use crate::types::{AppError, ErrorCode};
use std::path::{Path, PathBuf};

pub struct Sandbox {
    allowed_dirs: Vec<PathBuf>,
    blocked_dirs: Vec<PathBuf>,
    allowed_commands: Vec<String>,
}

impl Sandbox {
    pub fn new(home_dir: PathBuf) -> Self {
        Self {
            allowed_dirs: vec![home_dir.clone()],
            blocked_dirs: vec![
                home_dir.join(".ssh"),
                home_dir.join(".gnupg"),
                home_dir.join(".kube"),
                home_dir.join(".docker"),
            ],
            allowed_commands: vec!["dir".to_string(), "ls".to_string(), "echo".to_string()],
        }
    }

    pub fn validate_existing_path(&self, path: &str) -> Result<PathBuf, AppError> {
        let p = Path::new(path);
        let canonical = p.canonicalize().map_err(|_| {
            AppError::new(ErrorCode::PathBlocked, format!("Path not found: {}", path))
        })?;
        self.check_blocked(&canonical)?;
        Ok(canonical)
    }

    pub fn validate_write_path(&self, path: &str) -> Result<PathBuf, AppError> {
        let p = Path::new(path);
        if let Some(parent) = p.parent() {
            if parent.exists() {
                let canonical = parent.canonicalize().map_err(|_| {
                    AppError::new(
                        ErrorCode::PathBlocked,
                        format!("Parent path not found: {}", path),
                    )
                })?;
                self.check_blocked(&canonical)?;
            }
        }
        Ok(p.to_path_buf())
    }

    pub fn validate_command(&self, command: &str) -> Result<(), AppError> {
        if self.allowed_commands.contains(&command.to_string()) {
            Ok(())
        } else {
            Err(AppError::new(
                ErrorCode::CommandNotAllowed,
                format!("Command not allowed: {}", command),
            ))
        }
    }

    fn check_blocked(&self, path: &Path) -> Result<(), AppError> {
        for blocked in &self.blocked_dirs {
            if path.starts_with(blocked) {
                return Err(AppError::new(
                    ErrorCode::PathBlocked,
                    format!("Access to blocked directory: {}", path.display()),
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_validate_existing_path_blocks_ssh() {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let sandbox = Sandbox::new(home.clone());
        let ssh_dir = home.join(".ssh");
        if ssh_dir.exists() {
            assert!(sandbox
                .validate_existing_path(ssh_dir.to_str().unwrap())
                .is_err());
        }
    }

    #[test]
    fn test_validate_command_blocks_unknown() {
        let sandbox = Sandbox::new(PathBuf::from("."));
        assert!(sandbox.validate_command("rm").is_err());
        assert!(sandbox.validate_command("dir").is_ok());
    }
}
