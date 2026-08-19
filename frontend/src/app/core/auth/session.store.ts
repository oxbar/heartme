import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../api/auth.api';
import { decodeJwt } from './jwt';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AuthApi);
  private readonly tokenState = signal<string | null>(null);
  private readonly restoringState = signal(true);

  readonly accessToken = this.tokenState.asReadonly();
  readonly restoring = this.restoringState.asReadonly();
  readonly authenticated = computed(() => {
    const token = this.tokenState();
    if (!token) return false;
    const payload = decodeJwt(token);
    return !!payload && payload.exp * 1000 > Date.now() + 5_000;
  });
  readonly userId = computed(() => {
    const token = this.tokenState();
    return token ? decodeJwt(token)?.sub ?? null : null;
  });

  async restore(): Promise<void> {
    try {
      const token = await firstValueFrom(this.api.webRefresh());
      this.tokenState.set(token.accessToken);
    } catch {
      this.tokenState.set(null);
    } finally {
      this.restoringState.set(false);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const token = await firstValueFrom(this.api.webLogin({ email, password }));
    this.tokenState.set(token.accessToken);
  }

  async logout(): Promise<void> {
    try { await firstValueFrom(this.api.webLogout()); } finally { this.tokenState.set(null); }
  }

  async logoutAll(): Promise<void> {
    try { await firstValueFrom(this.api.logoutAll()); } finally {
      try { await firstValueFrom(this.api.webLogout()); } finally { this.tokenState.set(null); }
    }
  }

  setAccessToken(token: string): void {
    this.tokenState.set(token);
  }

  clear(): void {
    this.tokenState.set(null);
  }
}
