if (location == parent.location) throw new Error('This program does not run independantly.');
let geomaps = await fetch_json('/api/query/geomaps/1=1');
let modal = document.getElementById('add-geomap-modal');
let geomaps_table = new Tabulator('#geomaps-table',{
  // reactiveData:true,
  columns:[
    {title:'id',field:'id'},
    {title:'name', field:'name', editor:'input'},
    {title:'ext',field:'ext'},
    {title:'path', field:'path',editor:'input'},
    {title: 'x_max', field:'x_max'},
    {title: 'y_max', field:'y_max'},
    {title: 'z_max', field: 'z_max'},
    {formatter: "buttonCross", width: 30, hozAlign: "center", cellClick: async function (e, cell) {
      if (confirm('Warning: You will delete this geomap, and this action cannot be undone.')) {
        let delete_geomap_response = await fetch_post('/api/geomaps/delete',cell.getRow().getData());
        if (delete_geomap_response.ok) cell.getRow().delete();
      }
    }
  },
  ],
  data: geomaps,
});

geomaps_table.on('cellEdited',async (cell)=>{
  if (cell.getField() == 'path'){
    let rowData = cell.getRow().getData();
    let map_info_size = await get_svg_size(cell.getValue());
    // let map_image = new DOMParser().parseFromString(map_info_text,'image/svg+xml').lastElementChild;
    rowData.x_max = map_info_size.x_max;
    rowData.y_max = map_info_size.y_max;
    rowData.z_max = map_info_size.z_max;
  let updated_geomap_response = await fetch_post('/api/geomaps/update', rowData);
  if (updated_geomap_response.ok) geomaps_table.setData('/api/query/geomaps/1=1');
  }
});

document.getElementById('geomaps-plus').addEventListener('click',()=>{
  modal.style.display = 'block';
});
document.getElementById('add-geomap-cancel').addEventListener('click',()=>{
  modal.style.display = 'none';
});
document.getElementById('add-geomap-save').addEventListener('click',async ()=>{
  modal.style.display = 'none';
  let file = document.getElementById('new_geomap_file');
  let file_name = file.files[0].name;
  let name_split = file_name.split('.');
  let form_data = new FormData();
  form_data.append('map',file.files[0]);
  // console.log(file.files[0]);
  let upload_response = await upload_file('/upload',form_data);
  if (upload_response.ok){
    let svg_size = await get_svg_size('/public/map/' + file_name);

    let add_new_geomap_response = await fetch_post('/api/geomaps/insert',{
      id:0,
      name: name_split[0],
      ext: name_split[1],
      path: '/public/map/' + file_name,
      x_max: svg_size.x_max,
      y_max: svg_size.y_max,
      z_max: svg_size.z_max,
    });
    if (add_new_geomap_response.ok) {
      geomaps_table.setData('/api/query/geomaps/1=1');

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

async function upload_file(api,form_data){
  return fetch(api,{
    method:'POST',
    body:form_data
  });
}
async function get_svg_size(url){
  let svg_text = await fetch_text(url);
  let svg_dom = new DOMParser().parseFromString(svg_text,'image/svg+xml').querySelector('svg');
  return {
    x_max: parseFloat(svg_dom.getAttribute('width')),
    y_max: parseFloat(svg_dom.getAttribute('height')),
    z_max: 0,
  };
};

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
