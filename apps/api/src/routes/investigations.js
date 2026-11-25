import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { runInvestigation } from "../services/investigation.js";

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
    const { question } = z.object({ question: z.string().trim().min(8).max(2000) }).parse(req.body);
    const investigation = await prisma.investigation.create({
      data: { workspaceId: req.workspace.id, title: question.slice(0, 72), question, status: "RUNNING", startedAt: new Date() }
    });
    res.status(202).json({ success: true, data: investigation });
    runInvestigation(investigation.id).catch(error => console.error("Investigation failed", error));
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
