import json
import os
from typing import TypedDict, Any
import httpx
import pandas as pd
import google.generativeai as genai
from langgraph.graph import StateGraph, END

API_URL = os.getenv("API_URL", "http://localhost:4000/api/v1/internal")

class State(TypedDict, total=False):
    question: str
    workspaceId: str
    investigationId: str
    sourceId: str
    schema: list[dict]
    sql: str
    columns: list[str]
    rows: list[list[Any]]
    analysis: dict
    answer: str
    evidence: list[dict]
    chart: dict
    error: str

async def planner(state: State):
    if not os.getenv("GEMINI_API_KEY"):
        raise ValueError("GEMINI_API_KEY is required to run AI investigations")
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    schema_text = json.dumps(state["schema"], ensure_ascii=False)
    prompt = f"""You are the SQL planning agent for DataPilot. Generate ONE read-only PostgreSQL SELECT query.
Question: {state['question']}
Database schema (table_schema, table_name, column_name, data_type): {schema_text}
Rules: use only listed tables and columns; never use DDL/DML; no multiple statements; qualify ambiguous table names; add LIMIT 500; do not guess columns. Return strict JSON only: {{"sql":"...","reasoning":"short explanation"}}."""
    response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json", "temperature": 0.1})
    parsed = json.loads(response.text)
    sql = parsed.get("sql", "").strip()
    if not sql or not sql.lower().lstrip().startswith(("select", "with")):
        raise ValueError("Planner did not return a read-only SELECT query")
    return {"sql": sql}

async def executor(state: State):
    async with httpx.AsyncClient(timeout=18) as client:
        response = await client.post(
            f"{API_URL}/data-sources/{state['sourceId']}/query",
            headers={"x-internal-token": os.getenv("INTERNAL_SERVICE_TOKEN", "")},
            json={"workspaceId": state["workspaceId"], "query": state["sql"]}
        )
        response.raise_for_status()
        result = response.json()["data"]
    return {"columns": result["columns"], "rows": result["rows"]}

def analyst(state: State):
    frame = pd.DataFrame(state["rows"], columns=state["columns"])
    numeric = frame.select_dtypes(include="number")
    summary = {
        "rowCount": len(frame),
        "columns": state["columns"],
        "numericSummary": numeric.describe().round(2).to_dict() if not numeric.empty else {},
        "preview": frame.head(8).where(pd.notnull(frame.head(8)), None).to_dict(orient="records")
    }
    chart = None
    if len(numeric.columns) >= 1 and len(frame) > 1:
        label_col = next((c for c in frame.columns if c not in numeric.columns), None)
        value_col = numeric.columns[0]
        chart_frame = frame.head(20).copy()
        if not label_col:
            chart_frame["row"] = chart_frame.index.astype(str)
        chart = {
            "type": "bar",
            "title": f"{value_col} by {label_col}" if label_col else f"{value_col} distribution",
            "xKey": label_col or "row",
            "yKey": value_col,
            "data": chart_frame.where(pd.notnull(chart_frame), None).to_dict(orient="records")
        }
    return {"analysis": summary, "chart": chart}

async def verifier(state: State):
    if not state.get("rows") and not state.get("columns"):
        raise ValueError("Verification failed: query returned no result metadata")
    evidence = [{
        "type": "sql_result",
        "description": f"Executed a read-only query and received {len(state.get('rows', []))} rows.",
        "sql": state["sql"],
        "rowCount": len(state.get("rows", []))
    }]
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    prompt = f"""Answer the business question using only this query result summary. Never invent facts. If data is insufficient, say so.
Question: {state['question']}
Summary: {json.dumps(state['analysis'], default=str)}
SQL: {state['sql']}
Return concise plain text with key findings and caveats."""
    response = await model.generate_content_async(prompt, generation_config={"temperature": 0.2})
    return {"answer": response.text.strip(), "evidence": evidence}

def build_graph():
    graph = StateGraph(State)
    graph.add_node("planner", planner)
    graph.add_node("executor", executor)
    graph.add_node("analyst", analyst)
    graph.add_node("verifier", verifier)
    graph.set_entry_point("planner")
    graph.add_edge("planner", "executor")
    graph.add_edge("executor", "analyst")
    graph.add_edge("analyst", "verifier")
    graph.add_edge("verifier", END)
    return graph.compile()

workflow = build_graph()

async def run_workflow(payload: dict):
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{API_URL}/data-sources/{payload['sourceId']}/schema",
            headers={"x-internal-token": os.getenv("INTERNAL_SERVICE_TOKEN", "")},
            params={"workspaceId": payload["workspaceId"]}
        )
        response.raise_for_status()
        schema = response.json()["data"]
    if not schema:
        raise ValueError("The connected database has no accessible tables")
    state = await workflow.ainvoke({**payload, "schema": schema})
    return {key: state.get(key) for key in ("answer", "sql", "evidence", "chart")}
