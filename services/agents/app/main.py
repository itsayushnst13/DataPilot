import os
import secrets
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from app.workflow import run_workflow

app = FastAPI(title="DataPilot Agent Service", version="1.0.0")

class InvestigationRequest(BaseModel):
    question: str = Field(min_length=8, max_length=2000)
    workspaceId: str
    investigationId: str
    sourceId: str

@app.get("/health")
def health():
    return {"status": "healthy", "service": "datapilot-agents"}

@app.post("/investigate")
async def investigate(payload: InvestigationRequest, x_internal_token: str = Header(default="")):
    expected = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not expected or not secrets.compare_digest(expected, x_internal_token):
        raise HTTPException(status_code=401, detail="Unauthorized service")
    try:
        return await run_workflow(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Investigation workflow failed") from exc
