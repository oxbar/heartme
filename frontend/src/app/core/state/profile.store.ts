import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProfileView } from '../api/contracts';
import { ProfileApi } from '../api/profile.api';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ProfileApi);
  readonly profile = signal<ProfileView | null>(null);
  readonly loaded = computed(() => !!this.profile());

  async load(): Promise<ProfileView | null> {
    if (this.loaded()) return this.profile();
    const profile = await firstValueFrom(this.api.me());
    this.profile.set(profile);
    return profile;
  }

  async reload(): Promise<ProfileView> {
    const profile = await firstValueFrom(this.api.me());
    this.profile.set(profile);
    return profile;
  }

  updateLocal(changes: Partial<ProfileView>): void {
    const current = this.profile();
    if (current) {
      this.profile.set({ ...current, ...changes });
    }
  }

  clear(): void { this.profile.set(null); }
}
