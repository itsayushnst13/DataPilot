import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true } });
    if (!user) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid session" } });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}

export async function requireWorkspace(req, res, next) {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: "WORKSPACE_REQUIRED", message: "workspaceId is required" } });
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId } },
      include: { workspace: true }
    });
    if (!membership) return res.status(404).json({ success: false, error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found" } });
    req.workspace = membership.workspace;
    req.membership = membership;
    next();
  } catch (error) { next(error); }
}
