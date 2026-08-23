# GRE Vocabulary

A local-first GRE vocabulary app built with React, TypeScript, Vite, Tauri, and SQLite.

Implemented flows include CSV vocabulary import with progress-safe source merging, vocabulary search and detail pages, and restart-safe FSRS review with daily queues and keyboard shortcuts.

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

CSV imports require `lemma` and `source_name` columns. Optional columns include `part_of_speech`, `definition_en`, `definition_zh`, `ipa`, `example_sentence`, `source_group`, `source_rank`, and `is_high_priority`.

See [SPEC.md](SPEC.md) for product requirements, [ARCHITECTURE.md](ARCHITECTURE.md) for engineering decisions, and [DATA_SOURCES.md](DATA_SOURCES.md) for dataset policy.
