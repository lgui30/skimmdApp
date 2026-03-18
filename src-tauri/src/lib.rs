use serde::Serialize;

#[derive(Serialize, Clone)]
struct OpenResult {
    path: String,
    is_directory: bool,
}

/// Opens a native macOS Finder dialog that allows selecting BOTH files and folders.
#[tauri::command]
async fn open_file_or_folder(app: tauri::AppHandle) -> Result<Option<OpenResult>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.run_on_main_thread(move || {
        let result = open_panel_macos();
        let _ = tx.send(result);
    })
    .map_err(|e| e.to_string())?;

    rx.recv().map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn open_panel_macos() -> Option<OpenResult> {
    use objc::runtime::{Class, Object, BOOL, YES, NO};
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        // Create autorelease pool to manage ObjC memory
        let pool: *mut Object = msg_send![Class::get("NSAutoreleasePool")?, new];

        let result = (|| -> Option<OpenResult> {
            let panel: *mut Object = msg_send![Class::get("NSOpenPanel")?, openPanel];

            let _: () = msg_send![panel, setCanChooseFiles: YES];
            let _: () = msg_send![panel, setCanChooseDirectories: YES];
            let _: () = msg_send![panel, setAllowsMultipleSelection: NO];

            // Set prompt text
            let prompt = nsstring("Open");
            let _: () = msg_send![panel, setPrompt: prompt];

            let result: isize = msg_send![panel, runModal];
            if result == 1 {
                let urls: *mut Object = msg_send![panel, URLs];
                let count: usize = msg_send![urls, count];
                if count == 0 {
                    return None;
                }
                let url: *mut Object = msg_send![urls, objectAtIndex: 0usize];
                let path_obj: *mut Object = msg_send![url, path];
                if path_obj.is_null() {
                    return None;
                }
                let c_str: *const i8 = msg_send![path_obj, UTF8String];
                if c_str.is_null() {
                    return None;
                }
                let path = std::ffi::CStr::from_ptr(c_str)
                    .to_string_lossy()
                    .into_owned();
                let is_dir = std::fs::metadata(&path)
                    .map(|m| m.is_dir())
                    .unwrap_or(false);
                Some(OpenResult {
                    path,
                    is_directory: is_dir,
                })
            } else {
                None
            }
        })();

        let _: () = msg_send![pool, drain];
        result
    }
}

#[cfg(target_os = "macos")]
unsafe fn nsstring(s: &str) -> *mut objc::runtime::Object {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};
    let c_string = std::ffi::CString::new(s).unwrap();
    msg_send![Class::get("NSString").unwrap(), stringWithUTF8String: c_string.as_ptr()]
}

#[cfg(not(target_os = "macos"))]
fn open_panel_macos() -> Option<OpenResult> {
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![open_file_or_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
