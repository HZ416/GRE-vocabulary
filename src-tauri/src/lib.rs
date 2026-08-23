use tauri_plugin_sql::{Migration, MigrationKind};

mod backup;
#[cfg(test)]
mod database_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "initial schema",
        sql: include_str!("../../migrations/001_initial.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 2,
        description: "persist complete FSRS card state",
        sql: include_str!("../../migrations/002_fsrs_card_state.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 3,
        description: "persistent application settings",
        sql: include_str!("../../migrations/003_app_settings.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![backup::restore_database])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:gre-vocabulary.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running GRE Vocabulary");
}
