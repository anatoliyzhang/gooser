if (location == parent.location) throw new Error('This program does not run independantly.');
let gridstack = GridStack.init();
gridstack.disable();
let report_table, graph_line;
const grids = [
    { id: 1, x: 0, y: 0, w: 4, h: 8, name: 'Report', display_type: 'table' },
    { id: 2, x: 4, y: 0, w: 8, h: 4, name: 'Graph', display_type: 'line' },
];
grids.forEach(grid => {

    switch (grid.display_type) {
        case 'table':
            let widget_table = gridstack.addWidget(`
                <div class="card" id="card-${grid.id}">
                <div class="card-header">
                <h3 class="card-title"> <i class="fas fa-file-word"></i> ${grid.name}</h3>
                <div class="card-tools">
                <div class="btn-group">
                <button type="button" class="btn btn-success" id="download-excel" disabled>
                <i class="fas fa-file-excel"></i>
                </button>
                </div>
                </div>
                </div>
                <div class="card-body bg-dark">
                </div>
                </div>
                `,
                grid);
            report_table = new Tabulator(widget_table.querySelector('.card-body'), {
                layout: "fitDataStretch",
                headerVisible: false, //hide header
                columns: [{ title: 'Name', field: 'name' }, { title: 'Value', field: 'value' }]
            });
            break;
        case 'line':
            let widget_graph = gridstack.addWidget(
                `
                <div class="card" id="card-${grid.id}">
                    <div class="card-header">
                    <h3 class="card-title"> <i class="fas fa-tachometer-alt nav-icon"></i> ${grid.name}</h3>
                    <div class="card-tools">
                    </div>
                        </div>
                    <div class="card-body bg-dark">
                    </div>
                    </div>
                `,grid);
            graph_line = echarts.init(widget_graph.querySelector('.card-body'), 'dark');
            let line_option = {
                title: { text: '', subtextStyle: { color: '#dc3545' } },
                animation: false,
                backgroundColor: '#343a40',
                legend: {},
                tooltip: {},
                dataZoom: { type: 'inside' },
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                // dataset: { source: [] },
                series: [],
            };
            graph_line.setOption(line_option);
            break;
        default:
            break;
    }
});
// gridstack.load(grids);
let devices = await fetch_json(location.origin + '/devices');
let channels = [];
devices.forEach(device => { channels.push(...device.channels) });


let history_time_from = document.getElementById('history-time-from');
let history_time_to = document.getElementById('history-time-to');
let channel_select = document.getElementById('history-channel');

// let now = Date.now();
// console.log(Date.now());
// let now_start = Date.now();
// let now = new Date();
// let now_string = now.getFullYear().toString()+ '-'
//  + fill_zero((now.getMonth()+1).toString()) +'-'
//  + fill_zero(now.getDate().toString())+'T'
//  + fill_zero(now.getHours().toString())+':'
//  + fill_zero(now.getMinutes().toString())+':'
//  + fill_zero(now.getSeconds().toString()) +'.'
//  + fill_zero(now.getMilliseconds().toString());
let now = Date.now();
let now_string = new Date(now - new Date(now).getTimezoneOffset() * 60_000).toISOString().slice(0, 22);
//  let now_end = Date.now();
//  console.log(Date.now());

//  console.log(now_string);

history_time_from.value = now_string;
history_time_to.value = now_string;
// console.log(history_time_from.value)
channels.forEach(channel => {
    let cnl_option = document.createElement('option');
    cnl_option.value = channel.id;
    cnl_option.text = channel.id + ' ' + channel.name + ' @' + channel.group_name;
    channel_select.appendChild(cnl_option);
});
// new Date().
document.getElementById('history-query-button').addEventListener('click', async () => {
    let from = Date.parse(history_time_from.value);
    let to = Date.parse(history_time_to.value);
    let query_channel_id = channel_select.value;
    let query_channel = channels.find(channel => channel.id == query_channel_id);
    let query_device = devices.find(device => device.channels.findIndex(channel => channel.id == query_channel_id) > -1);
    // if (to - from >= 86400_000 * 60) {alert('Query period should be less than 60 days'); return;}
    // console.log(channel_select.value);
    let query_history_result = await fetch_json('/history/' + from + '/' + to + '/' + query_channel_id);
    if (query_history_result.length == 0) { alert('ERROR: NO DATA FOUND.'); return; }
    let line_data = query_history_result.map(data => [data.timestamp, data.data, data.status]);
    let data_statics = line_data.map(data => data[1]);
    let data_sum = 0;
    for (let i = 0, len = data_statics.length; i < len; i++) { data_sum += data_statics[i]; }
    let data_status = line_data.map(data => data[2]);

    // console.log(query_history_result);
    // draw the line in graph area
    graph_line.setOption({
        title: { text: 'History' },
        series: [
            {
                name: query_channel.name,
                type: 'line',
                data: line_data,
                symbolSize: 3,
                lineStyle:{width: 1},
                markLine: {
                    label: { position: 'insideEnd', formatter: '{b}: {c}' },
                    data: [
                        { name: 'min_alarm', yAxis: query_channel.min_alarm },
                        { name: 'low_alarm', yAxis: query_channel.low_alarm },
                        { name: 'high_alarm', yAxis: query_channel.high_alarm },
                        { name: 'max_alarm', yAxis: query_channel.max_alarm },
                        { name: 'average', type: 'average' },
                    ]
                },
                markPoint: {
                    data: [{
                        name: 'Maximum',
                        type: 'max'
                    },
                    {
                        name: 'Minimium',
                        type: 'min'
                    },]
                },
            }
        ]
    });
    // draw the table
    report_table.setData([
        { name: 'Title', value: 'Report on Device ' + query_device.id + ', ' + query_device.name + ', SN: ' + query_device.serial_number },
        { name: 'Channel', value: query_channel.id + ', ' + query_channel.name + ' @' + query_channel.group_name + ', ' + query_channel.measure_unit },
        { name: 'Created', value: new Date().toLocaleString() },
        { name: 'Period', value: history_time_from.value + ' -- ' + history_time_to.value },
        { name: 'Max', value: Math.max(...data_statics) },
        { name: 'Min', value: Math.min(...data_statics) },
        { name: 'Average', value: data_sum / data_statics.length },
        { name: 'Max Alarms', value: data_status.filter(sts => sts == 2).length },
        { name: 'High Alarms', value: data_status.filter(sts => sts == 1).length },
        { name: 'Low Alarms', value: data_status.filter(sts => sts == -1).length },
        { name: 'Min Alarms', value: data_status.filter(sts => sts == -2).length },
    ]);
    // download excell
    document.getElementById('download-excel').removeAttribute('disabled');
    document.getElementById('download-excel').addEventListener('click', ()=>{
        // console.log(report_table.getData());
        let report_overview_excel = report_table.getData().map(row=>[row.name, row.value]);
        let report_data_excel = line_data.map(data=>[new Date(data[0]).toLocaleString(), data[1], status_code_to_string(data[2])]);
        serve_excel(report_overview_excel,report_data_excel);
    });
});

function status_code_to_string(code){
    switch (code){
        case 0:
            return 'Normal';
        case 1:
            return 'High alarm';
        case 2:
            return 'Max alarm';
        case -1:
            return 'Low alarm';
        case -2:
            return 'Min alarm';
        default:
            return 'Error';                    
    }

}

async function fetch_json(url) {
    let response = await fetch(url);
    return await response.json();
}
async function fetch_text(url) {
    let response = await fetch(url);
    return await response.text();
}

function fill_zero(s) {
    switch (s.length) {
        case 1:
            return '0' + s;
        default:
            return s;
    }
}

function fill_zero_mili(s) {
    switch (s.length) {
        case 1:
            return '00' + s;
        // case 2:    
        default:
            return s;
    }
}

function serve_excel(overview, data){
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GOOSER';
    workbook.lastModifiedBy = 'GOOSER';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();
    // console.log(workbook);
    // const sheet_report = workbook.addWorksheet('General-Report');

    const worksheet = workbook.addWorksheet('Report',{properties:{tabColor:{argb:'FFC0000'}}});
    worksheet.headerFooter.oddFooter = "&L"+new Date().toLocaleString('en-GB')+"&CPage &P of &N";
    worksheet.columns = [
      { width: 11 },
      { width: 16},
    //   { width: 12,style: { numFmt: '0.000' }},
    ];


    worksheet.addRows(overview);
    // for (let r=13;r<xlsxTable.length+1;r++){
    //   for (let c of ['A','B','C','D','E','F']){
    //     worksheet.getCell(c+r).border = {top: {style:'thin'},left: {style:'thin'},bottom: {style:'thin'},right: {style:'thin'}};
    //   }
    // }
    const data_sheet = workbook.addWorksheet('Data',{properties:{tabColor:{argb:'007bff'}}});
    data_sheet.columns = [{ width: 18 },{ width: 18 },{ width: 18 }];
    data_sheet.addRow(['Time','Data', 'Status']);
    data_sheet.addRows(data);
    // let reportFileName = document.getElementById('reportdetail').checked?document.getElementById('historyFromTime').value+'--'+document.getElementById('historyToTime').value+'-report-detail.xlsx':
    // document.getElementById('historyFromTime').value+'--'+document.getElementById('historyToTime').value+'-report.xlsx'
    workbook.xlsx.writeBuffer().then((buffer)=>{saveAs(new Blob([buffer], {type: 'application/octet-stream'}),'reportFileName.xlsx');});
}