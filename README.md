# HelpMe

HelpMe is an AI-first, local-first life admin app. The current milestone focuses on a calm React UI with a thin web server and mock AI briefing APIs.

## Run Locally

Prerequisite: Node.js 20 or newer.

```powershell
npm install
npm run dev
```

The integrated Fastify + Vite dev server listens on:

```powershell
http://localhost:3000
```

## Production Mode

Build the frontend and serve it through the web server:

```powershell
npm run build
$env:NODE_ENV="production"; npm start
```

Override the port when needed:

```powershell
$env:PORT=8080; npm start
```

## Server Scope

This is intentionally a thin web server, not the full HelpMe backend.

- Serves the Vite React app.
- Provides `GET /healthz` for hosting health checks.
- Provides mock `GET /api/now` and `POST /api/ask`.
- Stores seed data in local SQLite at `data/helpme.sqlite`.
- Reads initial seed fixtures from `server/mock-data`.
- Does not implement task storage, real AI planning, or local model integration yet.
- Keeps the product direction Now-first and AI-first, not dashboard-first.

## Database

The current database layer uses SQLite with Drizzle schema definitions.

```powershell
npm run db:migrate
npm run db:seed
npm run db:reset
```

`npm start` will auto-migrate and seed the default data if the database is empty.

## Deploy

Use any Node web host that supports `npm start`, such as Render, Railway, Fly.io, a VPS, or Docker.

Docker:

```powershell
docker build -t helpme .
docker run --rm -p 3000:3000 helpme
```
