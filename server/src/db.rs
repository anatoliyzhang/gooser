use chrono::{DateTime, Datelike, Utc};
use rusqlite::{params, Connection};
use serde_derive::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sql_builder::SqlBuilder;
use std::{collections::HashMap, time::Duration, time::UNIX_EPOCH};

// static  CONN: rusqlite::Connection = Connection::open("system").unwrap();
pub fn query_devices(params: &str) -> Vec<Device> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from devices WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut devices = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        // devices.push(Value::from(row));
        devices.push(Device {
            id: row.get_unwrap(0),
            address: row.get_unwrap(1),
            serial_number: row.get_unwrap(2),
            manufacturer: row.get_unwrap(3),
            name: row.get_unwrap(4),
            description: row.get_unwrap(5),
            protocol: row.get_unwrap(6),
            agent_host: row.get_unwrap(7),
            baud_rate: row.get_unwrap(8),
            parity: row.get_unwrap(9),
            function_code: row.get_unwrap(10),
            stop_bit: row.get_unwrap(11),
            start_address: row.get_unwrap(12),
            data_type: row.get_unwrap(13),
            enabled: row.get_unwrap(14),
            channels: vec![],
        });
    }
    devices
}

pub fn query_channels(params: &str) -> Vec<Channel> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from channels WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut channels = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        channels.push(Channel {
            id: row.get_unwrap(0),
            device_id: row.get_unwrap(1),
            name: row.get_unwrap(2),
            description: row.get_unwrap(3),
            group_name: row.get_unwrap(4),
            measure_unit: row.get_unwrap(5),
            min_alarm: row.get_unwrap(6),
            low_alarm: row.get_unwrap(7),
            high_alarm: row.get_unwrap(8),
            max_alarm: row.get_unwrap(9),
            scale: row.get_unwrap(10),
            geo: row.get_unwrap(11),
        });
    }
    channels
}

pub fn query_menus(params: &str) -> Vec<Menu> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from menus WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut menus = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        menus.push(Menu {
            id: row.get_unwrap(0),
            name: row.get_unwrap(1),
            href: row.get_unwrap(2),
            parent: row.get_unwrap(3),
            auto: row.get_unwrap(4),
            display_kind: row.get_unwrap(5),
            weight: row.get_unwrap(6),
            icon_class: row.get_unwrap(7),
        });
    }
    menus
}

pub fn query_displays(params: &str) -> Vec<Display> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from displays WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut displays = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        displays.push(Display {
            id: row.get_unwrap(0),
            name: row.get_unwrap(1),
            description: row.get_unwrap(2),
            kind: row.get_unwrap(3),
            grids: vec![],
        });
    }
    displays
}

pub fn query_grids(params: &str) -> Vec<Grid> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from grids WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut grids = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        grids.push(Grid {
            id: row.get_unwrap(0),
            display_id: row.get_unwrap(1),
            x: row.get_unwrap(2),
            y: row.get_unwrap(3),
            w: row.get_unwrap(4),
            h: row.get_unwrap(5),
            widget_type: row.get_unwrap(6),
            widget_option: row.get_unwrap(7),
            widget_title: row.get_unwrap(8),
            widget_min: row.get_unwrap(9),
            widget_max: row.get_unwrap(10),
            widget_series: row.get_unwrap(11),
            x_axis: row.get_unwrap(12),
            y_axis: row.get_unwrap(13),
            geomap_id: row.get_unwrap(14),
        });
    }
    grids
}

pub fn query_geomaps(params: &str) -> Vec<GeoMap> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from geomaps WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut geomaps = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        geomaps.push(GeoMap {
            id: row.get_unwrap(0),
            name: row.get_unwrap(1),
            ext: row.get_unwrap(2),
            path: row.get_unwrap(3),
            x_max: row.get_unwrap(4),
            y_max: row.get_unwrap(5),
            z_max: row.get_unwrap(6),
        });
    }
    geomaps
}

pub fn query_users(params: &str) -> Vec<FullUser> {
    let conn = Connection::open("system").unwrap();
    let sql = format!("SELECT * from users WHERE {}", params);
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut users = Vec::new();
    while let Some(row) = rows.next().unwrap() {
        users.push(FullUser {
            id: row.get_unwrap(0),
            username: row.get_unwrap(1),
            password: row.get_unwrap(2),
            token: row.get_unwrap(3),
            last_logged_in: row.get_unwrap(4),
        });
    }
    users
}
// pub fn query_general (table: &str, params: &str) ->Vec<T>{
//     let conn = Connection::open("system").unwrap();
//     let sql = format!("SELECT * FROM {} WHERE {}", table, params);
//     let mut stmt = conn.prepare(&sql).unwrap();

//     let mut rows = stmt.query([]).unwrap();
//     let mut result = Vec::new();
//     while let Some(row) = rows.next().unwrap() {
//         // row.clone_into(target)
//         // let r = BigTuple::try_from(row);
//         result.push(T::try_from(row));
//     }
//     result
// println!("{:?}",result);
// }
pub fn query_history(from: u64, to: u64, channel_id: u32) -> Vec<History> {
    // let timestamp = data.get("timestamp").unwrap().as_u64().unwrap();
    let datetime_from = DateTime::<Utc>::from(UNIX_EPOCH + Duration::from_millis(from));
    let datetime_to = DateTime::<Utc>::from(UNIX_EPOCH + Duration::from_millis(to));
    let mut databases = vec![];
    let mut years = vec![];
    for year_diff in 0..=(datetime_to.year() - datetime_from.year()) {
        years.push(datetime_from.year() + year_diff);
    }
    // println!("{:?}",&years);
    // let conn = Connection::open("system").unwrap();
    for (i, year) in years.iter().enumerate() {
        if i == 0 && years.len() - 1 != 0 {
            for month in datetime_from.month()..=12 {
                databases.push(format!("{}{}", year, month));
            }
        } else if i == years.len() - 1 && i != 0 {
            for month in 1..=datetime_to.month() {
                databases.push(format!("{}{}", year, month));
            }
        } else if i == 0 && i == years.len() - 1 {
            for month in datetime_from.month()..=datetime_to.month() {
                databases.push(format!("{}{}", year, month));
            }
        } else {
            for month in 1..=12 {
                databases.push(format!("{}{}", year, month));
            }
        }
    }

    println!("{:?}", databases);
    let mut history_result = Vec::new();
    for db in databases {
        let conn = Connection::open(format!("./data/history{}.db", db)).unwrap();
        let sql_query = format!(
            "SELECT * FROM channel_{} WHERE timestamp > {} AND timestamp < {};",
            channel_id, from, to
        );
        println!("{}",sql_query);
        let stmt = conn.prepare(&sql_query);
        match stmt {
            Ok(mut statement) => {
                let rows = statement.query([]);
                match rows {
                    Ok(mut rows_ok) => {
                        while let Some(row) = &mut rows_ok.next().unwrap() {
                            history_result.push(History {
                                id: row.get_unwrap(0),
                                timestamp: row.get_unwrap(1),
                                data: row.get_unwrap(2),
                                status: row.get_unwrap(3),
                                channel_id: channel_id,
                            });
                        }
                    }
                    Err(_) => {}
                }
            }
            Err(_) => {
                // eprint!("{}", e);
            }
        }
    }

    history_result
    // vec![History{
    //     id:0,
    //     timestamp:0,
    //     data:0.0,
    //     status:0,
    //     channel_id:0
    // }]
}

pub fn get_device_with_channels(params: &str) -> Vec<Device> {
    let mut devices = query_devices(params);
    for device in devices.iter_mut() {
        device.channels = query_channels(format!("device_id={}", device.id).as_str())
    }
    devices
}

pub fn update(table: &str, sets: HashMap<&str, Value>, condition: Vec<&str>) -> usize {
    let conn = Connection::open("system").unwrap();
    let mut sql_builder = SqlBuilder::update_table(table);
    for (k, v) in sets {
        sql_builder.set(k, v);
    }
    for cond in condition {
        sql_builder.and_where(cond);
    }
    let sql = sql_builder.sql().unwrap();
    match conn.execute(&sql, []) {
        Ok(updated) => updated,
        Err(e) => {
            eprint!("{}", e);
            0
        }
    }
}

pub fn change_devices(opr: &str, device: &Device) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open("system").unwrap();
    match opr {
        "insert" => conn.execute(
            "INSERT INTO devices (address,serial_number,manufacturer,name,description,protocol,agent_host,baud_rate,parity,function_code,stop_bit,start_address,data_type,enabled) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14);",
            params![device.address,device.serial_number,device.manufacturer,device.name,device.description,device.protocol,device.agent_host,
            device.baud_rate,device.parity,device.function_code,device.stop_bit,device.start_address,device.data_type,device.enabled],
        ),
        "update" => conn.execute("UPDATE devices SET address=?1,
                        serial_number=?2,
                        manufacturer=?3,
                        name=?4,
                        description=?5,
                        protocol=?6,
                        agent_host=?7,
                        baud_rate=?8,
                        parity=?9,
                        function_code=?10,
                        stop_bit=?11,
                        start_address=?12,
                        data_type=?13,
                        enabled=?14 WHERE id=?15",
                        params![device.address,device.serial_number,device.manufacturer,device.name,device.description,device.protocol,device.agent_host,
                        device.baud_rate,device.parity,device.function_code,device.stop_bit,device.start_address,device.data_type,device.enabled, device.id],),
        "delete" => conn.execute("DELETE FROM devices WHERE id=?1", params![device.id]),
        _ => Err(rusqlite::Error::ExecuteReturnedResults)
    }
}

pub fn change_channels(opr: &str, channel: &Channel) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open("system").unwrap();
    match opr {
        "insert" => conn.execute(
            "INSERT INTO channels (device_id,name,description,group_name,measure_unit,min_alarm,low_alarm,high_alarm,max_alarm,scale,geo) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11);",
            params![channel.device_id,channel.name,channel.description,channel.group_name,channel.measure_unit,channel.min_alarm,channel.low_alarm,channel.high_alarm,channel.max_alarm,channel.scale,channel.geo],
        ),
        "update" => conn.execute("UPDATE channels SET device_id=?1,
                        name=?2,
                        description=?3,
                        group_name=?4,
                        measure_unit=?5,
                        min_alarm=?6,
                        low_alarm=?7,
                        high_alarm=?8,
                        max_alarm=?9,
                        scale=?10,
                        geo=?11 WHERE id=?12",
                        params![channel.device_id,channel.name,channel.description,channel.group_name,channel.measure_unit,channel.min_alarm,channel.low_alarm,channel.high_alarm,channel.max_alarm,channel.scale,channel.geo,channel.id],),
        "delete" => conn.execute("DELETE FROM channels WHERE id=?1", params![channel.id]),
        _ => Err(rusqlite::Error::ExecuteReturnedResults)
    }
}

pub fn change_displays(opr: &str, display: &Display) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open("system").unwrap();
    match opr {
        "insert" => conn.execute(
            "INSERT INTO displays (name,description,kind) 
            VALUES (?1, ?2, ?3);",
            params![display.name, display.description, display.kind],
        ),
        "update" => conn.execute(
            "UPDATE displays SET name=?1,
                        description=?2,
                        kind=?3 WHERE id=?4",
            params![display.name, display.description, display.kind, display.id],
        ),
        "delete" => conn.execute("DELETE FROM displays WHERE id=?1", params![display.id]),
        _ => Err(rusqlite::Error::ExecuteReturnedResults),
    }
}

pub fn change_grids(opr: &str, grid: &Grid) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open("system").unwrap();
    match opr {
        "insert" => conn.execute(
            "INSERT INTO grids (display_id,x,y,w,h,widget_type,widget_option,widget_title,widget_min,widget_max,widget_series,x_axis,y_axis,geomap_id) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14);",
            params![grid.display_id,grid.x,grid.y,grid.w,grid.h,grid.widget_type,grid.widget_option,grid.widget_title,grid.widget_min,grid.widget_max,grid.widget_series,grid.x_axis,grid.y_axis,grid.geomap_id],
        ),
        "update" => conn.execute("UPDATE grids SET display_id=?1,
                        x=?2,
                        y=?3,
                        w=?4,
                        h=?5,
                        widget_type=?6,
                        widget_option=?7,
                        widget_title=?8,
                        widget_min=?9,
                        widget_max=?10,
                        widget_series=?11,
                        x_axis=?12,
                        y_axis=?13,
                        geomap_id=?14 WHERE id=?15",
                        params![grid.display_id,grid.x,grid.y,grid.w,grid.h,grid.widget_type,grid.widget_option,grid.widget_title,grid.widget_min,grid.widget_max,grid.widget_series,grid.x_axis,grid.y_axis,grid.geomap_id,grid.id],),
        "delete" => conn.execute("DELETE FROM grids WHERE id=?1", params![grid.id]),
        _ => Err(rusqlite::Error::ExecuteReturnedResults)
    }
}

pub fn change_geomaps(opr: &str, geomap: &GeoMap) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open("system").unwrap();
    match opr {
        "insert" => conn.execute(
            "INSERT INTO geomaps (name,ext,path,x_max,y_max,z_max) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params![
                geomap.name,
                geomap.ext,
                geomap.path,
                geomap.x_max,
                geomap.y_max,
                geomap.z_max
            ],
        ),
        "update" => conn.execute(
            "UPDATE geomaps SET name=?1,
                        ext=?2,
                        path=?3,
                        x_max=?4,
                        y_max=?5,
                        z_max=?6 WHERE id=?7",
            params![
                geomap.name,
                geomap.ext,
                geomap.path,
                geomap.x_max,
                geomap.y_max,
                geomap.z_max,
                geomap.id
            ],
        ),
        "delete" => conn.execute("DELETE FROM geomaps WHERE id=?1", params![geomap.id]),
        _ => Err(rusqlite::Error::ExecuteReturnedResults),
    }
}

pub async fn store_to_db(msg: &str) {
    // println!("{}",json!(msg).is_string());
    // Map<String,Value>
    if let Ok(data) = serde_json::from_str::<Map<String, Value>>(msg) {
        // println!("{:#?}",data);
        let timestamp = data.get("timestamp").unwrap().as_u64().unwrap();
        let datetime = DateTime::<Utc>::from(UNIX_EPOCH + Duration::from_millis(timestamp));
        let devices_data = data.get("data").unwrap().as_array().unwrap();
        let devices_status = data.get("status").unwrap().as_array().unwrap();
        let devices_channels = data.get("channels").unwrap().as_array().unwrap();

        if devices_channels.len() != devices_data.len() {
            return;
        };

        let conn = Connection::open(format!(
            "./data/history{}{}.db",
            datetime.year(),
            datetime.month()
        ))
        .unwrap();
        for (channel_id_pos, channel_id_value) in devices_channels.iter().enumerate() {
            let channel_id = channel_id_value.as_u64().unwrap();
            // let test = devices_data.get(channel_id_pos).unwrap();
            // println!("{}",test);
            let channel_data = devices_data.get(channel_id_pos).unwrap().as_f64().unwrap();
            let channel_status = devices_status
                .get(channel_id_pos)
                .unwrap()
                .as_i64()
                .unwrap();
            let sql_create_table = format!("CREATE TABLE IF NOT EXISTS channel_{} (id integer primary key autoincrement, timestamp integer, data real, status integer);",channel_id);
            // println!("{}",sql_create_table);
            match conn.execute(&sql_create_table, []) {
                Ok(_) => {
                    let sql_insert = format!(
                        "INSERT INTO channel_{} (timestamp, data, status) VALUES ({},{},{});",
                        channel_id, timestamp, channel_data, channel_status
                    );
                    match conn.execute(&sql_insert, []) {
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("{}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("{}", e);
                }
            }
        }

        // let sql_create_table ="CREATE TABLE IF NOT EXISTS history (id integer primary key autoincrement, timestamp integer, data text, status text, devices text);";
        // match conn.execute(sql_create_table, []){
        //     Ok(_) => {
        //         let sql_insert = format!("INSERT INTO history (timestamp, data, status, devices) VALUES ({},'{}','{}','{}');", timestamp,devices_data,devices_status,devices);
        //         match conn.execute(&sql_insert, []) {
        //             Ok(_) => {},
        //             Err(e) => {eprintln!("{}", e);},
        //         }
        //     },
        //     Err(e) => {eprintln!("{}", e);}
        // }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Channel {
    id: u32,
    device_id: u32,
    name: String,
    description: String,
    group_name: String,
    measure_unit: String,
    min_alarm: f64,
    low_alarm: f64,
    high_alarm: f64,
    max_alarm: f64,
    scale: f64,
    geo: String,
}

#[derive(Serialize, Deserialize)]
pub struct Display {
    id: u32,
    name: String,
    description: String,
    kind: String,
    grids: Vec<Grid>,
}
#[derive(Serialize, Deserialize)]
pub struct Device {
    id: u32,
    address: u8,
    serial_number: String,
    manufacturer: String,
    name: String,
    description: String,
    protocol: String,
    agent_host: String,
    baud_rate: u32,
    parity: u8,
    function_code: u8,
    stop_bit: u8,
    start_address: u32,
    data_type: String,
    enabled: u8,
    channels: Vec<Channel>,
}
#[derive(Serialize, Deserialize)]
pub struct GeoMap {
    pub id: u32,
    pub name: String,
    pub ext: String,
    pub path: String,
    pub x_max: f64,
    pub y_max: f64,
    pub z_max: f64,
}
#[derive(Serialize, Deserialize)]
pub struct Grid {
    id: u32,
    display_id: u32,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    widget_type: String,
    widget_option: String,
    widget_title: String,
    widget_min: f64,
    widget_max: f64,
    widget_series: String,
    x_axis: String,
    y_axis: String,
    geomap_id: u32,
}

#[derive(Serialize, Deserialize)]
pub struct Menu {
    id: u32,
    name: String,
    href: String,
    parent: u32,
    auto: u8,
    display_kind: String,
    weight: u32,
    icon_class: String,
}

#[derive(Serialize, Deserialize)]
pub struct FullUser {
    id: u32,
    username: String,
    password: String,
    token: String,
    last_logged_in: u64,
}

#[derive(Serialize, Deserialize)]
pub struct History {
    id: u32,
    timestamp: u64,
    data: f64,
    status: i64,
    channel_id: u32,
}
