use std::net::IpAddr;

/// Extracts the host from a URL string without the `url` crate.
/// Handles: scheme://host:port/path?query
fn extract_host(url: &str) -> Result<(String, String), String> {
    // Check scheme
    let (scheme, rest) = if let Some(pos) = url.find("://") {
        let scheme = &url[..pos];
        (scheme.to_string(), &url[pos + 3..])
    } else {
        return Err("URL must have a scheme (http:// or https://)".to_string());
    };

    if scheme != "http" && scheme != "https" {
        return Err(format!("URL scheme '{}' is not allowed", scheme));
    }

    // Extract host (before /, ?, #, :)
    let host_end = rest
        .find(|c: char| c == '/' || c == '?' || c == '#' || c == ':')
        .unwrap_or(rest.len());
    let host = &rest[..host_end];

    if host.is_empty() {
        return Err("URL has no host".to_string());
    }

    // Handle IPv6 brackets: [::1]
    let host_clean = if host.starts_with('[') && host.ends_with(']') {
        &host[1..host.len() - 1]
    } else {
        host
    };

    Ok((scheme, host_clean.to_string()))
}

/// Checks if a URL is safe to request (no SSRF to internal/private IPs).
fn validate_url(url: &str) -> Result<(), String> {
    let (_scheme, host) = extract_host(url)?;

    // Block localhost variants
    let blocked_hosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];
    if blocked_hosts.contains(&host.as_str()) {
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
        "169.254.",       // AWS metadata
        "metadata.google", // GCP metadata
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
