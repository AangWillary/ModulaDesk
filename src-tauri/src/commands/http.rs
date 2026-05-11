use std::net::IpAddr;

/// Checks if a URL is safe to request (no SSRF to internal/private IPs).
fn validate_url(url: &str) -> Result<(), String> {
    let parsed = url::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;

    // Only allow http and https
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(format!("URL scheme '{}' is not allowed", scheme));
    }

    // Check host
    let host = parsed
        .host_str()
        .ok_or_else(|| "URL has no host".to_string())?;

    // Block localhost variants
    let blocked_hosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"];
    if blocked_hosts.contains(&host) {
        return Err("Requests to localhost are not allowed".to_string());
    }

    // Try to resolve and check for private IPs
    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_private_ip(ip) {
            return Err("Requests to private/internal IPs are not allowed".to_string());
        }
    }

    // Block common internal hostnames
    let host_lower = host.to_lowercase();
    let blocked_patterns = [
        ".local", ".internal", ".localhost", ".home", ".lan",
        "169.254.",  // AWS metadata
        "metadata.google",  // GCP metadata
    ];
    for pattern in &blocked_patterns {
        if host_lower.contains(pattern) {
            return Err("Requests to internal hosts are not allowed".to_string());
        }
    }

    Ok(())
}

fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_unspecified()
                // Block AWS/GCP metadata endpoint
                || v4.octets() == [169, 254, 169, 254]
        }
        IpAddr::V6(v6) => v6.is_loopback() || v6.is_unspecified(),
    }
}

#[tauri::command]
pub async fn http_get(url: String) -> Result<String, String> {
    validate_url(&url)?;

    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}
