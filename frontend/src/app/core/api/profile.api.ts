import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PresenceView, ProfileRequest, ProfileView, PublicProfileView } from './contracts';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  me(): Observable<ProfileView> {
    return this.http.get<ProfileView>('/api/v1/profile');
  }

  byUser(userId: string): Observable<PublicProfileView> {
    return this.http.get<PublicProfileView>(`/api/v1/profile/${userId}`);
  }

  presence(userId: string): Observable<PresenceView> {
    return this.http.get<PresenceView>(`/api/v1/profile/${userId}/presence`);
  }

  pingPresence(): Observable<PresenceView> {
    return this.http.post<PresenceView>('/api/v1/profile/presence', {});
  }

  save(profile: ProfileRequest): Observable<ProfileView> {
    return this.http.put<ProfileView>('/api/v1/profile', profile);
  }
}
