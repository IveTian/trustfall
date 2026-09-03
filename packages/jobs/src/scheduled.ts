import type { Job } from './types.ts';
import { MAINTENANCE_CLOCK_ID, runJob } from './run.ts';

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
 * What every tick runs. The maintenance clock is always on the list: it is
 * cheap when nothing is due, and it re-arms the precise timer for the next
 * window in case an earlier alarm was lost. The rest of the table arrives with
 * `scheduled_tasks` in the Stage 1 migration.
 */
async function dueTasks(_env: Env): Promise<Job[]> {
  return [
    {
      id: MAINTENANCE_CLOCK_ID,
      type: 'MAINTENANCE_TRANSITION',
      payload: {},
      runAt: Date.now(),
      attempt: 0,
    },
  ];
}
