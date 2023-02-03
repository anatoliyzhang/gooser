// #![deny(warnings)]
use std::collections::HashMap;
use std::fs;
// use std::error::Error;
use std::str::FromStr;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

// use db::{query_devices, query_menus, query_dashboards};
use bytes::BufMut;
use futures_util::{SinkExt, StreamExt, TryFutureExt, TryStreamExt};

use serde_derive::Serialize;
use serde_json::Value;
use std::{time::SystemTime, time::UNIX_EPOCH};
use tokio::sync::{mpsc, RwLock};
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::hyper::Uri;
use warp::multipart::{FormData, Part};
use warp::ws::{Message, WebSocket};
use warp::{http, Filter, Rejection, Reply};
mod auth;
mod db;

/// Our global unique user id counter.
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

/// Our state of currently connected users.
///
/// - Key is their id
/// - Value is a sender of `warp::ws::Message`
type Users = Arc<RwLock<HashMap<usize, mpsc::UnboundedSender<Message>>>>;

#[derive(Serialize)]
struct Status {
    logged_in: bool,
}

async fn user_connected(ws: WebSocket, users: Users) {
    // Use a counter to assign a new unique ID for this user.
    let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);

    // eprintln!("new user: {}", my_id);

    // Split the socket into a sender and receive of messages.
    let (mut user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    let mut rx = UnboundedReceiverStream::new(rx);

    tokio::task::spawn(async move {
        while let Some(message) = rx.next().await {
            user_ws_tx
                .send(message)
                .unwrap_or_else(|e| {
                    eprintln!("websocket send error: {}", e);
                })
                .await;
        }
    });

    // Save the sender in our list of connected users.
    users.write().await.insert(my_id, tx);
    let mut is_agent = false;
    // Return a `Future` that is basically a state machine managing
    // this specific user's connection.

    // Every time the user sends a message, broadcast it to
    // all other users...
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(uid={}): {}", my_id, e);
                break;
            }
        };

        if msg.is_ping() {
            is_agent = true;
        }
        if is_agent && !msg.is_ping() {
            // println!("{:?}{:#?}",is_agent ,msg);
            let msg_clone = msg.clone();
            // println!("{:#?}",msg_clone);
            db::store_to_db(msg_clone.to_str().unwrap()).await;
            user_message(my_id, msg, &users).await;
        }
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(my_id, &users).await;
    // let my_id_index = agents.iter().position(|x| *x == my_id).unwrap();
    // agents.remove(my_id_index);
}

async fn user_message(my_id: usize, msg: Message, users: &Users) {
    // Skip any non-Text messages...
    let msg = if let Ok(s) = msg.to_str() {
        s
    } else {
        return;
    };

    let new_msg = format!("{}", msg);

    // New message from this user, send it to everyone else (except same uid)...
    for (&uid, tx) in users.read().await.iter() {
        if my_id != uid {
            if let Err(_disconnected) = tx.send(Message::text(new_msg.clone())) {
                // The tx is disconnected, our `user_disconnected` code
                // should be happening in another task, nothing more to
                // do here.
            }
        }
    }
}

async fn user_disconnected(my_id: usize, users: &Users) {
    // eprintln!("good bye user: {}", my_id);

    // Stream closed up, so remove from the user list
    users.write().await.remove(&my_id);
}

fn redirect_or_proceed(path: String, cookie: String) -> warp::reply::Response {
    if auth::verify_cookie(cookie.as_str()) {
        // let p = path.clone();
        // println!("cookie verified");
        let body = match fs::read_to_string(format!("./client/pages/{}.html", path)) {
            Ok(content) => content,
            Err(e) => e.to_string(),
        };

        // let res_body = warp::body::form(body);
        warp::reply::html(body).into_response()
    } else {
        // let q= path.clone();

        // println!("cookie NOT verified");
        warp::redirect::redirect(
            Uri::from_str(format!("/login?redirect=/admin/{}", path).as_str()).unwrap(),
        )
        .into_response()
    }
}

async fn upload(form: FormData, cookie: String) -> Result<impl Reply, Rejection> {
    if !auth::verify_cookie(cookie.as_str()) {
        return Err(warp::reject::reject());
    };
    let parts: Vec<Part> = form.try_collect().await.map_err(|e| {
        eprintln!("form error: {}", e);
        warp::reject::reject()
    })?;

    for pt in parts {
        if pt.name() == "map" {
            match pt.content_type().unwrap() {
                "image/svg+xml" => {}
                v => {
                    eprintln!("invalid file type found: {}", v);
                    return Err(warp::reject::reject());
                }
            }
            let file_name = pt.filename().unwrap();
            let file_name = format!("./client/public/map/{}", file_name);
            let value = pt
                .stream()
                .try_fold(Vec::new(), |mut vec, data| {
                    vec.put(data);
                    async move { Ok(vec) }
                })
                .await
                .map_err(|e| {
                    eprintln!("reading file error: {}", e);
                    warp::reject::reject()
                })?;
            // let prename = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string();
            // let file_name = format!("./client/public/map/{}", file_name);
            tokio::fs::write(&file_name, value).await.map_err(|e| {
                eprint!("error writing file: {}", e);
                warp::reject::reject()
            })?;
            
            // println!("created file: {}", file_name);
            // write to db
            // db::change_geomaps("insert", &db::GeoMap{id:0, name: todo!(), ext: todo!(), path: todo!(), x_max: todo!(), y_max: todo!(), z_max: todo!() });
        }
    }

    Ok("{\"message\":\"success\"}")
}

#[tokio::main]
async fn main() {
    // pretty_env_logger::init();

    // Keep track of all connected users, key is usize, value
    // is a websocket sender.
    // let dc = device_list.clone();
    let users = Users::default();
    // Turn our "state" into a new Filter...
    let users = warp::any().map(move || users.clone());
    // let mut agents: Vec<usize> = Vec::new();
    // GET /chat -> websocket upgrade
    let ws_broadcast = warp::path("broadcast")
        // The `ws()` filter will prepare Websocket handshake...
        .and(warp::ws())
        .and(users)
        .map(|ws: warp::ws::Ws, users| {
            // This will call our function if the handshake succeeds.
            ws.on_upgrade(move |socket| user_connected(socket, users))
        });

    // GET / -> index html .map(|| warp::reply::html(INDEX_HTML))
    let index = warp::path::end().and(warp::fs::file("./client/pages/index.html"));
    // let client_root_files = warp::path::end().and(warp::path::param::<String>()).and(warp::fs::dir("./client/"));
    // let fav_icon =  warp::path("favicon.ico").and(warp::path::end()).and(warp::fs::file("./client/favicon.ico"));
    // let history = warp::path("history.html").and(warp::path::end()).and(warp::fs::file("./client/history.html"));

    let pages = warp::path("pages").and(warp::fs::dir("./client/pages/"));
    let public_assets = warp::path("public").and(warp::fs::dir("./client/public/"));
    let dir_node_modules = warp::path("node_modules").and(warp::fs::dir("./client/node_modules/"));
    let api_prefix = warp::path!("api" / ..);
    let api_query_db =
        warp::path!("query" / String / String).map(|table: String, params: String| {
            match table.as_str() {
                "devices" => {
                    serde_json::to_string_pretty::<Vec<db::Device>>(&db::query_devices(&params))
                        .unwrap()
                }
                "channels" => serde_json::to_string_pretty::<Vec<db::Channel>>(
                    &db::query_channels(&params).as_ref(),
                )
                .unwrap(),
                "menus" => serde_json::to_string_pretty::<Vec<db::Menu>>(
                    &db::query_menus(&params).as_ref(),
                )
                .unwrap(),
                "displays" => serde_json::to_string_pretty::<Vec<db::Display>>(
                    &db::query_displays(&params).as_ref(),
                )
                .unwrap(),
                "dashboards" => serde_json::to_string_pretty::<Vec<db::Display>>(
                    &db::query_displays(&params).as_ref(),
                )
                .unwrap(),
                "grids" => serde_json::to_string_pretty::<Vec<db::Grid>>(
                    &db::query_grids(&params).as_ref(),
                )
                .unwrap(),
                "geomaps" => serde_json::to_string_pretty::<Vec<db::GeoMap>>(
                    &db::query_geomaps(&params).as_ref(),
                )
                .unwrap(),
                "users" => serde_json::to_string_pretty::<Vec<db::FullUser>>(
                    &db::query_users(&params).as_ref(),
                )
                .unwrap(),
                _ => "[]".to_string(),
            }
        });
    let api_change_devices = warp::path!("devices" / String)
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::header("cookie"))
        .map(|opr: String, device: db::Device, cookie: String| {
            if auth::verify_cookie(cookie.as_str()) {
                // serde_json::to_string_pretty::<db::Device>(&db::insert_device(&device)).unwrap()
                match db::change_devices(opr.as_str(), &device) {
                    Ok(affected) => {
                        warp::reply::with_status(affected.to_string(), http::StatusCode::OK)
                            .into_response()
                    }
                    Err(e) => warp::reply::with_status(
                        e.to_string(),
                        http::StatusCode::INTERNAL_SERVER_ERROR,
                    )
                    .into_response(),
                }
            } else {
                warp::reply::with_status("401", http::StatusCode::UNAUTHORIZED).into_response()
                // warp::redirect::redirect(Uri::from_str(&format!("/login?redirect=/admin/{}.html",table.as_str())).unwrap()).into_response()
            }
        });
    let api_change_channels = warp::path!("channels" / String)
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::header("cookie"))
        .map(|opr: String, channel: db::Channel, cookie: String| {
            if auth::verify_cookie(cookie.as_str()) {
                match db::change_channels(opr.as_str(), &channel) {
                    Ok(affected) => {
                        warp::reply::with_status(affected.to_string(), http::StatusCode::OK)
                            .into_response()
                    }
                    Err(e) => warp::reply::with_status(
                        e.to_string(),
                        http::StatusCode::INTERNAL_SERVER_ERROR,
                    )
                    .into_response(),
                }
            } else {
                warp::reply::with_status("401", http::StatusCode::UNAUTHORIZED).into_response()
                // warp::redirect::redirect(Uri::from_str(&format!("/login?redirect=/admin/{}.html",table.as_str())).unwrap()).into_response()
            }
        });
    let api_change_displays = warp::path!("displays" / String)
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::header("cookie"))
        .map(|opr: String, display: db::Display, cookie: String| {
            if auth::verify_cookie(cookie.as_str()) {
                match db::change_displays(opr.as_str(), &display) {
                    Ok(affected) => {
                        warp::reply::with_status(affected.to_string(), http::StatusCode::OK)
                            .into_response()
                    }
                    Err(e) => warp::reply::with_status(
                        e.to_string(),
                        http::StatusCode::INTERNAL_SERVER_ERROR,
                    )
                    .into_response(),
                }
            } else {
                warp::reply::with_status("401", http::StatusCode::UNAUTHORIZED).into_response()
                // warp::redirect::redirect(Uri::from_str(&format!("/login?redirect=/admin/{}.html",table.as_str())).unwrap()).into_response()
            }
        });

    let api_change_grids = warp::path!("grids" / String)
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::header("cookie"))
        .map(|opr: String, grid: db::Grid, cookie: String| {
            if auth::verify_cookie(cookie.as_str()) {
                match db::change_grids(opr.as_str(), &grid) {
                    Ok(affected) => {
                        warp::reply::with_status(affected.to_string(), http::StatusCode::OK)
                            .into_response()
                    }
                    Err(e) => warp::reply::with_status(
                        e.to_string(),
                        http::StatusCode::INTERNAL_SERVER_ERROR,
                    )
                    .into_response(),
                }
            } else {
                warp::reply::with_status("401", http::StatusCode::UNAUTHORIZED).into_response()
                // warp::redirect::redirect(Uri::from_str(&format!("/login?redirect=/admin/{}.html",table.as_str())).unwrap()).into_response()
            }
        });
    let api_change_geomaps = warp::path!("geomaps" / String)
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::header("cookie"))
        .map(|opr: String, geomap: db::GeoMap, cookie: String| {
            if auth::verify_cookie(cookie.as_str()) {
                match db::change_geomaps(opr.as_str(), &geomap) {
                    Ok(affected) => {
                        warp::reply::with_status(affected.to_string(), http::StatusCode::OK)
                            .into_response()
                    }
                    Err(e) => warp::reply::with_status(
                        e.to_string(),
                        http::StatusCode::INTERNAL_SERVER_ERROR,
                    )
                    .into_response(),
                }
            } else {
                warp::reply::with_status("401", http::StatusCode::UNAUTHORIZED).into_response()
                // warp::redirect::redirect(Uri::from_str(&format!("/login?redirect=/admin/{}.html",table.as_str())).unwrap()).into_response()
            }
        });
    let api_status = warp::path!("status")
        .and(warp::get())
        .and(warp::header("cookie"))
        .map(|cookie: String| {
            if auth::verify_cookie(cookie.as_str()) {
                warp::reply::json(&Status { logged_in: true })
            } else {
                warp::reply::json(&Status { logged_in: false })
            }
        });

    let upload_route = warp::path("upload")
        .and(warp::post())
        .and(warp::multipart::form().max_length(5_000_000))
        .and(warp::header("cookie"))
        .and_then(upload);
    // let api_params = warp::path!(String / String).map(|arg1: String, arg2:String| match arg1.as_str() {
    //     "dashboard" => "{json}",
    //     _ => "abc",
    // });
    // let api_dashboards = warp::path!("dashboards").map(|| query_db());
    let login_page = warp::path!("login")
        .and(warp::get())
        .and(warp::fs::file("./client/pages/login.html"));
    let login_post = warp::path!("login")
        .and(warp::post())
        .and(warp::body::json())
        .map(|user: auth::user::User| {
            if auth::verify_user(&user) {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64;
                let token = auth::gen_token(&user);
                let mut set_map = HashMap::new();
                set_map.insert("token", Value::String(token.clone()));
                set_map.insert("last_logged_in", Value::Number(now.into()));
                db::update(
                    "users",
                    set_map,
                    vec![&format!("username='{}'", &user.username)],
                );
                warp::reply::with_header(
                    token.clone(),
                    "set-cookie",
                    format!(
                        "token={}; path=/; Max-Age=86400; SameSite=Lax; HttpOnly",
                        token
                    ),
                )
                .into_response()
            } else {
                warp::reply::with_status("401", http::StatusCode::UNAUTHORIZED).into_response()
            }
        });
    let logout = warp::path!("logout").and(warp::get()).map(|| {
        warp::reply::with_header(
            "{\"logout\": true}",
            "set-cookie",
            "token=null; path=/; Max-Age=86400; SameSite=Lax; HttpOnly",
        )
        .into_response()
    });
    let admin = warp::path!("admin")
        .and(warp::get())
        .and(warp::header("cookie"))
        .map(|cookie: String| redirect_or_proceed("admin".to_string(), cookie));
    //    .and(warp::fs::file("./client/pages/admin.html"));
    let admin_manage = warp::path!("admin" / String)
        .and(warp::get())
        .and(warp::header("cookie"))
        .map(|path: String, cookie: String| redirect_or_proceed(path, cookie));
    let route_history = warp::path!("history"/ u64 / u64 / u32)
                        .and(warp::get())
                        .map(|from:u64, to:u64, channel_id:u32| serde_json::to_string_pretty::<Vec<db::History>>(
                            &db::query_history(from,to,channel_id).as_ref(),
                        )
                        .unwrap());
    let api = api_prefix
        .and(api_query_db)
        .or(api_prefix.and(api_status))
        .or(api_prefix.and(api_change_devices))
        .or(api_prefix.and(api_change_channels))
        .or(api_prefix.and(api_change_displays))
        .or(api_prefix.and(api_change_grids))
        .or(api_prefix.and(api_change_geomaps));
    let route_devices = warp::path!("devices").map(|| {
        serde_json::to_string_pretty::<Vec<db::Device>>(&db::get_device_with_channels("1")).unwrap()
    });
    let route_devices_by_host = warp::path!("devices" / String).map(|host: String| {
        serde_json::to_string_pretty::<Vec<db::Device>>(&db::get_device_with_channels(&host))
            .unwrap()
    });
    let routes = index
        .or(api)
        .or(public_assets)
        .or(pages)
        .or(dir_node_modules)
        .or(route_devices)
        .or(route_devices_by_host)
        .or(route_history)
        .or(login_page)
        .or(login_post)
        .or(logout)
        .or(admin)
        .or(admin_manage)
        .or(upload_route)
        .or(ws_broadcast);

    warp::serve(routes).run(([0, 0, 0, 0], 4000)).await;
}
