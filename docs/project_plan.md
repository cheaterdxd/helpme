# HelpMe Full Project Continuation Plan

## Summary

HelpMe is a local-first AI personal operating system. The current MVP already has React, Fastify, SQLite, rule-based planning, Ollama fallback, the Orb command layer, proposal confirmation, core screens, and calendar conflict validation for scheduled task creation, task rescheduling, day planning, and review rescheduling.

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

## Roadmap

### Part 17 - Command Parser v2

Improve natural-language parsing for Vietnamese date, time, duration, and time windows.

Key outcomes:
- Parse `8h hoc AWS 1h` as start time 08:00 and duration 60 minutes.
- Parse `ngay mai 8:30`, `toi mai 20h`, `trong 60 phut`, and `tu 20h den 23h`.
- Move parser behavior into a dedicated module instead of keeping all parsing inside the command handler.
- Add smoke or focused tests for parser edge cases.

### Part 18 - Task CRUD v1

Make task management usable without relying only on AI commands.

Key outcomes:
- Add direct APIs for create, update, cancel/archive, priority, due date, and schedule.
- Backend validates schedule conflicts when a task gets a time block.
- UI supports lightweight task editing from task rows or a compact editor.
- Smoke covers create/update/cancel and conflict rejection.

### Part 19 - Calendar v2

Turn Calendar from a list into a practical planning surface.

Key outcomes:
- Add day/week lightweight calendar views.
- Add APIs for calendar events and time blocks.
- UI clearly separates busy time, free windows, and planned task blocks.
- Planner continues to avoid conflicts with events, time blocks, and scheduled tasks.
- Smoke covers event creation and planner conflict avoidance.

### Part 20 - Reminders v1

Activate reminders as a real daily feature.

Key outcomes:
- Add APIs for due/upcoming reminders, create reminder, mark done, and snooze.
- Orb can create reminders from natural language such as `nhac toi`.
- Today and Settings show reminder state.
- Smoke covers reminder creation, due list, and mark done.

### Part 21 - Habits v2

Make habit tracking more useful and editable.

Key outcomes:
- Add APIs for create habit, pause habit, update target/frequency, and read logs.
- UI shows weekly completion grid, check/uncheck today, streak, and target progress.
- Orb can propose creating a habit.
- Smoke covers create habit, log/unlog, and weekly completion update.

### Part 22 - Deadlines v2

Make Deadline Radar a real management workflow.

Key outcomes:
- Add CRUD APIs for deadlines.
- Link deadlines to task, project, or goal.
- Improve severity scoring and grouping.
- Add Orb commands for creating deadlines and explaining pressure.
- Smoke covers deadline creation, grouping, and planner scoring impact.

### Part 23 - Goals & Projects v2

Make goal/project/task relationships editable and useful.

Key outcomes:
- Add CRUD APIs for goals and projects.
- Add link/unlink task to project/goal.
- Goals UI shows real progress and project detail.
- Orb can propose breaking a goal or large task into project/tasks.
- Smoke covers goal/project creation, task linking, and progress calculation.

### Part 24 - Daily Review & Morning Brief v2

Persist real review history and use it to improve the next day.

Key outcomes:
- Store review entries: energy, completed summary, skipped work, carried work.
- Morning Brief uses yesterday review, today calendar, deadlines, and habits.
- Review UI shows completed, carried over, and energy trend.
- Smoke covers persisted review and brief reflection.

### Part 25 - AI Command Expansion

Expand Orb beyond the current core intents.

Key outcomes:
- Add intents: `create_deadline`, `create_habit`, `create_event`, `create_goal`, `breakdown_task`, `summarize_today`, and `weekly_plan`.
- Mutating intents always create `ai_action_proposal`.
- All AI outputs use Zod validation.
- Ollama failure or invalid JSON falls back without crashing.
- Smoke covers proposal and confirm path for key new intents.

### Part 26 - Planner Engine v2

Improve planning quality and make scoring more configurable.

Key outcomes:
- Split planner into a clearer engine with configurable weights.
- Use deadline urgency, priority, effort fit, goal importance, habit cadence, and energy.
- Add overload-resolution proposals: keep, move, reduce scope.
- Planner uses settings-defined working windows instead of hard-coded evening windows.
- Smoke covers overload handling and available-minute limits.

### Part 27 - Settings & Preferences

Make HelpMe configurable for the user.

Key outcomes:
- Add settings APIs for timezone, working windows, quiet hours, preferred model, planner weights, and display name.
- Settings UI edits key preferences.
- Parser and planner read settings instead of constants where appropriate.
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
- Rule-based fallback must keep the app usable when Ollama is offline.

## Release Rules

- Do not combine multiple large parts in one commit.
- Update `docs/project_todo.md` after each completed part.
- Each completed todo item should include release date, commit hash, and verification result.
- If a part reveals a prerequisite, add it to the todo file before implementing it.

