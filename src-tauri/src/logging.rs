pub fn launch_log_name(
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
) -> String {
    format!("puredeck-{year:04}{month:02}{day:02}{hour:02}{minute:02}{second:02}")
}

pub fn current_launch_log_name() -> String {
    use chrono::{Datelike, Local, Timelike};
    let now = Local::now();
    launch_log_name(
        now.year(),
        now.month(),
        now.day(),
        now.hour(),
        now.minute(),
        now.second(),
    )
}

pub fn init<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use tauri_plugin_log::{Target, TargetKind};

    let log_name = current_launch_log_name();
    let plugin = tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir {
                file_name: Some(log_name.clone()),
            }),
            Target::new(TargetKind::Webview),
        ])
        .level(log::LevelFilter::Info)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .max_file_size(50_000_000)
        .build();

    if app.plugin(plugin).is_err() {
        eprintln!("puredeck: file logging disabled (log dir unwritable)");
        return;
    }
    log::info!("puredeck starting (log file {log_name}.log)");
}

#[tauri::command]
pub fn log_message(level: String, message: String) {
    match level.as_str() {
        "error" => log::error!("{message}"),
        "warn" => log::warn!("{message}"),
        "debug" => log::debug!("{message}"),
        _ => log::info!("{message}"),
    }
}

pub fn format_google_connect_ok(email: &str, ms: u128) -> String {
    format!("google_connect ok email={email} ({ms}ms)")
}

pub fn format_google_connect_err(error: &str, ms: u128) -> String {
    format!("google_connect failed ({ms}ms): {error}")
}

pub fn format_google_disconnect(ms: u128) -> String {
    format!("google_disconnect ok ({ms}ms)")
}

pub fn format_google_token_err(error: &str, ms: u128) -> String {
    format!("google_access_token failed ({ms}ms): {error}")
}

pub fn is_neutral_outcome(error: &str) -> bool {
    error == "unconfigured"
}
