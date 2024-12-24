use axum::extract::Query;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct SimulationData {
    pub time: Vec<f64>,
    pub iodine: Vec<f64>,
    pub xenon: Vec<f64>,
    pub promethium: Vec<f64>,
    pub samarium: Vec<f64>,
    pub reactivity_xe: Vec<f64>,
    pub reactivity_sm: Vec<f64>,
}

#[derive(Deserialize)]
pub struct SimulationParams {
    time: f64,
    state: f64,
    last_time: f64,
    last_iodine: f64,
    last_xenon: f64,
    last_promethium: f64,
    last_samarium: f64,
}

pub async fn simulation_data(
    Query(params): Query<HashMap<String, String>>,
) -> impl axum::response::IntoResponse {
    let simulation_params = SimulationParams {
        time: params
            .get("time")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        state: params
            .get("state")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(1.0),
        last_time: params
            .get("lastTime")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        last_iodine: params
            .get("lastIodine")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        last_xenon: params
            .get("lastXenon")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        last_promethium: params
            .get("lastPromethium")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        last_samarium: params
            .get("lastSamarium")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
    };

    let mut data = SimulationData {
        time: Vec::new(),
        iodine: Vec::new(),
        xenon: Vec::new(),
        promethium: Vec::new(),
        samarium: Vec::new(),
        reactivity_xe: Vec::new(),
        reactivity_sm: Vec::new(),
    };

    let mut t = simulation_params.last_time * SECONDS_PER_DAY;
    let mut n_i = simulation_params.last_iodine;
    let mut n_xe = simulation_params.last_xenon;
    let mut n_pm = simulation_params.last_promethium;
    let mut n_sm = simulation_params.last_samarium;
    let dt = 60.0;
    let t_end = (simulation_params.last_time + simulation_params.time) * SECONDS_PER_DAY;

    let phi = PHI_0 * simulation_params.state;

    while t <= t_end {
        let dn_i_dt = GAMMA_I * SIGMA_F * phi - LAMBDA_I * n_i;
        let dn_xe_dt =
            GAMMA_XE * SIGMA_F * phi + LAMBDA_I * n_i - (LAMBDA_XE + SIGMA_A_XE * phi) * n_xe;

        let dn_pm_dt = GAMMA_PM * SIGMA_F * phi - LAMBDA_PM * n_pm;
        let dn_sm_dt = LAMBDA_PM * n_pm - SIGMA_A_SM * n_sm * phi;

        n_i += dn_i_dt * dt;
        n_xe += dn_xe_dt * dt;
        n_pm += dn_pm_dt * dt;
        n_sm += dn_sm_dt * dt;

        data.time.push(t / SECONDS_PER_DAY);
        data.iodine.push(n_i);
        data.xenon.push(n_xe);
        data.promethium.push(n_pm);
        data.samarium.push(n_sm);

        let sigma_a_p_xe = SIGMA_A_XE * n_xe;
        let sigma_a_p_sm = SIGMA_A_SM * n_sm;
        let delta_rho_xe = -sigma_a_p_xe / (SIGMA_A);
        let delta_rho_sm = -sigma_a_p_sm / (SIGMA_A);

        data.reactivity_xe.push(delta_rho_xe);
        data.reactivity_sm.push(delta_rho_sm);

        t += dt;
    }

    axum::Json(data)
}

const GAMMA_I: f64 = 6.386e-2;
const GAMMA_XE: f64 = 2.28e-3;
const GAMMA_PM: f64 = 1.13e-2;

const LAMBDA_I: f64 = 2.87e-5;
const LAMBDA_XE: f64 = 2.09e-5;
const LAMBDA_PM: f64 = 3.58e-6;

const SIGMA_A_XE: f64 = 2.65e6 * 1e-24;
const SIGMA_A_SM: f64 = 4.014e4 * 1e-24;

const PHI_0: f64 = 2.93e13;

const SIGMA_F: f64 = 0.066;
const SIGMA_A: f64 = 0.15;

const SECONDS_PER_DAY: f64 = 24.0 * 60.0 * 60.0;
