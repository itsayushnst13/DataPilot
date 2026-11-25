import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.js";
import { once } from "node:events";

async function withServer(run) {
  const server = createApp().listen(0);
  await once(server, "listening");
  try { await run("http://127.0.0.1:" + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test("health endpoint returns service liveness", async () => {
  await withServer(async base => {
    const response = await fetch(base + "/api/v1/health");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "alive");
  });
});

test("logout clears the HttpOnly session cookie", async () => {
  await withServer(async base => {
    const response = await fetch(base + "/api/v1/auth/logout", { method: "POST" });
    assert.equal(response.status, 204);
    const cookie = response.headers.get("set-cookie") || "";
    assert.match(cookie, /datapilot_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
  });
});

test("rejects cross-origin state-changing requests", async () => {
  await withServer(async base => {
    const response = await fetch(base + "/api/v1/auth/logout", {
      method: "POST",
      headers: { origin: "https://attacker.example" }
    });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.error.code, "ORIGIN_REJECTED");
  });
});
