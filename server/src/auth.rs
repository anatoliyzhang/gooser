// use serde_derive::{Serialize, Deserialize};
use regex::Regex;
// use serde_json::json;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use std::{time::SystemTime, time::UNIX_EPOCH,};
use crate::db;
pub mod user;

pub fn verify_user(user: &user::User) -> bool {
    let user_query_result = db::query_users(&format!("username=\'{}\' AND password=\'{}\';",user.username,user.password));
    // println!("{}",user_query_result);
    user_query_result.len() > 0
    // true
}

pub fn gen_token(_user: &user::User) -> String{
    let mut s = DefaultHasher::new();
    // user.username.hash(&mut s);
    // "1".hash(s);
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
    now.hash(&mut s);
    s.finish().to_string()
}

pub fn verify_token(token: &str) -> bool {
    // let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
    // let token_query_result = db::query_users(&format!("token={} AND last_logged_in > {}",token, now - 86400000));
    let token_query_result = db::query_users(&format!("token={}",token));
    token_query_result.len() > 0
}


pub fn verify_cookie(cookie: &str) -> bool {
    // match the token string
    let re = Regex::new(r".*token=(?P<token>.+)").unwrap();
    println!("cookie is: {}", cookie);
    let caps = re.captures(cookie);
    // println!("{:#?}",caps);
    match caps {
        Some(caped) => verify_token(&caped["token"]),
        None => false
    }
    // cookie.contains("token")
    
}

