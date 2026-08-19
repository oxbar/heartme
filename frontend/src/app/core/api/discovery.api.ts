import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InteractionType, Recommendation, RecommendationExplanation, RecommendationPage } from './contracts';

@Injectable({ providedIn: 'root' })
export class DiscoveryApi {
  private readonly http = inject(HttpClient);

  discover(limit = 24): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>('/api/v1/discovery', { params: { limit } });
  }

  discoverPage(limit = 24, cursor?: string | null): Observable<RecommendationPage> {
    const params: Record<string, string | number> = { limit };
    if (cursor) params['cursor'] = cursor;
    return this.http.get<RecommendationPage>('/api/v1/discovery/page', { params });
  }

  markViewed(userId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/discovery/${userId}/view`, {});
  }

  explain(userId: string): Observable<RecommendationExplanation> {
    return this.http.get<RecommendationExplanation>(`/api/v1/discovery/explain/${userId}`);
  }

  interact(userId: string, type: InteractionType): Observable<unknown> {
    return this.http.post(`/api/v1/interactions/${userId}`, { type });
  }
}
