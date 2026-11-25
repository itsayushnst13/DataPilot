# DataPilot Agent Service

Python-only analytics and agent orchestration service. Node/Express remains the API and database access boundary.

## Local setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/agents/requirements.txt
cp services/agents/.env.example services/agents/.env
uvicorn app.main:app --reload --app-dir services/agents --port 8000
```

Set the same `INTERNAL_SERVICE_TOKEN` in the API and agent environment. Set `GEMINI_API_KEY` for planning and answer synthesis.

## Agent graph
1. Planner: Gemini creates a schema-grounded, read-only PostgreSQL query.
2. Executor: calls the protected Express internal API; the API executes in a read-only transaction with a statement timeout.
3. Analyst: Pandas computes numeric summaries and a chart specification.
4. Verifier: synthesizes a response from returned evidence and records the executed SQL.

The database password never leaves the Express API.
