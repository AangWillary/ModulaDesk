use std::path::{Path, PathBuf};

use super::path_util::validate_path;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let canonical = validate_path(&path)?;
    std::fs::read_to_string(&canonical).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let canonical = validate_path(&path)?;

    if let Some(parent) = canonical.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    std::fs::write(&canonical, &content).map_err(|e| e.to_string())
}
