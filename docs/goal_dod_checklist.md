# HelpMe Goal DOD Checklist

This checklist splits `docs/goal.md` into concrete Definition of Done items and evaluates the current implementation from source code.

Status legend:
- `[x] Done`: usable in current source code.
- `[~] Partial`: foundation exists, but important DOD items are missing.
- `[ ] Missing`: not implemented beyond docs/schema/seed or not exposed to users.

Evaluation date: 2026-06-12.

## Overall Assessment

HelpMe currently has a solid MVP foundation: real Fastify server, React UI, SQLite data model, core screens, proposal-first Orb commands, rule-based prioritization, calendar conflict validation, focus sessions, habit logging, and smoke coverage for key proposal flows.

It is not yet complete as the final personal operating system in `docs/goal.md`. The biggest gaps are LLM-first intent parsing, orchestrator harness, direct CRUD for most domains, notification/reminder engine, week/month calendar, recurring events, goal breakdown/progress intelligence, persisted review history, and settings that actually control planner/model behavior.

## Completion Snapshot

| Area | Status | Current assessment |
| --- | --- | --- |
| Web server app | `[x] Done` | Fastify serves APIs and production static files. |
| SQLite data foundation | `[x] Done` | Core entities exist in schema and migrations. |
| Core navigation/screens | `[~] Partial` | Screens exist, but several are read-only or shallow. |
| Now recommended action | `[x] Done` | Now has goal -> project -> task selection and AI recommendation signal. |
| Today / morning brief | `[~] Partial` | Today summary and suggested focus exist, but no true generated morning brief history/context. |
| AI day planning | `[~] Partial` | Plan-day proposal exists with conflict validation, but planner is mostly rule-based and not LLM-first. |
| Evening review | `[~] Partial` | Review summary and reschedule proposal exist, but natural review capture and persisted review entries are missing. |
| Task manager | `[~] Partial` | Complete/reopen/focus and AI create/reschedule exist; full direct CRUD/edit/cancel/link/breakdown missing. |
| Smart inbox | `[~] Partial` | Organize proposal exists, but classification is rule-based and not LLM-backed. |
| Deadline manager | `[~] Partial` | Radar buckets exist; CRUD, reminders, LLM capture/explanation are missing. |
| Calendar manager | `[~] Partial` | Day view, time blocks, free windows, conflict detection exist; week/month/drag/drop/recurrence/event CRUD missing. |
| Focus sessions | `[~] Partial` | Start/complete focus works; follow-up capture after focus is missing. |
| Habit tracker | `[~] Partial` | Check-in/log, streak, completion, insight exist; create/edit/routine builder/deeper review missing. |
| Goal manager | `[~] Partial` | Goal -> project -> task overview exists; CRUD, breakdown, true progress intelligence missing. |
| Reminder/notification engine | `[ ] Missing` | Schema exists, but no usable reminder APIs/notifications. |
| AI command layer | `[~] Partial` | Orb, proposals, confirm flow exist; AI intent parser and orchestrator not implemented. |
| Local LLM integration | `[~] Partial` | Ollama client/status/JSON call/logging exist; limited usage, not primary command brain. |
| AI safety | `[~] Partial` | Proposal-first and conflict validation exist for several flows; not all mutating domains exist yet. |
| Settings/preferences | `[ ] Missing` | Settings screen mainly displays local AI status; no editable preferences. |
| Verification | `[x] Done` | Smoke script covers core APIs, proposals, focus, habits, conflicts. |

## A. Daily Management

### A1. Morning Brief

DOD:
- [x] Show today's summary: due today, overdue, events, inbox, open tasks, planned minutes.
- [x] Recommend a focus task with reason and risk.
- [x] Show Today timeline.
- [~] Include habit, deadline, and calendar context in a concise daily view.
- [ ] Generate a true morning brief using LLM synthesis.
- [ ] Persist daily brief output or daily assistant history.

Current evidence:
- `server/db/app-queries.mjs`: `getTodayView`.
- `src/components/RoutePanel.tsx`: `TodayView`.
- `server/ai/planner.mjs`: `createPlannerDecision`.

Assessment: partial. The Today screen is useful, but it is a deterministic dashboard, not yet an AI-generated morning assistant.

### A2. AI Plan My Day

DOD:
- [x] Accept a natural command through Orb.
- [x] Create a `plan_day` proposal.
- [x] Use tasks, deadlines, calendar events, estimated duration, and priority.
- [x] Validate free windows and blocked intervals.
- [x] Confirm proposal before writing `daily_plans` and `time_blocks`.
- [~] Use local LLM for short summary/reason.
- [ ] Use LLM to generate actual plan candidates.
- [ ] Support weekly planning.

Current evidence:
- `server/ai/command.mjs`: `looksLikePlanDayCommand`, `parseTimeWindow`, `enrichPlanSummary`.
- `server/db/app-queries.mjs`: `createPlanDayProposal`, `buildFreeWindows`, `buildPlanValidation`.
- `scripts/smoke.mjs`: plan-day proposal and confirm checks.

Assessment: partial. The flow exists and is safe, but it is rule-based scheduling plus LLM summary, not an LLM planner.

### A3. Evening Review

DOD:
- [x] Show completed and unfinished work.
- [x] Create a review reschedule proposal.
- [x] Validate reschedule conflicts.
- [x] Confirm before writing schedule changes.
- [ ] Capture natural review text.
- [ ] Persist review entries: energy, completed summary, skipped work, carried work.
- [ ] Generate LLM reflection and follow-up suggestions.

Current evidence:
- `server/db/app-queries.mjs`: `getReviewSummary`, `createDailyReviewProposal`, `buildReviewReschedulePlan`.
- `src/components/RoutePanel.tsx`: `ReviewView`.
- `scripts/smoke.mjs`: daily review proposal and confirm checks.

Assessment: partial. Rescheduling exists; real review capture/history does not.

## B. Smart Todo

### B1. Add Task With Natural Language

DOD:
- [x] Orb can create a task proposal.
- [x] Scheduled task proposal validates conflicts.
- [x] Confirmation writes the task.
- [~] Parses simple time/date/duration with manual code.
- [ ] LLM extracts Vietnamese intent and structured fields.
- [ ] Creates linked reminder when user says "nhac toi".
- [ ] Handles low-confidence extraction with clarification/error.

Current evidence:
- `server/ai/command.mjs`: `looksLikeCreateTaskCommand`, `parseCreateTask`.
- `server/db/app-queries.mjs`: `createTaskProposal`, `applyProposal`.
- `scripts/smoke.mjs`: create task conflict and clear-slot checks.

Assessment: partial. The safety path is strong, but the language understanding is still manual and reminder creation is missing.

### B2. Create Task From Vague Input

DOD:
- [ ] Interpret vague natural language such as "cuoi tuan nay xem lai lo trinh".
- [ ] Infer due date, priority, category/project.
- [ ] Ask clarification when needed.
- [ ] Create proposal before writing.

Current evidence:
- No LLM intent parser or clarification flow exists.
- Current parser only handles simple patterns in `server/ai/command.mjs`.

Assessment: missing.

### B3. Break Down Large Task

DOD:
- [ ] Detect large/ambiguous task.
- [ ] Propose project + subtasks.
- [ ] Link subtasks to goal/project.
- [ ] Confirm before writing.

Current evidence:
- No `breakdown_task` intent or proposal path in `server/ai/command.mjs`.
- No direct project/task creation flow for breakdown in `server/db/app-queries.mjs`.

Assessment: missing.

## C. Deadline Management

### C1. Deadline Radar

DOD:
- [x] Show overdue, today, this week, later.
- [x] Score urgency from due date/severity.
- [x] Link deadline pressure into task prioritization.
- [~] Show radar UI.
- [ ] Deadline CRUD.
- [ ] LLM deadline capture from natural language.
- [ ] Reminder generation for deadlines.

Current evidence:
- `server/db/app-queries.mjs`: `getDeadlineRadar`.
- `server/ai/planner.mjs`: `classifyDeadline`, `scoreDeadlinePressure`.
- `src/components/RoutePanel.tsx`: `DeadlinesView`.

Assessment: partial.

### C2. Overload Warning

DOD:
- [x] Compare planned minutes, available minutes, and open task estimates.
- [x] Show overload level and suggestions.
- [~] Use overload signal in Today.
- [ ] LLM analyzes tradeoffs and proposes keep/move/reduce-scope plan.
- [ ] Confirmable overload-resolution proposal.

Current evidence:
- `server/db/app-queries.mjs`: `buildOverloadSummary`.
- `src/components/RoutePanel.tsx`: Today metrics and overload display.

Assessment: partial.

## D. Smart Calendar

### D1. Time Blocking

DOD:
- [x] Store time blocks.
- [x] Show day timeline.
- [x] Detect free windows.
- [x] Validate calendar conflicts.
- [x] Write time blocks after proposal confirmation.
- [ ] Drag/drop task into time slot.
- [ ] Event/time-block CRUD endpoints.
- [ ] Week/month views.
- [ ] Recurring events.

Current evidence:
- `server/db/schema.mjs`: `calendarEvents`, `timeBlocks`.
- `server/db/app-queries.mjs`: `getCalendarView`, `buildFreeWindows`, `findPlanConflicts`.
- `src/types.ts`: `CalendarData` has `mode: "day"`.
- `src/components/RoutePanel.tsx`: `CalendarView`.

Assessment: partial.

### D2. Automatic Reschedule

DOD:
- [x] Orb can create a `reschedule_task` proposal.
- [x] Backend validates conflicts.
- [x] Confirmation writes schedule changes.
- [~] Evening review can reschedule unfinished tasks.
- [ ] LLM classifies urgent vs non-urgent tasks.
- [ ] Bulk reschedule command such as "doi cac task khong gap sang ngay mai".

Current evidence:
- `server/ai/command.mjs`: `looksLikeRescheduleCommand`.
- `server/db/app-queries.mjs`: `createRescheduleProposal`, `buildReviewReschedulePlan`.
- `scripts/smoke.mjs`: conflicting and clear reschedule checks.

Assessment: partial.

### D3. Focus Session

DOD:
- [x] Start focus session from suggested task.
- [x] Complete focus session.
- [x] Optionally complete task after focus.
- [x] Show active focus session on Today.
- [ ] Ask follow-up after focus.
- [ ] Create follow-up task from post-focus input.
- [ ] Break timer / deep-work mode settings.

Current evidence:
- `server/db/app-queries.mjs`: `startFocusSession`, `completeFocusSession`.
- `src/components/RoutePanel.tsx`: focus actions in Today.
- `scripts/smoke.mjs`: start and complete focus session checks.

Assessment: partial.

## E. Habit & Routine

### E1. Habit Tracking

DOD:
- [x] Store habits and habit logs.
- [x] Show streak and completion rate.
- [x] Log today's habit from UI/API.
- [~] Show simple insight text.
- [ ] Create/edit/pause habit.
- [ ] Weekly habit review screen.
- [ ] LLM-generated habit insight.

Current evidence:
- `server/db/schema.mjs`: `habits`, `habitLogs`.
- `server/db/app-queries.mjs`: `getHabitDashboard`, `logHabitToday`, `buildHabitInsight`.
- `src/components/RoutePanel.tsx`: `HabitsView`.
- `scripts/smoke.mjs`: habit log check.

Assessment: partial.

### E2. Routine Builder

DOD:
- [ ] Accept routine-building request.
- [ ] LLM proposes routine blocks.
- [ ] Confirm before creating tasks/time blocks/habits.
- [ ] Persist routine or generated blocks.

Current evidence:
- No routine builder intent or proposal path exists.

Assessment: missing.

## F. Goal Management

### F1. Manage Large Goals

DOD:
- [x] Store goals and projects.
- [x] Show goal -> project -> task relationship.
- [x] Now screen can select goal/project/task.
- [~] Show progress based on related tasks.
- [ ] Goal/project CRUD.
- [ ] Goal deadline/weekly target management.
- [ ] Goal -> milestone -> task -> calendar block hierarchy.

Current evidence:
- `server/db/schema.mjs`: `goals`, `projects`, `tasks`.
- `server/db/app-queries.mjs`: `getGoalsOverview`.
- `server/db/now-query.mjs`: selection tree and focus path.
- `src/components/NowScreen.tsx`: goal/project/task columns.
- `src/components/RoutePanel.tsx`: `GoalsView`.

Assessment: partial.

### F2. AI Progress Check

DOD:
- [ ] Ask progress question such as "toi co dung tien do khong".
- [ ] Compare weekly target vs actual logged/planned work.
- [ ] Suggest catch-up schedule.
- [ ] Confirm schedule changes before writing.

Current evidence:
- No AI progress-check intent.
- No weekly target engine.

Assessment: missing.

## G. User-Visible Screens

DOD:
- [x] Now screen.
- [x] Today screen.
- [x] Inbox screen.
- [x] Calendar screen.
- [x] Deadline Radar screen.
- [x] Goals screen.
- [x] Habits screen.
- [x] Review screen.
- [x] Settings screen.
- [~] Screens are backed by SQLite data.
- [ ] Calendar week/month views.
- [ ] Settings editing.
- [ ] Drag/drop interactions.

Current evidence:
- `src/navigation.ts`: route list.
- `src/components/RoutePanel.tsx`: secondary views.
- `src/components/NowScreen.tsx`: Now selection UI.
- `src/api.ts`: app data loaded from API endpoints.

Assessment: partial. The app has the required screen skeleton and useful MVP data, but several screens are read-only or shallow.

## H. Core Data Entities

DOD:
- [x] Task.
- [x] Calendar event.
- [x] Deadline.
- [x] Habit.
- [x] Habit log.
- [x] Goal.
- [x] Project.
- [x] Reminder.
- [x] Focus session.
- [x] Daily plan.
- [x] Time block.
- [x] AI run.
- [x] AI action proposal.
- [~] Settings.
- [ ] Tags.
- [ ] Milestones.
- [ ] Review entries.

Current evidence:
- `server/db/schema.mjs`.
- `server/db/migrations/0001_initial.sql`.
- `server/db/migrations/0002_personal_os.sql`.

Assessment: partial. Most tables exist, but several are not yet exposed through complete workflows.

## I. AI System

### I1. AI Intent Parser

DOD:
- [ ] LLM extracts intent and structured fields.
- [ ] Zod validates intent output.
- [ ] Low-confidence/missing fields returns clarification/error.
- [ ] No broad manual parser fallback.
- [ ] AI run logged.

Current evidence:
- `server/ai/command.mjs` still uses `looksLike...` and manual parse helpers.
- `server/ai/ollama-client.mjs` can call Ollama and validate JSON, but command intent does not use it yet.

Assessment: missing for the target design; current implementation is manual-rule MVP.

### I2. AI Planner

DOD:
- [x] Rank open tasks.
- [x] Account for deadline urgency, priority, effort fit, goal importance, overdue penalty.
- [x] Recommend focus.
- [x] Create day plan proposal.
- [~] Use LLM for summary only.
- [ ] LLM generates plan candidates.
- [ ] Plan my week.
- [ ] Deep planning mode.

Current evidence:
- `server/ai/planner.mjs`.
- `server/db/app-queries.mjs`: `createPlanDayProposal`.
- `server/ai/command.mjs`: `enrichPlanSummary`.

Assessment: partial.

### I3. AI Prioritizer

DOD:
- [x] Compute priority score.
- [x] Provide score breakdown.
- [x] Provide reason and risk summary.
- [~] Explain highest priority in Orb fallback.
- [ ] LLM-generated tradeoff explanation.
- [ ] User-adjustable weights.

Current evidence:
- `server/ai/planner.mjs`: `scoreTask`, `buildReason`, `buildRisk`.
- `server/db/app-queries.mjs`: `rankOpenTasks`.
- `src/components/RoutePanel.tsx`: `ScoreChips`.

Assessment: partial.

### I4. AI Reflection

DOD:
- [~] Review screen summarizes completed/unfinished work.
- [x] Creates reschedule proposal for unfinished work.
- [ ] LLM reflection summary.
- [ ] Persisted review history.
- [ ] Habit/task pattern analysis.

Current evidence:
- `server/db/app-queries.mjs`: `getReviewSummary`, `createDailyReviewProposal`.

Assessment: partial.

### I5. AI Orchestrator Harness

DOD:
- [ ] Separate orchestrator lifecycle: understand, gather context, plan, validate, propose, log.
- [ ] Quick/deep task modes.
- [ ] Budgets: timeout, max steps, max context size.
- [ ] No chain-of-thought exposure.
- [ ] Safe error/clarification handling.

Current evidence:
- No `server/ai/orchestrator.mjs`.
- `server/ai/command.mjs` is still a linear command handler.

Assessment: missing.

### I6. Local LLM Client

DOD:
- [x] Ollama status endpoint.
- [x] Configurable base URL/model through env.
- [x] JSON-mode generation helper.
- [x] Timeout handling.
- [x] AI run logging.
- [~] Used by plan summary.
- [ ] Used as primary intent/planner engine.

Current evidence:
- `server/ai/ollama-client.mjs`.
- `server.mjs`: `/api/ai/status`.
- `server/ai/command.mjs`: `enrichPlanSummary`.

Assessment: partial.

## J. Notification / Reminder Engine

DOD:
- [x] Reminder table exists.
- [ ] Reminder CRUD APIs.
- [ ] Due/upcoming reminder API.
- [ ] Snooze/done behavior.
- [ ] Reminder before deadline.
- [ ] Reminder before scheduled task.
- [ ] Overdue alert workflow.

Current evidence:
- `server/db/schema.mjs`: `reminders`.
- No `/api/reminders` route in `server.mjs`.

Assessment: missing as a usable feature.

## K. Safety, Persistence, And Verification

### K1. Proposal-First Mutation

DOD:
- [x] Mutating Orb commands create `ai_action_proposal`.
- [x] UI shows proposal preview and confirm button.
- [x] Confirm endpoint applies proposal.
- [x] Scheduled data is validated before and during confirmation for implemented flows.
- [ ] Edit/cancel proposal flow.
- [ ] Proposal rejection/cancel API.

Current evidence:
- `server/db/app-queries.mjs`: `createActionProposal`, `confirmActionProposal`, `applyProposal`.
- `src/components/AskOverlay.tsx`: proposal previews and confirm.
- `scripts/smoke.mjs`: proposal confirmation and conflict rejection.

Assessment: partial.

### K2. Verification

DOD:
- [x] Type check script.
- [x] Build script.
- [x] DB reset script.
- [x] Smoke test script.
- [x] Smoke covers core API, proposal confirm, focus, habit log, conflict rejection.
- [ ] Focused unit tests for parser/orchestrator/planner internals.
- [ ] Browser UI regression screenshots.

Current evidence:
- `package.json`.
- `scripts/smoke.mjs`.

Assessment: partial to done for MVP release safety; missing deeper automated coverage.

## Recommended Next DOD Order

1. Part 17 - AI Intent Parser v2
   - Replace command manual parsing with LLM structured extraction.
   - Validate with Zod.
   - Return error/clarification on LLM failure.
   - Keep proposal-first safety.

2. Part 25 should move earlier or be split as Part 17A - AI Orchestrator Harness v1
   - The command handler will become hard to maintain if more LLM-backed features are added without orchestration.

3. Part 18 - Task CRUD v1
   - Add direct create/edit/cancel/schedule APIs and UI.
   - Reuse AI intent output for Orb task proposals.

4. Part 20 - Reminders v1
   - This unlocks the "daily assistant" promise more than another passive screen.

5. Part 24 - Review/Morning Brief v2
   - Persist review entries and let the LLM synthesize the daily assistant layer.

## Bottom Line

Current HelpMe is a working personal-OS MVP shell with real persistence, proposal safety, and several usable daily workflows.

It is not yet the full HelpMe described in `docs/goal.md`. The next meaningful completion jump is not more UI panels; it is making the Orb truly LLM-driven with a validated orchestrator, then using that foundation to power task capture, reminders, planning, review, and goal breakdown.
