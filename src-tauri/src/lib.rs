mod commands;
mod core;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::read_file,
            commands::write_file,
            commands::exec_command,
            commands::clipboard_read,
            commands::clipboard_write,
            commands::http_get,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
