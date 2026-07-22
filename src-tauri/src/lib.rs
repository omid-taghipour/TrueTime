use tauri_plugin_dialog::DialogExt;

/// Open a native "Save As" dialog and write `contents` to the chosen path.
/// The frontend supplies only the file body and a suggested name — never a
/// path — so this never becomes an arbitrary-file-write primitive for the
/// webview. Returns `false` if the user cancels.
#[tauri::command]
fn export_stopwatches(
    app: tauri::AppHandle,
    contents: String,
    default_name: String,
) -> Result<bool, String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&default_name)
        .blocking_save_file();

    match path {
        Some(p) => {
            let p = p.into_path().map_err(|e| e.to_string())?;
            std::fs::write(&p, contents).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![export_stopwatches])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
