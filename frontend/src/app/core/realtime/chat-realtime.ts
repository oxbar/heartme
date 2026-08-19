import { Injectable, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable } from 'rxjs';
import { MessageView } from '../api/contracts';
import { SessionStore } from '../auth/session.store';

@Injectable({ providedIn: 'root' })
export class ChatRealtime {
  private readonly session = inject(SessionStore);
  private readonly client = new Client({
    brokerURL: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000
  });

  constructor() {
    this.client.beforeConnect = async () => {
      const token = this.session.accessToken();
      this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    };
  }

  messages(conversationId: string): Observable<MessageView> {
    return new Observable<MessageView>(subscriber => {
      let subscription: StompSubscription | undefined;
      const subscribe = () => {
        subscription = this.client.subscribe(`/topic/conversations/${conversationId}`, (message: IMessage) => {
          subscriber.next(JSON.parse(message.body) as MessageView);
        });
      };
      const previous = this.client.onConnect;
      this.client.onConnect = frame => {
        previous?.(frame);
        subscribe();
      };
      if (!this.client.active) this.client.activate();
      else if (this.client.connected) subscribe();

      return () => subscription?.unsubscribe();
    });
  }

  disconnect(): void {
    if (this.client.active) void this.client.deactivate();
  }
}
