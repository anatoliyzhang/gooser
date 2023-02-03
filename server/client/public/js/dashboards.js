if (location == parent.location) throw new Error('This program does not run independantly.');
let gridstack = GridStack.init();
// gridstack.disable();
let tables = {};
let selectedDashboardId = 0;
let dashboards = await fetch_json(location.origin + '/api/query/displays/kind=\'dashboard\'');
let dashboards_list_e = document.getElementById('dashboards_table');
let dashboards_table = new Tabulator('#dashboards_table',{
  layout: 'fitColumns',
  selectable: true,
  columns: [
    {"title": "id", "field": "id","width":30},
    {"title": "name", "field": "name","editor":"input"},
  {
    formatter: "buttonCross", width: 30, hozAlign: "center", cellClick: async function (e, cell) {
      // cell.getRow().toggleSelect();
      // selectedDeviceIds.push(cell.getRow().getData().id);
      if (confirm('Warning: You will delete this device, and this action cannot be undone.')) {
        let delete_device_response = await fetch_post('/api/dashboards/delete',cell.getRow().getData());
        if (delete_device_response.status == 200) cell.getRow().delete();

      }

    }
  }
],
data: dashboards,
});

dashboards_table.on('rowSelected', (row) => {
  let rowData = row.getData();
  let otherRows = dashboards_table.getSelectedRows().filter(r => r.getData().id != rowData.id);
  otherRows.forEach(ro => ro.deselect());
  // widgets['list'].deselectRow();
  // cell.getRow().toggleSelect();
  // widgets['detail'].setData([rowData]);
  // widgets['channels'].setData(rowData.channels);
  selectedDashboardId = rowData.id;
  // console.log(rowData);
  // gridstack.removeAll();
  reload_gridstack(rowData.id);
});
dashboards_table.on('cellEdited',async (cell)=>{
  let new_dashboard_data = cell.getRow().getData();
  // send the updated dashboard information to server
  let update_dashboard_response = await fetch_post('/api/displays/update', new_dashboard_data);
  
  if (update_dashboard_response.status > 300) {
    alert('Error, device not updated.');
    conso.log(update_dashboard_response.status);
  }
  // else{console.log('dashboard updated')}
});


document.getElementById('dashboard-plus').addEventListener('click',async ()=>{
  let new_dashboard = {
    id:0,
    name:'New Dashboard',
    description: 'Some description about this dashboard',
    kind: 'dashboard',
    grids:[]
  };
  let add_new_dashboard_response = await fetch_post('/api/displays/insert',new_dashboard);
  if (add_new_dashboard_response.status == 200){
    dashboards_table.setData('/api/query/displays/kind=\'dashboard\'');
    // dashboards_table.off("dataProcessed");
    // dashboards_table.on("dataProcessed",()=>{
    //   dashboards_table.selectRow();
    // });
  }
});
gridstack.on('change',(event, nodes)=>{
  // let nodes = gridstack.save();
  nodes.forEach(node=>{
    // console.log(node);
    let updated_node = {
      id:node.id,
    display_id:node.display_id,
    x:node.x,y:node.y,w:node.w,h:node.h,
    widget_type: node.widget_type,
    widget_title: node.widget_title,
    widget_option: node.widget_option,
    widget_min: node.widget_min,
    widget_max: node.widget_max,
    widget_series: node.widget_series,
    x_axis: node.x_axis,
    y_axis: node.y_axis,
    geomap_id: node.geomap_id,
    };
    tables['config_table_grid_'+node.id].on('tableBuilt',()=>{
      tables['config_table_grid_'+node.id].setData([updated_node]);
    });
    
    fetch_post('/api/grids/update',updated_node);
  });
});

document.getElementById('add_widget_button').addEventListener('click',async ()=>{
  if (selectedDashboardId == 0) return;
  let new_grid = {
    id:0,
    display_id:selectedDashboardId,
    x:0,y:0,w:4,h:2,
    widget_type:'CHANGE ME',
    widget_title: 'TITLE',
    widget_option: '{}',
    widget_min: 0,
    widget_max: 100,
    widget_series: '[]',
    x_axis:'{"type":"time"}',
    y_axis: '{"type":"value"}',
    geomap_id: 0,
  }
  let wgt = gridstack.addWidget(new_grid);
  // console.log(wgt.gridstackNode);
  new_grid.x = wgt.gridstackNode.x;
  new_grid.y = wgt.gridstackNode.y;
  // console.log(new_grid);
  let add_new_grid_response = await fetch_post('/api/grids/insert',new_grid);
  if (add_new_grid_response.ok) {
    reload_gridstack(selectedDashboardId);
  }
});
// gridstack.on('resizestop',(event, element)=>{
//   let nodes = gridstack.save();
//   nodes.forEach(node=>{
//     // console.log(node);
//     tables['config_table_grid_'+node.id].setData([node]);
//     fetch_post('/api/grids/update',node);
//   });
// });

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
async function reload_gridstack(dashboard_id){
  gridstack.removeAll();
  let grids = await fetch_json('/api/query/grids/display_id='+dashboard_id);
  // console.log(grids);
  grids.forEach(grid=>{
    let widget = gridstack.addWidget(`
    <div class="card card-success">
    <div class="card-header">
      <h3 class="card-title"><i class="fas fa-tachometer-alt nav-icon"></i> Widget Config </h3>
      <div class="card-tools">
        <button type="button" class="btn btn-tool" id="remove_${grid.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="card-body bg-dark">
      <div id="config_table_grid_${grid.id}"></div>
      <div id="config_table_widget_${grid.id}"></div>
      <div id="config_table_widget_option_${grid.id}"></div>
    </div>
  </div>
  `,
    grid);
    // let widget_config_table_ele = widget.querySelector('.card-body');
    tables['config_table_grid_'+grid.id] = new Tabulator('#config_table_grid_'+grid.id,{
      columns:[
      {title:'id',field:'id'},
      {title:'dashboard_id', field:'display_id'},
      {title:'x',field:'x'},
      {title:'y',field:'y'},
      {title:'w',field:'w'},
      {title:'h',field:'h'},
    ],
    data:[grid],
  });


    tables['config_table_widget_'+grid.id] = new Tabulator('#config_table_widget_'+grid.id,{
      columns: get_columns(grid.widget_type),
      data:[grid],
    });
    tables['config_table_widget_'+grid.id].on('cellClick',(e,cell)=>{
      if (cell.getField() == 'widget_series'){
        cell.getRow().popup(function (e, component, onRendered) {
          //component - column/row/cell component that triggered this popup
          //e - the mouse/touch event that triggered the popup
          //onRendered - function to call when the formatter has been rendered
          let series = JSON.parse(cell.getValue());
          // console.log(series);
          let element = document.createElement("div");
          let widget_series_table = new Tabulator(element, {
            selectable: true,
            columns: [
              {formatter:"rowSelection", titleFormatter:"rowSelection", hozAlign:"center", headerSort:false
              },
              { title: 'id', field: 'id' },
              { title: 'device_id', field: 'device_id' },
              { title: 'name', field: 'name' },
              { title: 'description', field: 'description' },
              { title: 'group_name', field: 'group_name' },
              { title: 'measure_unit', field: 'measure_unit' },
              { title: 'min_alarm', field: 'min_alarm' },
              { title: 'low_alarm', field: 'low_alarm' },
              { title: 'high_alarm', field: 'high_alarm' },
              { title: 'max_alarm', field: 'max_alarm' },
              { title: 'scale', field: 'scale' },
              { title: 'geo', field: 'geo' },
            ],
            // data:[{}]
          });
          widget_series_table.on('tableBuilt', () => {
            widget_series_table.setData('/api/query/channels/1');
            // let selected_channels = JSON.parse(cell.getValue());
            // console.log(selected_channels);
            
          });
          widget_series_table.on('dataProcessed',()=>{widget_series_table.selectRow(series);});
          widget_series_table.on("rowSelectionChanged", function(data, rows){
            //rows - array of row components for the selected rows in order of selection
            //data - array of data objects for the selected rows in order of selection
            // console.log(data);
            let value = data.map(v=>v.id);
            cell.setValue(JSON.stringify(value));
        });
          return element;
        }, "left");
      }

    });
    // let line_columns_def = [{title:'widget_min',field:'widget_min',editor:'number'},{title:'widget_max',field:'widget_max'}]
    // let config_table_widget_option = new Tabulator('#config_table_widget_'+grid.id,{})
    tables['config_table_widget_'+grid.id].on('cellEdited',async (cell)=>{
      if (cell.getField() == 'widget_type'){
        tables['config_table_widget_'+grid.id].setColumns(get_columns(cell.getValue()));
      }
      // console.log(cell.getRow().getData());
      // let updated_grid = calculate_option(cell.getRow().getData());
      // if (cell.getField() == 'x_axis'){cell.setValue(JSON.stringify(cell.getValue()))}
      let updated_grid = cell.getRow().getData();
      if (cell.getField() == 'x_axis'){updated_grid.x_axis = JSON.stringify(cell.getValue());}
      fetch_post('/api/grids/update',updated_grid);
      // let update_grid_response = await fetch_post('/api/grids/update',updated_grid);
      // console.log(update_grid_response.status);
      // console.log(updated_grid);
    });

    document.getElementById('remove_'+grid.id).addEventListener('click',async ()=>{
      // console.log('got it');
      let grid_selected = gridstack.save().find(gd=>gd.id == grid.id);
      // console.log(grid_to_be_deleted);
      let grid_to_be_deleted = {
        id:grid_selected.id,
      display_id:grid_selected.display_id,
      x:grid_selected.x,y:grid_selected.y,w:grid_selected.w,h:grid_selected.h,
      widget_type: grid_selected.widget_type,
      widget_title: grid_selected.widget_title,
      widget_option: grid_selected.widget_option,
      widget_min: grid_selected.widget_min,
      widget_max: grid_selected.widget_max,
      widget_series: grid_selected.widget_series,
      x_axis: grid_selected.x_axis,
      y_axis: grid_selected.y_axis,
      geomap_id: grid_selected.geomap_id,
      };
      if (confirm('Warning: You will delete this widget, and this action cannot be undone.')){
        let delete_grid_response = await fetch_post('/api/grids/delete',grid_to_be_deleted);
        if (delete_grid_response.ok) reload_gridstack(selectedDashboardId);
      }
    });
  });
}



function get_columns(type){
  let line_columns = [];
  let bar_columns =[];
  let gauge_columns = [{title:'min',field:'widget_min',editor:'number'},{title:'max',field:'widget_max',editor:'number'}];
  let graph_columns = [];
  let geo_columns = [{title:'geomap_id',field:'geomap_id',editor:'number'}];
  let table_columns = [{title:'columns',field:'x_axis',editor:'list',editorParams:{multiselect:true,values:
    ["id","device_id","name","description","group_name","measure_unit","min_alarm","low_alarm","high_alarm","max_alarm","scale","geo","value","time","status"]
  }}];
      let default_columns = [
        {title:'widget_type', field:'widget_type',editor:'list',editorParams:{values:['line','bar','gauge','graph','geo','table']}},
        {title:'widget_title', field:'widget_title', editor:'input'},
        {title:'Data Channels', field:'widget_series'}
      ];
  switch (type){
    case 'line':
      return default_columns.concat(line_columns);
    case 'bar':
      return default_columns.concat(bar_columns);
    case 'gauge':
      return default_columns.concat(gauge_columns);
    case 'graph':
      return default_columns.concat(graph_columns);
    case 'geo':
      return default_columns.concat(geo_columns);
    case 'table':
      return default_columns.concat(table_columns);
    default:
      return default_columns;  
  }
}

function calculate_option(grid){
  switch (grid.widget_type){
    case 'line':
      grid.widget_option = JSON.stringify({
        title: { text: '' },
        animation: false,
        backgroundColor: '#343a40',
        legend: {},
        tooltip: {},
        dataZoom: { type: 'inside' },
        xAxis: {type:'time'},
        yAxis: {type:'value'},
        dataset: { source: [] },
        series: [],
      });
      return grid;
  }
}