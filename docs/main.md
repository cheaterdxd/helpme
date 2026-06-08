# HelpMe Build Direction

`docs/goal.md` is the source of truth for completion.

HelpMe is an AI personal operating system, not a Now-only mockup. The app should help one person run daily life through:

- Calendar
- Todo
- Deadline radar
- Habit tracking
- Goal tracking
- AI planner
- Daily assistant

## Product Shape

HelpMe opens calmly, but it must contain real working views:

- Now: recommended next useful action.
- Today: daily timeline and overload signal.
- Inbox: captured tasks waiting to be organized.
- Calendar: time blocks and events.
- Deadlines: urgency radar.
- Goals: goal -> project -> task relationship.
- Habits: routine signal.
- Review: evening reflection and reschedule suggestions.
- Settings: local AI and behavior preferences.

## AI Shape

AI is the Orb command layer. It is not a permanent chat page.

The user can type natural commands such as:

- "Nhac toi toi mai 8h hoc AWS 1 tieng"
- "Hom nay toi ranh tu 20h den 23h, sap lich giup toi"
- "Organize inbox"
- "Deadline nao sap toi?"
- "Evening review"

Mutating actions must create an AI action proposal first. The backend validates the proposal and only writes to SQLite after user confirmation.

## MVP Priority

The next MVP should focus on:

1. Today timeline.
2. Inbox organization.
3. Orb command and proposal confirmation.
4. Rule-based planner.
5. Local Ollama integration as an enhancement, not a hard dependency.

Now stays important, but it is only one entry point in the personal OS.
