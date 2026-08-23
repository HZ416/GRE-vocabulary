# Architecture decisions

## Local database is the source of truth

The desktop app opens `sqlite:gre-vocabulary.db` through the official Tauri SQL plugin. React state is limited to transient UI state; persisted vocabulary and progress belong in SQLite.

## One forward-only migration source

Versioned SQL lives in `migrations/`. The same `001_initial.sql` file is included by the Tauri runtime and imported by the TypeScript migration test harness. Production migrations are applied by the Tauri plugin before the frontend connects. Migrations must be additive and preserve user data.

## Ports separate persistence from features

Feature code depends on repository interfaces in `src/services/repositories.ts`, not directly on Tauri. This keeps vocabulary import and FSRS scheduling independently testable in later phases.

## Validation at boundaries

Zod validates data returned across untyped boundaries such as SQLite health queries. TypeScript interfaces use application-style camelCase while adapters own database row mapping.

## Vocabulary updates are progress-safe

CSV rows are normalized and deduplicated before persistence. Imports only fill missing word metadata, merge sources using a unique `(word_id, source_name)` constraint, and recalculate priority from persisted sources. They never update notes or study-state tables.

## FSRS cards are fully restart-safe

The scheduler is deterministic and isolated in `src/fsrs/`. Every rating stores the complete card state and review log in one SQLite transaction. Migration 002 adds the scheduling fields required to reconstruct a `ts-fsrs` card without silently resetting it.
