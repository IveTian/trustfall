import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { createId, nowMs } from './ids.ts';
import { inviteLinks } from './schema.ts';
import type { Database } from './client.ts';

export const INVITE_LINK_STATES = ['ACTIVE', 'EXHAUSTED', 'REVOKED'] as const;
export type InviteLinkState = (typeof INVITE_LINK_STATES)[number];

export type InviteLinkRow = typeof inviteLinks.$inferSelect;

export function createInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function inviteRegistrationUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/admin/register?invite=${encodeURIComponent(token)}`;
}

export function inviteLinkState(
  row: Pick<InviteLinkRow, 'revokeTime' | 'useCount' | 'maxUses'>,
): InviteLinkState {
  if (row.revokeTime != null) {
    return 'REVOKED';
  }
  if (row.useCount >= row.maxUses) {
    return 'EXHAUSTED';
  }
  return 'ACTIVE';
}

export function remainingUses(
  row: Pick<InviteLinkRow, 'revokeTime' | 'useCount' | 'maxUses'>,
): number {
  if (row.revokeTime != null) {
    return 0;
  }
  return Math.max(0, row.maxUses - row.useCount);
}

export async function listInviteLinks(db: Database): Promise<InviteLinkRow[]> {
  return db
    .select()
    .from(inviteLinks)
    .orderBy(desc(inviteLinks.createTime), desc(inviteLinks.id))
    .all();
}

export async function getInviteLink(db: Database, id: string): Promise<InviteLinkRow | undefined> {
  return db.select().from(inviteLinks).where(eq(inviteLinks.id, id)).get();
}

export async function getInviteLinkByToken(
  db: Database,
  token: string,
): Promise<InviteLinkRow | undefined> {
  return db.select().from(inviteLinks).where(eq(inviteLinks.token, token)).get();
}

export async function createInviteLink(
  db: Database,
  input: { maxUses: number; createdBy: string },
): Promise<InviteLinkRow> {
  const now = nowMs();
  const row: InviteLinkRow = {
    id: createId('inv'),
    token: createInviteToken(),
    maxUses: input.maxUses,
    useCount: 0,
    createdBy: input.createdBy,
    revokeTime: null,
    createTime: now,
    updateTime: now,
  };
  await db.insert(inviteLinks).values(row);
  return row;
}

export async function revokeInviteLink(
  db: Database,
  id: string,
): Promise<InviteLinkRow | undefined> {
  const existing = await getInviteLink(db, id);
  if (!existing) {
    return undefined;
  }
  if (existing.revokeTime != null) {
    return existing;
  }
  const now = nowMs();
  await db
    .update(inviteLinks)
    .set({ revokeTime: now, updateTime: now })
    .where(eq(inviteLinks.id, id));
  return { ...existing, revokeTime: now, updateTime: now };
}

/**
 * Atomically spends one use. Returns the updated row, or undefined when the
 * token is missing, revoked, or already at `max_uses`.
 */
export async function consumeInviteLinkByToken(
  db: Database,
  token: string,
): Promise<InviteLinkRow | undefined> {
  const now = nowMs();
  return db
    .update(inviteLinks)
    .set({
      useCount: sql`${inviteLinks.useCount} + 1`,
      updateTime: now,
    })
    .where(
      and(
        eq(inviteLinks.token, token),
        isNull(inviteLinks.revokeTime),
        sql`${inviteLinks.useCount} < ${inviteLinks.maxUses}`,
      ),
    )
    .returning()
    .get();
}

/** Puts a reserved slot back when user creation fails after consume. */
export async function releaseInviteLinkSlot(db: Database, id: string): Promise<void> {
  await db
    .update(inviteLinks)
    .set({
      useCount: sql`max(${inviteLinks.useCount} - 1, 0)`,
      updateTime: nowMs(),
    })
    .where(eq(inviteLinks.id, id));
}
