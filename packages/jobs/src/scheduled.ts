import type { Job } from './types.ts';
import { runJob } from './run.ts';

/**
 * The single cron tick.
 *
 * A free-plan account gets three cron triggers and a 10ms CPU budget for the
 * scheduled handler, so TrustFall spends one trigger and treats it as a
 * heartbeat: read what is due, hand it to waitUntil, return. All pacing lives
 * in the `scheduled_tasks` table rather than in cron expressions.
 */
export async function handleScheduled(
  _controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(tick(env));
}

async function tick(env: Env): Promise<void> {
  const due = await dueTasks(env);
  for (const job of due) {
    try {
      await runJob(env, job);
    } catch (error) {
      console.error('scheduled task failed', job.type, error);
    }
  }
}

/**
 * Placeholder until `scheduled_tasks` lands with the Stage 1 migration. Keeping
 * the seam here means the cron entry point is already wired end to end.
 */
async function dueTasks(_env: Env): Promise<Job[]> {
  return [];
}
