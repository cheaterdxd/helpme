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

### Part 17 - AI Intent Parser v2

Let AI handle natural-language understanding for Vietnamese commands, while the backend owns schema validation, safety, conflict checks, and error handling.

Key outcomes:
- Add an AI intent extraction step for commands such as `8h hoc AWS 1h`, `ngay mai 8:30`, `toi mai 20h`, `trong 60 phut`, and `tu 20h den 23h`.
- Require AI output to match a strict schema: intent, entity ids or text, date, start time, end time, duration, confidence, and missing fields.
- Backend validates all AI output before creating a proposal; invalid or low-confidence output asks for clarification or returns an error.
- Remove broad manual parsing from the command handler instead of building a large rule parser.
- Add smoke or focused tests for AI output validation, LLM failure behavior, and proposal-first safety.

### Part 18 - Task CRUD v1

Make task management usable from both direct UI actions and LLM-backed Orb commands.

Key outcomes:
- Add direct APIs for create, update, cancel/archive, priority, due date, and schedule.
- Backend validates schedule conflicts when a task gets a time block.
- UI supports lightweight task editing from task rows or a compact editor.
- Orb task creation/editing uses the AI intent parser to produce structured proposals instead of manual text parsing.
- Smoke covers create/update/cancel and conflict rejection.

### Part 19 - Calendar v2

Turn Calendar from a list into a practical planning surface, with LLM-assisted event creation and schedule explanation.

Key outcomes:
- Add day/week lightweight calendar views.
- Add APIs for calendar events and time blocks.
- UI clearly separates busy time, free windows, and planned task blocks.
- Planner continues to avoid conflicts with events, time blocks, and scheduled tasks.
- Orb can propose events and time blocks from natural language, while backend code validates exact time ranges and conflicts.
- Smoke covers event creation and planner conflict avoidance.

### Part 20 - Reminders v1

Activate reminders as a real daily feature, using the LLM for natural reminder capture.

Key outcomes:
- Add APIs for due/upcoming reminders, create reminder, mark done, and snooze.
- Orb can create reminders from natural language such as `nhac toi`, with model-extracted date/time/repeat fields.
- Today and Settings show reminder state.
- Backend scheduler logic determines due/upcoming/done/snooze state without relying on the model.
- Smoke covers reminder creation, due list, and mark done.

### Part 21 - Habits v2

Make habit tracking more useful and editable, with LLM-generated setup suggestions and insights.

Key outcomes:
- Add APIs for create habit, pause habit, update target/frequency, and read logs.
- UI shows weekly completion grid, check/uncheck today, streak, and target progress.
- Orb can propose creating a habit from natural language and can summarize routine drift in short insight text.
- Backend code owns habit frequency validation, log writes, weekly completion, and streak calculation.
- Smoke covers create habit, log/unlog, and weekly completion update.

### Part 22 - Deadlines v2

Make Deadline Radar a real management workflow, with LLM-assisted capture and explanation.

Key outcomes:
- Add CRUD APIs for deadlines.
- Link deadlines to task, project, or goal.
- Use LLM to extract deadline title, due date, linked context, and severity hint from natural language.
- Keep date buckets and conflict/schedule math deterministic in backend code.
- Add Orb commands for creating deadlines and explaining pressure in plain language.
- Smoke covers deadline creation, grouping, and planner scoring impact.

### Part 23 - Goals & Projects v2

Make goal/project/task relationships editable and useful, with LLM-assisted breakdown.

Key outcomes:
- Add CRUD APIs for goals and projects.
- Add link/unlink task to project/goal.
- Goals UI shows real progress and project detail.
- Orb can propose breaking a goal or large task into projects/tasks, including dependencies and suggested first action.
- Backend validates entity links, stores proposals, and calculates progress from real tasks.
- Smoke covers goal/project creation, task linking, and progress calculation.

### Part 24 - Daily Review & Morning Brief v2

Persist real review history and use the LLM to synthesize a useful daily assistant.

Key outcomes:
- Store review entries: energy, completed summary, skipped work, carried work.
- Morning Brief uses yesterday review, today calendar, deadlines, and habits, then asks the LLM for a concise brief.
- Review UI shows completed, carried over, and energy trend.
- Evening Review uses LLM-generated reflection and reschedule suggestions, while backend code validates any proposed changes.
- Smoke covers persisted review and brief reflection.

### Part 25 - AI Orchestrator Harness & Command Expansion

Replace the growing command-handler if/else flow with an LLM-aware orchestration harness, then expand Orb beyond the current core intents.

Key outcomes:
- Add an orchestrator lifecycle: understand, gather context, plan, validate, propose, log.
- Add task modes: `quick` for simple model extraction and `deep` for multi-step planning.
- Enforce budgets: timeout, max steps, max context size, and no chain-of-thought exposure.
- Add intents: `create_deadline`, `create_habit`, `create_event`, `create_goal`, `breakdown_task`, `summarize_today`, and `weekly_plan`.
- Mutating intents always create `ai_action_proposal`.
- All AI outputs use Zod validation.
- Ollama failure or invalid JSON returns a safe error/clarification state instead of silently guessing.
- Smoke covers proposal and confirm path for key new intents.

### Part 26 - Planner Engine v2

Improve planning quality by combining deterministic constraints with LLM-generated planning proposals.

Key outcomes:
- Split planner into a clearer engine with deterministic constraints and LLM proposal generation.
- Backend computes hard constraints: available windows, conflicts, due buckets, task duration, and existing schedule.
- LLM proposes plan candidates, overload resolution, priority tradeoffs, and short explanations.
- Backend validates selected candidates before creating proposals.
- Planner uses settings-defined working windows instead of hard-coded evening windows.
- Smoke covers overload handling and available-minute limits.

### Part 27 - Settings & Preferences

Make HelpMe configurable for the user and for model behavior.

Key outcomes:
- Add settings APIs for timezone, working windows, quiet hours, preferred model, model timeout, deep-mode toggle, and display name.
- Settings UI edits key preferences.
- AI orchestrator and planner read settings instead of constants where appropriate.
- Smoke covers updating working window and planning with the new window.

### Part 28 - Production Hardening

Prepare the app for real daily deployment.

Key outcomes:
- Harden env/config, DB path handling, logging, startup health, and production mode.
- Add SQLite backup/export.
- Add clear API failure and proposal rejection UI states.
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
