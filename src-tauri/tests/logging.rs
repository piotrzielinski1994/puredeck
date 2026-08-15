// F1 - RED tests for the backend logging chain (port of purequery F18).
// Nothing exists yet: `puredeck_lib::logging` is not defined, so this whole
// test crate fails to compile until the feature lands. When it ships, the
// module must be exposed as `pub mod logging;` in src-tauri/src/lib.rs so an
// integration test can reach it (purequery keeps it private + tests inline;
// puredeck pins the same behavior from the outside).

use std::sync::Mutex;
use std::sync::Once;

// ---------------------------------------------------------------------------
// AC-001 / TC-001 / TC-002 / TC-003 - launch_log_name (pure, decomposed clock)
// ---------------------------------------------------------------------------

#[test]
fn launch_log_name_formats_decomposed_components_into_puredeck_stem() {
    assert_eq!(
        puredeck_lib::logging::launch_log_name(2026, 6, 25, 22, 38, 47),
        "puredeck-20260625223847"
    );
}

#[test]
fn launch_log_name_zero_pads_single_digit_components() {
    assert_eq!(
        puredeck_lib::logging::launch_log_name(2026, 1, 2, 3, 4, 5),
        "puredeck-20260102030405"
    );
}

#[test]
fn launch_log_name_stem_is_exactly_14_ascii_digits() {
    let name = puredeck_lib::logging::launch_log_name(2026, 12, 31, 23, 59, 59);
    let stem = name.strip_prefix("puredeck-").unwrap();
    assert_eq!(stem.len(), 14);
    assert!(stem.chars().all(|c| c.is_ascii_digit()));
}

// AC-002 - the per-launch file name comes from the same pure stem; only the
// clock source differs, so the shape (puredeck- + 14 digits) is stable.
#[test]
fn current_launch_log_name_matches_the_puredeck_timestamp_shape() {
    let name = puredeck_lib::logging::current_launch_log_name();
    let stem = name.strip_prefix("puredeck-").unwrap();
    assert_eq!(stem.len(), 14);
    assert!(stem.chars().all(|c| c.is_ascii_digit()));
}

// ---------------------------------------------------------------------------
// AC-006 / TC-004 - pure key=value formatters, no clock, no I/O
// ---------------------------------------------------------------------------

#[test]
fn format_google_connect_ok_builds_the_key_value_line_with_email_and_ms() {
    assert_eq!(
        puredeck_lib::logging::format_google_connect_ok("jane@example.com", 34),
        "google_connect ok email=jane@example.com (34ms)"
    );
}

#[test]
fn format_google_connect_err_builds_the_key_value_line_with_ms_and_error_tail() {
    assert_eq!(
        puredeck_lib::logging::format_google_connect_err("connection refused", 40),
        "google_connect failed (40ms): connection refused"
    );
}

#[test]
fn format_google_disconnect_builds_the_ok_line_with_ms() {
    assert_eq!(
        puredeck_lib::logging::format_google_disconnect(7),
        "google_disconnect ok (7ms)"
    );
}

#[test]
fn format_google_token_err_builds_the_key_value_line_with_ms_and_error_tail() {
    assert_eq!(
        puredeck_lib::logging::format_google_token_err("no refresh token", 5),
        "google_access_token failed (5ms): no refresh token"
    );
}

// ---------------------------------------------------------------------------
// AC-006 / TC-005 - neutral-outcome gate at the dispatcher
// ---------------------------------------------------------------------------

#[test]
fn is_neutral_outcome_allows_the_unconfigured_outcome_without_an_error_line() {
    assert!(puredeck_lib::logging::is_neutral_outcome("unconfigured"));
}

#[test]
fn is_neutral_outcome_rejects_an_ordinary_failure() {
    assert!(!puredeck_lib::logging::is_neutral_outcome("failed"));
    assert!(!puredeck_lib::logging::is_neutral_outcome("connection refused"));
}

// ---------------------------------------------------------------------------
// AC-004 / TC-023 - log_message maps the string level to the matching macro
// ---------------------------------------------------------------------------

struct CaptureLogger;

static RECORDS: Mutex<Vec<(String, String)>> = Mutex::new(Vec::new());
static INIT: Once = Once::new();

impl log::Log for CaptureLogger {
    fn enabled(&self, _metadata: &log::Metadata<'_>) -> bool {
        true
    }
    fn log(&self, record: &log::Record<'_>) {
        RECORDS
            .lock()
            .unwrap()
            .push((record.level().to_string(), record.args().to_string()));
    }
    fn flush(&self) {}
}

fn init_capture_logger() {
    INIT.call_once(|| {
        log::set_logger(&CaptureLogger).expect("logger must be installed once");
        log::set_max_level(log::LevelFilter::Trace);
    });
    RECORDS.lock().unwrap().clear();
}

#[test]
fn log_message_routes_error_warn_debug_and_anything_else_to_the_matching_macro() {
    init_capture_logger();

    puredeck_lib::logging::log_message("error".to_string(), "boom".to_string());
    puredeck_lib::logging::log_message("warn".to_string(), "careful".to_string());
    puredeck_lib::logging::log_message("debug".to_string(), "spam".to_string());
    puredeck_lib::logging::log_message("info".to_string(), "note".to_string());
    puredeck_lib::logging::log_message("anything-else".to_string(), "fallback".to_string());

    let records = RECORDS.lock().unwrap().clone();
    assert!(
        records.contains(&("ERROR".to_string(), "boom".to_string())),
        "error level must route to the error macro"
    );
    assert!(
        records.contains(&("WARN".to_string(), "careful".to_string())),
        "warn level must route to the warn macro"
    );
    assert!(
        records.contains(&("DEBUG".to_string(), "spam".to_string())),
        "debug level must route to the debug macro"
    );
    assert!(
        records.contains(&("INFO".to_string(), "note".to_string())),
        "info level must route to the info macro"
    );
    assert!(
        records.contains(&("INFO".to_string(), "fallback".to_string())),
        "any other level must route to the info macro"
    );
}
