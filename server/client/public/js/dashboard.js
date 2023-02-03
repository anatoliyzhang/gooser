if (location == parent.location) throw new Error('This program does not run independantly.');
// console.log(location, parent.location);
// import {GridStack} from './gridstack';
let gridstack = GridStack.init();
gridstack.disable();
// use jquery from the parent window
// const $ = parent.$;
// console.log(DataTable);
// import {DataTable} from '/node_modules/datatables.net/js/jquery.dataTables.min.js';
// let DataTable = await DateTable;

let url = new URL(location.href);
const dashboard_id = url.searchParams.get('id');
let grids = await fetch_json(location.origin + '/api/query/grids/display_id=' + dashboard_id);
let devices = await fetch_json(location.origin + '/devices');
let channels = [];
devices.forEach(device => { channels.push(...device.channels) });
// console.log(devices);
const LINED_DATA_MAX_LENGTH = 1200;
const PRECISION = 100;
let widgets = {};
let channels_need_lined_data = [];
let lined_data = [];
let observing_channel_ids = [];
parent.toastr.options = {
  timeOut: 4000,
  positionClass: "toast-bottom-left",
  newestOnTop: true,
  preventDuplicates: true,
};
// const Echarts_WidgetTypes = ['line', 'bar', 'gauge', 'graph'];
grids.forEach(async grid => {
  let widget = gridstack.addWidget(`
    <div class="card" id="card-${grid.id}">
    <div class="card-header">
      <h3 class="card-title"><i class="fas fa-tachometer-alt nav-icon"></i> ${grid.widget_title}</h3>
      <div class="card-tools">
      </div>
    </div>
    <div class="card-body bg-dark">
    </div>
  </div>
  `,
    grid);
  //   console.log(widget);
  let echart_ele = widget.querySelector('.card-body');
  // let initOption;
  let widget_series = JSON.parse(grid.widget_series);
  observing_channel_ids = observing_channel_ids.concat(widget_series);
  switch (grid.widget_type) {
    case "line":
      widgets[grid.id] = echarts.init(echart_ele, 'dark');
      let line_init_option = {
        title: { text: '', subtextStyle:{color:'#dc3545'} },
        animation: false,
        backgroundColor: '#343a40',
        legend: {},
        tooltip: {},
        dataZoom: { type: 'inside' },
        xAxis: JSON.parse(grid.x_axis),
        yAxis: JSON.parse(grid.y_axis),
        dataset: { source: [] },
        series: [],
      };
      widget_series.forEach(serie => {
        // let channel_need_line = {
        //   channel_id: serie,
        //   device_id: devices.find(device => device.channels.findIndex(c => c.id == serie) > -1).id,
        //   channel_index: devices.find(device => device.channels.findIndex(c => c.id == serie) > -1).channels.findIndex(c => c.id == serie)
        // };

        let line_channel = channels.find(channel => channel.id == serie);
        line_init_option.title.text += ' ' + line_channel.measure_unit;
        if (channels_need_lined_data.length == 0 || !channels_need_lined_data.includes(serie)) channels_need_lined_data.push(serie);

        line_init_option.series.push({
          type: grid.widget_type,
          symbolSize: 3,
          lineStyle:{width: 1},
          encode: { x: 0, y: channels_need_lined_data.indexOf(serie) + 1 },
          name: line_channel.name,
          endLabel: {
            show: true, color: 'inherit',
            // formatter: '{@['+(channels_need_lined_data.indexOf(serie) + 1)+']} '+ line_channel.measure_unit
          },
          markLine: {
            label: { position: 'insideEnd', formatter: '{b}: {c}' },
            data: [
              { name: 'min_alarm', yAxis: line_channel.min_alarm },
              { name: 'low_alarm', yAxis: line_channel.low_alarm },
              { name: 'high_alarm', yAxis: line_channel.high_alarm },
              { name: 'max_alarm', yAxis: line_channel.max_alarm }
            ]
          },
        });
        // if (serie[1] > lined_data_max_length) lined_data_max_length = serie[1];
      });
      widgets[grid.id].setOption(line_init_option);
      break;
    case 'bar':

      widgets[grid.id] = echarts.init(echart_ele, 'dark');
      let bar_init_option = {
        title: { text: '', subtextStyle:{color:'#dc3545'} },
        animation: false,
        backgroundColor: '#343a40',
        legend: {},
        tooltip: {},
        xAxis: JSON.parse(grid.x_axis),
        yAxis: JSON.parse(grid.y_axis),
        series: [],
      };
      // bar_init_option.xAxis.data = [];
      widget_series.forEach(serie => {
        let bar_channel = channels.find(channel => channel.id == serie);
        // console.log(bar_channel);
        // bar_init_option.xAxis.data.push(bar_channel.name);
        bar_init_option.title.text = bar_channel.measure_unit;
        bar_init_option.series.push({
          type: 'bar',
          name: bar_channel.name,
          markLine: {
            label: { position: 'insideEnd', formatter: '{b}: {c}' },
            data: [
              { name: 'min_alarm', yAxis: bar_channel.min_alarm },
              { name: 'low_alarm', yAxis: bar_channel.low_alarm },
              { name: 'high_alarm', yAxis: bar_channel.high_alarm },
              { name: 'max_alarm', yAxis: bar_channel.max_alarm },
            ]
          },
          label: { show: true, position: 'bottom', formatter: '{b}\n{c}' },
        });
      });
      widgets[grid.id].setOption(bar_init_option);
      break;
    case 'gauge':
      widgets[grid.id] = echarts.init(echart_ele, 'dark');
      let gauge_init_option = {
        title: { text: '', subtextStyle:{color:'#dc3545'} },
        backgroundColor: '#343a40',
        legend: {},
        tooltip: {},
        series: [],
      };
      widget_series.forEach((serie, ix) => {
        let gauge_channel = channels.find(channel => channel.id == serie);
        // console.log(gauge_channel);
        gauge_init_option.title.text = gauge_channel.measure_unit;
        gauge_init_option.series.push({
          type: 'gauge',
          name: gauge_channel.name,
          min: grid.widget_min,
          max: grid.widget_max,
          axisLine: {
            lineStyle: {
              width: 10,
              color: [
                [(gauge_channel.min_alarm - grid.widget_min) / (grid.widget_max - grid.widget_min), "#7fffd4"],
                [(gauge_channel.low_alarm - grid.widget_min) / (grid.widget_max - grid.widget_min), "#1e90ff"],
                [(gauge_channel.high_alarm - grid.widget_min) / (grid.widget_max - grid.widget_min), "#00aa00"],
                [(gauge_channel.max_alarm - grid.widget_min) / (grid.widget_max - grid.widget_min), "#ffd700"],
                [1, "#ff0000"]
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '20%',
            width: 14,
            offsetCenter: [0, '-60%'],
            itemStyle: {
              color: 'inherit'
            }
          },
          axisTick: {
            distance: -10,
            length: 5,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          splitLine: {
            distance: -10,
            length: 12,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          axisLabel: {
            color: 'inherit',
            distance: -10,
            fontSize: 12,
            rotate: 'tangential',
          },
          detail: {
            offsetCenter: [0, 20 * ix],
            formatter: "{value} " + gauge_channel.measure_unit,
            color: 'inherit',
            fontSize: 20,
          },
          data: [],

        });
      });
      // console.log(gauge_init_option);
      widgets[grid.id].setOption(gauge_init_option);
      break;
    case 'graph':
      widgets[grid.id] = echarts.init(echart_ele, 'dark');
      let graph_init_option = {
        title: { text: '', subtextStyle:{color:'#dc3545'} },
        backgroundColor: '#343a40',
        legend: {},
        tooltip: {},
        // roam:true,
        // layout: 'none',
        series:[{
          type: 'graph',
          name: grid.widget_title,
          // zoom:3,
          label: {
            show: true,
            // position: 'right',
            formatter: '{b}'
          },
          lineStyle:{color:'source'},
          edgeSymbol: ['circle', 'arrow'],
          categories: [{name: 'Device'}],
          data: [],
          links:[],
        }],
        
      };
      devices.forEach((device,idx)=>{
        graph_init_option.series[0].data.push({
          name:device.name,
          x:idx*400,
          y:0,
          value:'device',
          symbol:"roundRect",
          symbolSize:[100,50],
          channel_id: 0,
          category: 0,
          
          // label:{show:true,formatter:"{b}:\n{@value}",color:"#FFFFFF"}
        });
      });
      graph_init_option.series[0].categories.push();
      let groups = {};
      widget_series.forEach((serie,idx) => {
        let serie_channel = channels.find(channel => channel.id == serie);
        let serie_dev = devices.find(dev=>dev.id==serie_channel.device_id);
        
        if (graph_init_option.series[0].categories.length == 0 || graph_init_option.series[0].categories.findIndex(cate=>cate.name == serie_channel.group_name) < 0)
        {
          graph_init_option.series[0].categories.push({name: serie_channel.group_name});
          groups[serie_channel.group_name] = [];
          groups[serie_channel.group_name].push(serie);
          // graph_init_option.series[0].data.push({
          //   id:'dev_'+serie_dev.id,
          //   name:serie_dev.name,
          //   symbol: 'roundRect',
          //   symbolSize:[100,50],
          //   x:40*serie_categories_index,y:0,value:0,
          //   category:serie_categories_index,
          // });
          
        }else{groups[serie_channel.group_name].push(serie)}
        
        let serie_categories_index = graph_init_option.series[0].categories.findIndex(cate=>cate.name == serie_channel.group_name);
        let serie_groups_index = groups[serie_channel.group_name].findIndex(g=>g==serie);
        graph_init_option.series[0].data.push({
          // name: serie+':'+serie_channel.name,// this name should be UNIQUE.
          name: serie+':'+serie_channel.name,
          channel_id:serie,
          x: (serie_categories_index)*200,
          y: serie_groups_index*200+350,
          value: 0,
          symbol: 'rect',
          symbolSize: 50,
          category:serie_categories_index,
          label:{show:true,formatter:serie_channel.group_name+'\n'+serie_channel.name+":\n{@value}"+serie_channel.measure_unit},
          // itemStyle:{borderWidth:1,borderColor:'#28a745'},
        });

        // links
        graph_init_option.series[0].links.push({
          source:serie+':'+serie_channel.name,
          target:serie_dev.name,
          lineStyle: {curveness: 0.4},
        });
      });
      // console.log(graph_init_option.series[0].data);
      widgets[grid.id].setOption(graph_init_option);
      break;
    case 'geo':
      let geomaps = await fetch_json(location.origin + '/api/query/geomaps/1=1');
      // console.log(geomaps);
      let geomap = geomaps.find(map=>map.id == grid.geomap_id);
      let geomap_svg = await fetch_text(geomap.path);
      echarts.registerMap(geomap.name, { svg: geomap_svg });
      widgets[grid.id] = echarts.init(echart_ele, 'dark');
      // console.log(geomap);
      let geo_init_option = {
        title: { text: '', subtextStyle:{color:'#dc3545'} },
        backgroundColor: '#343a40',
        tooltip: {},
        geo: {
          tooltip: {
            show: false
          },
          map: geomap.name,
          roam: true
        },
        series: [{
          type: 'scatter',
          coordinateSystem: 'geo',
          colorBy:'data',
          geoIndex: 0,
          symbolSize: function (params) {return 20* (1 + params[3]);},
          label:{show:true,position:"right",formatter:"{@[4]} : {@[2]} {@[5]}",color:"#FFFFFF"},
          // itemStyle: {
          //   color: '#b02a02'
          // },
          // encode: {
          //   tooltip: 2
          // },
          data: []
        }]
      };

      widgets[grid.id].setOption(geo_init_option);
      break;
    case 'table':
      let table_init_option = {
        layout: "fitColumns",
        // columns: [{title: 'ID', field:}'id','name','description','group_name','measure_unit','time','value','alarm']
        // autoColumns:true,
        columns: [],
        data:[]
        };
        // console.log(grid.x_axis);
        JSON.parse(grid.x_axis).forEach(col=>{
          if (col == 'status') {
            table_init_option.columns.push({title:col.toUpperCase(),field:col,formatter: function(cell, formatterParams, onRendered){
              switch (cell.getValue()){
                case 0:
                  cell.getElement().style.backgroundColor = 'green';
                  return 'Normal';
                case 1:
                  // cell.getElement().classList.remove('')
                  cell.getElement().style.backgroundColor = 'orange';
                  return 'High Alarm';
                case 2:
                  cell.getElement().style.backgroundColor = 'red';
                  return 'Max Alarm';
                case -1:
                  cell.getElement().style.backgroundColor = 'orange';
                  return 'Low Alarm';
                case -2:
                  cell.getElement().style.backgroundColor = 'red';
                  return 'Min Alarm';
                default:
                  cell.getElement().style.backgroundColor = 'red';
                  return 'Error';
              }
              
            }
          });
          }
          else if (col == 'time'){
            table_init_option.columns.push({title:col.toUpperCase(),field:col, width:150, formatter:(cell, formatterParams, onRendered)=>{
              // tomorrow +3600*1000*24
              return new Date(cell.getValue()).toLocaleString();
            }
          });
          }
          else {
            table_init_option.columns.push({title:col.toUpperCase(),field:col});
          }
        });
        
        widget_series.forEach(serie => {
        let serie_channel = channels.find(channel => channel.id == serie);
        
        table_init_option.data.push({
          id:serie_channel.id,
          name:serie_channel.name,
          description: serie_channel.description,
          group_name: serie_channel.group_name,
          
          measure_unit: serie_channel.measure_unit,
          time: 0,
          value: 0,
          status: 0,
        });
      });
      // console.log(table_init_option.columns);
      // let table_ele = document.createElement('table');
      // echart_ele.appendChild(table_ele);
      // widgets[grid.id] = $(echart_ele).jsGrid({});
      widgets[grid.id] = new Tabulator(echart_ele,table_init_option);
    
      break;
    default:
      // console.log(grid);
      break;
  }

});

let ws = new WebSocket('ws://' + location.host + '/broadcast');
// setInterval(()=>{ws.send("{\"key\":\"value\"}");},2000);
ws.onmessage = (msg) => {
  // console.log(JSON.parse(msg.data));
  // update_widgets(JSON.parse(msg.data));
  let all_devices_data = JSON.parse(msg.data);
  // for demo purpose , chaning the data to random
  // all_devices_data.data = all_devices_data.data.map(data => Math.round(data * Math.random()*  PRECISION) / PRECISION);
  parent.toastr.remove();
  all_devices_data.data = all_devices_data.data.map(data => Math.round(data * PRECISION) / PRECISION);
  if (lined_data.length >= LINED_DATA_MAX_LENGTH) lined_data.shift();
  let one_lined_data = [];
  one_lined_data.push(all_devices_data.timestamp);
  channels_need_lined_data.forEach(channel_id => {
    // let device_id = devices.find(device=>device.channels.findIndex(c=>c.id == channel_id) > -1).id;
    one_lined_data.push(all_devices_data.data[channels.findIndex(channel => channel.id == channel_id)]);
  });
  lined_data.push(one_lined_data);
  // console.log(lined_data);
  let status = all_devices_data.status;
  grids.forEach(grid => {
    switch (grid.widget_type) {
      case 'line':
        let line_alarm_info = alarm_info(status,JSON.parse(grid.widget_series));
        reset_card_class(grid.id,line_alarm_info.alarm_codes);
        widgets[grid.id].setOption({title:{subtext:line_alarm_info.alarm_message}, dataset: { source: lined_data } });
        break;
      case 'bar':
        let bar_widget_series = JSON.parse(grid.widget_series);
        let bar_alarm_info = alarm_info(status,bar_widget_series);
        let bar_series = [];
        bar_widget_series.forEach(serie => {
          // console.log(channels.find(channel=>channel.id==serie).name);
          bar_series.push({

            data: [{
              name: channels.find(channel => channel.id == serie).name,
              value: all_devices_data.data[channels.findIndex(channel => channel.id == serie)]
            }]
          });
        });
        reset_card_class(grid.id,bar_alarm_info.alarm_codes);
        widgets[grid.id].setOption({title:{subtext:bar_alarm_info.alarm_message}, series: bar_series });
        break;
      case 'gauge':
        // console.log(widgets[grid.id].getOption());
        let gauge_widget_series = JSON.parse(grid.widget_series);
        let gauge_alarm_info = alarm_info(status,gauge_widget_series);
        let gauge_series = [];
        gauge_widget_series.forEach(serie => {
          gauge_series.push({ data: [all_devices_data.data[channels.findIndex(channel => channel.id == serie)]] });
        });
        reset_card_class(grid.id,gauge_alarm_info.alarm_codes);
        widgets[grid.id].setOption({title:{subtext:gauge_alarm_info.alarm_message},  series: gauge_series });
        break;
      case 'graph':
        let graph_widget_series = JSON.parse(grid.widget_series);
        let graph_alarm_info = alarm_info(status,graph_widget_series);
          let serie_data = widgets[grid.id].getOption().series[0].data;
          // console.log(original_serie_data);
          serie_data.forEach(data=>{
            if (data.channel_id !== 0) {
              let channel_index = channels.findIndex(channel => channel.id == data.channel_id);
              let channel_value = all_devices_data.data[channel_index];
              let channel_status_code = Math.abs(status[channel_index]);
              if (channel_value != undefined){
                data.value = channel_value;
                data.symbolSize = 50 * (1+ channel_status_code/4);
                data.symbolRotate = 45 * (channel_status_code > 0 ? 1 : 0);
              }
            }
            // else{  }
          });
          reset_card_class(grid.id,graph_alarm_info.alarm_codes);
          // console.log(serie_data);
        widgets[grid.id].setOption({title:{subtext:graph_alarm_info.alarm_message}, series: [{data: serie_data}] });
        break;
      case 'geo':
        // console.log('geo');
        let geo_widget_series = JSON.parse(grid.widget_series);
        let geo_alarm_info = alarm_info(status,geo_widget_series);

        let geo_serie_data = [];
        geo_widget_series.forEach(serie => {
          let serie_channel = channels.find(chnl=>chnl.id == serie);
          let serie_geo_info = JSON.parse(serie_channel.geo).find(geo=>geo[0] == grid.geomap_id);
          let channel_index = channels.findIndex(channel => channel.id == serie);
          let alarm_code_grade = Math.abs(status[channel_index]);
          if (serie_geo_info) {
            let serie_geo = serie_geo_info.slice(1,3);
            serie_geo.push(all_devices_data.data[channel_index],alarm_code_grade,serie_channel.name,serie_channel.measure_unit);
            // geo_serie_data.push(serie_geo.slice(1,3).push(all_devices_data.data[channels.findIndex(channel => channel.id == serie)]));
            geo_serie_data.push(serie_geo);
            // console.log(serie_geo);
          }
        });
        // console.log(geo_serie_data);
        reset_card_class(grid.id,geo_alarm_info.alarm_codes);
        widgets[grid.id].setOption({title:{subtext:geo_alarm_info.alarm_message}, series:[{data: geo_serie_data}]});
        break;  
      case 'table':
        let table_widget_series = JSON.parse(grid.widget_series);
        let table_alarm_info = alarm_info(status,table_widget_series);
        let table_update_data = [];
        JSON.parse(grid.widget_series).forEach(serie => {
          let channel_index = channels.findIndex(channel => channel.id == serie);
          table_update_data.push({
            id: serie,
            time:all_devices_data.timestamp,
            value:all_devices_data.data[channel_index],
            status:status[channel_index],
          });
        });
        // console.log(table_update_data);
        reset_card_class(grid.id,table_alarm_info.alarm_codes);
        widgets[grid.id].updateData(table_update_data);
        break;  
      default:
        // console.log('defaylt');
        break;
    }
    // console.log(widgets[grid.id].getOption());
  });

  // the above alarm code are visual styles for widgets, when alarm triggered.
  // Global Alarm, it is important to fire alarm in ways other than widget styles
  status.forEach((code,i)=>{
    let current_channel = channels[i];
    let current_data = all_devices_data.data[i];
    if (observing_channel_ids.includes(current_channel.id)){
    switch (code){
      case 0:
        // normal
        break;
      default:
        // sound_alarm(current_channel,current_data,code, []);
        sound_alarm(code);
        // voice alarm
        voice_alarm(current_channel.name, code);
        // toast alarm
        toast_alarm(current_channel, code, current_data);
        break;
      }
    }
  });
// console.log(observing_channel_ids)
};
// ws.onclose = (e)=>{console.log(e)};
async function fetch_json(url) {
  let response = await fetch(url);
  return await response.json();
}
async function fetch_text(url) {
  let response = await fetch(url);
  return await response.text();
}

function get_alarm_message(name, status_code){
  switch (status_code){
    case 0:
      return '';
      break;
    case 1:
      return 'Warning: '+ name + ' high alarm!';
      break;
    case -1:
      return 'Warning: '+ name + ' low alarm!';
      break;
    case 2:
      return 'Warning: '+ name + ' max alarm!';
      break;
    case -2:
      return 'Warning: '+ name + ' min alarm!';
      break;
    default:
      break;      
  }
}

function reset_card_class(id,codes){
  let class_name = 'card-success';
  if (codes.some(v=> v== 2 || v== -2)) class_name = 'flashred';
  else if (codes.some(v=> v== 1 || v== -1)) class_name = 'flashyellow';
  const all_classes = ['card-success', 'flashyellow', 'flashred'];
  document.getElementById('card-'+id).classList.remove(...all_classes);
  document.getElementById('card-'+id).classList.add(class_name);
}

function alarm_info(status,series){
  let alarm_message = '';
  let alarm_codes = [];
  series.forEach(serie=>{
    let serie_status = status[channels.findIndex(channel=>channel.id == serie)];
    let serie_name = channels.find(channel=>channel.id == serie).name;
    if (serie_status!= undefined) alarm_message += get_alarm_message(serie_name,serie_status)+'\n';
    if (serie_status!= undefined) alarm_codes.push(serie_status);
    // console.log(serie_status,serie_name)
  });
  
  return {alarm_message,alarm_codes};
}

function sound_alarm(code){
  // document.getElementById(sound).pause();

  document.getElementById('alarm_sound_'+ Math.abs(code)).play();
  // document.getElementById(sound).removeAttribute('muted');
}

function voice_alarm (channel_name,code){
  let vm = new SpeechSynthesisUtterance(get_alarm_message(channel_name,code));
  speechSynthesis.speak(vm);
}

function toast_alarm(channel,code, data){
  // console.log(toastr)
  // parent.toastr.remove();
  switch (code){
    case 1:
      parent.toastr.warning(
      'Now: '+ data + channel.measure_unit + '\n'+'High Alarm is set to: ' + channel.high_alarm + channel.measure_unit,
      get_alarm_message(channel.name,code)
      );
      break;
    case 2:
      parent.toastr.error(
      'Now: '+ data + channel.measure_unit + '\n'+'Max Alarm is set to: ' + channel.max_alarm + channel.measure_unit,
      get_alarm_message(channel.name,code)
      );
      break;
    case -1:
      parent.toastr.warning(
      'Now: '+ data + channel.measure_unit + '\n'+'Low Alarm is set to: ' + channel.low_alarm + channel.measure_unit,
      get_alarm_message(channel.name,code)
      );
      break;
    case -2:
      parent.toastr.error(
      'Now: '+ data + channel.measure_unit + '\n'+'Min Alarm is set to: ' + channel.min_alarm + channel.measure_unit,
      get_alarm_message(channel.name,code)
      );
      break;
  }
  
}
// function alarm(current_channel,current_data,code){
//   // play alarm sound
//   document.getElementById('alarm_sound_'+ Math.abs(code)).play();
//   // play voice alarm
//   voice_alarm(current_channel,current_data,code);

// }