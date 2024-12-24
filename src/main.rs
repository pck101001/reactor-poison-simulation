use axum::response::Html;
use axum::{routing::get, Router};
use axum_server::Server;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use tower_http::services::ServeDir;

mod simulation;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .nest_service("/static", ServeDir::new("static"))
        .route(
            "/",
            get(|| async { Html(include_str!("../templates/index.html")) }),
        )
        .route("/simulation", get(simulation::simulation_data));

    Server::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)), 3000))
        .serve(app.into_make_service())
        .await
        .unwrap();
}
