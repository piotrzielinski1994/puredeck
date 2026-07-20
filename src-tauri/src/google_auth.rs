use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::mpsc;
use std::time::Duration;

const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT: &str = "https://openidconnect.googleapis.com/v1/userinfo";
const REVOKE_ENDPOINT: &str = "https://oauth2.googleapis.com/revoke";
const SCOPES: &str = "openid email https://www.googleapis.com/auth/drive.appdata";
const KEYRING_SERVICE: &str = "com.pzielinski.puredeck";
const KEYRING_ACCOUNT: &str = "google-refresh-token";

const ERR_UNCONFIGURED: &str = "unconfigured";
const ERR_FAILED: &str = "failed";

#[derive(Serialize)]
pub struct GoogleAccountDto {
    email: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
}

#[derive(Deserialize)]
struct UserInfo {
    email: String,
}

struct OAuthConfig {
    client_id: String,
    client_secret: String,
}

fn read_config() -> Result<OAuthConfig, String> {
    let client_id =
        std::env::var("PUREDECK_GOOGLE_CLIENT_ID").map_err(|_| ERR_UNCONFIGURED.to_string())?;
    if client_id.is_empty() {
        return Err(ERR_UNCONFIGURED.to_string());
    }
    let client_secret = std::env::var("PUREDECK_GOOGLE_CLIENT_SECRET").unwrap_or_default();
    Ok(OAuthConfig {
        client_id,
        client_secret,
    })
}

fn random_url_token(bytes: usize) -> String {
    let mut buffer = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut buffer);
    URL_SAFE_NO_PAD.encode(buffer)
}

fn pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn build_auth_url(client_id: &str, redirect_uri: &str, challenge: &str, state: &str) -> String {
    let params = [
        ("client_id", client_id),
        ("redirect_uri", redirect_uri),
        ("response_type", "code"),
        ("scope", SCOPES),
        ("code_challenge", challenge),
        ("code_challenge_method", "S256"),
        ("state", state),
        ("access_type", "offline"),
        ("prompt", "consent"),
    ];
    let query = params
        .iter()
        .map(|(key, value)| {
            format!(
                "{}={}",
                key,
                url::form_urlencoded::byte_serialize(value.as_bytes()).collect::<String>()
            )
        })
        .collect::<Vec<_>>()
        .join("&");
    format!("{}?{}", AUTH_ENDPOINT, query)
}

fn parse_redirect(redirect_url: &str, expected_state: &str) -> Result<String, String> {
    let parsed = url::Url::parse(redirect_url).map_err(|_| ERR_FAILED.to_string())?;
    let mut code: Option<String> = None;
    let mut state: Option<String> = None;
    for (key, value) in parsed.query_pairs() {
        match key.as_ref() {
            "code" => code = Some(value.into_owned()),
            "state" => state = Some(value.into_owned()),
            _ => {}
        }
    }
    if state.as_deref() != Some(expected_state) {
        return Err(ERR_FAILED.to_string());
    }
    code.ok_or_else(|| ERR_FAILED.to_string())
}

fn store_refresh_token(token: &str) -> Result<(), String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .and_then(|entry| entry.set_password(token))
        .map_err(|_| ERR_FAILED.to_string())
}

fn read_refresh_token() -> Option<String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .ok()
        .and_then(|entry| entry.get_password().ok())
}

fn delete_refresh_token() {
    if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT) {
        let _ = entry.delete_credential();
    }
}

fn exchange_code(
    config: &OAuthConfig,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> Result<TokenResponse, String> {
    let params = [
        ("client_id", config.client_id.as_str()),
        ("client_secret", config.client_secret.as_str()),
        ("code", code),
        ("code_verifier", verifier),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri),
    ];
    reqwest::blocking::Client::new()
        .post(TOKEN_ENDPOINT)
        .form(&params)
        .send()
        .and_then(|response| response.error_for_status())
        .and_then(|response| response.json::<TokenResponse>())
        .map_err(|_| ERR_FAILED.to_string())
}

fn refresh_access_token(config: &OAuthConfig, refresh_token: &str) -> Result<String, String> {
    let params = [
        ("client_id", config.client_id.as_str()),
        ("client_secret", config.client_secret.as_str()),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ];
    let response = reqwest::blocking::Client::new()
        .post(TOKEN_ENDPOINT)
        .form(&params)
        .send()
        .map_err(|_| ERR_FAILED.to_string())?;
    if !response.status().is_success() {
        delete_refresh_token();
        return Err(ERR_FAILED.to_string());
    }
    response
        .json::<TokenResponse>()
        .map(|token| token.access_token)
        .map_err(|_| ERR_FAILED.to_string())
}

fn fetch_email(access_token: &str) -> Result<String, String> {
    reqwest::blocking::Client::new()
        .get(USERINFO_ENDPOINT)
        .bearer_auth(access_token)
        .send()
        .and_then(|response| response.error_for_status())
        .and_then(|response| response.json::<UserInfo>())
        .map(|info| info.email)
        .map_err(|_| ERR_FAILED.to_string())
}

fn run_oauth_flow(config: &OAuthConfig) -> Result<TokenResponse, String> {
    let verifier = random_url_token(48);
    let challenge = pkce_challenge(&verifier);
    let state = random_url_token(24);

    let (sender, receiver) = mpsc::channel::<String>();
    let port = tauri_plugin_oauth::start(move |redirect_url| {
        let _ = sender.send(redirect_url);
    })
    .map_err(|_| ERR_FAILED.to_string())?;

    let redirect_uri = format!("http://127.0.0.1:{}", port);
    let auth_url = build_auth_url(&config.client_id, &redirect_uri, &challenge, &state);
    tauri_plugin_opener::open_url(auth_url, None::<String>).map_err(|_| ERR_FAILED.to_string())?;

    let redirect_url = receiver
        .recv_timeout(Duration::from_secs(300))
        .map_err(|_| ERR_FAILED.to_string())?;
    let _ = tauri_plugin_oauth::cancel(port);

    let code = parse_redirect(&redirect_url, &state)?;
    exchange_code(config, &code, &verifier, &redirect_uri)
}

#[tauri::command]
pub fn google_status() -> Option<GoogleAccountDto> {
    let config = read_config().ok()?;
    let refresh_token = read_refresh_token()?;
    let access_token = refresh_access_token(&config, &refresh_token).ok()?;
    fetch_email(&access_token)
        .ok()
        .map(|email| GoogleAccountDto { email })
}

#[tauri::command]
pub fn google_connect() -> Result<GoogleAccountDto, String> {
    let config = read_config()?;
    let tokens = run_oauth_flow(&config)?;
    let refresh_token = tokens.refresh_token.ok_or_else(|| ERR_FAILED.to_string())?;
    let email = fetch_email(&tokens.access_token)?;
    store_refresh_token(&refresh_token)?;
    Ok(GoogleAccountDto { email })
}

#[tauri::command]
pub fn google_disconnect() -> Result<(), String> {
    if let Some(refresh_token) = read_refresh_token() {
        let _ = reqwest::blocking::Client::new()
            .post(REVOKE_ENDPOINT)
            .form(&[("token", refresh_token.as_str())])
            .send();
    }
    delete_refresh_token();
    Ok(())
}

#[tauri::command]
pub fn google_access_token() -> Result<String, String> {
    let config = read_config()?;
    let refresh_token = read_refresh_token().ok_or_else(|| ERR_FAILED.to_string())?;
    refresh_access_token(&config, &refresh_token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_challenge_matches_rfc7636_vector() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(
            pkce_challenge(verifier),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn build_auth_url_requests_all_scopes_and_pkce() {
        let url = build_auth_url("cid", "http://127.0.0.1:9004", "chal", "st");
        assert!(url.contains("code_challenge_method=S256"));
        assert!(url.contains("access_type=offline"));
        assert!(url.contains("prompt=consent"));
        assert!(url.contains("openid"));
        assert!(url.contains("email"));
        assert!(url.contains("drive.appdata"));
    }

    #[test]
    fn parse_redirect_returns_code_when_state_matches() {
        let code = parse_redirect("http://127.0.0.1:9004/?code=abc&state=st", "st");
        assert_eq!(code, Ok("abc".to_string()));
    }

    #[test]
    fn parse_redirect_rejects_state_mismatch() {
        let result = parse_redirect("http://127.0.0.1:9004/?code=abc&state=evil", "st");
        assert!(result.is_err());
    }

    #[test]
    fn parse_redirect_rejects_missing_code() {
        let result = parse_redirect("http://127.0.0.1:9004/?state=st", "st");
        assert!(result.is_err());
    }
}
