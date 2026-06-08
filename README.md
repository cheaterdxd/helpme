# HelpMe

HelpMe is a local-first AI personal operating system for daily life admin. The current MVP connects a React UI, a Fastify web server, SQLite data, a rule-based planner, and an Ollama-backed command layer with rule-based fallback.

`docs/goal.md` is the source of truth for what "complete HelpMe" means.

## Run Locally

Prerequisite: Node.js 20 or newer.

```powershell
npm install
npm run dev
```

Default URL:

```powershell
http://localhost:3000
```

## Product Areas

The app currently exposes these screens:

- Now: next useful action.
- Today: timeline, suggested focus, overload signal, planner score.
- Inbox: captured tasks and AI organize proposal.
- Calendar: time blocks and events.
- Deadlines: overdue, today, this week, later.
- Goals: goal -> project -> task.
- Habits: routine signal.
- Review: evening review and reschedule proposal.
- Settings: local AI status and fallback mode.

The Orb opens the command layer. Commands that mutate data create an `ai_action_proposal` first and only write to SQLite after confirmation.

## API Surface

Core endpoints:

- `GET /healthz`
- `GET /api/now`
- `GET /api/today`
- `GET /api/tasks`
- `POST /api/inbox/organize`
- `GET /api/calendar`
- `GET /api/deadlines`
- `GET /api/habits`
- `GET /api/goals`
- `GET /api/review`
- `GET /api/ai/status`
- `POST /api/ai/command`
- `POST /api/ai/proposals/:id/confirm`

Legacy compatibility:

- `POST /api/ask` routes through the same AI command layer.

## Database

SQLite is stored at `data/helpme.sqlite` by default.

```powershell
npm run db:migrate
npm run db:seed
npm run db:reset
```

The server auto-migrates and seeds default data if the database is empty.

## Local AI

The default local model is:

```powershell
qwen3:1.7b
```

Enable local summaries:

```powershell
ollama serve
ollama pull qwen3:1.7b
```

If Ollama is offline or the model is missing, HelpMe still runs using the rule-based planner. AI runs and fallback errors are logged in `ai_runs`.

## Verification

Run before every feature release:

```powershell
npm run db:reset
npm run check
npm run build
npm run smoke
```

`npm run smoke` starts a temporary server with a temporary SQLite database, checks the core APIs, creates and confirms an AI proposal, then cleans up.

## Release-Part Workflow

Development is split into release parts. Each large part should be committed and pushed separately after verification.

Recommended flow:

```powershell
npm run db:reset
npm run check
npm run build
npm run smoke
git add -A
git commit -m "feat: <release part>"
git push origin main
```

Do not bundle multiple large parts into one commit.

## Production Mode

Build the frontend and serve it through Fastify:

```powershell
npm run build
$env:NODE_ENV="production"; npm start
```

Override the port when needed:

```powershell
$env:PORT=8080; npm start
```

Docker:

```powershell
docker build -t helpme .
docker run --rm -p 3000:3000 helpme
```
