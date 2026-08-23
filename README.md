# GRE Vocabulary

A local-first GRE vocabulary app built with React, TypeScript, Vite, Tauri, and SQLite.

Implemented flows include CSV vocabulary import with progress-safe source merging, vocabulary search and detail pages with personal notes, restart-safe FSRS review with daily queues and keyboard shortcuts, persistent study/display preferences, English/Chinese interface switching, portable vocabulary/progress exports, and full SQLite backups.

## Development

Prerequisites: Node.js 24 LTS and the stable Rust toolchain.

```sh
npm install
npm run test
npm run test:performance
npm run test:e2e
npm run typecheck
npm run lint
npm run tauri dev
```

The SQLite database is stored in the platform-specific application data directory. Open **Settings** and run the database health check to verify the desktop connection.

Choose **Settings → Interface language** to switch the main interface between English and Chinese. The selection is stored in the local SQLite database and is included in progress exports and full backups.

Use **Settings → Export and backup** to save vocabulary as CSV or JSON, learning progress as JSON, or a complete `.db` backup. CSV and JSON are portable data exports; the `.db` file is the complete local snapshot, including notes, settings, flags, FSRS state, and review history.

Use **Restore database backup** to replace local data from a compatible SQLite backup. Before replacement, the app checks SQLite integrity, schema version, required tables and columns, settings, and foreign-key relationships. The previous database is retained as `gre-vocabulary-before-restore.db` in the application data directory, and a failed final validation automatically rolls it back.

CSV imports require `lemma` and `source_name` columns. Optional columns include `part_of_speech`, `definition_en`, `definition_zh`, `ipa`, `example_sentence`, `source_group`, `source_rank`, and `is_high_priority`.

On a fresh install, the Dashboard walks through the three-step setup. The Vocabulary page shows an example row and can save a UTF-8 CSV template with every supported column.

The regular suite includes repository, FSRS persistence, backup validation, real file-backed migration, and core React page tests. The Playwright suite covers CSV import, favorites, keyboard-driven review, statistics, and Dashboard progress in one browser flow backed by an isolated in-memory SQLite database. The separate performance suite exercises import, search, and daily queue creation with 20,000 words. GitHub Actions validates the project and builds unsigned installers for macOS Apple Silicon, macOS Intel, and Windows x64.

See [SPEC.md](SPEC.md) for product requirements, [ROADMAP.md](ROADMAP.md) for implementation status, [ARCHITECTURE.md](ARCHITECTURE.md) for engineering decisions, and [DATA_SOURCES.md](DATA_SOURCES.md) for dataset policy.
