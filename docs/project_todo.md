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

### Phase 1 - Framework Completion

- [x] Part 17 - AI Orchestrator Harness v1
  - Goal: complete the AI command framework lifecycle before adding more domain intents.
  - Release: 2026-06-13
  - Commit: f9d9cd9
  - Verified: db:reset, check, build, smoke

- [x] Part 18 - AI Intent Parser v2
  - Goal: let AI extract Vietnamese command intent and structured fields; backend validates output, and LLM failure returns error/clarification instead of a manual parser fallback.
  - Release: 2026-06-13
  - Commit: 3724538
  - Verified: db:reset, check, build, smoke

- [ ] Part 19 - Proposal & Validation Runtime v2
  - Goal: harden shared proposal payloads, rejection/cancel status, validators, and safe API/UI error shapes.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 20 - Settings & Model Runtime Foundation
  - Goal: make user preferences and model behavior settings editable and used by the AI orchestrator/planner.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 21 - Planner Engine Foundation v2
  - Goal: combine deterministic scheduling constraints with LLM-generated plan candidates, overload resolution, and explanations.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 22 - UI Interaction Framework v2
  - Goal: standardize reusable loading, empty, error, clarification, conflict, and proposal states before adding more feature screens.
  - Release:
  - Commit:
  - Verified:

### Phase 2 - Domain Feature Verticals

- [ ] Part 23 - Task & Inbox Workflows v2
  - Goal: add direct task CRUD plus LLM-backed task create/edit/breakdown and inbox workflows.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 24 - Reminder & Notification Engine v1
  - Goal: activate reminders with LLM reminder capture and deterministic due/upcoming/done/snooze behavior.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 25 - Calendar & Time Blocking v2
  - Goal: add practical day/week calendar views, event/time-block APIs, and LLM-backed event/time-block proposals.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 26 - Deadline Workflows v2
  - Goal: add deadline CRUD, linking, LLM deadline extraction/explanation, reminders, and deterministic date buckets.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 27 - Habits & Routine v2
  - Goal: make habits editable with LLM setup suggestions, routine proposals, weekly completion, and deterministic streak handling.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 28 - Goals & Project Breakdown v2
  - Goal: add editable goal/project/task relationships plus LLM-assisted goal/project/task breakdown and progress checks.
  - Release:
  - Commit:
  - Verified:

- [ ] Part 29 - Review & Daily Assistant v2
  - Goal: persist reviews and use LLM synthesis for morning brief, evening reflection, and reschedule suggestions.
  - Release:
  - Commit:
  - Verified:

### Phase 3 - Production Hardening

- [ ] Part 30 - Production Hardening
  - Goal: harden config, backups, errors, production serving, and deployment docs after framework and feature verticals are usable.
  - Release:
  - Commit:
  - Verified:
