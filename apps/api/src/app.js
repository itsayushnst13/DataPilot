import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import { ZodError } from "zod";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import dataSourceRoutes from "./routes/data-sources.js";
import sqlRoutes from "./routes/sql.js";
import investigationRoutes from "./routes/investigations.js";
import healthRoutes from "./routes/health.js";
import internalRoutes from "./routes/internal.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173", credentials: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pino({ redact: ["req.headers.authorization", "req.body.password", "req.body.token"] }));

  app.get("/api/v1/health", (_req, res) => res.status(200).json({
    success: true, data: { service: "datapilot-api", status: "alive", timestamp: new Date().toISOString() }
  }));
  app.use("/api/v1/health/details", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/workspaces", workspaceRoutes);
  app.use("/api/v1/data-sources", dataSourceRoutes);
  app.use("/api/v1/sql", sqlRoutes);
  app.use("/api/v1/investigations", investigationRoutes);
  app.use("/api/v1/internal", internalRoutes);

  app.use((_req, res) => res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }));
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.issues.map(i => ({ path: i.path.join("."), message: i.message })) } });
    const status = Number(error.status) || 500;
    if (status >= 500) reqSafeLog(error);
    return res.status(status).json({ success: false, error: { code: error.code || "INTERNAL_ERROR", message: status >= 500 ? "An unexpected server error occurred" : error.message } });
  });
  return app;
}
function reqSafeLog(error) { console.error(error); }
