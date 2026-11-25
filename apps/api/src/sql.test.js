import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertReadOnlySql } from "./routes/sql.js";

describe("read-only SQL policy", () => {
  it("accepts a SELECT and adds a bounded result limit", () => {
    assert.equal(assertReadOnlySql("SELECT id FROM orders"), "SELECT id FROM orders LIMIT 501");
  });
  it("preserves an explicit safe limit", () => {
    assert.equal(assertReadOnlySql("SELECT id FROM orders LIMIT 25"), "SELECT id FROM orders LIMIT 25");
  });
  it("rejects data modification statements", () => {
    assert.throws(() => assertReadOnlySql("DELETE FROM orders"), /Only SELECT queries are allowed/);
    assert.throws(() => assertReadOnlySql("SELECT 1; DROP TABLE users"), /prohibited operation/);
  });
  it("rejects dangerous PostgreSQL functions", () => {
    assert.throws(() => assertReadOnlySql("SELECT pg_read_file('/etc/passwd')"), /prohibited operation/);
  });
  it("rejects oversized limits", () => {
    assert.throws(() => assertReadOnlySql("SELECT * FROM orders LIMIT 999999"), /LIMIT cannot exceed 500 rows/);
  });
});
