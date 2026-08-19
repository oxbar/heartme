import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserView, WebToken } from './contracts';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  register(body: { email: string; password: string }): Observable<UserView> {
    return this.http.post<UserView>('/api/v1/auth/register', body);
  }

  webLogin(body: { email: string; password: string }): Observable<WebToken> {
    return this.http.post<WebToken>('/api/v1/auth/web/login', body, { withCredentials: true });
  }

  webRefresh(): Observable<WebToken> {
    return this.http.post<WebToken>('/api/v1/auth/web/refresh', {}, { withCredentials: true });
  }

  webLogout(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/web/logout', {}, { withCredentials: true });
  }

  logoutAll(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/logout-all', {});
  }
}
