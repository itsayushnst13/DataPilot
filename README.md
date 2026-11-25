# DataPilot

Autonomous multi-agent AI data analyst. Ask business questions in natural language and investigate PostgreSQL data with auditable SQL, deterministic analytics, verification, and evidence-backed reports.

## Stack
- Frontend: React, JavaScript, Vite, Tailwind CSS, React Router, Axios, Recharts
- API: Node.js, Express, JavaScript ES modules, Prisma, PostgreSQL
- AI services (later phases): Python, LangGraph, Gemini, Pandas, NumPy
- Jobs (later phases): Redis and BullMQ

## Repository layout
```
apps/
  web/       React application
  api/       Express API
services/
  agents/    LangGraph service (Phase 5)
  analytics/ Python analytics service (Phase 7)
```

## Prerequisites
Node.js 20+, npm 10+.

## Run Phase 1
```bash
npm install
npm run install:all
npm run dev
```
The web app runs on http://localhost:5173 and API health endpoint on http://localhost:4000/api/v1/health.

Copy `apps/api/.env.example` to `apps/api/.env` before configuring database-backed phases.

## Roadmap
1. Monorepo, dashboard, navigation, API foundation
2. PostgreSQL, Prisma, authentication, workspaces
3. Database connections and schema explorer
4. Text-to-SQL, validation, safe execution
5. LangGraph agents
6. Autonomous bounded investigation
7. Analytics and anomaly detection
8. Evidence verification
9. Charts, reports, investigation replay
10. Redis, BullMQ, MCP
11. Testing and hardening
12. Docker and deployment

Features are marked complete only after implementation and verification.
