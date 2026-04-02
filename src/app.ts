import express from "express";
import { documentsRoutes } from "./api/routes/documents.routes";
import { healthRoutes } from "./api/routes/health.routes";
import { metricsRoutes } from "./api/routes/metrics.routes";
import { log } from "./utils/logger";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.use(documentsRoutes());

  app.use(healthRoutes());
  app.use(metricsRoutes());

  // OpenAPI minimal: pour rester simple => JSON statique
  app.get("/api/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: { title: "Doc-service API", version: "1.0.0" },
      paths: {
        "/api/documents/batch": {
          post: {
            summary: "Create 1000 docs batch",
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "array", items: { type: "string" } },
                  example: ["user-1", "user-2", "user-3"],
                },
              },
            },
          },
        },
        "/api/documents/batch/{batchId}": {
          get: {
            summary: "Get batch status",
            parameters: [
              {
                name: "batchId",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
          },
        },
        "/api/documents/{documentId}": {
          get: {
            summary: "Get PDF",
            parameters: [
              {
                name: "documentId",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
          },
        },
        "/health": { get: { summary: "Health check " } },
        "/metrics": { get: { summary: "Prometheus metrics" } },
      },
    });
  });

  // error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res
      .status(err?.statusCode ?? 500)
      .json({ error: "internal_error", message: String(err) });
  });

  return app;
}
