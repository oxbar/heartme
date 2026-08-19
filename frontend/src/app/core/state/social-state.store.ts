import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, MatchView } from '../api/contracts';
import { MatchApi } from '../api/match.api';
import { MessagingApi } from '../api/messaging.api';
import { SessionStore } from '../auth/session.store';

export interface SocialRefreshOptions {
  /**
   * Keep the last known-good state when a navigation refresh returns an empty
   * snapshot. Explicit domain actions such as unmatch mutate the store directly.
   */
  preserveKnown?: boolean;
  /**
   * Retry an all-empty snapshot briefly. This covers the small AFTER_COMMIT
   * window between reciprocal LIKE persistence, match activation and route
   * navigation without forcing the user through Discovery again.
   */
  retryEmpty?: boolean;
}

interface SocialSnapshot {
  matches: MatchView[];
  conversations: ConversationView[];
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
    return this.loaded() ? Promise.resolve() : this.refresh({ preserveKnown: true, retryEmpty: true });
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

  /**
   * Put a match returned by a direct API check into the session store
   * immediately. Discovery calls this before routing to Matches/Messages so a
   * newly-created match cannot disappear while a background refresh catches up.
   */
  rememberMatch(match: MatchView): void {
    this.syncOwner();
    if (match.status !== 'ACTIVE') return;
    this.matches.update(list => dedupeMatches([match, ...list]));
    this.loaded.set(true);
    this.persist();
  }

  removeMatch(matchId: string): void {
    this.matches.update(list => list.filter(match => match.id !== matchId));
    this.conversations.update(list => list.filter(conversation => conversation.matchId !== matchId));
    this.loaded.set(true);
    this.persist();
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
    this.restorePersisted(current);
  }

  private async performRefresh(options: SocialRefreshOptions, owner: string | null): Promise<void> {
    this.loading.set(true);
    try {
      const attempts = options.retryEmpty ? 4 : 1;
      let finalMatches: MatchView[] | null = null;
      let finalConversations: ConversationView[] | null = null;
      let anySuccess = false;

      for (let attempt = 0; attempt < attempts; attempt++) {
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

        anySuccess ||= matchesResult.ok || conversationsResult.ok;
        if (matchesResult.ok) finalMatches = dedupeMatches(matchesResult.value);
        if (conversationsResult.ok) finalConversations = sortConversations(conversationsResult.value);

        // Conversations are only returned by the backend while their match is
        // ACTIVE. They are therefore a safe recovery source when /matches is
        // briefly empty during tab navigation or immediately after a match.
        if (finalConversations?.length) {
          const recovered = matchesFromConversations(finalConversations);
          finalMatches = dedupeMatches([...(finalMatches ?? []), ...recovered]);
        }

        const hasSocialData = !!finalMatches?.length || !!finalConversations?.length;
        if (hasSocialData || !options.retryEmpty || attempt === attempts - 1) break;
        await delay([90, 180, 360][attempt] ?? 360);
      }

      if (finalMatches !== null) {
        const next = finalMatches;
        if (!options.preserveKnown || next.length || !this.loaded() || !this.matches().length) {
          this.matches.set(next);
        }
      }

      if (finalConversations !== null) {
        const next = finalConversations;
        if (!options.preserveKnown || next.length || !this.loaded() || !this.conversations().length) {
          this.conversations.set(next);
        }
      }

      if (anySuccess) {
        this.loaded.set(true);
        this.persist();
      }
    } finally {
      if (owner === this.ownerUserId) this.loading.set(false);
    }
  }

  private persist(): void {
    const owner = this.ownerUserId;
    if (!owner) return;
    const storage = sessionStorageSafe();
    if (!storage) return;
    const snapshot: SocialSnapshot = {
      matches: this.matches(),
      conversations: this.conversations()
    };
    try {
      storage.setItem(storageKey(owner), JSON.stringify(snapshot));
    } catch {
      // Storage is an enhancement only; quota/privacy mode must not break UX.
    }
  }

  private restorePersisted(owner: string | null): void {
    if (!owner) return;
    const storage = sessionStorageSafe();
    if (!storage) return;
    try {
      const raw = storage.getItem(storageKey(owner));
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SocialSnapshot>;
      const matches = Array.isArray(parsed.matches) ? dedupeMatches(parsed.matches) : [];
      const conversations = Array.isArray(parsed.conversations) ? sortConversations(parsed.conversations) : [];
      if (matches.length || conversations.length) {
        this.matches.set(dedupeMatches([...matches, ...matchesFromConversations(conversations)]));
        this.conversations.set(conversations);
        this.loaded.set(true);
      }
    } catch {
      try { storage.removeItem(storageKey(owner)); } catch { /* noop */ }
    }
  }
}

function dedupeMatches(items: MatchView[]): MatchView[] {
  const byId = new Map<string, MatchView>();
  for (const item of items) {
    if (item?.status === 'ACTIVE' && item.id) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function matchesFromConversations(items: ConversationView[]): MatchView[] {
  return items
    .filter(item => !!item?.matchId && !!item.userA && !!item.userB)
    .map(item => ({
      id: item.matchId,
      userA: item.userA,
      userB: item.userB,
      status: 'ACTIVE',
      createdAt: item.createdAt
    }));
}

function sortConversations(items: ConversationView[]): ConversationView[] {
  const byId = new Map<string, ConversationView>();
  for (const item of items) if (item?.id) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => {
    const left = new Date(a.lastMessageAt || a.createdAt).getTime();
    const right = new Date(b.lastMessageAt || b.createdAt).getTime();
    return right - left;
  });
}

function storageKey(userId: string): string {
  return `heartme.social.v2.${userId}`;
}

function sessionStorageSafe(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
