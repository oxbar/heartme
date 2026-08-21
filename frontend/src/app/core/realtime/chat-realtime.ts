import { Injectable, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject, Subscription } from 'rxjs';
import { MessageReactionEvent, MessageView, ReadReceiptView } from '../api/contracts';
import { SessionStore } from '../auth/session.store';

interface TopicEntry {
  readonly subject: Subject<unknown>;
  observers: number;
  brokerSubscription?: StompSubscription;
}

@Injectable({ providedIn: 'root' })
export class ChatRealtime {
  private readonly session = inject(SessionStore);
  private readonly topics = new Map<string, TopicEntry>();
  private readonly client = new Client({
    brokerURL: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`,
    reconnectDelay: 1500,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000
  });

  constructor() {
    this.client.beforeConnect = async () => {
      const token = this.session.accessToken();
      this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    };

    this.client.onConnect = () => {
      for (const [destination, entry] of this.topics) {
        if (entry.observers > 0) this.subscribeBroker(destination, entry);
      }
    };

    this.client.onWebSocketClose = () => {
      for (const entry of this.topics.values()) entry.brokerSubscription = undefined;
    };
  }

  messages(conversationId: string): Observable<MessageView> {
    return this.topic<MessageView>(`/topic/conversations/${conversationId}`);
  }

  receipts(conversationId: string): Observable<ReadReceiptView> {
    return this.topic<ReadReceiptView>(`/topic/conversations/${conversationId}/receipts`);
  }

  reactions(conversationId: string): Observable<MessageReactionEvent> {
    return this.topic<MessageReactionEvent>(`/topic/conversations/${conversationId}/reactions`);
  }

  private topic<T>(destination: string): Observable<T> {
    return new Observable<T>(subscriber => {
      let entry = this.topics.get(destination);
      if (!entry) {
        entry = { subject: new Subject<unknown>(), observers: 0 };
        this.topics.set(destination, entry);
      }

      entry.observers += 1;
      const localSubscription: Subscription = entry.subject.subscribe({
        next: value => subscriber.next(value as T),
        error: error => subscriber.error(error),
        complete: () => subscriber.complete()
      });

      if (!this.client.active) this.client.activate();
      if (this.client.connected) this.subscribeBroker(destination, entry);

      return () => {
        localSubscription.unsubscribe();
        const current = this.topics.get(destination);
        if (!current) return;
        current.observers = Math.max(0, current.observers - 1);
        if (current.observers === 0) {
          if (this.client.connected) current.brokerSubscription?.unsubscribe();
          this.topics.delete(destination);
        }
      };
    });
  }

  private subscribeBroker(destination: string, entry: TopicEntry): void {
    if (!this.client.connected || entry.brokerSubscription) return;
    entry.brokerSubscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        entry.subject.next(JSON.parse(message.body) as unknown);
      } catch {
        // Ignore malformed broker payloads without killing every local observer.
      }
    });
  }

  disconnect(): void {
    for (const entry of this.topics.values()) {
      if (this.client.connected) entry.brokerSubscription?.unsubscribe();
      entry.subject.complete();
    }
    this.topics.clear();
    if (this.client.active) void this.client.deactivate();
  }
}
