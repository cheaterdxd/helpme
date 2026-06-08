# HelpMe Product Brief

HelpMe is a local-first AI personal operating system.

The product is complete when it can help the user manage daily life across tasks, calendar, deadlines, habits, goals, planning, reminders, and review.

## Core Jobs

1. Know what the user has to do today.
2. Detect what is urgent, overdue, or overloaded.
3. Create a realistic day plan from tasks and available time.
4. Parse natural language into structured actions.
5. Propose changes before writing data.
6. Connect daily work to goals.
7. Review the day and reschedule unfinished work.

## Core Modules

- Task Manager
- Calendar Manager
- Deadline Manager
- Habit Tracker
- Goal Manager
- AI Planner
- Notification/Reminder Engine
- AI Command Layer

## AI Contract

AI should:

- Parse intent.
- Prioritize work.
- Explain briefly.
- Create proposals.
- Wait for confirmation before mutation.

AI should not:

- Act like a generic chatbot.
- Write important data without confirmation.
- Expose long reasoning or chain-of-thought.
- Force the user to inspect raw dashboard data before helping.

## Local-First Direction

The app stores product data in SQLite. Local Ollama is the first AI provider. If Ollama is offline, HelpMe must still run using rule-based planning and deterministic fallback behavior.
