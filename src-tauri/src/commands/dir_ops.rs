use serde::Serialize;

use super::path_util::validate_path;

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
}

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let canonical = validate_path(&path)?;
    let entries = std::fs::read_dir(&canonical).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let file_path = entry.path().to_string_lossy().to_string();
        let modified = metadata.modified().ok().and_then(|t| {
            let duration = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
            let datetime = chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)?;
            Some(datetime.format("%Y-%m-%d %H:%M").to_string())
        });

        result.push(DirEntry {
            name,
            path: file_path,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified,
        });
    }

    result.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(result)
}

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    let canonical = validate_path(&path)?;
    opener::open(&canonical).map_err(|e| e.to_string())
}
