import { prisma } from "../lib/prisma.js";

export async function runInvestigation(id) {
  try {
    const item = await prisma.investigation.findUnique({ where: { id } });
    if (!item) return;
    const agentUrl = process.env.AGENT_SERVICE_URL;
    if (!agentUrl) throw new Error("Agent service is not configured. Set AGENT_SERVICE_URL and start services/agents.");
    const response = await fetch(agentUrl + "/investigate", {
      method: "POST", headers: { "content-type": "application/json", "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
      body: JSON.stringify({ question: item.question, workspaceId: item.workspaceId, investigationId: item.id })
    });
    if (!response.ok) throw new Error("Agent service returned " + response.status);
    const result = await response.json();
    await prisma.investigation.update({
      where: { id },
      data: { status: "COMPLETED", answer: result.answer, sql: result.sql || null, evidence: result.evidence || undefined, chart: result.chart || undefined, completedAt: new Date() }
    });
  } catch (error) {
    await prisma.investigation.update({ where: { id }, data: { status: "FAILED", error: error.message.slice(0, 500), completedAt: new Date() } });
  }
}
