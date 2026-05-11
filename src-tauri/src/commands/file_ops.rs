use std::path::{Path, PathBuf};

/// Validates and canonicalizes a file path, blocking access to sensitive system files.
fn validate_path(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path);

    // Attempt to canonicalize; if the path doesn't exist yet (for write),
    // canonicalize the parent directory
    let canonical = if p.exists() {
        p.canonicalize().map_err(|e| format!("Invalid path: {}", e))?
    } else {
        // For new files, check the parent directory
        let parent = p.parent().unwrap_or(Path::new("/"));
        let canon_parent = parent
            .canonicalize()
            .map_err(|e| format!("Invalid parent path: {}", e))?;
        canon_parent.join(p.file_name().unwrap_or_default())
    };

    // Block access to sensitive system files
    let path_str = canonical.to_string_lossy().to_lowercase();
    let blocked = [
        "/etc/shadow",
        "/etc/passwd",
        "/etc/sudoers",
        "system32\\config\\sam",
        "system32\\config\\system",
        "system32\\config\\security",
    ];
    for b in &blocked {
        if path_str.contains(b) {
            return Err("Access to this system file is denied".to_string());
        }
    }

    Ok(canonical)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let canonical = validate_path(&path)?;
    std::fs::read_to_string(&canonical).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let canonical = validate_path(&path)?;

    // Ensure parent directory exists
    if let Some(parent) = canonical.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    std::fs::write(&canonical, &content).map_err(|e| e.to_string())
}
