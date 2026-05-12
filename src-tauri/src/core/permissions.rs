use crate::types::{AppError, ErrorCode, Permission};
use std::collections::HashMap;

pub struct PermissionChecker {
    granted: HashMap<String, Vec<Permission>>,
}

impl PermissionChecker {
    pub fn new() -> Self {
        Self {
            granted: HashMap::new(),
        }
    }

    pub fn check(&self, instance_id: &str, perm: Permission) -> Result<(), AppError> {
        let perms = self.granted.get(instance_id);
        match perms {
            Some(p) if p.contains(&perm) => Ok(()),
            _ => Err(AppError::new(
                ErrorCode::PermissionDenied,
                format!(
                    "Permission {:?} not granted for instance {}",
                    perm, instance_id
                ),
            )),
        }
    }

    pub fn grant(&mut self, instance_id: &str, perm: Permission) {
        self.granted
            .entry(instance_id.to_string())
            .or_default()
            .push(perm);
    }

    pub fn revoke(&mut self, instance_id: &str, perm: Permission) {
        if let Some(perms) = self.granted.get_mut(instance_id) {
            perms.retain(|p| !matches!((p, &perm), (Permission::FileRead, Permission::FileRead)));
        }
    }
}
