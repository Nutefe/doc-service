import dotenv from "dotenv";
import { createApp } from "./app";
import { log } from "./utils/logger";

dotenv.config();

async function main() {
  const port = Number(process.env.PORT ?? "3000");

  const app = createApp();
  app.listen(port, () => log("info", "api_listening", { port }));
}

main().catch((e) => {
  log("error", "api_crash", { err: String(e) });
  process.exit(1);
});
