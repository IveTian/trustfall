import { type DeliveryMode, deliveryMode, type Job, type JobType } from './types.ts';
import { armMaintenanceClock, runJob } from './run.ts';

export { deliveryMode } from './types.ts';
export type { DeliveryMode, Job, JobType } from './types.ts';
export { armMaintenanceClock };

const DISPATCHER_KEY = 'singleton';

export type EnqueueOptions = {
  /** Epoch ms. Omitted means "as soon as possible". */
  runAt?: number;
  attempt?: number;
  ctx?: ExecutionContext;
  /**
   * A fixed id makes the job a singleton: scheduling it again replaces the
   * pending copy instead of adding a second one. For timers that re-arm
   * themselves, such as the maintenance clock.
   */
  id?: string;
};

/**
 * The only way to defer work. Routes to whichever delivery mechanism this
 * deployment has, so callers never learn which plan they are on.
 */
export async function enqueue(
  env: Env,
  type: JobType,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {},
): Promise<void> {
  const job: Job = {
    id: options.id ?? crypto.randomUUID(),
    type,
    payload,
    runAt: options.runAt ?? Date.now(),
    attempt: options.attempt ?? 0,
  };

  const mode: DeliveryMode = deliveryMode(env);

  if (mode === 'queue') {
    const delaySeconds = Math.max(0, Math.ceil((job.runAt - Date.now()) / 1000));
    // Queues cap delivery delay at 12 hours. Anything longer is held in D1 and
    // swept back in by cron, so callers can ask for any runAt they like.
    await env.EVENTS!.send(job, delaySeconds > 0 ? { delaySeconds } : undefined);
    return;
  }

  if (mode === 'durable-object') {
    const id = env.DISPATCHER!.idFromName(DISPATCHER_KEY);
    await env.DISPATCHER!.get(id).schedule(job);
    return;
  }

  // Inline: best effort, no retry. Deployments in this mode accept that a job
  // lost to a crash is lost for good.
  const work = runJob(env, job);
  if (options.ctx) {
    options.ctx.waitUntil(work);
    return;
  }
  await work;
}
