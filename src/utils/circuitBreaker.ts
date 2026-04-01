export class CircuitBreaker {
  private failures = 0;
  private state: "closed" | "open" | "half_open" = "closed";
  private openedAt = 0;

  constructor(
    private readonly cfg: { failureThreshold: number; halfOpenAfterMs: number },
  ) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.state === "open") {
      if (now - this.openedAt > this.cfg.halfOpenAfterMs)
        this.state = "half_open";
      else throw new Error("circuit_open");
    }

    try {
      const out = await fn();
      this.failures = 0;
      if (this.state === "half_open") this.state = "closed";
      return out;
    } catch (e) {
      this.failures++;
      if (this.failures >= this.cfg.failureThreshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      throw e;
    }
  }

  info() {
    return { state: this.state, failures: this.failures };
  }
}
