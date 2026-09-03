import { createDb, nextMaintenanceBoundary, reconcileMaintenances } from '@trustfall/db';
import { enqueue } from './index.ts';
import { deliveryMode, type Job } from './types.ts';

/** The one pending maintenance timer; re-arming replaces it rather than stacking. */
export const MAINTENANCE_CLOCK_ID = 'maintenance-clock';

/**
 * Single execution point for every job, whatever delivered it. Queue consumer,
 * Durable Object alarm and the inline fallback all land here, so a job behaves
 * identically across the three delivery modes.
 */
export async function runJob(env: Env, job: Job): Promise<void> {
  switch (job.type) {
    case 'MAINTENANCE_TRANSITION':
      await runMaintenanceClock(env);
      return;
    case 'WEBHOOK_DELIVER':
    case 'EMAIL_SEND':
    case 'COMPONENT_STATUS_RECONCILE':
    case 'UPTIME_ROLLUP':
      // Handlers land here as each stage brings them online.
      console.log(`job ${job.type} not yet implemented`, job.id);
      return;
  }
}

/**
 * Point the precise timer at the next window boundary. Creates and edits call
 * this so a newly scheduled window does not wait for the cron heartbeat.
 *
 * Only the Durable Object can hold a single re-armable timer: scheduling the
 * same id again replaces the pending alarm. A Queue message cannot be replaced
 * or withdrawn once sent, so arming there on every write would pile up
 * delayed messages; queue and inline deployments rely on the heartbeat, which
 * reconciles every tick, and on reads reconciling.
 */
export async function armMaintenanceClock(env: Env): Promise<void> {
  if (deliveryMode(env) !== 'durable-object') {
    return;
  }
  const boundary = await nextMaintenanceBoundary(createDb(env.DB));
  if (boundary === undefined) {
    return;
  }
  await enqueue(env, 'MAINTENANCE_TRANSITION', {}, { runAt: boundary, id: MAINTENANCE_CLOCK_ID });
}

/**
 * Opens and closes maintenance windows whose time has come, then re-arms
 * itself for the next boundary. Reads reconcile too, so this is what keeps the
 * page right when nobody is looking. Inline delivery cannot wait, so there it
 * runs once and leaves the cron sweep to call again.
 */
async function runMaintenanceClock(env: Env): Promise<void> {
  await reconcileMaintenances(createDb(env.DB));
  await armMaintenanceClock(env);
}
