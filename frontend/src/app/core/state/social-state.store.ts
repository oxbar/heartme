import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, MatchView } from '../api/contracts';
import { MatchApi } from '../api/match.api';
import { MessagingApi } from '../api/messaging.api';
import { SessionStore } from '../auth/session.store';

export interface SocialRefreshOptions {
  /**
   * Keep the last known-good non-empty state if a navigation refresh returns an
   * empty list. Explicit domain actions (unmatch) update the store directly.
   */
  preserveKnown?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SocialStateStore {
  private readonly matchApi = inject(MatchApi);
  private readonly messagingApi = inject(MessagingApi);
  private readonly session = inject(SessionStore);

  readonly matches = signal<MatchView[]>([]);
  readonly conversations = signal<ConversationView[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);

  private inFlight: { owner: string | null; promise: Promise<void> } | null = null;
  private ownerUserId: string | null = null;

  ensureLoaded(): Promise<void> {
    this.syncOwner();
    return this.loaded() ? Promise.resolve() : this.refresh({ preserveKnown: true });
  }

  refresh(options: SocialRefreshOptions = { preserveKnown: true }): Promise<void> {
    this.syncOwner();
    const owner = this.ownerUserId;
    if (this.inFlight?.owner === owner) return this.inFlight.promise;

    const request = this.performRefresh(options, owner).finally(() => {
      if (this.inFlight?.promise === request) this.inFlight = null;
    });
    this.inFlight = { owner, promise: request };
    return request;
  }

  removeMatch(matchId: string): void {
    this.matches.update(list => list.filter(match => match.id !== matchId));
    this.conversations.update(list => list.filter(conversation => conversation.matchId !== matchId));
  }

  clear(): void {
    this.matches.set([]);
    this.conversations.set([]);
    this.loaded.set(false);
    this.loading.set(false);
    this.inFlight = null;
  }

  private syncOwner(): void {
    const current = this.session.userId();
    if (this.ownerUserId === current) return;
    this.ownerUserId = current;
    this.clear();
  }

  private async performRefresh(options: SocialRefreshOptions, owner: string | null): Promise<void> {
    this.loading.set(true);
    try {
      const [matchesResult, conversationsResult] = await Promise.all([
        firstValueFrom(this.matchApi.list()).then(
          value => ({ ok: true as const, value }),
          () => ({ ok: false as const, value: [] as MatchView[] })
        ),
        firstValueFrom(this.messagingApi.conversations()).then(
          value => ({ ok: true as const, value }),
          () => ({ ok: false as const, value: [] as ConversationView[] })
        )
      ]);

      // A response started for the previous authenticated account must never
      // populate the state of the next account in the same browser tab.
      if (owner !== this.ownerUserId || owner !== this.session.userId()) return;

      if (matchesResult.ok) {
        const next = dedupeMatches(matchesResult.value);
        if (!options.preserveKnown || next.length || !this.loaded() || !this.matches().length) {
          this.matches.set(next);
        }
      }

      if (conversationsResult.ok) {
        const next = sortConversations(conversationsResult.value);
        if (!options.preserveKnown || next.length || !this.loaded() || !this.conversations().length) {
          this.conversations.set(next);
        }
      }

      if (matchesResult.ok || conversationsResult.ok) this.loaded.set(true);
    } finally {
      if (owner === this.ownerUserId) this.loading.set(false);
    }
  }
}

function dedupeMatches(items: MatchView[]): MatchView[] {
  const byId = new Map<string, MatchView>();
  for (const item of items) {
    if (item.status === 'ACTIVE') byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function sortConversations(items: ConversationView[]): ConversationView[] {
  const byId = new Map<string, ConversationView>();
  for (const item of items) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => {
    const left = new Date(a.lastMessageAt || a.createdAt).getTime();
    const right = new Date(b.lastMessageAt || b.createdAt).getTime();
    return right - left;
  });
}
