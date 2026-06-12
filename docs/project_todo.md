# HelpMe Project Todo

## Current Rule

Each major part is a separate feature release.

Required verification before marking a part complete:

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

## Roadmap Checklist

- [ ] Part 17 - Command Parser v2
  - Goal: parse Vietnamese date, time, duration, and time windows reliably.
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

## Completed Recent Releases

- [x] Part 16 - Reschedule Task Validation v2
  - Release: 2026-06-12
  - Commit: ab4b758
  - Verified: db:reset, check, build, smoke

- [x] Part 15 - Scheduled Task Creation Validation
  - Release: 2026-06-12
  - Commit: 1bbb97e
  - Verified: db:reset, check, build, smoke

- [x] Part 14 - Orb Proposal Preview v2
  - Release: 2026-06-12
  - Commit: e30059a
  - Verified: db:reset, check, build, smoke

- [x] Part 13 - Review Reschedule Validation
  - Release: 2026-06-12
  - Commit: d2c6606
  - Verified: db:reset, check, build, smoke

- [x] Part 12 - Planner Calendar Conflict Validation
  - Release: 2026-06-12
  - Commit: 10cb472
  - Verified: db:reset, check, build, smoke

- [x] Part 11 - Inbox Organization v2
  - Release: 2026-06-12
  - Commit: 991432a
  - Verified: db:reset, check, build, smoke

- [x] Part 10 - Focus Session Flow
  - Release: 2026-06-12
  - Commit: 6fd4b86
  - Verified: db:reset, check, build, smoke

