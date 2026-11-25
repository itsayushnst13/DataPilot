import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { withSourceClient } from "../services/connection.js";
import { assertReadOnlySql } from "./sql.js";

const router = Router();
function verifyService(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected || req.headers["x-internal-token"] !== expected) return res.status(401).json({ success: false, error: { code: "SERVICE_UNAUTHORIZED", message: "Invalid service token" } });
  next();
}
router.use(verifyService);
router.get("/data-sources/:sourceId/schema", async (req, res, next) => {
  try {
    const source = await prisma.dataSource.findFirst({ where: { id: req.params.sourceId, workspaceId: String(req.query.workspaceId || "") } });
    if (!source) return res.status(404).json({ success: false, error: { code: "SOURCE_NOT_FOUND", message: "Data source not found" } });
    const rows = await withSourceClient(source, async client => (await client.query("SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name, ordinal_position")).rows);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});
router.post("/data-sources/:sourceId/query", async (req, res, next) => {
  try {
    const { workspaceId, query } = req.body || {};
    if (typeof query !== "string" || query.length > 12000) {
      return res.status(400).json({ success: false, error: { code: "INVALID_QUERY", message: "Query must be a string under 12,000 characters" } });
    }
    const safeQuery = assertReadOnlySql(query);
    const source = await prisma.dataSource.findFirst({ where: { id: req.params.sourceId, workspaceId: String(workspaceId || "") } });
    if (!source) return res.status(404).json({ success: false, error: { code: "SOURCE_NOT_FOUND", message: "Data source not found" } });
    const result = await withSourceClient(source, async client => {
      await client.query("BEGIN READ ONLY");
      try { await client.query("SET LOCAL statement_timeout = '10s'"); const data = await client.query({ text: safeQuery, rowMode: "array" }); await client.query("COMMIT"); return data; }
      catch (e) { await client.query("ROLLBACK"); throw e; }
    });
    res.json({ success: true, data: { columns: result.fields.map(f => f.name), rows: result.rows.slice(0, 500), rowCount: result.rowCount } });
  } catch (e) { next(e); }
});
export default router;
