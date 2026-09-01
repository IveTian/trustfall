import type { Job } from './types.ts';

/**
 * Single execution point for every job, whatever delivered it. Queue consumer,
 * Durable Object alarm and the inline fallback all land here, so a job behaves
 * identically across the three delivery modes.
 */
export async function runJob(env: Env, job: Job): Promise<void> {
  switch (job.type) {
    case 'WEBHOOK_DELIVER':
    case 'EMAIL_SEND':
    case 'COMPONENT_STATUS_RECONCILE':
    case 'MAINTENANCE_TRANSITION':
    case 'UPTIME_ROLLUP':
      // Handlers land here as each stage brings them online.
      console.log(`job ${job.type} not yet implemented`, job.id);
      return;
  }
}
