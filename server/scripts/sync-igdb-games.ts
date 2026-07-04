// Thin CLI wrapper for manual IGDB sync runs. The engine lives in
// server/lib/igdb-sync.ts; the worker runs the same code as a weekly job.
// Usage: bun server/scripts/sync-igdb-games.ts [--full | --incremental | --steam-map-only]

import { runIgdbSync, type IgdbSyncMode } from "../lib/igdb-sync";

function modeFromArgv(): IgdbSyncMode {
  if (process.argv.includes("--steam-map-only")) return "steam-map-only";
  if (process.argv.includes("--full")) return "full";
  if (process.argv.includes("--incremental")) return "incremental";
  return "auto";
}

try {
  await runIgdbSync(modeFromArgv());
  process.exit(0);
} catch (err) {
  console.error("\nSync failed:", err);
  process.exit(1);
}
