import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const documentsGeneratedTotal = new client.Counter({
  name: "documents_generated_total",
  help: "Total documents generated",
});

export const batchProcessingDuration = new client.Histogram({
  name: "batch_processing_duration_seconds",
  help: "Document processing duration (seconds)",
  buckets: [0.05, 0.1, 0.2, 0.35, 0.5, 1, 2, 3, 5, 8],
});

export const queueSize = new client.Gauge({
  name: "queue_size",
  help: "Queue size",
});

registry.registerMetric(documentsGeneratedTotal);
registry.registerMetric(batchProcessingDuration);
registry.registerMetric(queueSize);
