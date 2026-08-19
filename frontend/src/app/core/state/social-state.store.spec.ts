import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
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
  it('preserves the last known-good match when a tab refresh temporarily returns empty', async () => {
    const matchApi = { list: vi.fn().mockReturnValueOnce(of([match])).mockReturnValueOnce(of([])) };
    const messagingApi = { conversations: vi.fn(() => of([conversation])) };
    const store = createStore(matchApi, messagingApi);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);

    await store.refresh({ preserveKnown: true });
    expect(store.matches()).toEqual([match]);
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
