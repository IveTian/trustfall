import { DurableObject } from 'cloudflare:workers';
import { runJob } from './run.ts';
import type { Job } from './types.ts';

/**
 * The free-plan delivery clock.
 *
 * Cloudflare Queues need a paid plan, so a default TrustFall deployment has no
 * queue to lean on. This Durable Object stands in: it keeps a table of pending
 * jobs in its own SQLite storage and wakes itself with a single alarm.
 *
 * A Durable Object has exactly one alarm, so the alarm is always set to the
 * earliest pending job and the handler drains everything that has come due.
 */
export class Dispatcher extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS pending_jobs (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          run_at INTEGER NOT NULL,
          attempt INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS pending_jobs_run_at_idx ON pending_jobs(run_at);
      `);
    });
  }

  async schedule(job: Job): Promise<void> {
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO pending_jobs (id, type, payload, run_at, attempt)
       VALUES (?, ?, ?, ?, ?)`,
      job.id,
      job.type,
      JSON.stringify(job.payload),
      job.runAt,
      job.attempt,
    );
    await this.rearm();
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const due = this.ctx.storage.sql
      .exec<{ id: string; type: string; payload: string; run_at: number; attempt: number }>(
        `SELECT * FROM pending_jobs WHERE run_at <= ? ORDER BY run_at LIMIT 50`,
        now,
      )
      .toArray();

    for (const row of due) {
      // Each job is isolated: one failure must not abandon the rest of the batch.
      try {
        await this.run({
          id: row.id,
          type: row.type as Job['type'],
          payload: JSON.parse(row.payload) as Record<string, unknown>,
          runAt: row.run_at,
          attempt: row.attempt,
        });
        this.ctx.storage.sql.exec(`DELETE FROM pending_jobs WHERE id = ?`, row.id);
      } catch (error) {
        console.error('job failed', row.id, row.type, error);
        this.ctx.storage.sql.exec(`DELETE FROM pending_jobs WHERE id = ?`, row.id);
      }
    }

    await this.rearm();
  }

  /** Point the single alarm at the earliest job still pending. */
  private async rearm(): Promise<void> {
    const next = this.ctx.storage.sql
      .exec<{ run_at: number }>(`SELECT run_at FROM pending_jobs ORDER BY run_at LIMIT 1`)
      .toArray()[0];
    if (!next) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Math.max(next.run_at, Date.now()));
  }

  private async run(job: Job): Promise<void> {
    await runJob(this.env, job);
  }
}
