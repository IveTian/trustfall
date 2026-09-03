import { describe, expect, it } from 'vitest';
import {
  createInviteToken,
  inviteLinkState,
  inviteRegistrationUrl,
  remainingUses,
} from './invite-links.ts';

describe('inviteLinkState', () => {
  it('is active while uses remain and it has not been revoked', () => {
    expect(inviteLinkState({ revokeTime: null, useCount: 0, maxUses: 3 })).toBe('ACTIVE');
    expect(inviteLinkState({ revokeTime: null, useCount: 2, maxUses: 3 })).toBe('ACTIVE');
  });

  it('is exhausted once every use is spent', () => {
    expect(inviteLinkState({ revokeTime: null, useCount: 3, maxUses: 3 })).toBe('EXHAUSTED');
    expect(inviteLinkState({ revokeTime: null, useCount: 4, maxUses: 3 })).toBe('EXHAUSTED');
  });

  it('treats a revoked link as revoked even if uses remain', () => {
    expect(inviteLinkState({ revokeTime: 1, useCount: 0, maxUses: 3 })).toBe('REVOKED');
  });
});

describe('remainingUses', () => {
  it('counts unused slots on an active link', () => {
    expect(remainingUses({ revokeTime: null, useCount: 1, maxUses: 5 })).toBe(4);
  });

  it('is zero when revoked or exhausted', () => {
    expect(remainingUses({ revokeTime: 1, useCount: 0, maxUses: 5 })).toBe(0);
    expect(remainingUses({ revokeTime: null, useCount: 5, maxUses: 5 })).toBe(0);
  });
});

describe('createInviteToken', () => {
  it('returns a 48-character hex secret', () => {
    const token = createInviteToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it('does not repeat across calls', () => {
    expect(createInviteToken()).not.toBe(createInviteToken());
  });
});

describe('inviteRegistrationUrl', () => {
  it('points at the admin register page and strips a trailing slash on the origin', () => {
    expect(inviteRegistrationUrl('https://status.example.com/', 'abc')).toBe(
      'https://status.example.com/admin/register?invite=abc',
    );
  });
});
