use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub module_id: Option<String>,
    pub instance_id: Option<String>,
    pub cause: Option<String>,
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl std::error::Error for AppError {}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            module_id: None,
            instance_id: None,
            cause: None,
        }
    }

    pub fn with_context(mut self, module_id: &str, instance_id: &str) -> Self {
        self.module_id = Some(module_id.to_string());
        self.instance_id = Some(instance_id.to_string());
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    PermissionDenied,
    PathBlocked,
    CommandNotAllowed,
    FileNotFound,
    FileReadError,
    FileWriteError,
    NetworkError,
    ProcessError,
    StorageError,
    EmbedError,
    ModuleNotFound,
    ManifestInvalid,
    LifecycleError,
    IpcTimeout,
    InternalError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandContext {
    pub module_id: String,
    pub instance_id: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Permission {
    FileRead,
    FileWrite,
    NetworkHttp,
    SystemClipboard,
    SystemShell,
    SystemProcess,
    SystemInfo,
    AutomationRun,
}

impl Permission {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "file:read" => Some(Self::FileRead),
            "file:write" => Some(Self::FileWrite),
            "network:http" => Some(Self::NetworkHttp),
            "system:clipboard" => Some(Self::SystemClipboard),
            "system:shell" => Some(Self::SystemShell),
            "system:process" => Some(Self::SystemProcess),
            "system:info" => Some(Self::SystemInfo),
            "automation:run" => Some(Self::AutomationRun),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub family: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_code_serialization() {
        let err = AppError::new(ErrorCode::PermissionDenied, "denied");
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("PERMISSION_DENIED"));
        assert!(json.contains("denied"));
    }

    #[test]
    fn test_permission_from_str() {
        assert!(Permission::from_str("file:read").is_some());
        assert!(Permission::from_str("invalid:perm").is_none());
    }
}
