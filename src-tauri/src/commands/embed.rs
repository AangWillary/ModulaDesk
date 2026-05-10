use serde::Serialize;

#[derive(Serialize)]
pub struct WindowInfo {
    pub hwnd: isize,
    pub title: String,
    pub class_name: String,
    pub process_name: String,
}

#[cfg(windows)]
mod win32 {
    #![allow(non_snake_case, dead_code)]

    use std::ffi::c_void;
    use std::ptr;

    pub type HWND = *mut c_void;
    pub type BOOL = i32;
    pub type DWORD = u32;
    pub type LONG = i32;

    pub const GWL_STYLE: i32 = -16;
    pub const GWL_EXSTYLE: i32 = -20;
    pub const WS_CHILD: DWORD = 0x40000000;
    pub const WS_POPUP: DWORD = 0x80000000;
    pub const WS_VISIBLE: DWORD = 0x10000000;
    pub const SWP_FRAMECHANGED: DWORD = 0x0020;
    pub const SWP_NOACTIVATE: DWORD = 0x0010;
    pub const SWP_NOZORDER: DWORD = 0x0004;
    pub const SWP_SHOWWINDOW: DWORD = 0x0040;

    extern "system" {
        pub fn SetParent(hWndChild: HWND, hWndNewParent: HWND) -> HWND;
        pub fn SetWindowPos(
            hWnd: HWND,
            hWndInsertAfter: HWND,
            X: i32,
            Y: i32,
            cx: i32,
            cy: i32,
            uFlags: DWORD,
        ) -> BOOL;
        pub fn GetWindowLongW(hWnd: HWND, nIndex: i32) -> LONG;
        pub fn SetWindowLongW(hWnd: HWND, nIndex: i32, dwNewLong: LONG) -> LONG;
        pub fn ShowWindow(hWnd: HWND, nCmdShow: i32) -> BOOL;
        pub fn MoveWindow(hWnd: HWND, X: i32, Y: i32, nWidth: i32, nHeight: i32, bRepaint: BOOL) -> BOOL;
        pub fn IsWindow(hWnd: HWND) -> BOOL;
    }

    pub const SW_SHOW: i32 = 5;

    // Callback for EnumWindows
    pub type WNDENUMPROC = Option<unsafe extern "system" fn(hwnd: HWND, lparam: isize) -> BOOL>;

    extern "system" {
        pub fn EnumWindows(lpEnumFunc: WNDENUMPROC, lparam: isize) -> BOOL;
        pub fn GetWindowTextW(hWnd: HWND, lpString: *mut u16, nMaxCount: i32) -> i32;
        pub fn GetClassNameW(hWnd: HWND, lpClassName: *mut u16, nMaxCount: i32) -> i32;
        pub fn IsWindowVisible(hWnd: HWND) -> BOOL;
        pub fn GetWindowThreadProcessId(hWnd: HWND, lpdwProcessId: *mut DWORD) -> DWORD;
    }

    pub unsafe fn hwnd_to_isize(h: HWND) -> isize {
        h as isize
    }

    pub unsafe fn isize_to_hwnd(h: isize) -> HWND {
        h as HWND
    }
}

/// List all visible windows with titles
#[tauri::command]
pub fn list_windows() -> Result<Vec<WindowInfo>, String> {
    #[cfg(windows)]
    {
        let mut windows = Vec::new();

        unsafe extern "system" fn enum_callback(
            hwnd: win32::HWND,
            lparam: isize,
        ) -> win32::BOOL {
            unsafe {
                if win32::IsWindowVisible(hwnd) == 0 {
                    return 1;
                }

                let mut title_buf = [0u16; 256];
                let title_len = win32::GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 256);
                if title_len == 0 {
                    return 1;
                }
                let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

                let mut class_buf = [0u16; 256];
                let class_len = win32::GetClassNameW(hwnd, class_buf.as_mut_ptr(), 256);
                let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);

                let mut pid: win32::DWORD = 0;
                win32::GetWindowThreadProcessId(hwnd, &mut pid as *mut _);

                let windows = &mut *(lparam as *mut Vec<WindowInfo>);
                windows.push(WindowInfo {
                    hwnd: win32::hwnd_to_isize(hwnd),
                    title,
                    class_name,
                    process_name: pid.to_string(),
                });

                1
            }
        }

        unsafe {
            win32::EnumWindows(Some(enum_callback), &mut windows as *mut _ as isize);
        }

        Ok(windows)
    }

    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}

/// Embed an external window into the Tauri window
#[tauri::command]
pub fn embed_window(
    app: tauri::AppHandle,
    target_hwnd: isize,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<bool, String> {
    #[cfg(windows)]
    {
        unsafe {
            let target = win32::isize_to_hwnd(target_hwnd);

            if win32::IsWindow(target) == 0 {
                return Err("Target window does not exist".to_string());
            }

            // Get Tauri window HWND
            let tauri_hwnd = app
                .get_webview_window("main")
                .ok_or("Main window not found")?
                .hwnd()
                .map_err(|e| e.to_string())?;

            let parent = win32::isize_to_hwnd(tauri_hwnd.0 as isize);

            // Set the target window as child of Tauri window
            win32::SetParent(target, parent);

            // Update window style to child
            let style = win32::GetWindowLongW(target, win32::GWL_STYLE);
            win32::SetWindowLongW(
                target,
                win32::GWL_STYLE,
                (style | win32::WS_CHILD as i32) & !(win32::WS_POPUP as i32),
            );

            // Position and size
            win32::MoveWindow(target, x, y, width, height, 1);
            win32::ShowWindow(target, win32::SW_SHOW);

            Ok(true)
        }
    }

    #[cfg(not(windows))]
    {
        let _ = (app, target_hwnd, x, y, width, height);
        Err("Window embedding is only supported on Windows".to_string())
    }
}

/// Resize an embedded window
#[tauri::command]
pub fn resize_embedded(
    target_hwnd: isize,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<bool, String> {
    #[cfg(windows)]
    {
        unsafe {
            let target = win32::isize_to_hwnd(target_hwnd);
            if win32::IsWindow(target) == 0 {
                return Err("Target window does not exist".to_string());
            }
            win32::MoveWindow(target, x, y, width, height, 1);
            Ok(true)
        }
    }

    #[cfg(not(windows))]
    {
        let _ = (target_hwnd, x, y, width, height);
        Err("Window embedding is only supported on Windows".to_string())
    }
}

/// Detach an embedded window (restore to standalone)
#[tauri::command]
pub fn detach_window(target_hwnd: isize) -> Result<bool, String> {
    #[cfg(windows)]
    {
        unsafe {
            let target = win32::isize_to_hwnd(target_hwnd);
            if win32::IsWindow(target) == 0 {
                return Err("Target window does not exist".to_string());
            }

            // Remove parent
            win32::SetParent(target, std::ptr::null_mut());

            // Restore window style
            let style = win32::GetWindowLongW(target, win32::GWL_STYLE);
            win32::SetWindowLongW(
                target,
                win32::GWL_STYLE,
                (style & !(win32::WS_CHILD as i32)) | win32::WS_POPUP as i32,
            );

            Ok(true)
        }
    }

    #[cfg(not(windows))]
    {
        let _ = target_hwnd;
        Err("Window embedding is only supported on Windows".to_string())
    }
}
