import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { withSourceClient } from "../services/connection.js";

const router = Router();
router.use(requireAuth);
const querySchema = z.object({ query: z.string().trim().min(6).max(12000) });

function assertReadOnlySql(sql) {
  const normalized = sql.trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(normalized)) throw Object.assign(new Error("Only SELECT queries are allowed"), { status: 400, code: "READ_ONLY_ONLY" });
  if (normalized.includes(";") || /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|vacuum|refresh|set|reset|pg_sleep)\b/i.test(normalized)) {
    throw Object.assign(new Error("Query contains a prohibited operation"), { status: 400, code: "UNSAFE_SQL" });
  }
  return normalized;
}
async function getSource(workspaceId, sourceId) {
  const source = await prisma.dataSource.findFirst({ where: { id: sourceId, workspaceId } });
  if (!source) throw Object.assign(new Error("Data source not found"), { status: 404, code: "SOURCE_NOT_FOUND" });
  return source;
}
router.post("/:workspaceId/:sourceId/query", requireWorkspace, async (req, res, next) => {
  try {
    const { query } = querySchema.parse(req.body);
    const sql = assertReadOnlySql(query);
    const source = await getSource(req.workspace.id, req.params.sourceId);
    const result = await withSourceClient(source, async client => {
      await client.query("BEGIN READ ONLY");
      try {
        await client.query("SET LOCAL statement_timeout = '10s'");
        const data = await client.query({ text: sql, rowMode: "array" });
        await client.query("COMMIT");
        return data;
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    });
    res.json({ success: true, data: { columns: result.fields.map(f => f.name), rows: result.rows.slice(0, 500), rowCount: result.rowCount, truncated: result.rows.length > 500 } });
  } catch (e) { next(e); }
});
router.get("/:workspaceId/:sourceId/schema", requireWorkspace, async (req, res, next) => {
  try {
    const source = await getSource(req.workspace.id, req.params.sourceId);
    const tables = await withSourceClient(source, async client => {
      const result = await client.query(`SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_schema, table_name, ordinal_position`);
      return result.rows;
    });
    res.json({ success: true, data: tables });
  } catch (e) { next(e); }
});
export default router;
