import { Resend } from "resend";
import type { Job } from "../db/schema/jobs";

// Operational alerting: a dead-lettered job emails the operator, replacing
// the "GitHub Actions emails on a red run" signal the old CI cron provided.

const ALERT_FROM = "Checkpointer Jobs <noreply@info.checkpointer.io>";
const ALERT_TO = "hello@checkpointer.io";

/** Email the operator that a job exhausted its retries. Never throws. */
export async function sendJobFailureAlert(job: Job, error: unknown): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[alerts] RESEND_API_KEY not set; job ${job.id} (${job.type}) failed silently`);
    return;
  }

  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error ?? "unknown error");

  try {
    await new Resend(apiKey).emails.send({
      from: ALERT_FROM,
      to: ALERT_TO,
      subject: `[Checkpointer jobs] ${job.type} failed after ${job.attempts} attempt(s)`,
      text: [
        `Job ${job.id} exhausted its retries and was dead-lettered.`,
        ``,
        `Type: ${job.type}`,
        `Payload: ${JSON.stringify(job.payload)}`,
        `Attempts: ${job.attempts}/${job.maxAttempts}`,
        `Created: ${job.createdAt.toISOString()}`,
        ``,
        `Error:`,
        message,
        ``,
        `Inspect: GET /api/admin/jobs?status=failed`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[alerts] failed to send job failure alert:", err);
  }
}
