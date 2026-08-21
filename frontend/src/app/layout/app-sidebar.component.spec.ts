import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { MatchView } from '../core/api/contracts';
import { MatchApi } from '../core/api/match.api';
import { MediaApi } from '../core/api/media.api';
import { MessagingApi } from '../core/api/messaging.api';
import { ProfileApi } from '../core/api/profile.api';
import { ChatRealtime } from '../core/realtime/chat-realtime';
import { SessionStore } from '../core/auth/session.store';
import { ProfileStore } from '../core/state/profile.store';
import { AppSidebarComponent } from './app-sidebar.component';

const activeMatch: MatchView = {
  id: 'match-1',
  userA: 'user-a',
  userB: 'user-b',
  status: 'ACTIVE',
  createdAt: '2026-08-19T10:00:00Z'
};

describe('AppSidebarComponent social-state lifecycle', () => {
  it('keeps already loaded matches when a tab refresh fails', async () => {
    const matchApi = {
      list: vi.fn()
        .mockReturnValueOnce(of([activeMatch]))
        .mockReturnValueOnce(throwError(() => new Error('temporary network error')))
    };
    const sidebar = createSidebar(matchApi);

    await vi.waitFor(() => expect(sidebar.matches()).toEqual([activeMatch]));
    await (sidebar as unknown as { load(): Promise<void> }).load();

    expect(sidebar.matches()).toEqual([activeMatch]);
  });

  it('does not discard match state when switching the visual mode to Messages', async () => {
    const sidebar = createSidebar({ list: vi.fn(() => of([activeMatch])) });
    await vi.waitFor(() => expect(sidebar.matches()).toHaveLength(1));

    sidebar.activeUrl.set('/app/messages');

    expect(sidebar.messagesMode()).toBe(true);
    expect(sidebar.matches()).toEqual([activeMatch]);
  });
});

function createSidebar(matchApi: object): AppSidebarComponent {
  TestBed.resetTestingModule();
  const routerEvents = new Subject<unknown>();
  TestBed.configureTestingModule({
    providers: [
      { provide: MatchApi, useValue: matchApi },
      { provide: MessagingApi, useValue: { conversations: vi.fn(() => of([])), messages: vi.fn(() => of([])) } },
      { provide: ChatRealtime, useValue: { messages: vi.fn(() => EMPTY) } },
      {
        provide: ProfileApi,
        useValue: {
          pingPresence: vi.fn(() => of(void 0)),
          byUser: vi.fn(() => of({
            userId: 'user-b', displayName: 'Ana', bio: null, age: 29, gender: 'WOMAN', bodyType: null,
            city: 'Blumenau', state: 'SC', country: 'BR', interests: []
          })),
          presence: vi.fn(() => of({ userId: 'user-b', online: true, lastSeenAt: null }))
        }
      },
      { provide: MediaApi, useValue: { mine: vi.fn(() => of([])), batch: vi.fn(() => of({})) } },
      { provide: SessionStore, useValue: { userId: () => 'user-a' } },
      { provide: ProfileStore, useValue: { profile: () => ({ displayName: 'Micael' }), load: vi.fn(async () => null) } },
      { provide: Router, useValue: { url: '/app/matches', events: routerEvents.asObservable() } }
    ]
  });
  return TestBed.runInInjectionContext(() => new AppSidebarComponent());
}
