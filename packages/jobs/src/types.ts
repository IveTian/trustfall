/**
 * A unit of deferred work. Jobs are small and self-describing: the payload
 * carries identifiers, never whole resources, because a queue message is
 * capped at 128 KB and a Durable Object alarm has to serialise the same shape.
 */
export type Job = {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  /** Epoch ms. Earlier than now means "run on the next tick". */
  runAt: number;
  attempt: number;
};

export const JOB_TYPES = [
  'WEBHOOK_DELIVER',
  'EMAIL_SEND',
  'COMPONENT_STATUS_RECONCILE',
  'MAINTENANCE_TRANSITION',
  'UPTIME_ROLLUP',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

/**
 * How this deployment runs deferred work. Chosen by probing bindings, never by
 * an environment variable, so `wrangler.jsonc` stays the single switch.
 */
export type DeliveryMode = 'queue' | 'durable-object' | 'inline';

export function deliveryMode(env: Env): DeliveryMode {
  if ('EVENTS' in env && env.EVENTS) {
    return 'queue';
  }
  if ('DISPATCHER' in env && env.DISPATCHER) {
    return 'durable-object';
  }
  return 'inline';
}
