// Fire-and-forget poke from the API to the worker so a just-enqueued job
// starts immediately instead of waiting for the worker's fallback poll. Runs
// over Fly's private network in production; losing a kick is harmless — the
// fallback poll picks the job up.

export const WORKER_KICK_PORT = 8191;

function workerBaseUrl(): string {
  if (process.env.WORKER_KICK_URL) return process.env.WORKER_KICK_URL.replace(/\/kick$/, "");
  const app = process.env.FLY_APP_NAME;
  if (app) return `http://worker.process.${app}.internal:${WORKER_KICK_PORT}`;
  return `http://localhost:${WORKER_KICK_PORT}`; // local dev worker, if running
}

export function kickWorker(): void {
  fetch(`${workerBaseUrl()}/kick`, { method: "POST", signal: AbortSignal.timeout(3000) }).catch(() => {
    // Worker asleep/unreachable — the fallback poll covers it.
  });
}

export interface WorkerHealth {
  reachable: boolean;
  interactiveRunning?: number;
  batchRunning?: number;
}

/** Probe the worker's /health endpoint; unreachable is a normal answer, not an error. */
export async function fetchWorkerHealth(): Promise<WorkerHealth> {
  try {
    const res = await fetch(`${workerBaseUrl()}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { reachable: false };
    const body = (await res.json()) as { interactiveRunning: number; batchRunning: number };
    return { reachable: true, interactiveRunning: body.interactiveRunning, batchRunning: body.batchRunning };
  } catch {
    return { reachable: false };
  }
}
