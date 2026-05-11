use serde::Serialize;

#[derive(Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
}

/// Allowed executables (by basename, case-insensitive on Windows).
/// These are invoked directly via Command::new() — NO shell is used.
const ALLOWED_COMMANDS: &[&str] = &[
    // System info
    "whoami", "hostname", "uname", "ver", "systeminfo",
    // File listing (read-only)
    "ls", "dir", "tree", "cat", "type", "head", "tail",
    // Disk info
    "df", "du",
    // Process info (read-only)
    "tasklist", "ps",
    // Network info (read-only)
    "ipconfig", "ifconfig", "ping", "nslookup",
    // Date/time
    "date", "time",
    // Environment
    "echo", "set", "env", "printenv",
    // Package managers / dev tools
    "npm", "npx", "cargo", "rustc", "git",
    // Safe builtins
    "pwd",
];

/// Parses a command string into (program, args) and validates against whitelist.
/// Uses whitespace splitting — no shell metacharacter interpretation.
fn parse_and_validate(command: &str) -> Result<(String, Vec<String>), String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    let parts: Vec<String> = trimmed.split_whitespace().map(String::from).collect();
    let program = &parts[0];

    // Extract basename for whitelist check
    let basename = program
        .rsplit(|c: char| c == '/' || c == '\\')
        .next()
        .unwrap_or(program)
        .to_lowercase();

    // On Windows, strip .exe extension for comparison
    let basename = basename.strip_suffix(".exe").unwrap_or(&basename);

    if !ALLOWED_COMMANDS.contains(&basename) {
        return Err(format!(
            "Command '{}' is not in the allowed list",
            basename
        ));
    }

    let args = parts[1..].to_vec();
    Ok((program.clone(), args))
}

#[tauri::command]
pub fn exec_command(command: String) -> Result<CommandResult, String> {
    let (program, args) = parse_and_validate(&command)?;

    // Execute directly — no shell involved, so metacharacters like ; & | are literal args
    let output = std::process::Command::new(&program)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}
