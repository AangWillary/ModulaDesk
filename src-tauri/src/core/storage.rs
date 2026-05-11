use std::path::{Path, PathBuf};
use crate::types::{AppError, ErrorCode};

pub struct StorageEngine {
    base_dir: PathBuf,
}

impl StorageEngine {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    fn validate_key(key: &str) -> Result<(), AppError> {
        if key.contains("..") || key.contains('/') || key.contains('\\') {
            return Err(AppError::new(
                ErrorCode::StorageError,
                format!("Invalid storage key: {}", key),
            ));
        }
        Ok(())
    }

    fn validate_instance_id(instance_id: &str) -> Result<(), AppError> {
        if instance_id.contains("..") || instance_id.contains('/') || instance_id.contains('\\') {
            return Err(AppError::new(
                ErrorCode::StorageError,
                format!("Invalid instance ID: {}", instance_id),
            ));
        }
        Ok(())
    }

    fn path_for(&self, instance_id: &str, key: &str) -> PathBuf {
        self.base_dir.join(instance_id).join(format!("{}.json", key))
    }

    pub fn get(&self, instance_id: &str, key: &str) -> Result<Option<serde_json::Value>, AppError> {
        Self::validate_instance_id(instance_id)?;
        Self::validate_key(key)?;

        let path = self.path_for(instance_id, key);
        if !path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&path).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to read storage: {}", e))
        })?;

        let value: serde_json::Value = serde_json::from_str(&content).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to parse storage: {}", e))
        })?;

        Ok(Some(value))
    }

    pub fn set(&self, instance_id: &str, key: &str, value: &serde_json::Value) -> Result<(), AppError> {
        Self::validate_instance_id(instance_id)?;
        Self::validate_key(key)?;

        let dir = self.base_dir.join(instance_id);
        std::fs::create_dir_all(&dir).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to create storage dir: {}", e))
        })?;

        let path = self.path_for(instance_id, key);
        let content = serde_json::to_string_pretty(value).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to serialize: {}", e))
        })?;

        std::fs::write(&path, content).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to write storage: {}", e))
        })?;

        Ok(())
    }

    pub fn delete(&self, instance_id: &str, key: &str) -> Result<(), AppError> {
        Self::validate_instance_id(instance_id)?;
        Self::validate_key(key)?;

        let path = self.path_for(instance_id, key);
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| {
                AppError::new(ErrorCode::StorageError, format!("Failed to delete: {}", e))
            })?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_set_and_get() {
        let dir = tempdir().unwrap();
        let engine = StorageEngine::new(dir.path().to_path_buf());
        let value = serde_json::json!({"key": "value"});
        engine.set("test-instance", "data", &value).unwrap();
        let result = engine.get("test-instance", "data").unwrap();
        assert_eq!(result, Some(value));
    }

    #[test]
    fn test_validate_key_blocks_traversal() {
        assert!(StorageEngine::validate_key("../etc/passwd").is_err());
        assert!(StorageEngine::validate_key("valid-key").is_ok());
    }
}
