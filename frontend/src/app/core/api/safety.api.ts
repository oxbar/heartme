import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SafetyApi {
  private readonly http = inject(HttpClient);

  block(userId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/safety/blocks/${userId}`, {});
  }

  unblock(userId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/safety/blocks/${userId}`);
  }

  report(userId: string, reason: string, details: string): Observable<void> {
    return this.http.post<void>(`/api/v1/safety/reports/${userId}`, { reason, details });
  }
}
