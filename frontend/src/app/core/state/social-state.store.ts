import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, MatchView } from '../api/contracts';
import { MatchApi } from '../api/match.api';
import { MessagingApi } from '../api/messaging.api';
import { SessionStore } from '../auth/session.store';

export interface SocialRefreshOptions {
  preserveKnown?: boolean;
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
  private readonly destroyRef = inject(DestroyRef);

  readonly matches = signal<MatchView[]>([]);
  readonly conversations = signal<ConversationView[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<unknown | null>(null);

  private inFlight: { owner: string | null; promise: Promise<void> } | null = null;
  private ownerUserId: string | null = null;
  private destroyed = false;

  constructor() {
    this.ownerUserId = this.session.userId();
    this.restorePersisted(this.ownerUserId);

    effect(() => {
      const nextUserId = this.session.userId();
      if (this.ownerUserId !== nextUserId) {
        this.ownerUserId = nextUserId;
        this.resetForOwnerChange();
        this.restorePersisted(nextUserId);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
  }

  ensureLoaded(): Promise<void> {
    return this.loaded() ? Promise.resolve() : this.refresh({ preserveKnown: true, retryEmpty: true });
  }

  refresh(options: SocialRefreshOptions = { preserveKnown: true }): Promise<void> {
    const owner = this.ownerUserId;
    if (this.inFlight?.owner === owner) return this.inFlight.promise;

    let request!: Promise<void>;
    request = this.performRefresh(options, owner, () => {
      if (this.inFlight?.promise === request) this.inFlight = null;
    });
    this.inFlight = { owner, promise: request };
    return request;
  }

  rememberMatch(match: MatchView): void {
    if (match.status !== 'ACTIVE') return;
    this.matches.update(list => dedupeMatches([match, ...list]));
    this.loaded.set(true);
    this.error.set(null);
    this.persist();
  }

  removeMatch(matchId: string): void {
    this.matches.update(list => list.filter(match => match.id !== matchId));
    this.conversations.update(list => list.filter(conversation => conversation.matchId !== matchId));
    this.loaded.set(true);
    this.error.set(null);
    this.persist();
  }

  private resetForOwnerChange(): void {
    this.matches.set([]);
    this.conversations.set([]);
    this.loaded.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.inFlight = null;
  }

  private async performRefresh(
    options: SocialRefreshOptions,
    owner: string | null,
    onFinally: () => void
  ): Promise<void> {
    let finalized = false;
    const complete = () => {
      if (!finalized) {
        finalized = true;
        onFinally();
      }
    };
    if (owner !== this.ownerUserId || this.destroyed) {
      complete();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const attempts = options.retryEmpty ? 4 : 1;
      let finalMatches: MatchView[] | null = null;
      let finalConversations: ConversationView[] | null = null;
      let anySuccess = false;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < attempts; attempt++) {
        const [matchesResult, conversationsResult] = await Promise.all([
          firstValueFrom(this.matchApi.list()).then(
            value => ({ ok: true as const, value, error: null as unknown }),
            err => ({ ok: false as const, value: [] as MatchView[], error: err })
          ),
          firstValueFrom(this.messagingApi.conversations()).then(
            value => ({ ok: true as const, value, error: null as unknown }),
            err => ({ ok: false as const, value: [] as ConversationView[], error: err })
          )
        ]);

        if (owner !== this.ownerUserId || owner !== this.session.userId() || this.destroyed) {
          complete();
          return;
        }

        anySuccess ||= matchesResult.ok || conversationsResult.ok;
        if (!anySuccess && attempt === attempts - 1) {
          lastError = matchesResult.error ?? conversationsResult.error;
        }

        if (matchesResult.ok) {
          finalMatches = dedupeMatches(matchesResult.value);
        }
        if (conversationsResult.ok) {
          finalConversations = sortConversations(conversationsResult.value);
        }

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
        if (!options.preserveKnown) {
          this.matches.set(next);
        } else if (next.length > 0) {
          this.matches.set(next);
        } else if (!this.loaded()) {
          this.matches.set(next);
        }
      }

      if (finalConversations !== null) {
        const next = finalConversations;
        if (!options.preserveKnown) {
          this.conversations.set(next);
        } else if (next.length > 0) {
          this.conversations.set(next);
        } else if (!this.loaded()) {
          this.conversations.set(next);
        }
      }

      if (anySuccess) {
        this.loaded.set(true);
        this.error.set(null);
        this.persist();
      } else if (lastError && !this.loaded()) {
        this.error.set(lastError);
      }
    } catch (err) {
      if (owner === this.ownerUserId && !this.loaded()) {
        this.error.set(err);
      }
    } finally {
      complete();
      if (owner === this.ownerUserId) {
        this.loading.set(false);
      }
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
      // noop
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
        this.error.set(null);
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
