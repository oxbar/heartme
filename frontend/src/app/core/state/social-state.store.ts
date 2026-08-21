import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, MatchView, MessageView } from '../api/contracts';
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
  lastMessages?: Record<string, MessageView>;
  readAt?: Record<string, string>;
}

interface InFlightRefresh {
  owner: string | null;
  epoch: number;
  promise: Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class SocialStateStore {
  private readonly matchApi = inject(MatchApi);
  private readonly messagingApi = inject(MessagingApi);
  private readonly session = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly matches = signal<MatchView[]>([]);
  readonly conversations = signal<ConversationView[]>([]);
  readonly lastMessages = signal<Record<string, MessageView>>({});
  readonly readAtMap = signal<Record<string, string>>({});
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<unknown | null>(null);

  private inFlight: InFlightRefresh | null = null;
  private ownerUserId: string | null = null;
  private ownerEpoch = 0;
  private destroyed = false;

  constructor() {
    // Do the first owner synchronization synchronously. The effect below keeps
    // following SessionStore afterwards, but callers never have to wait for an
    // effect flush before refresh()/ensureLoaded() sees the correct owner.
    this.syncOwner();

    effect(() => {
      this.session.userId();
      this.syncOwner();
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
  }

  ensureLoaded(): Promise<void> {
    this.syncOwner();
    return this.loaded() ? Promise.resolve() : this.refresh({ preserveKnown: true, retryEmpty: true });
  }

  refresh(options: SocialRefreshOptions = { preserveKnown: true }): Promise<void> {
    const owner = this.syncOwner();
    const epoch = this.ownerEpoch;

    if (!owner || this.destroyed) {
      this.loading.set(false);
      return Promise.resolve();
    }

    if (this.inFlight?.owner === owner && this.inFlight.epoch === epoch) {
      return this.inFlight.promise;
    }

    let request!: Promise<void>;
    request = this.performRefresh(options, owner, epoch, () => {
      if (this.inFlight?.promise === request) this.inFlight = null;
    });
    this.inFlight = { owner, epoch, promise: request };
    return request;
  }

  rememberMatch(match: MatchView): void {
    const owner = this.syncOwner();
    if (!owner || match.status !== 'ACTIVE') return;
    this.matches.update(list => dedupeMatches([match, ...list]));
    this.loaded.set(true);
    this.error.set(null);
    this.persist();
  }

  removeMatch(matchId: string): void {
    const owner = this.syncOwner();
    if (!owner) return;
    const removedConversationIds = new Set(
      this.conversations().filter(conversation => conversation.matchId === matchId).map(conversation => conversation.id)
    );
    this.matches.update(list => list.filter(match => match.id !== matchId));
    this.conversations.update(list => list.filter(conversation => conversation.matchId !== matchId));
    if (removedConversationIds.size) {
      this.lastMessages.update(current => omitKeys(current, removedConversationIds));
      this.readAtMap.update(current => omitKeys(current, removedConversationIds));
    }
    this.loaded.set(true);
    this.error.set(null);
    this.persist();
  }

  rememberMessage(message: MessageView): void {
    const owner = this.syncOwner();
    if (!owner || !message?.conversationId || !message.id) return;

    const current = this.lastMessages()[message.conversationId];
    if (current && messageTime(current) > messageTime(message)) return;

    this.lastMessages.update(messages => ({ ...messages, [message.conversationId]: message }));
    this.conversations.update(items => sortConversations(items.map(conversation =>
      conversation.id === message.conversationId
        ? { ...conversation, lastMessageAt: message.sentAt }
        : conversation
    )));
    this.persist();
  }

  rememberLatestMessages(messages: Record<string, MessageView>): void {
    const owner = this.syncOwner();
    if (!owner) return;

    let changed = false;
    const merged = { ...this.lastMessages() };
    for (const [conversationId, message] of Object.entries(messages)) {
      const current = merged[conversationId];
      if (!current || messageTime(message) >= messageTime(current)) {
        if (!current || current.id !== message.id || current.readAt !== message.readAt || current.heartReactionCount !== message.heartReactionCount || current.heartReactedByMe !== message.heartReactedByMe) {
          merged[conversationId] = message;
          changed = true;
        }
      }
    }
    if (!changed) return;

    this.lastMessages.set(merged);
    this.conversations.update(items => sortConversations(items.map(conversation => {
      const message = merged[conversation.id];
      if (!message) return conversation;
      const currentTime = conversation.lastMessageAt ? new Date(conversation.lastMessageAt).getTime() : 0;
      return messageTime(message) >= currentTime ? { ...conversation, lastMessageAt: message.sentAt } : conversation;
    })));
    this.persist();
  }

  markConversationReadLocal(conversationId: string, at = new Date().toISOString()): void {
    const owner = this.syncOwner();
    if (!owner || !conversationId) return;
    const current = this.readAtMap()[conversationId];
    if (current && new Date(current).getTime() >= new Date(at).getTime()) return;
    this.readAtMap.update(map => ({ ...map, [conversationId]: at }));
    this.persist();
  }

  private syncOwner(): string | null {
    const nextUserId = this.session.userId();
    if (nextUserId === this.ownerUserId) return nextUserId;

    this.ownerUserId = nextUserId;
    this.ownerEpoch += 1;
    this.resetForOwnerChange();
    this.restorePersisted(nextUserId);
    return nextUserId;
  }

  private resetForOwnerChange(): void {
    this.matches.set([]);
    this.conversations.set([]);
    this.lastMessages.set({});
    this.readAtMap.set({});
    this.loaded.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.inFlight = null;
  }

  private isCurrentOwner(owner: string | null, epoch: number): boolean {
    return !this.destroyed
      && owner === this.ownerUserId
      && epoch === this.ownerEpoch
      && owner === this.session.userId();
  }

  private async performRefresh(
    options: SocialRefreshOptions,
    owner: string | null,
    epoch: number,
    onFinally: () => void
  ): Promise<void> {
    let finalized = false;
    const complete = () => {
      if (!finalized) {
        finalized = true;
        onFinally();
      }
    };

    if (!this.isCurrentOwner(owner, epoch)) {
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

        if (!this.isCurrentOwner(owner, epoch)) {
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

      if (!this.isCurrentOwner(owner, epoch)) return;

      if (finalMatches !== null) {
        this.applyMatches(finalMatches, options.preserveKnown !== false);
      }

      if (finalConversations !== null) {
        this.applyConversations(finalConversations, options.preserveKnown !== false);
      }

      if (anySuccess) {
        this.loaded.set(true);
        this.error.set(null);
        this.persist();
      } else if (lastError && !this.loaded()) {
        this.error.set(lastError);
      }
    } catch (err) {
      if (this.isCurrentOwner(owner, epoch)) {
        this.error.set(err);
      }
    } finally {
      complete();
      // A stale request must never flip loading=false for a newer owner/request.
      if (this.isCurrentOwner(owner, epoch)) {
        this.loading.set(false);
      }
    }
  }

  private applyMatches(next: MatchView[], preserveKnown: boolean): void {
    const existing = this.matches();
    if (preserveKnown && existing.length > 0 && next.length === 0) return;
    this.matches.set(next);
  }

  private applyConversations(next: ConversationView[], preserveKnown: boolean): void {
    const existing = this.conversations();
    if (preserveKnown && existing.length > 0 && next.length === 0) return;
    this.conversations.set(next);
  }

  private persist(): void {
    const owner = this.ownerUserId;
    if (!owner) return;
    const storage = sessionStorageSafe();
    if (!storage) return;
    const snapshot: SocialSnapshot = {
      matches: this.matches(),
      conversations: this.conversations(),
      lastMessages: this.lastMessages(),
      readAt: this.readAtMap()
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
      const lastMessages = isRecord(parsed.lastMessages) ? parsed.lastMessages as Record<string, MessageView> : {};
      const readAt = isRecord(parsed.readAt) ? parsed.readAt as Record<string, string> : {};
      if (matches.length || conversations.length || Object.keys(lastMessages).length) {
        this.matches.set(dedupeMatches([...matches, ...matchesFromConversations(conversations)]));
        this.conversations.set(conversations);
        this.lastMessages.set(lastMessages);
        this.readAtMap.set(readAt);
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
function messageTime(message: MessageView): number {
  return new Date(message.sentAt).getTime();
}

function omitKeys<T>(source: Record<string, T>, keys: Set<string>): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!keys.has(key)) next[key] = value;
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
