import { closeMongodb } from "../infra/mongodb";
import { log } from "./logger";

const hooks: Array<() => Promise<void>> = [];
let armed = false;

export function onShutdown(h: () => Promise<void>) {
  hooks.push(h);
}

export function armShutdown() {
  if (armed) return;
  armed = true;

  const handler = async (signal: string) => {
    log("info", "shutdown_start", { signal });
    for (const h of hooks) {
      try {
        await h();
      } catch (e) {
        log("error", "shutdown_hook_error", { err: String(e) });
      }
    }
    await closeMongodb().catch(() => {});
    process.exit(0);
  };

  process.on("SIGTERM", () => void handler("SIGTERM"));
  process.on("SIGINT", () => void handler("SIGINT"));
}
