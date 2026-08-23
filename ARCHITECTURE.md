# Architecture decisions

## Local database is the source of truth

The desktop app opens `sqlite:gre-vocabulary.db` through the official Tauri SQL plugin. React state is limited to transient UI state; persisted vocabulary and progress belong in SQLite.

## One forward-only migration source

Versioned SQL lives in `migrations/`. The same `001_initial.sql` file is included by the Tauri runtime and imported by the TypeScript migration test harness. Production migrations are applied by the Tauri plugin before the frontend connects. Migrations must be additive and preserve user data.

## Ports separate persistence from features

Feature code depends on repository interfaces in `src/services/repositories.ts`, not directly on Tauri. This keeps vocabulary import and FSRS scheduling independently testable in later phases.

## Validation at boundaries

Zod validates data returned across untyped boundaries such as SQLite health queries. TypeScript interfaces use application-style camelCase while adapters own database row mapping.

## Interface language is local state

English copy is the translation key and fallback; a compact in-app dictionary supplies Chinese copy without a runtime service or network request. Migration 004 persists the selected language in `app_settings`, so it follows the same backup and restore path as other preferences.

## Vocabulary updates are progress-safe

CSV rows are normalized and deduplicated before persistence. Imports only fill missing word metadata, merge sources using a unique `(word_id, source_name)` constraint, and recalculate priority from persisted sources. They never update notes or study-state tables.

## FSRS cards are fully restart-safe

The scheduler is deterministic and isolated in `src/fsrs/`. Every rating stores the complete card state and review log in one SQLite transaction. Migration 002 adds the scheduling fields required to reconstruct a `ts-fsrs` card without silently resetting it.

## Database restore fails safely

Restore is handled by a dedicated Rust command after frontend SQL connections are checkpointed and closed. A candidate must pass SQLite integrity, schema, migration, settings, and foreign-key checks. The active database is copied to `gre-vocabulary-before-restore.db` before replacement; the copied candidate is validated again and the original is recovered if that final check fails.

## Desktop privileges are explicit

The production WebView CSP permits only bundled content and Tauri IPC. Its capability grants individual SQL load/select/execute/close commands, scoped file export/copy operations, and the specific dialog commands used by the interface. Cross-platform CI builds the same configuration for Apple Silicon, Intel macOS, and Windows x64.
