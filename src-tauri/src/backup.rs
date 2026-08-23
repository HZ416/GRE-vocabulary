use serde::Serialize;
use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection};
use std::{collections::HashSet, fs, path::{Path, PathBuf}};
use tauri::Manager;

const DATABASE_NAME: &str = "gre-vocabulary.db";
const ROLLBACK_NAME: &str = "gre-vocabulary-before-restore.db";
const SUPPORTED_SCHEMA_VERSION: i64 = 4;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreSummary {
    word_count: i64,
    review_count: i64,
    rollback_path: String,
}

async fn validate_database(path: &Path) -> Result<(i64, i64), String> {
    if !path.is_file() {
        return Err("The selected backup is not a file".into());
    }
    let options = SqliteConnectOptions::new().filename(path).read_only(true);
    let mut connection = options.connect().await
        .map_err(|error| format!("Cannot open the selected file as SQLite: {error}"))?;

    let result = async {
        let integrity: String = sqlx::query_scalar("PRAGMA integrity_check")
            .fetch_one(&mut connection).await
            .map_err(|error| format!("SQLite integrity check failed: {error}"))?;
        if integrity != "ok" {
            return Err(format!("SQLite integrity check failed: {integrity}"));
        }

        let required_columns: [(&str, &[&str]); 6] = [
            ("words", &["id", "lemma", "notes", "priority_score"]),
            ("word_sources", &["word_id", "source_name"]),
            ("user_word_state", &["word_id", "status", "fsrs_due", "fsrs_state", "fsrs_reps"]),
            ("review_logs", &["id", "word_id", "reviewed_at", "rating"]),
            ("app_settings", &["id", "new_words_per_day", "max_reviews_per_day", "interface_language"]),
            ("_sqlx_migrations", &["version", "success"]),
        ];
        for (table, columns) in required_columns {
            let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?")
                .bind(table).fetch_one(&mut connection).await
                .map_err(|error| format!("Cannot inspect backup schema: {error}"))?;
            if exists != 1 {
                return Err(format!("This is not a GRE Vocabulary backup: missing table {table}"));
            }
            let query = format!("SELECT name FROM pragma_table_info('{table}')");
            let present: HashSet<String> = sqlx::query_scalar::<_, String>(&query)
                .fetch_all(&mut connection).await
                .map_err(|error| format!("Cannot inspect {table}: {error}"))?.into_iter().collect();
            if let Some(column) = columns.iter().find(|column| !present.contains(**column)) {
                return Err(format!("Backup table {table} is missing column {column}"));
            }
        }

        let version: Option<i64> = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(&mut connection).await.map_err(|error| format!("Cannot read backup version: {error}"))?;
        if version.unwrap_or(0) > SUPPORTED_SCHEMA_VERSION {
            return Err(format!("This backup was created by a newer app version (schema {})", version.unwrap_or(0)));
        }
        let migration_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 1 AND version BETWEEN 1 AND 4")
            .fetch_one(&mut connection).await.map_err(|error| format!("Cannot read backup migrations: {error}"))?;
        if version != Some(SUPPORTED_SCHEMA_VERSION) || migration_count != SUPPORTED_SCHEMA_VERSION {
            return Err("The backup schema is incomplete or unsupported".into());
        }

        let settings: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM app_settings WHERE id = 1")
            .fetch_one(&mut connection).await.map_err(|error| format!("Cannot validate settings: {error}"))?;
        if settings != 1 {
            return Err("The backup does not contain valid application settings".into());
        }
        let violations = sqlx::query("PRAGMA foreign_key_check").fetch_all(&mut connection).await
            .map_err(|error| format!("Foreign-key check failed: {error}"))?;
        if !violations.is_empty() {
            return Err(format!("The backup contains {} broken data relationship(s)", violations.len()));
        }
        let words = sqlx::query_scalar("SELECT COUNT(*) FROM words").fetch_one(&mut connection).await
            .map_err(|error| format!("Cannot count words: {error}"))?;
        let reviews = sqlx::query_scalar("SELECT COUNT(*) FROM review_logs").fetch_one(&mut connection).await
            .map_err(|error| format!("Cannot count reviews: {error}"))?;
        Ok((words, reviews))
    }.await;
    connection.close().await.map_err(|error| format!("Cannot close backup after validation: {error}"))?;
    result
}

fn remove_sidecars(database: &Path) -> Result<(), String> {
    let value = database.to_string_lossy();
    for suffix in ["-wal", "-shm"] {
        let path = PathBuf::from(format!("{value}{suffix}"));
        if path.exists() {
            fs::remove_file(&path).map_err(|error| format!("Cannot remove stale SQLite sidecar {}: {error}", path.display()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn restore_database(app: tauri::AppHandle, source_path: String) -> Result<RestoreSummary, String> {
    let source = PathBuf::from(source_path).canonicalize()
        .map_err(|error| format!("Cannot access selected backup: {error}"))?;
    let app_data = app.path().app_config_dir().map_err(|error| format!("Cannot locate application data: {error}"))?;
    fs::create_dir_all(&app_data).map_err(|error| format!("Cannot prepare application data directory: {error}"))?;
    let target = app_data.join(DATABASE_NAME);
    if target.canonicalize().ok().as_ref() == Some(&source) {
        return Err("The selected file is already the active database".into());
    }
    let (word_count, review_count) = validate_database(&source).await?;
    let rollback = app_data.join(ROLLBACK_NAME);

    if target.exists() {
        fs::copy(&target, &rollback).map_err(|error| format!("Cannot create the before-restore safety copy: {error}"))?;
    }
    remove_sidecars(&target)?;
    if let Err(error) = fs::copy(&source, &target) {
        if rollback.exists() { let _ = fs::copy(&rollback, &target); }
        return Err(format!("Cannot replace the local database: {error}"));
    }
    if let Err(error) = validate_database(&target).await {
        if rollback.exists() { let _ = fs::copy(&rollback, &target); }
        return Err(format!("Restored database failed final validation; the original was recovered: {error}"));
    }
    Ok(RestoreSummary { word_count, review_count, rollback_path: rollback.to_string_lossy().into_owned() })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Executor;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_database(name: &str) -> PathBuf {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        std::env::temp_dir().join(format!("gre-vocabulary-{name}-{}-{nonce}.db", std::process::id()))
    }

    async fn create_valid_database(path: &Path) {
        let options = SqliteConnectOptions::new().filename(path).create_if_missing(true);
        let mut connection = options.connect().await.unwrap();
        connection.execute(include_str!("../../migrations/001_initial.sql")).await.unwrap();
        connection.execute(include_str!("../../migrations/002_fsrs_card_state.sql")).await.unwrap();
        connection.execute(include_str!("../../migrations/003_app_settings.sql")).await.unwrap();
        connection.execute(include_str!("../../migrations/004_interface_language.sql")).await.unwrap();
        connection.execute("CREATE TABLE _sqlx_migrations (version BIGINT PRIMARY KEY, description TEXT NOT NULL, installed_on TEXT NOT NULL, success BOOLEAN NOT NULL, checksum BLOB NOT NULL, execution_time BIGINT NOT NULL)").await.unwrap();
        connection.execute("INSERT INTO _sqlx_migrations VALUES (1, 'one', '', 1, X'00', 0), (2, 'two', '', 1, X'00', 0), (3, 'three', '', 1, X'00', 0), (4, 'four', '', 1, X'00', 0)").await.unwrap();
        connection.close().await.unwrap();
    }

    #[test]
    fn accepts_complete_backups_and_rejects_unrelated_sqlite_files() {
        tauri::async_runtime::block_on(async {
            let valid = temporary_database("valid");
            create_valid_database(&valid).await;
            assert_eq!(validate_database(&valid).await.unwrap(), (0, 0));
            let invalid = temporary_database("invalid");
            let options = SqliteConnectOptions::new().filename(&invalid).create_if_missing(true);
            let mut connection = options.connect().await.unwrap();
            connection.execute("CREATE TABLE unrelated (id INTEGER)").await.unwrap();
            connection.close().await.unwrap();
            assert!(validate_database(&invalid).await.unwrap_err().contains("missing table words"));
            fs::remove_file(valid).unwrap();
            fs::remove_file(invalid).unwrap();
        });
    }
}
