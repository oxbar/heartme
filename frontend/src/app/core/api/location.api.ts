import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { BrazilianCityView, BrazilianStateView } from './contracts';

@Injectable({ providedIn: 'root' })
export class LocationApi {
  private readonly http = inject(HttpClient);

  states(): Observable<BrazilianStateView[]> {
    return this.http.get<BrazilianStateView[]>('/api/v1/locations/states');
  }

  cities(state: string): Observable<BrazilianCityView[]> {
    return this.http.get<BrazilianCityView[]>(`/api/v1/locations/states/${encodeURIComponent(state)}/cities`);
  }
}
