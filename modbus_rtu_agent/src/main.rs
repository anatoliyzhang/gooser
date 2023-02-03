#![warn(clippy::pedantic)]
#![allow(clippy::let_underscore_drop)]
// #![windows_subsystem = "windows"]

// use dotenv::dotenv;
use futures_util::sink::SinkExt;
// use futures_util::StreamExt;
use config::Config;
use serde_derive::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::{time::Duration, time::SystemTime, time::UNIX_EPOCH};
use tokio::time::sleep;
use tokio_modbus::prelude::*;
use tokio_serial::SerialStream;
use ureq;
use websocket_lite::{Message, Result};
use local_ip_address::{local_ip};
use rand::prelude::*;

#[derive(Debug, Serialize, Deserialize)]
struct Device {
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
    start_address: u16,
    data_type: String,
    enabled: u8,
    channels: Vec<Channel>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Channel {
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

fn fill_zero(hex: &u16) -> String {
    let hex_string = format!("{:x}", hex);
    match hex_string.len() {
        4 => hex_string,
        3 => format!("0{}", hex_string),
        2 => format!("00{}", hex_string),
        1 => format!("000{}", hex_string),
        0 => format!("{}", "0000"),
        _ => hex_string,
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let settings = Config::builder()
        // Add in `./settings.toml`
        .add_source(config::File::with_name("./settings.toml"))
        // Add in settings from the environment (with a prefix of APP)
        // Eg.. `APP_DEBUG=1 ./target/app` would set the `debug` key
        .add_source(config::Environment::with_prefix("APP"))
        .build()
        .unwrap()
        .try_deserialize::<HashMap<String, String>>()
        .unwrap();
    let http_server_address = settings.get("HTTP_SERVER_ADDRESS").unwrap();
    let ws_server_address = settings.get("WS_SERVER_ADDRESS").unwrap();
    let dev_path = settings.get("DEV_PATH").unwrap();
    let baud_rate = settings.get("BAUD_RATE").unwrap().parse()?;
    let interval_s = settings.get("INTERVAL_S").unwrap().parse()?;
    let interval_mili = settings.get("INTERVAL_MILI").unwrap().parse()?;
    let ws_builder = websocket_lite::ClientBuilder::new(ws_server_address)?;
    let my_local_ip = local_ip().unwrap();
    // let my_ip_where = match http_server_address.as_str() {
    //     "http://127.0.0.1:4000" => format!("agent_host={} or agent_host='localhost'",my_local_ip),
    //     "http://localhost:4000" => format!("agent_host={} or agent_host='localhost'",my_local_ip),
    //     _ =>  format!("agent_host={}",my_local_ip)
    // };
    let body: String = ureq::get(format!("{}/devices/agent_host='{}'", http_server_address, my_local_ip.to_string()).as_str())
        // .set("Example-Header", "header value")
        .call()?
        .into_string()?;
    let devices: Vec<Device> = serde_json::from_str(&body).unwrap();
    let mut ws_stream = ws_builder.async_connect().await?;
    let _ = ws_stream.send(Message::ping("Carter")).await;
    // ws_stream.next().await;
    // let mut devices: Vec<Device> = Vec::new();
    // if let Some(msg) = ws_stream.next().await {
    //     if let Ok(m) = msg {
    //         match m.opcode() {
    //             Opcode::Text => {
    //                 let text = m.as_text().unwrap();
    //                 devices = serde_json::from_str(text).unwrap();
    //             }
    //             Opcode::Ping => ws_stream.send(Message::pong(m.into_data())).await?,
    //             Opcode::Close => {
    //                 let _ = ws_stream
    //                     .send(Message::close(Some((1, "reason".to_string()))))
    //                     .await;
    //                 // break;
    //             }
    //             Opcode::Pong | Opcode::Binary => {}
    //         }
    //     } else {
    //         let _ = ws_stream
    //             .send(Message::close(Some((2, "reason".to_string()))))
    //             .await;
    //         // break;
    //     }
    // }

    let serial_port_builder = tokio_serial::new(dev_path, baud_rate);
    let port = SerialStream::open(&serial_port_builder).unwrap();
    let slave = Slave(0);
    let mut ctx = rtu::connect_slave(port, slave).await?;

    loop {
        let mut result = Map::new();
        // let mut result_device = Map::new();
        // let mut result_devices_list = Vec::new();
        let mut result_devices_channels = Vec::new();
        let mut result_data = Vec::new();
        let mut result_status = Vec::new();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        for device in devices.iter() {
            let device_channel_count = device.channels.len() as u16;
            ctx.set_slave(Slave(device.address));
            // println!("Reading a sensor value on {} @ {}", device.name,&device.id);
            
            let rsp_raw = match device.function_code {
                // for data type Float abcd, it reads twice the length of a value, then combine them into 1 hex string,
                // then convert the hex string to a float 32 number.
                // it is required by the device it self, for the device stores one float value in two addresses, you should take the values in the 2 address
                // then combine them into one value, and convert it to a real value you want.
                3 => {
                    match device.data_type.as_str() {
                        "FLOAT:ABCD" => {
                            let double_decimal = ctx
                                .read_holding_registers(
                                    device.start_address,
                                    device_channel_count * 2,
                                )
                                .await
                                .unwrap();
                            let mut values = Vec::new();
                            for i in 0..usize::from(device_channel_count) {
                                // let current_channel = device.channels.get(i).unwrap();
                                let double_hex = format!(
                                    "{}{}",
                                    fill_zero(double_decimal.get(i * 2).unwrap()),
                                    fill_zero(double_decimal.get(i * 2 + 1).unwrap())
                                );
                                // let double_hex_db = format!("{:x} {:x}",double_decimal.get(i*2).unwrap(),double_decimal.get(i*2+1).unwrap());
                                // println!("{}",double_hex_db);
                                let bits = u32::from_str_radix(&double_hex, 16).unwrap();
                                let float = f32::from_bits(bits);
                                values.push(json!(float));
                            }
                            values
                        }
                        _ => ctx
                            .read_holding_registers(device.start_address, device_channel_count)
                            .await
                            .unwrap()
                            .into_iter()
                            .map(|v| json!(f32::from(v)))
                            .collect(),
                    }

                    // double_decimal.get(i*2).unwrap()
                }
                4 => ctx
                    .read_input_registers(device.start_address, device_channel_count)
                    .await
                    .unwrap()
                    .into_iter()
                    .map(|v| json!(f32::from(v)))
                    .collect(),
                _ => ctx
                    .read_holding_registers(device.start_address, device_channel_count)
                    .await
                    .unwrap()
                    .into_iter()
                    .map(|v| json!(f32::from(v)))
                    .collect(),
            };
            // println!("{:?}",rsp_raw);
            // let mut rsp_scaled = Vec::new();
            // let mut rsp_status = Vec::new();

            for (i, v) in rsp_raw.iter().enumerate() {
                let current_channel = device.channels.get(i).unwrap();
                // random for test purpose
                let rnd:u8 = random();
                let v_scaled = v.as_f64().unwrap() * current_channel.scale * (rnd as f64) / 150.0f64;
                // rsp_scaled.push(json!(v_scaled));
                result_data.push(v_scaled);
                let status_code = match v_scaled {
                    x if x > current_channel.low_alarm && x < current_channel.high_alarm => 0,
                    x if x >= current_channel.high_alarm && x < current_channel.max_alarm => 1,
                    x if x >= current_channel.max_alarm => 2,
                    x if x > current_channel.min_alarm && x <= current_channel.low_alarm => -1,
                    x if x <= current_channel.min_alarm => -2,
                    _ => 3,
                };
                // println!("{}:{:?}",v_scaled,status_code);
                // rsp_status.push(json!(status_code));
                result_status.push(status_code);
            }
            // result_data.push(value)
            // let rsp = ctx.read_holding_registers(0, 2).await?;
            // println!("Current device index is: {:?}", index);
            // let rsp_scaled = rsp_raw.iter().enumerate().map(|(i,v)| json!(v.as_f64().unwrap() * device.channels.get(i).unwrap().scale) ).collect::<Vec<_>>();
            // let alarm = rsp_scaled.iter().map(|v| ).collect();
            // result.insert(device.id.to_string(), Value::Array(rsp_raw));
            // result_device.insert("id".to_string(), Value::String(device.id.to_string()));
            // result_device.insert("data".to_string(), Value::Array(rsp_scaled));
            // result_device.insert("status".to_string(), Value::Array(rsp_status));
            // result_device.insert("timestamp".to_string(),now.into());
            // result_device.insert("agent".to_string(), Value::String("ModbusAgent".to_string()));
            // result_devices_list.push(result_device.to_owned());
            // result.push(result_device.to_owned());
            for channel in device.channels.iter(){
                result_devices_channels.push(channel.id);
            }
            // result_devices_list.push(device.id);
            
        }
        result.insert("timestamp".to_string(), Value::Number(now.into()));
        // result.insert("payload".to_string(), json!(result_devices_list));
        result.insert("data".to_string(), result_data.into());
        result.insert("status".to_string(), result_status.into());
        // result.insert("devices".to_string(), result_devices_list.into());
        result.insert("channels".to_string(), result_devices_channels.into());
        // println!("{:?}",result);
        // println!("timestamp: {:#?}",f32::from(SystemTime::now().duration_since(time::UNIX_EPOCH).unwrap().as_millis()));
        // result.insert(
        //     "devices".to_string(),
        //     Value::Array(devices_result_list)
        // );

        // write the result into Database? No let's store it @ the server side.

        // send the result, without handling the possible error
        match ws_stream
            .send(Message::text(
                serde_json::to_string_pretty(&result).unwrap(),
            ))
            .await
        {
            Ok(_) => {}
            Err(e) => {
                println!("{}", e);
                break;
            }
        }
        result.clear();

        sleep(Duration::new(interval_s, interval_mili)).await;
    }
    Ok(())
}
