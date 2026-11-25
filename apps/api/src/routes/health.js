import { Router } from "express";
import { prisma } from "../lib/prisma.js";
const router = Router();
router.get("/", async (_req, res) => {
  let database = "disconnected";
  try { await prisma.$queryRawUnsafe("SELECT 1"); database = "connected"; } catch {}
  res.status(database === "connected" ? 200 : 503).json({ success: database === "connected", data: { service: "datapilot-api", status: database === "connected" ? "healthy" : "degraded", database, timestamp: new Date().toISOString() } });
});
export default router;
