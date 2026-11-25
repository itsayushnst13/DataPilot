import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({ where: { userId: req.user.id }, include: { workspace: { include: { _count: { select: { dataSources: true, investigations: true } } } } }, orderBy: { createdAt: "asc" } });
    res.json({ success: true, data: memberships.map(m => ({ ...m.workspace, role: m.role })) });
  } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(80) }).parse(req.body);
    const workspace = await prisma.workspace.create({
      data: { name, slug: "ws-" + crypto.randomUUID(), createdById: req.user.id, memberships: { create: { userId: req.user.id, role: "ADMIN" } } }
    });
    res.status(201).json({ success: true, data: workspace });
  } catch (e) { next(e); }
});
router.get("/:workspaceId", requireWorkspace, (req, res) => res.json({ success: true, data: req.workspace }));
export default router;
