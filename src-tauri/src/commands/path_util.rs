use std::path::{Path, PathBuf};

/// Returns the user's home directory.
fn home_dir() -> Option<PathBuf> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()
        .map(PathBuf::from)
}

/// Validates a file path using an allowlist approach.
/// Only allows access under the user's home directory.
/// Blocks access to sensitive hidden directories like .ssh, .gnupg, .aws, etc.
pub fn validate_path(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path);

    // Canonicalize: if path exists, resolve it; otherwise try parent
    let canonical = match p.canonicalize() {
        Ok(c) => c,
        Err(_) => {
            let parent = p.parent().unwrap_or(Path::new("/"));
            let canon_parent = parent
                .canonicalize()
                .map_err(|e| format!("Invalid parent path: {}", e))?;
            canon_parent.join(p.file_name().unwrap_or_default())
        }
    };

    // Allowlist: must be under user home directory
    if let Some(home) = home_dir() {
        if let Ok(home_canon) = home.canonicalize() {
            if !canonical.starts_with(&home_canon) {
                return Err(format!(
                    "Access denied: path must be under your home directory ({})",
                    home_canon.display()
                ));
            }
        }
    }

    // Blocklist for sensitive hidden directories within home
    let path_str = canonical.to_string_lossy();
    let blocked_dirs = [
        "/.ssh", "/.gnupg", "/.gpg", "/.aws", "/.azure",
        "/.config/google-chrome", "/.config/chromium",
        "/.mozilla", "/.firefox",
        "/AppData/Local/Google/Chrome/User Data",
        "/AppData/Roaming/Mozilla/Firefox",
        "/.kube", "/.docker",
        "\\AppData\\Local\\Google\\Chrome\\User Data",
        "\\AppData\\Roaming\\Mozilla\\Firefox",
    ];

    for blocked in &blocked_dirs {
        if path_str.contains(blocked) {
            return Err("Access to this sensitive directory is denied".to_string());
        }
    }

    Ok(canonical)
}
