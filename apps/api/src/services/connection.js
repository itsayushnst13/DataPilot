import { createDecipheriv } from "node:crypto";
import pg from "pg";
const { Client } = pg;

function decrypt(value) {
  const [ivHex, tagHex, dataHex] = value.split(":");
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be a 32-byte hex key");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
export async function withSourceClient(source, callback) {
  const client = new Client({
    host: source.host, port: source.port, database: source.database,
    user: source.username, password: decrypt(source.secret),
    ssl: process.env.DATASOURCE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    connectionTimeoutMillis: 7000, query_timeout: 15000, statement_timeout: 12000
  });
  await client.connect();
  try { return await callback(client); }
  finally { await client.end(); }
}
