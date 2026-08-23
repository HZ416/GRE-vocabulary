# GRE Vocabulary roadmap

## Completed

- [x] React, TypeScript, Vite, and Tauri foundation
- [x] SQLite migrations and health check
- [x] Progress-safe CSV import, normalization, deduplication, and source merging
- [x] Vocabulary browser, search, and word details
- [x] Restart-safe FSRS study and review logs
- [x] Dashboard with new, due, overdue, and vocabulary progress counts
- [x] Favorites and difficult-word lists
- [x] Basic learning statistics
- [x] Editable personal notes on word details
- [x] Persistent daily limits and answer display preferences
- [x] Vocabulary CSV/JSON and learning-progress JSON exports
- [x] Full SQLite database backup from the Settings page
- [x] First-run setup flow, CSV field guidance, and saveable import template
- [x] Validated SQLite restore with confirmation and automatic rollback copy

## Next: smaller improvements

- All planned smaller improvements are complete.

## Next: medium improvements

- [ ] Real file-backed SQLite restart and migration tests
- [ ] React Testing Library coverage for core pages
- [ ] Playwright end-to-end review flow
- [ ] Localized English and Chinese interface copy

## Release readiness

- [ ] Licensed 800–1200-word Core GRE deck with documented sources
- [ ] GitHub Actions builds for macOS Apple Silicon, macOS Intel, and Windows x64
- [ ] macOS code signing and notarization
- [ ] Windows installer signing
- [ ] Restrictive Content Security Policy and narrower Tauri permissions
- [ ] Import, search, and queue performance tests with 20,000 words
