# GRE Vocabulary

A local-first GRE vocabulary app built with React, TypeScript, Vite, Tauri, and SQLite.

Implemented flows include CSV vocabulary import with progress-safe source merging, vocabulary search and detail pages with personal notes, restart-safe FSRS review with daily queues and keyboard shortcuts, persistent study/display preferences, portable vocabulary/progress exports, and full SQLite backups.

## Development

Prerequisites: Node.js 24 LTS and the stable Rust toolchain.

```sh
npm install
npm run test
npm run typecheck
npm run lint
npm run tauri dev
```

The SQLite database is stored in the platform-specific application data directory. Open **Settings** and run the database health check to verify the desktop connection.

Use **Settings → Export and backup** to save vocabulary as CSV or JSON, learning progress as JSON, or a complete `.db` backup. CSV and JSON are portable data exports; the `.db` file is the complete local snapshot, including notes, settings, flags, FSRS state, and review history.

CSV imports require `lemma` and `source_name` columns. Optional columns include `part_of_speech`, `definition_en`, `definition_zh`, `ipa`, `example_sentence`, `source_group`, `source_rank`, and `is_high_priority`.

See [SPEC.md](SPEC.md) for product requirements, [ROADMAP.md](ROADMAP.md) for implementation status, [ARCHITECTURE.md](ARCHITECTURE.md) for engineering decisions, and [DATA_SOURCES.md](DATA_SOURCES.md) for dataset policy.
