# HelpMe Project Todo

## Current Rule

Each major part is a separate feature release.

Required verification before marking a new part complete:

```powershell
npm run db:reset
npm run check
npm run build
npm run smoke
```

After each release:

- Tick the item from `[ ]` to `[x]`.
- Add release date.
- Add commit hash.
- Add verification summary.
- Push the commit to `origin main`.

Note: Parts 1-9 were completed before the release rule was made strict, so some early parts are grouped under the same MVP commit.

## Project Timeline Checklist

- [x] Part 1 - Repository Foundation
  - Goal: initialize the HelpMe repository and baseline project documentation.
  - Release: early setup
  - Commit: cc753e1
  - Verified: repository created

- [x] Part 2 - AI-first UX Exploration
  - Goal: explore the original HelpMe AI-first interface, Now direction, and local UI skills.
  - Release: early setup
  - Commit: a79a0e4
  - Verified: static UI mockups and docs added

- [x] Part 3 - Product Reset to Personal OS
  - Goal: align HelpMe with `docs/goal.md` as Calendar + Todo + Deadline + Habit + Goal + AI Planner + Daily Assistant.
  - Release: early bundled MVP
  - Commit: 61e82c2
  - Verified: docs and app direction updated

- [x] Part 4 - Web App Shell & Navigation
  - Goal: establish the React app shell, navigation, Orb presence, and core route structure.
  - Release: early bundled MVP
  - Commit: 61e82c2
  - Verified: app shell and screens served by Vite/Fastify

- [x] Part 5 - Data Foundation v1
  - Goal: add SQLite schema, migrations, seed data, and query layer for personal OS entities.
  - Release: early bundled MVP
  - Commit: 61e82c2
  - Verified: migrations and seed flow added

- [x] Part 6 - Core Personal OS MVP
  - Goal: add first usable versions of core screens, Orb command layer, proposal confirmation, planner rules, and Ollama integration.
  - Release: early bundled MVP
  - Commit: 61e82c2
  - Verified: app reads from backend-backed data and supports proposal-first planning

- [x] Part 7 - Local AI Fallback Hardening
  - Goal: keep the app usable when Ollama is offline, slow, or returns invalid output.
  - Release: 2026-06-12
  - Commit: 97f0387
  - Verified: fallback behavior hardened

- [x] Part 8 - Release Smoke Verification
  - Goal: add repeatable release smoke checks so each feature can be verified before commit.
  - Release: 2026-06-12
  - Commit: d7c4967
  - Verified: smoke script added

- [x] Part 9 - Direct Task & Habit Actions
  - Goal: add direct UI/API actions for task and habit interactions outside Orb.
  - Release: 2026-06-12
  - Commit: ed82ce6
  - Verified: direct action flows added

- [x] Part 10 - Focus Session Flow
  - Goal: add focus session behavior for starting and tracking focused work.
  - Release: 2026-06-12
  - Commit: 6fd4b86
  - Verified: db:reset, check, build, smoke

- [x] Part 11 - Inbox Organization v2
  - Goal: add clearer inbox organization lanes and backend support.
  - Release: 2026-06-12
  - Commit: 991432a
  - Verified: db:reset, check, build, smoke

- [x] Part 12 - Planner Calendar Conflict Validation
  - Goal: ensure planner scheduling avoids existing calendar conflicts.
  - Release: 2026-06-12
  - Commit: 10cb472
  - Verified: db:reset, check, build, smoke

- [x] Part 13 - Review Reschedule Validation
  - Goal: validate evening review reschedule proposals before writing data.
  - Release: 2026-06-12
  - Commit: d2c6606
  - Verified: db:reset, check, build, smoke

- [x] Part 14 - Orb Proposal Preview v2
  - Goal: show richer proposal preview data in Orb before user confirmation.
  - Release: 2026-06-12
  - Commit: e30059a
  - Verified: db:reset, check, build, smoke

- [x] Part 15 - Scheduled Task Creation Validation
  - Goal: validate scheduled task creation before proposal confirmation.
  - Release: 2026-06-12
  - Commit: 1bbb97e
  - Verified: db:reset, check, build, smoke

- [x] Part 16 - Reschedule Task Validation v2
  - Goal: improve task rescheduling validation and conflict handling.
  - Release: 2026-06-12
  - Commit: ab4b758
  - Verified: db:reset, check, build, smoke

- [ ] Part 17 - AI Intent Parser v2
  - Goal: let AI extract Vietnamese command intent and structured fields, while backend validates output and keeps manual parsing fallback-only.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 18 - Task CRUD v1
  - Goal: add direct task create/update/cancel/schedule workflows.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 19 - Calendar v2
  - Goal: add practical day/week calendar views and event/time-block APIs.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 20 - Reminders v1
  - Goal: activate reminders with due/upcoming/done/snooze behavior.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 21 - Habits v2
  - Goal: make habits editable with weekly completion and better streak handling.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 22 - Deadlines v2
  - Goal: add deadline CRUD, linking, improved scoring, and Orb commands.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 23 - Goals & Projects v2
  - Goal: add editable goal/project/task relationships and real progress.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 24 - Daily Review & Morning Brief v2
  - Goal: persist reviews and generate better morning brief context.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 25 - AI Command Expansion
  - Goal: add more Orb intents with validated proposal-first behavior.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 26 - Planner Engine v2
  - Goal: improve scoring, overload resolution, and configurable planning.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 27 - Settings & Preferences
  - Goal: make user preferences editable and used by parser/planner.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 28 - Production Hardening
  - Goal: harden config, backups, errors, production serving, and deployment docs.
  - Release:
  - Commit:
  - Verified:
