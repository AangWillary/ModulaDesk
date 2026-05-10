use serde::Serialize;

#[derive(Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn exec_command(command: String) -> Result<CommandResult, String> {
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
