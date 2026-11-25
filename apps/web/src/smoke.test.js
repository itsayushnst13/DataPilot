import { describe, expect, it } from "vitest";

describe("DataPilot web workspace", () => {
  it("loads the application source entry", async () => {
    const module = await import("./App.jsx");
    expect(module.default).toBeTypeOf("function");
  });
});
