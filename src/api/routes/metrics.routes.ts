import { Router } from "express";
import { registry } from "../../metrics/prometheus";

export function metricsRoutes() {
  const r = Router();
  r.get("/metrics", async (_req, res) => {
    res.setHeader("content-type", registry.contentType);
    res.send(await registry.metrics());
  });
  return r;
}
