import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActiveSubscriptionResponse, SubscriptionPlan } from './contracts';

@Injectable({ providedIn: 'root' })
export class PremiumApi {
  private readonly http = inject(HttpClient);

  subscription(): Observable<ActiveSubscriptionResponse> {
    return this.http.get<ActiveSubscriptionResponse>('/api/v1/premium/subscription');
  }

  purchase(plan: SubscriptionPlan): Observable<unknown> {
    return this.http.post('/api/v1/billing/purchase', { plan });
  }
}
