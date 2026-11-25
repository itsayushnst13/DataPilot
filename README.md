# DataPilot

**Autonomous multi-agent AI data analyst** — connect a PostgreSQL database, ask business questions in natural language, and receive an answer with the generated SQL and supporting evidence.

> Current status: functional MVP foundation. Authentication, workspaces, encrypted PostgreSQL connections, schema exploration, read-only SQL execution and a four-stage LangGraph investigation pipeline are implemented in the repository. Run the verification steps below before treating any deployment as production-ready.

## Stack

| Layer | Technology |
|---|---|
| Web | React 18, JavaScript, Vite, Tailwind CSS, Recharts |
| API | Node.js 20, Express, JavaScript ES modules, Zod |
| Database | PostgreSQL 16, Prisma |
| Authentication | bcrypt password hashing, signed JWT bearer tokens |
| Database connections | node-postgres, AES-256-GCM credential encryption |
| Agent orchestration | Python 3.11, LangGraph, Gemini |
| Analytics | Pandas, NumPy |
| Local infrastructure | Docker Compose, PostgreSQL, Redis |

No TypeScript and no MongoDB are used.

## Architecture

```text
React + Vite (JavaScript)
        |
        | Bearer JWT / REST
        v
Node.js + Express API
  |       |         |
  |       |         +-- Auth + Workspace + Investigation APIs
  |       |
  |       +-- Prisma ---------------- PostgreSQL (DataPilot metadata)
  |
  +-- Encrypted connection vault -- External PostgreSQL data source
  |       +-- Read-only transaction
  |       +-- Statement timeout
  |       +-- SQL operation guard
  |       +-- 500-row response cap
  |
  +-- Internal service token
          |
          v
     Python FastAPI agent service
          |
          v
       LangGraph workflow
       1. Planner   -> Gemini creates schema-grounded SQL
       2. Executor  -> Express internal API executes read-only SQL
       3. Analyst   -> Pandas summaries and chart specification
       4. Verifier  -> evidence-grounded natural-language answer
```

The external database password stays inside the Express API boundary; it is not sent to the Python agent service.

## Repository layout

```text
apps/
  web/                 React JavaScript frontend
  api/
    prisma/schema.prisma
    src/
      middleware/      JWT and workspace authorization
      routes/          auth, workspace, data source, SQL, investigations
      services/        encrypted PostgreSQL connection and agent runner
services/
  agents/
    app/main.py        FastAPI entry point
    app/workflow.py    LangGraph multi-agent workflow
docker-compose.yml     PostgreSQL and Redis for local development
```

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
- Docker Desktop (recommended)
- A Gemini API key for AI investigations
- A PostgreSQL database you are authorized to query

## Local setup

### 1. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 2. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Set the values in `apps/api/.env`:
- `DATABASE_URL`: local DataPilot metadata database
- `JWT_SECRET`: a long random secret (32+ characters)
- `DATA_ENCRYPTION_KEY`: exactly 64 hex characters (32 random bytes)
- `INTERNAL_SERVICE_TOKEN`: a long random shared secret

Generate secrets (macOS/Linux):
```bash
openssl rand -hex 32
```

Use one generated value for `JWT_SECRET`, another for `DATA_ENCRYPTION_KEY`, and another for `INTERNAL_SERVICE_TOKEN`. Keep secrets out of Git.

### 3. Install and initialize the database

```bash
npm install
npm run db:generate
npm run db:push
```

### 4. Start the API and frontend

```bash
npm run dev
```

- Web: http://localhost:5173
- API health: http://localhost:4000/api/v1/health

### 5. Start the durable investigation worker

In another terminal (keep Redis running):

```bash
npm run worker
```

BullMQ retries failed investigations up to three times with exponential backoff.

### 6. Start the agent service

In a second terminal:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/agents/requirements.txt
cp services/agents/.env.example services/agents/.env
```

Set `GEMINI_API_KEY` and make `INTERNAL_SERVICE_TOKEN` exactly match the API value in `apps/api/.env`. Then run:
```bash
uvicorn app.main:app --reload --app-dir services/agents --port 8000
```

Agent health: http://localhost:8000/health

## Demo database

To try the application without using business data, create a separate PostgreSQL database and run `examples/demo-database.sql` in it. It creates sample customers, products, orders and order items.

Create a dedicated read-only login (replace the password and database name):

```sql
CREATE ROLE datapilot_reader LOGIN PASSWORD 'replace-this-password';
GRANT CONNECT ON DATABASE datapilot_demo TO datapilot_reader;
GRANT USAGE ON SCHEMA public TO datapilot_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datapilot_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datapilot_reader;
```

Connect DataPilot with the `datapilot_reader` credentials.


## Production deployment with Docker Compose

The repository includes a full multi-container deployment: web (Nginx), Express API, Python agent service, BullMQ worker, PostgreSQL and Redis.

1. Copy the environment templates:
   ```bash
   cp .env.production.example .env.production
   cp apps/api/.env.example apps/api/.env
   cp services/agents/.env.example services/agents/.env
   ```
2. Generate URL-safe passwords and secrets:
   ```bash
   openssl rand -hex 24
   openssl rand -hex 32
   ```
   Put the first generated values in `.env.production` for PostgreSQL and Redis. Set a separate `JWT_SECRET`, 64-character hex `DATA_ENCRYPTION_KEY`, and `INTERNAL_SERVICE_TOKEN` in `apps/api/.env`. Put the exact same internal token and your Gemini key in `services/agents/.env`.
3. Start all services:
   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
   ```
4. Open `http://localhost:8080`. Inspect service status with:
   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml ps
   docker compose --env-file .env.production -f docker-compose.production.yml logs -f api worker agents
   ```

The API container applies Prisma migrations before starting. PostgreSQL and Redis are internal to the Compose network and are not published to the host. Put TLS termination and an HTTPS reverse proxy in front of the web service before exposing it publicly. Back up the PostgreSQL volume and protect all environment files.

For local development, continue using `docker compose up -d postgres redis`, `npm run db:push`, and the separate API/worker/agent commands described above.

## First run

1. Register a DataPilot account.
2. Add a PostgreSQL data source.
3. Use a dedicated database role with SELECT-only grants. Do not use a production superuser.
4. Open Database Explorer to inspect visible tables and columns.
5. Open SQL Playground and run a read-only query.
6. Open AI Analyst and ask a question about the connected schema.
7. Open Investigations to inspect the answer, SQL and evidence.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account and default workspace |
| POST | `/api/v1/auth/login` | Sign in |
| GET | `/api/v1/auth/me` | Current user |
| GET/POST | `/api/v1/workspaces` | List/create workspaces |
| GET/POST | `/api/v1/data-sources/:workspaceId` | List/add PostgreSQL sources |
| GET | `/api/v1/sql/:workspaceId/:sourceId/schema` | Inspect schema |
| POST | `/api/v1/sql/:workspaceId/:sourceId/query` | Run safe read-only SQL |
| GET/POST | `/api/v1/investigations/:workspaceId` | List/start investigations |
| GET | `/api/v1/investigations/:workspaceId/:id` | Read investigation result |

All workspace routes require a valid JWT and membership in the requested workspace. Internal agent endpoints require the shared service token.

## Safety and operational notes

- Passwords are hashed with bcrypt.
- Data source credentials use AES-256-GCM with a 32-byte key.
- SQL endpoints accept one SELECT/CTE statement, reject common write/administrative operations, use read-only transactions and apply statement timeouts.
- Result payloads are capped at 500 rows.
- Use a read-only database role as the primary security boundary. SQL string checks are defense-in-depth, not a replacement for database permissions.
- Set `DATASOURCE_SSL=true` for TLS-enabled remote PostgreSQL services.
- Configure network egress restrictions and secret management before production deployment.
- JWT is currently stored by the browser client; a production deployment should move to secure, HttpOnly cookies with CSRF protections and add refresh/revocation flows.
- Investigation jobs run through Redis/BullMQ with three attempts and exponential backoff; deploy at least one worker process and monitor failed jobs.

## Verification

```bash
npm test
npm run build
```

Python agent package installation and runtime should also be verified in its own environment. Tests and live integration checks must pass before deployment; this repository has not yet been run against your local database or Gemini key from this session.

## Remaining production-hardening work

- Connection lifecycle management and credential rotation
- Secure HttpOnly session cookies, refresh tokens and token revocation
- Full automated API integration and browser end-to-end test suites
- Agent execution traces, per-step latency and token/cost telemetry
- Report export, scheduling and deployment pipelines
