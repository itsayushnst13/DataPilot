import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { withSourceClient } from "../services/connection.js";

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
    if (typeof query !== "string" || query.length > 12000 || !/^\s*(select|with)\b/i.test(query) || query.includes(";") || /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|vacuum|refresh|set|reset|pg_sleep|pg_read_file|pg_ls_dir|dblink|lo_import|lo_export|pg_terminate_backend|pg_cancel_backend|set_config)\b/i.test(query)) {
      return res.status(400).json({ success: false, error: { code: "UNSAFE_SQL", message: "Only a single safe read-only SELECT query is allowed" } });
    }
    const limit = query.match(/\blimit\s+(\d+)/i);
    if (limit && Number(limit[1]) > 501) return res.status(400).json({ success: false, error: { code: "ROW_LIMIT_EXCEEDED", message: "LIMIT cannot exceed 500 rows" } });
    const safeQuery = limit ? query : query + " LIMIT 501";
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
