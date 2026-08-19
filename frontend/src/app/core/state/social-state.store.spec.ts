import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationView, MatchView } from '../api/contracts';
import { MatchApi } from '../api/match.api';
import { MessagingApi } from '../api/messaging.api';
import { SessionStore } from '../auth/session.store';
import { SocialStateStore } from './social-state.store';

const match: MatchView = {
  id: 'match-1',
  userA: 'user-a',
  userB: 'user-b',
  status: 'ACTIVE',
  createdAt: '2026-08-19T10:00:00Z'
};

const conversation: ConversationView = {
  id: 'conversation-1',
  matchId: 'match-1',
  userA: 'user-a',
  userB: 'user-b',
  createdAt: '2026-08-19T10:01:00Z',
  lastMessageAt: null
};

describe('SocialStateStore', () => {
  beforeEach(() => {
    try { window.sessionStorage.clear(); } catch { /* noop */ }
  });

  it('preserves the last known-good match when a tab refresh temporarily returns empty', async () => {
    const matchApi = { list: vi.fn().mockReturnValueOnce(of([match])).mockReturnValueOnce(of([])) };
    const messagingApi = { conversations: vi.fn(() => of([conversation])) };
    const store = createStore(matchApi, messagingApi);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);
  });

  it('recovers an ACTIVE match from an active conversation when /matches is transiently empty', async () => {
    const store = createStore(
      { list: vi.fn(() => of([])) },
      { conversations: vi.fn(() => of([conversation])) }
    );

    await store.refresh({ preserveKnown: true, retryEmpty: true });

    expect(store.matches()).toEqual([{ ...match, createdAt: conversation.createdAt }]);
    expect(store.conversations()).toEqual([conversation]);
  });

  it('restores matches from session storage if the social service is recreated during route navigation', async () => {
    const first = createStore(
      { list: vi.fn(() => of([match])) },
      { conversations: vi.fn(() => of([conversation])) }
    );
    await first.refresh({ preserveKnown: true });
    expect(first.matches()).toEqual([match]);

    // Simulates destruction/recreation caused by shell/router/dev reload. The
    // second store starts with an empty backend snapshot but must render the
    // match immediately from the authenticated browser session cache.
    const second = createStore(
      { list: vi.fn(() => of([])) },
      { conversations: vi.fn(() => of([])) }
    );
    await second.ensureLoaded();

    expect(second.matches()).toEqual([match]);
  });

  it('shares conversations and matches independently of which route component is alive', async () => {
    const store = createStore(
      { list: vi.fn(() => of([match])) },
      { conversations: vi.fn(() => of([conversation])) }
    );

    await store.refresh({ preserveKnown: true });

    expect(store.matches()).toEqual([match]);
    expect(store.conversations()).toEqual([conversation]);
    expect(store.loaded()).toBe(true);
  });

  it('remembers a newly detected match before navigation finishes', () => {
    const store = createStore(
      { list: vi.fn(() => of([])) },
      { conversations: vi.fn(() => of([])) }
    );

    store.rememberMatch(match);

    expect(store.matches()).toEqual([match]);
    expect(store.loaded()).toBe(true);
  });

  it('removes both the match and its conversation after an explicit unmatch', async () => {
    const store = createStore(
      { list: vi.fn(() => of([match])) },
      { conversations: vi.fn(() => of([conversation])) }
    );
    await store.refresh({ preserveKnown: true });

    store.removeMatch('match-1');

    expect(store.matches()).toEqual([]);
    expect(store.conversations()).toEqual([]);
  });

  it('does not leak social state between authenticated users', async () => {
    const currentUser = signal<string | null>('user-a');
    const matchApi = { list: vi.fn().mockReturnValueOnce(of([match])).mockReturnValueOnce(of([])) };
    const store = createStore(matchApi, { conversations: vi.fn(() => of([])) }, currentUser);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);

    currentUser.set('user-c');
    await store.refresh({ preserveKnown: true });

    expect(store.matches()).toEqual([]);
  });

  it('keeps the match visible across Matches → Messages → Matches route re-entry refreshes', async () => {
    const listCalls: MatchView[][] = [[match], [], [match], [], [match]];
    const matchApi = { list: vi.fn(() => of(listCalls.shift() ?? [])) };
    const conversationsCalls: ConversationView[][] = [[conversation], [conversation], [conversation], [conversation], [conversation]];
    const messagingApi = { conversations: vi.fn(() => of(conversationsCalls.shift() ?? [])) };
    const store = createStore(matchApi, messagingApi);

    await store.refresh({ preserveKnown: true, retryEmpty: true });
    expect(store.matches().length).toBe(1);
    expect(store.matches()[0].id).toBe('match-1');
    expect(store.matches()[0].status).toBe('ACTIVE');

    await store.refresh({ preserveKnown: true, retryEmpty: true });
    expect(store.matches().length).toBe(1);

    await store.refresh({ preserveKnown: true, retryEmpty: true });
    expect(store.matches().length).toBe(1);
    expect(store.matches()[0].status).toBe('ACTIVE');

    await store.refresh({ preserveKnown: true, retryEmpty: true });
    expect(store.matches().length).toBe(1);

    await store.refresh({ preserveKnown: true, retryEmpty: true });
    expect(store.matches().length).toBe(1);
    expect(store.conversations().length).toBe(1);
  });

  it('synchronizes the owner before ensureLoaded so route navigation cannot reuse stale state', async () => {
    const currentUser = signal<string | null>('user-a');
    const matchApi = { list: vi.fn().mockReturnValueOnce(of([match])).mockReturnValueOnce(of([])) };
    const store = createStore(matchApi, { conversations: vi.fn(() => of([])) }, currentUser);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);

    // Simulate a synchronous session owner change immediately followed by a
    // navigation-driven ensureLoaded(), before Angular's effect queue flushes.
    currentUser.set('user-c');
    await store.ensureLoaded();

    expect(store.matches()).toEqual([]);
    expect(matchApi.list).toHaveBeenCalledTimes(2);
  });

  it('exposes an error signal without wiping known-good data on transient HTTP failures', async () => {
    const failingOnce = vi.fn()
      .mockReturnValueOnce(of([match]))
      .mockImplementationOnce(() => { throw new Error('transient network'); })
      .mockReturnValueOnce(of([]));
    const messagingApi = { conversations: vi.fn(() => of([conversation])) };
    const store = createStore({ list: failingOnce }, messagingApi);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);
    expect(store.error()).toBeNull();

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);
    expect(store.error()).not.toBeNull();
  });
});

function createStore(matchApi: object, messagingApi: object, currentUser = signal<string | null>('user-a')): SocialStateStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: MatchApi, useValue: matchApi },
      { provide: MessagingApi, useValue: messagingApi },
      { provide: SessionStore, useValue: { userId: currentUser } }
    ]
  });
  return TestBed.inject(SocialStateStore);
}
