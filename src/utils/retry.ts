export async function retry<T>(
  fn: () => Promise<T>,
  opts: { attempts: number; baseDelayMs: number },
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = opts.baseDelayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
