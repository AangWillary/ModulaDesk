use serde::Serialize;

#[derive(Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
}

/// Checks if a command is allowed. Only specific safe commands are permitted.
fn is_command_allowed(command: &str) -> Result<(), String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    // Extract the base command (first token)
    let base_cmd = trimmed
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_lowercase();

    // Strip path prefixes to get just the command name
    let cmd_name = base_cmd
        .rsplit(|c| c == '/' || c == '\\')
        .next()
        .unwrap_or(&base_cmd);

    // Whitelist of allowed commands
    let allowed = [
        // System info
        "whoami", "hostname", "uname", "ver", "systeminfo",
        // File listing (safe read-only)
        "ls", "dir", "tree", "cat", "type", "head", "tail",
        // Disk info
        "df", "du", "diskpart",
        // Process info (read-only)
        "tasklist", "ps",
        // Network info (read-only)
        "ipconfig", "ifconfig", "ping", "nslookup",
        // Date/time
        "date", "time",
        // Environment
        "echo", "set", "env", "printenv",
        // Package managers (for dev workflows)
        "npm", "npx", "node", "python", "python3", "pip", "pip3",
        "cargo", "rustc", "git",
        // Shell builtins that are safe
        "cd", "pwd", "cls", "clear",
        // Windows Terminal / PowerShell launching
        "wt", "powershell", "pwsh", "cmd",
    ];

    if allowed.contains(&cmd_name) {
        Ok(())
    } else {
        Err(format!(
            "Command '{}' is not in the allowed list",
            cmd_name
        ))
    }
}

#[tauri::command]
pub fn exec_command(command: String) -> Result<CommandResult, String> {
    is_command_allowed(&command)?;

    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args(["/C", &command])
            .output()
    } else {
        std::process::Command::new("sh")
            .args(["-c", &command])
            .output()
    }
    .map_err(|e| e.to_string())?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}
