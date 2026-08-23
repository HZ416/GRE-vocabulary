use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection, Executor};
use std::{fs, path::PathBuf, time::{SystemTime, UNIX_EPOCH}};

fn temporary_database(name: &str) -> PathBuf {
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    std::env::temp_dir().join(format!("gre-vocabulary-{name}-{}-{nonce}.db", std::process::id()))
}

async fn connect(path: &PathBuf, create: bool) -> sqlx::SqliteConnection {
    SqliteConnectOptions::new().filename(path).create_if_missing(create).connect().await.unwrap()
}

#[test]
fn file_backed_restart_and_forward_migrations_preserve_progress() {
    tauri::async_runtime::block_on(async {
        let path = temporary_database("migration-restart");
        let mut database = connect(&path, true).await;
        database.execute(include_str!("../../migrations/001_initial.sql")).await.unwrap();
        database.execute("INSERT INTO words (id, lemma, notes, created_at, updated_at) VALUES ('word-1', 'equivocal', 'keep me', '2026-01-01', '2026-01-01')").await.unwrap();
        database.execute("INSERT INTO user_word_state (word_id, status, total_reviews, correct_reviews, next_review_at) VALUES ('word-1', 'review', 7, 6, '2026-09-01T00:00:00Z')").await.unwrap();
        database.execute("INSERT INTO review_logs (id, word_id, reviewed_at, rating) VALUES ('review-1', 'word-1', '2026-08-23T00:00:00Z', 3)").await.unwrap();
        database.close().await.unwrap();

        database = connect(&path, false).await;
        database.execute(include_str!("../../migrations/002_fsrs_card_state.sql")).await.unwrap();
        database.execute(include_str!("../../migrations/003_app_settings.sql")).await.unwrap();
        database.execute("UPDATE user_word_state SET fsrs_state = 2, fsrs_due = next_review_at, fsrs_reps = 7 WHERE word_id = 'word-1'").await.unwrap();
        database.close().await.unwrap();

        database = connect(&path, false).await;
        let row: (String, String, i64, i64, String) = sqlx::query_as(
            "SELECT w.lemma, w.notes, s.total_reviews, s.fsrs_reps, s.fsrs_due FROM words w JOIN user_word_state s ON s.word_id = w.id WHERE w.id = 'word-1'",
        ).fetch_one(&mut database).await.unwrap();
        assert_eq!(row, ("equivocal".into(), "keep me".into(), 7, 7, "2026-09-01T00:00:00Z".into()));
        let review_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM review_logs").fetch_one(&mut database).await.unwrap();
        let settings_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM app_settings WHERE id = 1").fetch_one(&mut database).await.unwrap();
        assert_eq!((review_count, settings_count), (1, 1));
        database.close().await.unwrap();
        fs::remove_file(path).unwrap();
    });
}
