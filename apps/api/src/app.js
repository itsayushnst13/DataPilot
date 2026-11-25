import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pino());

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
      success: true,
      data: { service: "datapilot-api", status: "healthy", timestamp: new Date().toISOString() }
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  return app;
}
