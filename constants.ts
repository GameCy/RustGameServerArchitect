import { ProjectStep, ProtoDefinition, CodeFile } from './types';

export const PROJECT_PLAN: ProjectStep[] = [
  {
    id: 1,
    title: "Project Setup & Base Auth",
    details: [
      "Workspace setup with Cargo",
      "Implementation of Argon2id password hashing",
      "RS256 JWT generation logic"
    ],
    completed: true
  },
  {
    id: 2,
    title: "Session Persistence Layer",
    details: [
      "Create 'sessions' table in SQLite",
      "Implement token whitelisting logic",
      "Link user_id to active access/refresh pairs"
    ],
    completed: true
  },
  {
    id: 3,
    title: "gRPC Streaming & Validation",
    details: [
      "Implement UploadFile with mandatory DB session check",
      "Integrate token revocation on Logout",
      "Add RefreshToken RPC with session rotation"
    ],
    completed: true
  },
  {
    id: 4,
    title: "Integration Testing Suite",
    details: [
      "Develop CLI 'test_client' for end-to-end flows",
      "Implement subcommand parsing for all gRPC methods",
      "Add automated smoke test script"
    ],
    completed: true
  }
];

export const WIRE_PROTO: ProtoDefinition = {
  name: "wire.proto",
  content: `syntax = "proto3";

package wire;

service GameService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc Logout(LogoutRequest) returns (LogoutResponse);
  rpc RefreshToken(RefreshTokenRequest) returns (RefreshTokenResponse);
  rpc UploadFile(stream UploadFileRequest) returns (UploadFileResponse);
  rpc SendMessage(SendMessageRequest) returns (SendMessageResponse);
}

message RegisterRequest {
  string username = 1;
  string password = 2;
  string email = 3;
}

message RegisterResponse {
  bool success = 1;
  string message = 2;
}

message LoginRequest {
  string username = 1;
  string password = 2;
}

message LoginResponse {
  bool success = 1;
  string message = 2;
  string access_token = 3;
  string refresh_token = 4;
}

message RefreshTokenRequest {
  string refresh_token = 1;
}

message RefreshTokenResponse {
  bool success = 1;
  string access_token = 2;
  string message = 3;
}

message LogoutRequest {
  string access_token = 1;
}

message LogoutResponse {
  bool success = 1;
  string message = 2;
}

message UploadFileRequest {
  oneof data {
    FileInfo file_info = 1;
    bytes chunk_data = 2;
  }
}

message FileInfo {
  string file_name = 1;
  string access_token = 2;
}

message UploadFileResponse {
  bool success = 1;
  string message = 2;
  string file_hash = 3;
}

message SendMessageRequest {
  string access_token = 1;
  string message = 2;
}

message SendMessageResponse {
  bool success = 1;
  string message = 2;
}`
};

export const IMPLEMENTATION_FILES: CodeFile[] = [
  {
    path: 'Cargo.toml',
    name: 'Cargo.toml (Root)',
    language: 'toml',
    content: `[workspace]
members = [
    "game_server",
    "test_client",
]
resolver = "2"`
  },
  {
    path: 'proto/wire.proto',
    name: 'wire.proto',
    language: 'proto',
    content: WIRE_PROTO.content
  },
  {
    path: 'game_server/Cargo.toml',
    name: 'game_server/Cargo.toml',
    language: 'toml',
    content: `[package]
name = "game_server"
version = "0.1.0"
edition = "2021"

[dependencies]
tonic = "0.10"
prost = "0.12"
tokio = { version = "1.0", features = ["full"] }
tokio-stream = "0.1"
rusqlite = { version = "0.29", features = ["bundled"] }
r2d2 = "0.8"
r2d2_sqlite = "0.22"
argon2 = "0.5"
jsonwebtoken = "9.0"
serde = { version = "1.0", features = ["derive"] }
chrono = { version = "0.4", features = ["serde"] }
sha2 = "0.10"
hex = "0.4"

[build-dependencies]
tonic-build = "0.10"`
  },
  {
    path: 'game_server/src/main.rs',
    name: 'game_server/main.rs',
    language: 'rust',
    content: `mod config;
mod database;
mod jwt;
mod myservice;

use std::sync::Arc;
use tonic::transport::Server;
use database::Database;
use jwt::JwtManager;
use myservice::MyService;
use crate::wire::game_service_server::GameServiceServer;

pub mod wire {
    tonic::include_proto!("wire");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db = Arc::new(Database::new("game.db", 10)?);
    let jwt = Arc::new(JwtManager::new("keys/priv.pem", "keys/pub.pem"));
    
    let service = MyService { 
        db, 
        jwt, 
        upload_dir: "./uploads".into() 
    };

    println!("gRPC Game Server listening on [::1]:50051");
    Server::builder()
        .add_service(GameServiceServer::new(service))
        .serve("[::1]:50051".parse()?)
        .await?;

    Ok(())
}`
  },
  {
    path: 'game_server/src/database.rs',
    name: 'database.rs',
    language: 'rust',
    content: `use rusqlite::{params, Connection, Result};
use r2d2_sqlite::SqliteConnectionManager;
use r2d2::Pool;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2
};

pub type DbPool = Pool<SqliteConnectionManager>;

pub struct Database {
    pool: DbPool,
}

impl Database {
    pub fn new(path: &str, pool_size: u32) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = SqliteConnectionManager::file(path);
        let pool = Pool::builder().max_size(pool_size).build(manager)?;
        let conn = pool.get()?;
        
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email TEXT
            )", []
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                access_token TEXT NOT NULL UNIQUE,
                refresh_token TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )", []
        )?;

        Ok(Database { pool })
    }

    pub fn register_user(&self, username: &str, password: &str, email: &str) -> Result<(), String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default().hash_password(password.as_bytes(), &salt)
            .map_err(|e| e.to_string())?.to_string();
        conn.execute("INSERT INTO users (username, password_hash, email) VALUES (?1, ?2, ?3)", params![username, hash, email]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn verify_login(&self, username: &str, password: &str) -> Result<i64, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let (id, hash): (i64, String) = conn.query_row(
            "SELECT id, password_hash FROM users WHERE username = ?1", 
            params![username], 
            |r| Ok((r.get(0)?, r.get(1)?))
        ).map_err(|_| "Invalid credentials".to_string())?;

        let p_hash = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
        if Argon2::default().verify_password(password.as_bytes(), &p_hash).is_err() { 
            return Err("Invalid credentials".into()); 
        }
        Ok(id)
    }

    pub fn create_session(&self, user_id: i64, access_token: &str, refresh_token: &str) -> Result<(), String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO sessions (user_id, access_token, refresh_token) VALUES (?1, ?2, ?3)",
            params![user_id, access_token, refresh_token]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn validate_session(&self, access_token: &str) -> Result<i64, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let user_id: i64 = conn.query_row(
            "SELECT user_id FROM sessions WHERE access_token = ?1",
            params![access_token],
            |r| r.get(0)
        ).map_err(|_| "Session revoked".to_string())?;
        Ok(user_id)
    }

    pub fn rotate_session(&self, old_refresh: &str, new_access: &str, new_refresh: &str) -> Result<i64, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let user_id: i64 = conn.query_row(
            "SELECT user_id FROM sessions WHERE refresh_token = ?1",
            params![old_refresh],
            |r| r.get(0)
        ).map_err(|_| "Invalid refresh token".to_string())?;

        conn.execute(
            "UPDATE sessions SET access_token = ?1, refresh_token = ?2 WHERE refresh_token = ?3",
            params![new_access, new_refresh, old_refresh]
        ).map_err(|e| e.to_string())?;
        
        Ok(user_id)
    }

    pub fn delete_session(&self, access_token: &str) -> Result<(), String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM sessions WHERE access_token = ?1", params![access_token]).map_err(|e| e.to_string())?;
        Ok(())
    }
}`
  },
  {
    path: 'game_server/src/jwt.rs',
    name: 'jwt.rs',
    language: 'rust',
    content: `use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use serde::{Serialize, Deserialize};
use chrono::{Utc, Duration};
use tonic::Status;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims { 
    pub sub: String, 
    pub exp: usize, 
    pub iat: usize, 
    pub token_type: String 
}

pub struct JwtManager { 
    encoding_key: EncodingKey, 
    decoding_key: DecodingKey 
}

impl JwtManager {
    pub fn new(priv_path: &str, pub_path: &str) -> Self {
        let priv_key = std::fs::read(priv_path).expect("Private key missing");
        let pub_key = std::fs::read(pub_path).expect("Public key missing");
        Self {
            encoding_key: EncodingKey::from_rsa_pem(&priv_key).unwrap(),
            decoding_key: DecodingKey::from_rsa_pem(&pub_key).unwrap(),
        }
    }

    pub fn generate_tokens(&self, user_id: i64) -> (String, String) {
        let now = Utc::now();
        let access = encode(&Header::new(Algorithm::RS256), &Claims {
            sub: user_id.to_string(), 
            exp: (now + Duration::minutes(30)).timestamp() as usize,
            iat: now.timestamp() as usize, 
            token_type: "access".into(),
        }, &self.encoding_key).unwrap();
        
        let refresh = encode(&Header::new(Algorithm::RS256), &Claims {
            sub: user_id.to_string(), 
            exp: (now + Duration::days(14)).timestamp() as usize,
            iat: now.timestamp() as usize, 
            token_type: "refresh".into(),
        }, &self.encoding_key).unwrap();
        
        (access, refresh)
    }

    pub fn validate_token(&self, token: &str, expected_type: &str) -> Result<i64, Status> {
        let val = Validation::new(Algorithm::RS256);
        let data = decode::<Claims>(token, &self.decoding_key, &val)
            .map_err(|e| Status::unauthenticated(format!("JWT Validation Error: {}", e)))?;
            
        if data.claims.token_type != expected_type { 
            return Err(Status::unauthenticated("Invalid token type")); 
        }
        
        data.claims.sub.parse().map_err(|_| Status::unauthenticated("Malformed subject"))
    }
}`
  },
  {
    path: 'game_server/src/myservice.rs',
    name: 'myservice.rs',
    language: 'rust',
    content: `use std::sync::Arc;
use tonic::{Status, Request, Response, Streaming};
use tokio_stream::StreamExt;
use tokio::io::AsyncWriteExt;
use sha2::{Sha256, Digest};
use crate::database::Database;
use crate::jwt::JwtManager;
use crate::wire::game_service_server::GameService;
use crate::wire::{
    upload_file_request::Data, RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse, LogoutRequest, LogoutResponse,
    UploadFileRequest, UploadFileResponse, SendMessageRequest, SendMessageResponse,
    RefreshTokenRequest, RefreshTokenResponse
};

pub struct MyService { 
    pub db: Arc<Database>, 
    pub jwt: Arc<JwtManager>, 
    pub upload_dir: String 
}

impl MyService {
    async fn authorize_request(&self, token: &str) -> Result<i64, Status> {
        let user_id = self.jwt.validate_token(token, "access")?;
        self.db.validate_session(token).map_err(|e| Status::unauthenticated(e))?;
        Ok(user_id)
    }
}

#[tonic::async_trait]
impl GameService for MyService {
    async fn register(&self, req: Request<RegisterRequest>) -> Result<Response<RegisterResponse>, Status> {
        let r = req.into_inner();
        match self.db.register_user(&r.username, &r.password, &r.email) {
            Ok(_) => Ok(Response::new(RegisterResponse { success: true, message: "User registered".into() })),
            Err(e) => Ok(Response::new(RegisterResponse { success: false, message: e })),
        }
    }

    async fn login(&self, req: Request<LoginRequest>) -> Result<Response<LoginResponse>, Status> {
        let r = req.into_inner();
        match self.db.verify_login(&r.username, &r.password) {
            Ok(id) => {
                let (a, r) = self.jwt.generate_tokens(id);
                self.db.create_session(id, &a, &r).map_err(|e| Status::internal(e))?;
                Ok(Response::new(LoginResponse { 
                    success: true, message: "Logged in".into(), access_token: a, refresh_token: r 
                }))
            }
            Err(e) => Ok(Response::new(LoginResponse { success: false, message: e, ..Default::default() }))
        }
    }

    async fn refresh_token(&self, req: Request<RefreshTokenRequest>) -> Result<Response<RefreshTokenResponse>, Status> {
        let r = req.into_inner();
        let user_id = self.jwt.validate_token(&r.refresh_token, "refresh")?;
        let (new_a, new_r) = self.jwt.generate_tokens(user_id);
        match self.db.rotate_session(&r.refresh_token, &new_a, &new_r) {
            Ok(_) => Ok(Response::new(RefreshTokenResponse { success: true, access_token: new_a, message: "Rotated".into() })),
            Err(e) => Err(Status::unauthenticated(e))
        }
    }

    async fn upload_file(&self, req: Request<Streaming<UploadFileRequest>>) -> Result<Response<UploadFileResponse>, Status> {
        let mut stream = req.into_inner();
        let mut hasher = Sha256::new();
        let mut writer: Option<tokio::fs::File> = None;

        while let Some(msg) = stream.next().await {
            match msg?.data {
                Some(Data::FileInfo(info)) => {
                    self.authorize_request(&info.access_token).await?;
                    let path = std::path::Path::new(&self.upload_dir).join(&info.file_name);
                    writer = Some(tokio::fs::File::create(path).await?);
                }
                Some(Data::ChunkData(chunk)) => {
                    if let Some(ref mut w) = writer {
                        hasher.update(&chunk);
                        w.write_all(&chunk).await?;
                    }
                }
                None => {}
            }
        }
        Ok(Response::new(UploadFileResponse { 
            success: true, message: "Upload finished".into(), file_hash: hex::encode(hasher.finalize()) 
        }))
    }

    async fn send_message(&self, req: Request<SendMessageRequest>) -> Result<Response<SendMessageResponse>, Status> {
        let r = req.into_inner();
        self.authorize_request(&r.access_token).await?;
        Ok(Response::new(SendMessageResponse { success: true, message: "Message accepted".into() }))
    }

    async fn logout(&self, req: Request<LogoutRequest>) -> Result<Response<LogoutResponse>, Status> {
        let r = req.into_inner();
        let _ = self.db.delete_session(&r.access_token);
        Ok(Response::new(LogoutResponse { success: true, message: "Session ended".into() }))
    }
}`
  },
  {
    path: 'test_client/Cargo.toml',
    name: 'test_client/Cargo.toml',
    language: 'toml',
    content: `[package]
name = "test_client"
version = "0.1.0"
edition = "2021"

[dependencies]
tonic = "0.10"
prost = "0.12"
tokio = { version = "1.0", features = ["full"] }
tokio-stream = "0.1"
clap = { version = "4.0", features = ["derive"] }

[build-dependencies]
tonic-build = "0.10"`
  },
  {
    path: 'test_client/src/main.rs',
    name: 'test_client/main.rs',
    language: 'rust',
    content: `use clap::{Parser, Subcommand};
use tonic::Request;
use tokio_stream::StreamExt;

pub mod wire {
    tonic::include_proto!("wire");
}

use wire::game_service_client::GameServiceClient;
use wire::{
    RegisterRequest, LoginRequest, SendMessageRequest, 
    RefreshTokenRequest, UploadFileRequest, FileInfo, upload_file_request::Data
};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Register { username: String, pass: String },
    Login { username: String, pass: String },
    Send { token: String, msg: String },
    Refresh { refresh_token: String },
    Upload { token: String, filename: String },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = GameServiceClient::connect("http://[::1]:50051").await?;
    let cli = Cli::parse();

    match cli.command {
        Commands::Register { username, pass } => {
            let res = client.register(Request::new(RegisterRequest {
                username, password: pass, email: "test@example.com".into()
            })).await?;
            println!("Response: {:?}", res.into_inner());
        }
        Commands::Login { username, pass } => {
            let res = client.login(Request::new(LoginRequest { username, password: pass })).await?;
            println!("Response: {:?}", res.into_inner());
        }
        Commands::Send { token, msg } => {
            let res = client.send_message(Request::new(SendMessageRequest { access_token: token, message: msg })).await?;
            println!("Response: {:?}", res.into_inner());
        }
        Commands::Refresh { refresh_token } => {
            let res = client.refresh_token(Request::new(RefreshTokenRequest { refresh_token })).await?;
            println!("Response: {:?}", res.into_inner());
        }
        Commands::Upload { token, filename } => {
            let file_info = FileInfo { file_name: filename, access_token: token };
            let chunk = vec![0u8; 512]; // Mock data chunk
            
            let stream = tokio_stream::iter(vec![
                UploadFileRequest { data: Some(Data::FileInfo(file_info)) },
                UploadFileRequest { data: Some(Data::ChunkData(chunk)) },
            ]);
            
            let res = client.upload_file(Request::new(stream)).await?;
            println!("Response: {:?}", res.into_inner());
        }
    }
    Ok(())
}`
  }
];