mod commands;
mod core;

use core::window;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Configure window for desktop embedding on Windows
            if let Some(win) = app.get_webview_window("main") {
                #[cfg(windows)]
                {
                    if let Ok(hwnd) = win.hwnd() {
                        let h = hwnd.0 as isize;
                        window::set_tool_window(h);
                        window::set_window_bottom(h);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::read_file,
            commands::write_file,
            commands::exec_command,
            commands::clipboard_read,
            commands::clipboard_write,
            commands::http_get,
            commands::read_dir,
            commands::open_path,
            commands::list_windows,
            commands::embed_window,
            commands::resize_embedded,
            commands::detach_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
