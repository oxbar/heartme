import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MatchView } from './contracts';

@Injectable({ providedIn: 'root' })
export class MatchApi {
  private readonly http = inject(HttpClient);

  list(): Observable<MatchView[]> {
    return this.http.get<MatchView[]>('/api/v1/matches');
  }

  unmatch(matchId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/matches/${matchId}`);
  }
}
