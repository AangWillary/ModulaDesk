#[cfg(windows)]
mod win32 {
    #![allow(non_snake_case, dead_code)]

    pub type HWND = *mut core::ffi::c_void;
    pub type LONG = i32;
    pub type DWORD = u32;
    pub type BOOL = i32;

    pub const HWND_BOTTOM: HWND = 1 as HWND;
    pub const GWL_EXSTYLE: i32 = -20;
    pub const SWP_NOMOVE: DWORD = 0x0002;
    pub const SWP_NOSIZE: DWORD = 0x0001;
    pub const SWP_NOACTIVATE: DWORD = 0x0010;
    pub const WS_EX_TOOLWINDOW: DWORD = 0x00000080;
    pub const WS_EX_NOACTIVATE: DWORD = 0x08000000;
    pub const WS_EX_TRANSPARENT: DWORD = 0x00000020;

    extern "system" {
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
    }
}

/// Set window to bottom of z-order
#[cfg(windows)]
pub fn set_window_bottom(hwnd: isize) {
    unsafe {
        win32::SetWindowPos(
            hwnd as win32::HWND,
            win32::HWND_BOTTOM,
            0,
            0,
            0,
            0,
            win32::SWP_NOMOVE | win32::SWP_NOSIZE | win32::SWP_NOACTIVATE,
        );
    }
}

/// Set window as tool window (hidden from taskbar and Alt+Tab)
#[cfg(windows)]
pub fn set_tool_window(hwnd: isize) {
    unsafe {
        let h = hwnd as win32::HWND;
        let ex_style = win32::GetWindowLongW(h, win32::GWL_EXSTYLE);
        win32::SetWindowLongW(
            h,
            win32::GWL_EXSTYLE,
            ex_style | win32::WS_EX_TOOLWINDOW as i32 | win32::WS_EX_NOACTIVATE as i32,
        );
    }
}

/// Enable or disable click-through
#[allow(dead_code)]
#[cfg(windows)]
pub fn set_click_through(hwnd: isize, enable: bool) {
    unsafe {
        let h = hwnd as win32::HWND;
        let ex_style = win32::GetWindowLongW(h, win32::GWL_EXSTYLE);
        if enable {
            win32::SetWindowLongW(
                h,
                win32::GWL_EXSTYLE,
                ex_style | win32::WS_EX_TRANSPARENT as i32,
            );
        } else {
            win32::SetWindowLongW(
                h,
                win32::GWL_EXSTYLE,
                ex_style & !(win32::WS_EX_TRANSPARENT as i32),
            );
        }
    }
}

// Stubs for non-Windows
#[cfg(not(windows))]
pub fn set_window_bottom(_hwnd: isize) {}

#[cfg(not(windows))]
pub fn set_tool_window(_hwnd: isize) {}

#[cfg(not(windows))]
pub fn set_click_through(_hwnd: isize, _enable: bool) {}
