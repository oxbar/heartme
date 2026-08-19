import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConversationView, MessageView } from './contracts';

@Injectable({ providedIn: 'root' })
export class MessagingApi {
  private readonly http = inject(HttpClient);

  conversations(): Observable<ConversationView[]> {
    return this.http.get<ConversationView[]>('/api/v1/conversations');
  }

  messages(conversationId: string, before?: string, limit = 50): Observable<MessageView[]> {
    const params: Record<string, string | number> = { limit };
    if (before) params['before'] = before;
    return this.http.get<MessageView[]>(`/api/v1/conversations/${conversationId}/messages`, { params });
  }

  send(conversationId: string, content: string): Observable<MessageView> {
    return this.http.post<MessageView>(`/api/v1/conversations/${conversationId}/messages`, { content });
  }

  markRead(conversationId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/conversations/${conversationId}/read`, {});
  }
}
