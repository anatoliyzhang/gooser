use serde_derive::{Deserialize};

#[derive(Debug, Deserialize,Hash)]
pub struct User {
    pub username: String,
    pub password: String,
    
}