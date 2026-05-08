#[cfg(windows)]
use windows::Win32::Foundation::HWND;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::*;

/// Set window to bottom of z-order (below desktop icons on some setups)
#[cfg(windows)]
pub fn set_window_bottom(hwnd: isize) {
    unsafe {
        let hwnd = HWND(hwnd as *mut _);
        let _ = SetWindowPos(
            hwnd,
            HWND_BOTTOM,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

/// Set window as tool window (hidden from taskbar and Alt+Tab)
#[cfg(windows)]
pub fn set_tool_window(hwnd: isize) {
    unsafe {
        let hwnd = HWND(hwnd as *mut _);
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        let _ = SetWindowLongW(
            hwnd,
            GWL_EXSTYLE,
            ex_style | WS_EX_TOOLWINDOW.0 as i32 | WS_EX_NOACTIVATE.0 as i32,
        );
    }
}

/// Enable or disable click-through (mouse events pass through to windows below)
#[cfg(windows)]
pub fn set_click_through(hwnd: isize, enable: bool) {
    unsafe {
        let hwnd = HWND(hwnd as *mut _);
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        if enable {
            let _ = SetWindowLongW(
                hwnd,
                GWL_EXSTYLE,
                ex_style | WS_EX_TRANSPARENT.0 as i32,
            );
        } else {
            let _ = SetWindowLongW(
                hwnd,
                GWL_EXSTYLE,
                ex_style & !(WS_EX_TRANSPARENT.0 as i32),
            );
        }
    }
}

// Stub implementations for non-Windows platforms
#[cfg(not(windows))]
pub fn set_window_bottom(_hwnd: isize) {}

#[cfg(not(windows))]
pub fn set_tool_window(_hwnd: isize) {}

#[cfg(not(windows))]
pub fn set_click_through(_hwnd: isize, _enable: bool) {}
