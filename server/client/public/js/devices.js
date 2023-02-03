if (location == parent.location) throw new Error('This program does not run independantly.');
let gridstack = GridStack.init();
gridstack.disable();
let widgets = {};
let devices_management_displays = await fetch_json(location.origin + '/api/query/displays/kind=\'devices_management\'');
// console.log(devices_management_displays);
let display_id = devices_management_displays[0].id;
let grids = await fetch_json(location.origin + '/api/query/grids/display_id=' + display_id);
// console.log(grids);
let devices = await fetch_json('/devices');
let selectedDeviceId = 0;
// console.log(devices);
grids.forEach(async grid => {
  let widget_y = JSON.parse(grid.y_axis)
  let widget_type = widget_y.type;
  let widget_buttons = widget_y.buttons;
  // console.log(widget_buttons);
  let table_colums = JSON.parse(grid.x_axis);
  let table_init_option = {
    // layout: "fitColumns",
    // columns: [{title: 'ID', field:}'id','name','description','group_name','measure_unit','time','value','alarm']
    // autoColumns:true,
    columns: table_colums,
    data: []
  };
  // console.log(table_init_option);
  // widgets[widget_type] = new Tabulator(devs_ele, table_init_option);

  let card = gridstack.addWidget(`
        <div class="card card-success">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-server nav-icon"></i> ${grid.widget_title}</h3>
          <div class="card-tools">
          ${widget_buttons.map(button => `<button type="button" class="btn btn-tool" id="${widget_type}-${button}">
          <i class="fas fa-${button}"></i>
        </button>`)}
          </div>
        </div>
        <div class="card-body bg-dark">
        </div>
      </div>
      `,
    grid);
  let table_ele = card.querySelector('.card-body');
  switch (widget_type) {
    case 'list':

      let list_init_option = {
        layout: "fitColumns",
        selectable: true,
        columns: [
          {
            "title": "name", "field": "name",
            //  cellClick: function (e, cell) {
            //   let rowData = cell.getRow().getData();
            //   widgets['list'].deselectRow();
            //   cell.getRow().toggleSelect();
            //   widgets['detail'].setData([rowData]);
            //   widgets['channels'].setData(rowData.channels);
            //   selectedDeviceId = rowData.id;
            // }
          },
          {
            formatter: "buttonCross", width: 30, hozAlign: "center", cellClick: async function (e, cell) {
              // cell.getRow().toggleSelect();
              // selectedDeviceIds.push(cell.getRow().getData().id);
              if (confirm('Warning: You will delete this device, and this action cannot be undone.')) {
                let delete_device_response = await fetch_post('/api/devices/delete', cell.getRow().getData());
                if (delete_device_response.status == 200) cell.getRow().delete();

              }

            }
          }],
        data: devices
      };
      widgets['list'] = new Tabulator(table_ele, list_init_option);
      widgets['list'].on('rowSelected', (row) => {
        let rowData = row.getData();
        let otherRows = widgets['list'].getSelectedRows().filter(r => r.getData().id != rowData.id);
        otherRows.forEach(ro => ro.deselect());
        // widgets['list'].deselectRow();
        // cell.getRow().toggleSelect();
        widgets['detail'].setData([rowData]);
        widgets['channels'].setData(rowData.channels);
        selectedDeviceId = rowData.id;
      });

      // let add_device_modal = document.getElementById('add-device-modal');

      break;
    case 'detail':


      widgets['detail'] = new Tabulator(table_ele, table_init_option);
      widgets['detail'].on('cellEdited', async (cell) => {
        let new_device_data = cell.getRow().getData();
        if (cell.getField() == 'name') {

          widgets['list'].updateData([new_device_data]);
        }
        // send the updated device information to server
        let update_device_response = await fetch_post('/api/devices/update', new_device_data);
        // console.log(update_device_response);
        if (update_device_response.status > 300) {
          alert('Error, device not updated.');
          conso.log(update_device_response.status);
        }
        else { console.log(update_device_response.status); }
      });
      break;
    case 'channels':
      table_colums.push({
        formatter: "buttonCross", width: 30, hozAlign: "center", cellClick: async (e, cell) => {
          // cell.getRow().toggleSelect();
          // selectedDeviceIds.push(cell.getRow().getData().id);
          if (confirm('Warning: You will delete this channel, and this action cannot be undone.')) {
            let delete_device_response = await fetch_post('/api/channels/delete', cell.getRow().getData());
            if (delete_device_response.status == 200) {
              widgets['list'].setData('/devices');
              widgets['list'].off("dataProcessed");
              widgets['list'].on("dataProcessed", () => { widgets['list'].selectRow(selectedDeviceId); });
            }

          }

        }
      });
      widgets['channels'] = new Tabulator(table_ele, {
        columns: table_colums,
      });

      widgets['channels'].on('cellEdited', async (cell) => {
        let new_channel_data = cell.getRow().getData();
        // console.log(new_channel_data);
        // send the updated channel information to server
        let update_channel_response = await fetch_post('/api/channels/update', new_channel_data);

        if (update_channel_response.status > 300) {
          alert('Error, channel not updated.');
          console.log(update_channel_response.status);
        }
        // else{console.log(update_channel_response.status);}  
      });
      widgets['channels'].on('cellClick', async (e, cell) => {
        if (cell.getField() == 'geo') {
          cell.getRow().popup(function (e, component, onRendered) {
            //component - column/row/cell component that triggered this popup
            //e - the mouse/touch event that triggered the popup
            //onRendered - function to call when the formatter has been rendered

            let element = document.createElement("div");
            let geo_table = new Tabulator(element, {
              columns: [
                // {title:'ID', field:'id'},
                { title: 'map_id', field: 'id' },
                { title: 'map_name', field: 'name' },
                { title: 'map_path', field: 'path' },
                { title: 'x_max', field: 'x_max' },
                { title: 'y_max', field: 'y_max' },
                { title: 'x', field: 'x', editor: 'number' },
                { title: 'y', field: 'y', editor: 'number' },
              ],
              // data:[{}]
            });
            geo_table.on('tableBuilt', () => {
              geo_table.setData('/api/query/geomaps/1');
            });
            geo_table.on('cellEdited', () => {
              let geo_data = geo_table.getData();
              // console.log(geo_data);
              let cell_data = geo_data.map(geo => [geo.id, geo.x, geo.y, 0]);
              cell.setValue(JSON.stringify(cell_data));
            });
            onRendered(function () {
              // element.textContent = JSON.stringify(component.getRow().getData());
            });

            return element;
          }, "center");
        }
      });
      break;
    default:
      break;
  }
  // widgets["list"].setData([{"id":1,"name":"abc"}]);
});

document.getElementById('list-plus').addEventListener('click', async () => {
  let new_device = {
    id: 0,
    address: 0,
    serial_number: 'SN',
    manufacturer: 'XXX LTD',
    name: 'Device Name',
    description: 'device descrp',
    protocol: 'ModbusRTU',
    agent_host: '192.168.x.x',
    baud_rate: 9600,
    parity: 0,
    function_code: 3,
    crc_bit: 0,
    stop_bit: 8,
    start_address: 110,
    data_type: 'INTEGER',
    enabled: 1,
    channels: []
  };
  let add_new_device_response = await fetch_post('/api/devices/insert', new_device);
  if (add_new_device_response.status == 200) {
    // location.reload();
    widgets['list'].setData('/devices');
    selectedDeviceId = 0;
  }
  else console.log(await add_new_device_response.text());
});

document.getElementById('channels-plus').addEventListener('click', async () => {
  // console.log('add channel');
  if (selectedDeviceId == 0) { alert('please select a device to add channels'); return; }
  else {
    // console.log(selectedDeviceId);
    let new_channel = {
      id: 0,
      device_id: selectedDeviceId,
      name: 'Channel Name',
      description: 'Descrp',
      group_name: 'somewhere 1',
      measure_unit: 'Kg',
      min_alarm: -10,
      low_alarm: -1,
      high_alarm: 80,
      max_alarm: 100,
      scale: 1,
      geo: '[[0,0,0,0]]'
    }
    let add_new_channel_response = await fetch_post('/api/channels/insert', new_channel);
    if (add_new_channel_response.status == 200) {
      widgets['list'].setData('/devices');
      widgets['list'].off("dataProcessed");
      widgets['list'].on("dataProcessed", () => { widgets['list'].selectRow(selectedDeviceId); });

    }

  }

});

async function fetch_json(url) {
  let response = await fetch(url);
  return await response.json();
}
async function fetch_text(url) {
  let response = await fetch(url);
  return await response.text();
}
async function fetch_post(api,json){
  return fetch(api,{
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'include', 
    headers: {
      'Content-Type': 'application/json',
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(json) 
  });
}