import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.js";
import { once } from "node:events";

test("health endpoint returns service status", async () => {
  const server = createApp().listen(0);
  await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "alive");
  } finally {
    server.close();
  }
});
