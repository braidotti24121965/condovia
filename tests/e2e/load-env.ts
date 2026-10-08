import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalE2EEnv() {
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.e2e.local"), "utf8");
    for (const line of file.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match?.[1] && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
    }
  } catch {
    // The setup reports the missing variables without exposing secret values.
  }
}
