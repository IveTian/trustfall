import type { Job } from './types.ts';
import { runJob } from './run.ts';

/**
 * Queue consumer. Only reachable on a paid plan; free deployments never bind
 * EVENTS and drive the same jobs through the Dispatcher alarm instead.
 *
 * Every message is acked or retried explicitly. An exception escaping this
 * handler would retry the whole batch, so nothing is allowed to escape.
 */
export async function handleQueue(
  batch: MessageBatch<Job>,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await runJob(env, message.body);
      message.ack();
    } catch (error) {
      console.error('queue job failed', message.body.type, error);
      message.retry();
    }
  }
}
