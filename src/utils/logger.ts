export function log(
  level: "info" | "warn" | "error",
  msg: string,
  meta: Record<string, any> = {},
) {
  const line = {
    time: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };

  process.stdout.write(JSON.stringify(line) + "\n");
}
