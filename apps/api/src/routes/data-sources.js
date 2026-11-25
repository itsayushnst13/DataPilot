import { randomBytes, createCipheriv } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { withSourceClient } from "../services/connection.js";

const router = Router();
router.use(requireAuth);
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  database: z.string().trim().min(1).max(128),
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512)
});
function encrypt(value) {
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be a 32-byte hex key");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}
router.get("/:workspaceId", requireWorkspace, async (req, res, next) => {
  try {
    const rows = await prisma.dataSource.findMany({ where: { workspaceId: req.workspace.id }, select: { id: true, name: true, type: true, host: true, port: true, database: true, username: true, status: true, lastTestedAt: true, createdAt: true } });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});
router.post("/:workspaceId", requireWorkspace, async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const connection = {
      host: input.host, port: input.port, database: input.database, username: input.username,
      secret: encrypt(input.password)
    };
    await withSourceClient(connection, async client => client.query("SELECT 1"));
    const source = await prisma.dataSource.create({ data: {
      workspaceId: req.workspace.id, name: input.name, ...connection, status: "CONNECTED", lastTestedAt: new Date()
    }, select: { id: true, name: true, type: true, host: true, port: true, database: true, username: true, status: true, lastTestedAt: true, createdAt: true } });
    res.status(201).json({ success: true, data: source });
  } catch (e) { next(e); }
});
export default router;
