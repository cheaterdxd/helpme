# HelpMe Full Project Continuation Plan

## Summary

HelpMe is a local-first AI personal operating system. The current MVP already has React, Fastify, SQLite, rule-based planning, an Ollama client, the Orb command layer, proposal confirmation, core screens, and calendar conflict validation for scheduled task creation, task rescheduling, day planning, and review rescheduling.

This plan continues the project from the current state toward the complete product defined in `docs/goal.md`: Calendar + Todo + Deadline + Habit + Goal + AI Planner + Daily Assistant.

Each major part must be implemented as a separate feature release:

1. Implement the part.
2. Run verification.
3. Commit with a feature-style message.
4. Push to `origin main`.
5. Tick the matching item in `docs/project_todo.md`.

Required verification before every release:

```powershell
npm run db:reset
npm run check
npm run build
npm run smoke
```

## LLM-First Allocation

From Part 17 onward, do not build large manual parsers or hand-coded decision trees for language-heavy work. Prefer the local LLM model for understanding, synthesis, prioritization, and multi-step planning. Backend code remains responsible for safety, validation, persistence, and deterministic calculations.

Use the LLM model for:
- Natural-language intent extraction from Orb commands.
- Task title cleanup, date/time/duration extraction, and missing-field detection.
- Inbox grouping and task classification.
- Goal/project/task breakdown suggestions.
- Daily and weekly planning proposals.
- Priority explanation and tradeoff summaries.
- Deadline pressure explanation.
- Habit insights and routine coaching.
- Morning brief and evening review summaries.
- Overload analysis and reschedule suggestions.

Keep deterministic code for:
- SQLite schema, migrations, CRUD APIs, and persistence.
- Zod/schema validation of every LLM output.
- Calendar conflict detection and time arithmetic.
- Recurrence expansion, reminder due checks, habit streak math, and deadline buckets.
- Proposal creation, confirmation, cancellation, and audit logging.
- UI state, loading/error handling, and smoke tests.

LLM failure policy:
- For AI-required features, do not silently guess with a manual fallback.
- If Ollama is offline, times out, returns invalid JSON, or returns low confidence, return a clear error or clarification state and do not create a mutating proposal.
- Existing non-AI screens should still load from SQLite, but AI commands that require model understanding should fail safely.

## Roadmap

The build order is framework-first, then feature verticals. Do not expand multiple domain features before the framework gates are complete. A feature is not "done" just because a screen exists; it must pass through the shared API, validation, proposal, verification, and UI state framework.

### Phase 1 - Framework Completion

Finish the app skeleton, AI command runtime, validation contracts, settings, and verification foundation first.

#### Part 17 - AI Orchestrator Harness v1

Build the command execution framework before adding more domain intents.

DOD targets:
- `I5. AI Orchestrator Harness`
- `K1. Proposal-First Mutation`
- `K2. Verification`

Key outcomes:
- Add an orchestrator lifecycle: understand, gather context, plan, validate, propose, log.
- Add task modes: `quick` for simple model extraction and `deep` for multi-step planning.
- Enforce budgets: timeout, max steps, max context size, and no chain-of-thought exposure.
- Standardize safe error/clarification responses.
- Keep `/api/ai/command` stable while moving command logic out of a growing if/else handler.
- Smoke covers orchestrator success, validation failure, LLM failure, and proposal-first behavior.

#### Part 18 - AI Intent Parser v2

Use the orchestrator to let AI handle Vietnamese natural-language understanding, while backend code owns schema validation and safety.

DOD targets:
- `I1. AI Intent Parser`
- `I6. Local LLM Client`
- `K1. Proposal-First Mutation`

Key outcomes:
- Add an AI intent extraction step for commands such as `8h hoc AWS 1h`, `ngay mai 8:30`, `toi mai 20h`, `trong 60 phut`, and `tu 20h den 23h`.
- Require AI output to match a strict schema: intent, entity ids or text, date, start time, end time, duration, confidence, and missing fields.
- Backend validates all AI output before creating a proposal; invalid or low-confidence output asks for clarification or returns an error.
- Remove broad manual parsing from the command handler instead of building a large rule parser.
- AI runs are logged and smoke/focused tests cover valid output, invalid JSON, low confidence, and missing fields.

#### Part 19 - Proposal & Validation Runtime v2

Harden the mutation framework used by every future feature.

DOD targets:
- `K1. Proposal-First Mutation`
- `K2. Verification`

Key outcomes:
- Add shared proposal payload conventions: title, summary, preview data, validation, warnings, and source AI run.
- Add proposal cancel/reject status and API.
- Add consistent validation error shape for API and Orb UI.
- Add shared validators for entity ids, date ranges, scheduled blocks, and conflict-sensitive writes.
- Smoke covers confirm, reject, already-confirmed, invalid proposal, and conflict rejection paths.

#### Part 20 - Settings & Model Runtime Foundation

Make runtime behavior configurable before planner/domain logic depends on it.

DOD targets:
- `G. User-Visible Screens`
- `I6. Local LLM Client`

Key outcomes:
- Add settings APIs for timezone, working windows, quiet hours, preferred model, model timeout, deep-mode toggle, and display name.
- Settings UI edits the key preferences instead of only displaying AI status.
- AI orchestrator and planner read settings instead of constants where appropriate.
- Smoke covers updating working window, model timeout, and planning with the new window.

#### Part 21 - Planner Engine Foundation v2

Separate deterministic constraints from LLM-generated plan candidates.

DOD targets:
- `I2. AI Planner`
- `I3. AI Prioritizer`
- `C2. Overload Warning`

Key outcomes:
- Backend computes hard constraints: available windows, conflicts, due buckets, task duration, and existing schedule.
- LLM proposes plan candidates, overload resolution, priority tradeoffs, and short explanations.
- Backend validates selected candidates before creating proposals.
- Planner uses settings-defined working windows instead of hard-coded evening windows.
- Smoke covers overload handling, available-minute limits, and invalid LLM plan rejection.

#### Part 22 - UI Interaction Framework v2

Finish reusable UI states before adding more feature screens.

DOD targets:
- `G. User-Visible Screens`
- `K1. Proposal-First Mutation`

Key outcomes:
- Standardize loading, empty, error, conflict, clarification, and proposal states.
- Add reusable proposal preview patterns for create/edit/reschedule/breakdown flows.
- Ensure Orb and route panels do not hide primary actions on desktop/mobile.
- Add focused UI smoke or browser checks for core flows.

### Phase 2 - Domain Feature Verticals

After the framework phase, build features as vertical slices: API, validation, UI, Orb command, proposal flow, persistence, and smoke verification together.

#### Part 23 - Task & Inbox Workflows v2

Make task management usable from both direct UI actions and LLM-backed Orb commands.

DOD targets:
- `B1. Add Task With Natural Language`
- `B2. Create Task From Vague Input`
- `B3. Break Down Large Task`
- `K1. Proposal-First Mutation`

Key outcomes:
- Add direct APIs for create, update, cancel/archive, priority, due date, schedule, and link/unlink goal/project.
- UI supports lightweight task editing from task rows or a compact editor.
- Orb task creation/editing uses the AI intent parser to produce structured proposals.
- Add `breakdown_task` proposal for large tasks.
- Smoke covers create/update/cancel/link/breakdown and conflict rejection.

#### Part 24 - Reminder & Notification Engine v1

Build the daily assistant's reminder backbone.

DOD targets:
- `J. Notification / Reminder Engine`
- `B1. Add Task With Natural Language`

Key outcomes:
- Add APIs for due/upcoming reminders, create reminder, mark done, and snooze.
- Orb can create reminders from natural language such as `nhac toi`, with model-extracted date/time/repeat fields.
- Backend scheduler logic determines due/upcoming/done/snooze state without relying on the model.
- Today and Settings show reminder state.
- Smoke covers reminder creation, due list, snooze, and mark done.

#### Part 25 - Calendar & Time Blocking v2

Turn Calendar into a practical planning surface.

DOD targets:
- `D1. Time Blocking`
- `D2. Automatic Reschedule`

Key outcomes:
- Add day/week lightweight calendar views.
- Add APIs for calendar events and time blocks.
- UI clearly separates busy time, free windows, and planned task blocks.
- Orb can propose events and time blocks from natural language, while backend validates exact time ranges and conflicts.
- Smoke covers event creation, time block update, planner conflict avoidance, and reschedule rejection.

#### Part 26 - Deadline Workflows v2

Make Deadline Radar a management workflow, not only a read-only list.

DOD targets:
- `C1. Deadline Radar`
- `C2. Overload Warning`

Key outcomes:
- Add CRUD APIs for deadlines.
- Link deadlines to task, project, or goal.
- Use LLM to extract deadline title, due date, linked context, and severity hint from natural language.
- Keep date buckets and schedule math deterministic.
- Add Orb commands for creating deadlines and explaining pressure.
- Smoke covers deadline creation, grouping, reminder generation, and planner scoring impact.

#### Part 27 - Habits & Routine v2

Make habits editable and add routine generation.

DOD targets:
- `E1. Habit Tracking`
- `E2. Routine Builder`

Key outcomes:
- Add APIs for create habit, pause habit, update target/frequency, and read logs.
- UI shows weekly completion grid, check/uncheck today, streak, and target progress.
- Orb can propose creating a habit and building a routine.
- Backend owns habit frequency validation, log writes, weekly completion, and streak calculation.
- Smoke covers create habit, log/unlog, routine proposal, and weekly completion update.

#### Part 28 - Goals & Project Breakdown v2

Make goal/project/task relationships editable and useful.

DOD targets:
- `F1. Manage Large Goals`
- `F2. AI Progress Check`

Key outcomes:
- Add CRUD APIs for goals and projects.
- Add link/unlink task to project/goal.
- Goals UI shows real progress and project detail.
- Orb can propose breaking a goal or large task into projects/tasks, including dependencies and suggested first action.
- Add progress check command using goal target, completed work, planned work, and deadlines.
- Smoke covers goal/project creation, task linking, breakdown, and progress calculation.

#### Part 29 - Review & Daily Assistant v2

Persist review history and use the LLM to synthesize a useful daily assistant.

DOD targets:
- `A1. Morning Brief`
- `A3. Evening Review`
- `I4. AI Reflection`

Key outcomes:
- Store review entries: energy, completed summary, skipped work, carried work.
- Morning Brief uses yesterday review, today calendar, deadlines, reminders, and habits, then asks the LLM for a concise brief.
- Evening Review captures natural text, generates reflection, and proposes reschedules.
- Backend validates any proposed schedule changes before writing.
- Smoke covers persisted review, morning brief, and reschedule validation.

### Phase 3 - Production Hardening

#### Part 30 - Production Hardening

Prepare the app for real daily deployment after the framework and core feature verticals are usable.

DOD targets:
- `K2. Verification`

Key outcomes:
- Harden env/config, DB path handling, logging, startup health, and production mode.
- Add SQLite backup/export.
- Add clear API failure and proposal rejection UI states for production.
- Recheck Docker and production docs.
- Consider single-user auth if the app is deployed publicly.
- Smoke covers production serving and core APIs.

## Interface Rules

- Keep `/api/ai/command` and `/api/ai/proposals/:id/confirm` stable.
- Domain APIs should stay simple REST JSON.
- Every mutating AI command must create a proposal first.
- Every proposal that writes scheduled data must validate conflicts at proposal time and confirm time.
- Every proposal shown in Orb must include enough payload data for a compact preview.
- LLM output is never trusted directly; backend validates schema, entity ids, permissions, time ranges, conflicts, and status transitions.
- LLM-required command failures return safe error/clarification states instead of silent manual guessing.
- Non-AI screens and direct CRUD should keep working when Ollama is offline.

## Release Rules

- Do not combine multiple large parts in one commit.
- Update `docs/project_todo.md` after each completed part.
- Each completed todo item should include release date, commit hash, and verification result.
- If a part reveals a prerequisite, add it to the todo file before implementing it.
