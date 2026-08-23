# GRE Vocabulary App — Product & Engineering Specification

## 1. Project Overview

This project is a local-first GRE vocabulary learning application focused on three ideas:

1. **High-quality GRE vocabulary prioritization**
2. **FSRS-based spaced repetition**
3. **Semantic learning instead of isolated memorization**

The product should begin as a fast, reliable vocabulary review app and later expand into a GRE-specific learning system with synonym groups, confusing words, Sentence Equivalence, Text Completion, and AI-assisted content generation.

The initial target user is a GRE learner who wants a cleaner, more focused experience than a generic flashcard app.

---

## 2. Product Goals

### Primary goals

- Help users learn the highest-value GRE vocabulary first.
- Schedule reviews using FSRS.
- Keep the learning workflow fast enough for daily use.
- Support bilingual English/Chinese vocabulary data.
- Make it easy to import and update vocabulary datasets.
- Preserve user progress locally.
- Work on macOS and Windows.
- Support a browser/PWA version where practical.
- Provide a codebase that is easy for Codex or other coding agents to extend.

### Secondary goals

- Build semantic relationships between words.
- Train GRE-style distinctions between near-synonyms.
- Generate GRE-style practice questions.
- Support AI-generated examples, mnemonics, and explanations.
- Provide useful learning analytics.

---

## 3. Non-Goals for V0.1

The first release should **not** attempt to implement:

- Full GRE Verbal simulation
- User accounts
- Cloud sync
- Social features
- Leaderboards
- Public deck marketplace
- Complex AI pipelines
- Automatic dictionary scraping
- Mobile-native iOS/Android apps
- Full Anki compatibility
- Large-scale NLP embeddings

These can be added later if useful.

---

# 4. Target Platforms

## V0.1

Primary:

- macOS
- Windows

Secondary:

- Modern desktop browsers

Preferred desktop packaging:

- **Tauri**

Preferred web frontend:

- **React + TypeScript**

Optional PWA support:

- Yes

---

# 5. Recommended Technical Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- Zustand

## UI

Preferred:

- Tailwind CSS
- shadcn/ui

Alternative:

- Any lightweight accessible component library

## Desktop shell

- Tauri

## Database

- SQLite

Preferred access layer:

- Tauri SQLite plugin or equivalent
- Strongly typed repository/service layer

## Spaced repetition

- `ts-fsrs`

## Validation

- Zod

## Testing

- Vitest
- React Testing Library
- Playwright for core end-to-end flows

---

# 6. Architecture Principles

The app should follow these principles:

### Local-first

All learning data should work without an internet connection.

### Deterministic study logic

FSRS scheduling and vocabulary selection must not depend on AI.

### AI is optional

If AI features are added later, the app must remain fully functional when AI is disabled.

### Data portability

Users should be able to export:

- vocabulary data
- study history
- progress
- difficult/favorite word lists

### Clear separation of concerns

Suggested layers:

```text
src/
├── app/
├── components/
├── features/
│   ├── study/
│   ├── vocabulary/
│   ├── search/
│   ├── stats/
│   └── settings/
├── db/
├── services/
├── fsrs/
├── import/
├── types/
└── utils/
```

---

# 7. Vocabulary Strategy

The app should not treat all GRE words as equally important.

Words should be prioritized based on overlap across multiple GRE vocabulary sources.

Recommended vocabulary tiers:

| Tier | Approximate Size | Purpose |
|---|---:|---|
| Core | 800–1200 | Highest-priority vocabulary |
| Standard | 2000–3000 | Main GRE vocabulary coverage |
| Extended | 5000+ | Lower-frequency and advanced words |

V0.1 should ship with **Core** only.

---

# 8. Word Priority Model

Each word may appear in multiple source lists.

Example:

```text
equivocal

Sources:
- GregMat
- Magoosh Common
- PowerScore
- Manhattan
```

A simple initial score:

```text
priority_score =
3 * source_count
+ 2 * high_priority_source_count
```

Later versions may incorporate user-specific data:

```text
priority_score =
3 * source_count
+ 2 * high_priority_source_count
+ 2 * user_error_rate
+ 1 * forgetting_score
```

FSRS determines:

> When should this word be reviewed?

Priority determines:

> Which unseen word should be introduced next?

These two systems should remain logically separate.

---

# 9. Core Data Model

## 9.1 `words`

```sql
CREATE TABLE words (
    id TEXT PRIMARY KEY,
    lemma TEXT NOT NULL UNIQUE,
    part_of_speech TEXT,
    ipa TEXT,
    definition_en TEXT,
    definition_zh TEXT,
    example_sentence TEXT,
    mnemonic TEXT,
    roots TEXT,
    difficulty INTEGER DEFAULT 0,
    frequency_tier TEXT DEFAULT 'core',
    priority_score REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## 9.2 `word_sources`

```sql
CREATE TABLE word_sources (
    id TEXT PRIMARY KEY,
    word_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_group TEXT,
    source_rank INTEGER,
    is_high_priority INTEGER DEFAULT 0,

    FOREIGN KEY (word_id) REFERENCES words(id)
);
```

Examples of `source_name`:

```text
gregmat
magoosh_common
magoosh_basic
powerscore
prepscholar
barrons
manhattan
```

---

## 9.3 `word_synonyms`

Do not store synonyms as a comma-separated string.

```sql
CREATE TABLE word_synonyms (
    id TEXT PRIMARY KEY,
    word_id TEXT NOT NULL,
    related_word_id TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'synonym',
    strength REAL DEFAULT 1.0,
    distinction_note TEXT,

    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (related_word_id) REFERENCES words(id)
);
```

Possible relationship types:

```text
synonym
near_synonym
antonym
confusable
related
```

---

## 9.4 `word_tags`

```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE word_tags (
    word_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,

    PRIMARY KEY (word_id, tag_id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

Potential tags:

```text
core
advanced
positive
negative
ambiguous
speech
argument
emotion
personality
common_confusion
```

---

# 10. User Study Model

## 10.1 `user_word_state`

Each word should have one persistent study state.

```sql
CREATE TABLE user_word_state (
    word_id TEXT PRIMARY KEY,

    status TEXT NOT NULL DEFAULT 'new',

    is_favorite INTEGER DEFAULT 0,
    is_difficult INTEGER DEFAULT 0,

    total_reviews INTEGER DEFAULT 0,
    correct_reviews INTEGER DEFAULT 0,
    incorrect_reviews INTEGER DEFAULT 0,

    last_reviewed_at TEXT,
    next_review_at TEXT,

    fsrs_state INTEGER,
    fsrs_step INTEGER,
    fsrs_stability REAL,
    fsrs_difficulty REAL,
    fsrs_due TEXT,
    fsrs_last_review TEXT,

    FOREIGN KEY (word_id) REFERENCES words(id)
);
```

Recommended statuses:

```text
new
learning
review
mastered
suspended
```

---

## 10.2 `review_logs`

Every review should be recorded.

```sql
CREATE TABLE review_logs (
    id TEXT PRIMARY KEY,
    word_id TEXT NOT NULL,

    reviewed_at TEXT NOT NULL,

    rating INTEGER NOT NULL,

    response_ms INTEGER,

    mode TEXT NOT NULL DEFAULT 'flashcard',

    previous_due TEXT,
    next_due TEXT,

    previous_stability REAL,
    new_stability REAL,

    previous_difficulty REAL,
    new_difficulty REAL,

    FOREIGN KEY (word_id) REFERENCES words(id)
);
```

Rating should map to FSRS:

```text
1 = Again
2 = Hard
3 = Good
4 = Easy
```

---

# 11. Study Workflow

## 11.1 Daily Queue

The daily queue should contain:

1. overdue reviews
2. reviews due today
3. new words

Default daily settings:

```text
New words/day: 20
Maximum reviews/day: 200
```

The user can modify these values.

---

## 11.2 Queue Ordering

Recommended order:

```text
1. Overdue reviews
2. Due reviews
3. Learning-stage words
4. New words
```

Within new words:

```text
ORDER BY priority_score DESC
```

Optionally randomize words within similar priority ranges.

---

# 12. Core Review Screen

The review interface should be extremely fast.

Initial state:

```text
equivocal
```

Optional:

```text
/ɪˈkwɪvəkəl/
```

The definition must be hidden initially.

User action:

```text
Show Answer
```

Answer view:

```text
equivocal

adj.

EN:
Open to more than one interpretation; ambiguous.

ZH:
模棱两可的；含糊不清的

Example:
The committee issued an equivocal statement that satisfied neither side.

Synonyms:
ambiguous
evasive
noncommittal
```

Then display:

```text
Again
Hard
Good
Easy
```

Each action must immediately:

1. update the FSRS state
2. save a review log
3. calculate the next due time
4. move to the next word

Keyboard shortcuts:

```text
Space = Show Answer
1 = Again
2 = Hard
3 = Good
4 = Easy
F = Favorite
D = Difficult
```

---

# 13. Learn New Word Screen

A new word should show more context than a review card.

Recommended layout:

```text
equivocal
/ɪˈkwɪvəkəl/

adj.

模棱两可的；不明确的

Core meaning:
Open to more than one interpretation.

Example:
The witness gave an equivocal answer when asked about the meeting.

Synonyms:
ambiguous
evasive
noncommittal

Usage distinction:
evasive often implies deliberate avoidance.
```

The user may mark:

```text
Known
Learn
Difficult
Favorite
```

---

# 14. Dashboard

The dashboard should answer:

> What should I do today?

Show:

```text
Today's Study

New            20
Due            43
Overdue         7
Total           70
```

Also show:

```text
Vocabulary Progress

Core
743 / 1000 introduced
512 in review
231 learning
```

Optional later:

```text
Estimated retention: 91%
```

Primary CTA:

```text
Start Review
```

---

# 15. Vocabulary Browser

Users should be able to browse all words.

Columns:

```text
Word
Meaning
Tier
Status
Priority
Due
Favorite
Difficult
```

Filters:

```text
All
New
Learning
Review
Mastered
Difficult
Favorite
Core
Standard
Extended
```

Search should match:

- lemma
- English definition
- Chinese definition

---

# 16. Word Detail Page

Each word should have a dedicated page.

Sections:

```text
Word
Pronunciation
Part of speech
English definition
Chinese definition
Example
Mnemonic
Roots
Synonyms
Antonyms
Confusable words
Sources
Study statistics
Review history
Notes
```

Users should be able to edit notes.

---

# 17. Settings

V0.1 settings:

```text
New words per day
Maximum reviews per day
Show Chinese definition
Show English definition
Show IPA
Show examples
Review order
Theme
```

FSRS configuration should initially use sensible defaults.

Advanced FSRS parameters should not be shown to normal users in V0.1.

---

# 18. Import Format

The project should support CSV import.

Minimum CSV:

```csv
lemma,part_of_speech,definition_en,definition_zh,ipa,example_sentence,source_name
equivocal,adj,"open to more than one interpretation","模棱两可的",/ɪˈkwɪvəkəl/,"The answer was deliberately equivocal.",gregmat
```

Importer behavior:

1. normalize lemma
2. detect duplicates
3. merge sources
4. preserve existing user progress
5. update empty metadata fields
6. never overwrite user notes without explicit confirmation

---

# 19. Vocabulary Build Pipeline

Raw source word lists should remain separate from application-ready data.

Suggested structure:

```text
data/
├── raw/
│   ├── gregmat.txt
│   ├── magoosh_common.txt
│   ├── powerscore.txt
│   └── ...
├── processed/
│   ├── words.json
│   ├── word_sources.json
│   └── synonyms.json
└── scripts/
    ├── normalize.ts
    ├── merge.ts
    └── score.ts
```

Pipeline:

```text
raw word lists
    ↓
normalize spelling
    ↓
deduplicate
    ↓
attach source metadata
    ↓
calculate source count
    ↓
calculate priority score
    ↓
assign vocabulary tier
    ↓
export application dataset
```

---

# 20. Copyright & Data Policy

The repository should distinguish between:

### Safe project data

- word spelling
- source-list membership
- user-authored definitions
- open dictionary metadata
- original examples
- original mnemonics

### Potentially copyrighted content

Avoid redistributing:

- copied Magoosh explanations
- copied GregMat definitions
- copied commercial GRE book entries
- copied proprietary Chinese definitions
- copied commercial example sentences

The preferred strategy is:

```text
Use GRE lists to determine WHICH words matter.
Use open or original content to determine HOW the words are explained.
```

The app should include a `DATA_SOURCES.md` file documenting every bundled dataset and its license.

---

# 21. V0.1 Scope

V0.1 is the Minimum Viable Product.

## Required

- [ ] React + TypeScript application
- [ ] Tauri desktop wrapper
- [ ] SQLite database
- [ ] Core GRE vocabulary import
- [ ] Word detail data model
- [ ] FSRS integration
- [ ] Daily review queue
- [ ] New word learning flow
- [ ] Again / Hard / Good / Easy
- [ ] Keyboard shortcuts
- [ ] Search
- [ ] Favorites
- [ ] Difficult words
- [ ] Dashboard
- [ ] Basic statistics
- [ ] Settings
- [ ] CSV import
- [ ] Export user progress
- [ ] Automated tests for FSRS state persistence

---

# 22. V0.2 Scope — GRE Semantic Learning

Add:

- [ ] Synonym graph
- [ ] Near-synonym distinctions
- [ ] Antonyms
- [ ] Confusing word groups
- [ ] Synonym review mode
- [ ] GRE-focused tags
- [ ] Better word priority ranking

Example:

```text
equivocal
├── ambiguous
├── evasive
├── noncommittal
└── cryptic
```

Each relationship may include a distinction note.

Example:

```text
ambiguous:
can have multiple interpretations

evasive:
often implies deliberate avoidance

cryptic:
difficult to understand
```

---

# 23. V0.3 Scope — GRE Question Modes

Add dedicated GRE practice.

## Sentence Equivalence

Example:

```text
The politician's response was deliberately _____,
allowing both sides to interpret it favorably.

A. unequivocal
B. equivocal
C. explicit
D. ambiguous
E. lucid
F. categorical
```

Correct:

```text
B + D
```

---

## Text Completion

Support:

- one blank
- two blanks
- three blanks

Store questions separately from vocabulary cards.

---

# 24. Future AI Features

AI functionality should be implemented as an optional service.

Potential features:

### Example generation

Generate an original GRE-level sentence.

### Mnemonic generation

Generate a concise memory aid.

### Synonym distinction

Explain:

```text
equivocal vs ambiguous vs evasive
```

### Practice generation

Generate:

- Sentence Equivalence
- Text Completion
- synonym questions

### Error explanation

After an incorrect answer, explain why the selected choice was wrong.

---

# 25. AI Data Safety

Generated AI content must be distinguishable from verified dictionary content.

Suggested fields:

```text
content_source = human | open_dictionary | ai
model_name
generated_at
verified
```

AI-generated content must be editable.

Users should be able to disable all AI features.

---

# 26. Statistics

## V0.1

Display:

```text
Words introduced
Words reviewed
Words mastered
Reviews today
Accuracy today
Current streak
```

## Later

Add:

```text
Retention estimate
Average reviews per word
Weakest vocabulary groups
Most difficult words
Due forecast
Learning velocity
```

---

# 27. Mastery Definition

Do not define mastery only as:

```text
reviewed N times
```

A better future definition may include:

```text
FSRS stability threshold
+
recent successful recall
+
minimum review count
```

For V0.1, use a simple rule:

```text
status = mastered
when:
total_reviews >= 4
AND
fsrs_stability >= configurable threshold
```

The mastery label should not modify FSRS scheduling.

---

# 28. Accessibility & UX Requirements

- Core review actions must work with keyboard only.
- Buttons must have accessible labels.
- Color must not be the only status indicator.
- Review screen should avoid visual clutter.
- Answer reveal should not cause large layout shifts.
- Desktop UI should work well around 1200–1600 px width.
- Dark mode should be supported.

---

# 29. Performance Requirements

For a vocabulary database under 20,000 words:

- app launch should feel immediate
- search should return in under ~100 ms locally
- review action should transition instantly
- database writes should not block UI
- daily queue generation should be fast enough to feel synchronous

Avoid premature optimization.

---

# 30. Testing Requirements

## Unit tests

Required for:

- priority scoring
- vocabulary deduplication
- import normalization
- FSRS rating mapping
- due-date persistence
- review-state transitions

## Integration tests

Required for:

```text
Import vocabulary
→ learn word
→ review word
→ restart app
→ verify progress persists
```

## E2E tests

At minimum:

```text
Launch app
Start study
Reveal answer
Choose Good
Advance to next card
```

---

# 31. Error Handling

The app should safely handle:

- malformed CSV
- duplicate words
- missing definitions
- missing IPA
- database migration errors
- corrupted optional metadata

A missing example or definition should not prevent study.

FSRS state corruption should never silently reset user progress.

---

# 32. Database Migrations

The database schema must be versioned.

Do not rely on destructive reset migrations after V0.1.

Recommended:

```text
migrations/
001_initial.sql
002_synonyms.sql
003_question_bank.sql
```

---

# 33. Backup & Export

Users should be able to export:

### Vocabulary

```text
CSV / JSON
```

### User progress

```text
JSON
```

### Full backup

```text
SQLite database copy
```

Later versions may support import of full backups.

---

# 34. Suggested Navigation

Desktop sidebar:

```text
Dashboard
Study
Vocabulary
Difficult
Favorites
Statistics
Settings
```

Later:

```text
GRE Practice
Synonyms
Confusing Words
```

---

# 35. Suggested First-Run Flow

```text
Welcome
  ↓
Choose daily new-word target
  ↓
Choose English / Chinese display preference
  ↓
Load Core GRE deck
  ↓
Start first 10 words
```

Do not require account creation.

---

# 36. Proposed Repository Structure

```text
gre-vocab/
├── src/
│   ├── app/
│   ├── components/
│   ├── db/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── study/
│   │   ├── vocabulary/
│   │   ├── search/
│   │   ├── stats/
│   │   └── settings/
│   ├── fsrs/
│   ├── import/
│   ├── services/
│   ├── types/
│   └── utils/
├── src-tauri/
├── data/
│   ├── raw/
│   ├── processed/
│   └── scripts/
├── migrations/
├── tests/
├── public/
├── SPEC.md
├── DATA_SOURCES.md
├── README.md
└── package.json
```

---

# 37. Development Order

Codex should implement the app in the following order.

## Phase 1 — Foundation

1. Initialize React + TypeScript + Vite
2. Add Tauri
3. Add SQLite
4. Add migrations
5. Define typed models
6. Create repository/service layer

## Phase 2 — Vocabulary

7. Implement word database
8. Implement CSV import
9. Implement vocabulary browser
10. Implement search
11. Implement word detail page

## Phase 3 — Study

12. Integrate `ts-fsrs`
13. Create user word state
14. Create review log system
15. Implement daily queue
16. Build review screen
17. Add keyboard shortcuts

## Phase 4 — Product UX

18. Dashboard
19. Favorites
20. Difficult words
21. Settings
22. Basic statistics
23. Export / backup

## Phase 5 — Quality

24. Tests
25. Error handling
26. Migration tests
27. Performance cleanup
28. Documentation

---

# 38. Acceptance Criteria for V0.1

V0.1 is complete when a user can:

1. launch the app
2. import/load a GRE Core vocabulary deck
3. learn new words
4. reveal definitions
5. rate memory using Again / Hard / Good / Easy
6. close the app
7. reopen it
8. continue with correct FSRS scheduling
9. search any word
10. favorite or mark a word difficult
11. view basic learning statistics
12. export their progress

The app must work offline.

---

# 39. Codex Implementation Rules

Codex should follow these rules while implementing this specification:

1. Do not rewrite working modules without a clear reason.
2. Keep commits/tasks small and focused.
3. Add tests for scheduling and persistence before refactoring those modules.
4. Do not add cloud services unless explicitly requested.
5. Do not add AI dependencies in V0.1.
6. Do not hard-code vocabulary inside React components.
7. Use the database as the source of truth.
8. Preserve user data through schema migrations.
9. Prefer simple, maintainable implementations.
10. Update `SPEC.md` only when product behavior intentionally changes.

---

# 40. First Codex Task

Use the following as the first implementation task:

```text
Read SPEC.md completely before making changes.

Implement Phase 1 only.

Goal:
Create the project foundation for the GRE Vocabulary App.

Requirements:
- React
- TypeScript
- Vite
- Tauri
- SQLite
- Zod
- Zustand
- React Router
- Vitest

Implement:
1. Project initialization
2. Basic app shell
3. Sidebar navigation placeholders
4. SQLite connection
5. Migration system
6. Initial database schema for:
   - words
   - word_sources
   - tags
   - word_tags
   - user_word_state
   - review_logs
7. TypeScript types matching the schema
8. Repository/service interfaces
9. A database health check shown in a simple Settings/debug section
10. Tests proving the database initializes successfully

Do not implement:
- FSRS
- vocabulary import
- study flow
- AI
- cloud sync

Before finishing:
- run all tests
- run type checking
- run linting
- verify the Tauri app starts
- summarize files changed
- document any architectural decisions
```

---

# 41. Second Codex Task

After Phase 1 is stable:

```text
Read SPEC.md and inspect the existing implementation.

Implement the vocabulary data layer.

Requirements:
- CSV import
- word normalization
- duplicate detection
- source merging
- priority score calculation
- vocabulary browser
- search
- word detail page

Important:
Importing an updated vocabulary list must never erase user progress.

Add unit tests for:
- normalization
- deduplication
- source merging
- priority scoring
```

---

# 42. Third Codex Task

After the vocabulary layer is stable:

```text
Read SPEC.md and the current project.

Implement FSRS-based study.

Use ts-fsrs.

Requirements:
- daily due queue
- new-word queue
- Again / Hard / Good / Easy
- persistent FSRS state
- review logs
- keyboard shortcuts
- restart-safe scheduling

Critical test:

Import word
→ study word
→ rate Good
→ close/reinitialize database layer
→ reload word
→ verify FSRS state and due date are preserved
```

---

# 43. Long-Term Product Direction

The project should evolve from:

```text
Flashcard app
```

into:

```text
GRE semantic vocabulary trainer
```

The key differentiator should eventually be:

```text
Word
+
Meaning
+
Synonym network
+
Fine-grained distinctions
+
GRE context
+
FSRS
+
Personal error history
```

The goal is not merely to help users recognize vocabulary.

The goal is to help users make distinctions such as:

```text
ambiguous
equivocal
evasive
cryptic
noncommittal
```

quickly enough to solve actual GRE Verbal questions.

---

# 44. Success Metric

The product is successful if the user can open it every day and immediately know:

```text
What should I study now?
```

and the system reliably prioritizes:

```text
the right words
at the right time
with the right context.
```
