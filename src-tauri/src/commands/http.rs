use std::net::IpAddr;

/// Extracts the host from a URL string without the `url` crate.
fn extract_host(url: &str) -> Result<String, String> {
    let rest = url
        .find("://")
        .map(|pos| &url[pos + 3..])
        .ok_or_else(|| "URL must have a scheme (http:// or https://)".to_string())?;

    let scheme = &url[..url.find("://").unwrap()];
    if scheme != "http" && scheme != "https" {
        return Err(format!("URL scheme '{}' is not allowed", scheme));
    }

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

    Ok(host_clean.to_string())
}

/// Checks if a URL is safe to request (no SSRF to internal/private IPs).
fn validate_url(url: &str) -> Result<(), String> {
    let host = extract_host(url)?;

    // Block localhost variants
    let blocked_hosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];
    if blocked_hosts.contains(&host.as_str()) {
        return Err("Requests to localhost are not allowed".to_string());
    }

    // Check for private IPs
    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_private_ip(ip) {
            return Err("Requests to private/internal IPs are not allowed".to_string());
        }
    }

    // Block internal hostnames using suffix matching (not substring)
    let host_lower = host.to_lowercase();
    let blocked_suffixes = [
        ".local", ".internal", ".localhost", ".home.arpa", ".lan",
    ];
    for suffix in &blocked_suffixes {
        if host_lower.ends_with(suffix) {
            return Err(format!(
                "Requests to '{}' domains are not allowed",
                suffix
            ));
        }
    }

    // Block specific IP ranges in hostname form
    if host_lower.starts_with("169.254.") {
        return Err("Requests to link-local addresses are not allowed".to_string());
    }

    // Block metadata endpoints by exact hostname
    let blocked_exact = [
        "metadata.google.internal",
        "metadata.google.com",
        "instance-data",
    ];
    for blocked in &blocked_exact {
        if host_lower == *blocked {
            return Err("Requests to cloud metadata endpoints are not allowed".to_string());
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
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified()
                || is_ipv6_private(v6)
        }
    }
}

/// Checks IPv6 private ranges: fc00::/7 (ULA), fe80::/10 (link-local), ::ffff:0:0/96 (v4-mapped)
fn is_ipv6_private(ip: std::net::Ipv6Addr) -> bool {
    let octets = ip.octets();
    // fc00::/7 — Unique Local Address
    if (octets[0] & 0xfe) == 0xfc {
        return true;
    }
    // fe80::/10 — Link-local
    if octets[0] == 0xfe && (octets[1] & 0xc0) == 0x80 {
        return true;
    }
    // ::ffff:0:0/96 — IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    if octets[0..12] == [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff] {
        return true;
    }
    false
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
