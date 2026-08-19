import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationView } from './contracts';

@Injectable({ providedIn: 'root' })
export class NotificationApi {
  private readonly http = inject(HttpClient);

  list(limit = 50): Observable<NotificationView[]> {
    return this.http.get<NotificationView[]>('/api/v1/notifications', { params: { limit } });
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(`/api/v1/notifications/${id}/read`, {});
  }

  clear(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>('/api/v1/notifications');
  }
}
