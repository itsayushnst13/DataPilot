import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { getInvestigationQueue } from "../queues/investigation.queue.js";

const router = Router();
router.use(requireAuth);
router.get("/:workspaceId", requireWorkspace, async (req, res, next) => {
  try {
    const rows = await prisma.investigation.findMany({ where: { workspaceId: req.workspace.id }, orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});
router.post("/:workspaceId", requireWorkspace, async (req, res, next) => {
  try {
    const { question, sourceId } = z.object({
      question: z.string().trim().min(8).max(2000),
      sourceId: z.string().optional()
    }).parse(req.body);
    const source = sourceId
      ? await prisma.dataSource.findFirst({ where: { id: sourceId, workspaceId: req.workspace.id } })
      : await prisma.dataSource.findFirst({ where: { workspaceId: req.workspace.id }, orderBy: { createdAt: "asc" } });
    if (!source) return res.status(400).json({ success: false, error: { code: "DATA_SOURCE_REQUIRED", message: "Connect a PostgreSQL data source before starting an investigation" } });
    const investigation = await prisma.investigation.create({
      data: { workspaceId: req.workspace.id, dataSourceId: source.id, title: question.slice(0, 72), question, status: "RUNNING", startedAt: new Date() }
    });
    try {
      await getInvestigationQueue().add("investigate", { investigationId: investigation.id }, { jobId: investigation.id });
    } catch (queueError) {
      await prisma.investigation.update({ where: { id: investigation.id }, data: { status: "FAILED", error: "Could not enqueue investigation. Check Redis availability.", completedAt: new Date() } });
      throw queueError;
    }
    res.status(202).json({ success: true, data: investigation });
  } catch (e) { next(e); }
});
router.get("/:workspaceId/:id", requireWorkspace, async (req, res, next) => {
  try {
    const item = await prisma.investigation.findFirst({ where: { id: req.params.id, workspaceId: req.workspace.id } });
    if (!item) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Investigation not found" } });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
});
export default router;
