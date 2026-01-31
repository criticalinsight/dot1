use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! This message is computed in Rust 🦀", name)
}

#[wasm_bindgen]
pub fn compute_physics_step(dt: f32) -> f32 {
    // Placeholder for future physics
    dt * 9.81
}
