import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InteractionType, Recommendation } from './contracts';

@Injectable({ providedIn: 'root' })
export class DiscoveryApi {
  private readonly http = inject(HttpClient);

  discover(limit = 24): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>('/api/v1/discovery', { params: { limit } });
  }

  interact(userId: string, type: InteractionType): Observable<unknown> {
    return this.http.post(`/api/v1/interactions/${userId}`, { type });
  }
}
