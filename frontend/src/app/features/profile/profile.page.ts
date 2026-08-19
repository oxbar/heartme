import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { PhotoView, ProfileView } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { AvatarComponent } from '../../shared/avatar.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, RouterLink, AvatarComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Seu perfil" subtitle="Gerencie suas informações e fotos." icon="user">
        <div pageHeaderActions class="flex items-center gap-2">
          <button
            type="button"
            (click)="load()"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
          >
            <hm-icon name="rotate-ccw" size="16" [class]="loading() ? 'animate-spin' : ''" />
            Atualizar
          </button>
          <a
            routerLink="/app/profile/edit"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            <hm-icon name="pencil" size="16" />
            Editar
          </a>
        </div>
      </hm-page-header>

      @if (loading()) {
        <hm-loading-state />
      } @else if (error()) {
        <div class="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p class="text-destructive mb-4">{{ error() }}</p>
          <button
            type="button"
            (click)="load()"
            class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            Tentar novamente
          </button>
        </div>
      } @else if (!profile()) {
        <hm-empty-state title="Sem dados do perfil" icon="user" />
      } @else {
        <div class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 space-y-6">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center">
              <hm-avatar [name]="profile()!.displayName" [size]="120" class="mb-4" />
              <h2 class="text-xl font-bold text-card-foreground">
                {{ profile()!.displayName }}, {{ age() }}
              </h2>
              <p class="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <hm-icon name="map-pin" size="16" />
                {{ profile()!.city }}{{ profile()!.state ? ', ' + profile()!.state : '' }}
              </p>
              @if (profile()!.bio) {
                <p class="text-sm text-muted-foreground mt-4">{{ profile()!.bio }}</p>
              }
              @if (profile()!.interests.length) {
                <div class="flex flex-wrap justify-center gap-2 mt-4">
                  @for (i of profile()!.interests; track i) {
                    <span class="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      <hm-icon name="sparkles" size="12" class="mr-1" />
                      {{ i }}
                    </span>
                  }
                </div>
              }
            </div>
          </div>
          <div class="lg:col-span-2 space-y-6">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-card-foreground">Fotos</h3>
                <label class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition">
                  <hm-icon name="upload" size="16" />
                  Enviar foto
                  <input type="file" accept="image/*" class="hidden" (change)="onPhotoUpload($event)" [disabled]="uploading()" />
                </label>
              </div>
              @if (uploading()) {
                <div class="rounded-lg bg-muted h-10 flex items-center justify-center text-sm text-muted-foreground">
                  <span class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2"></span>
                  Enviando...
                </div>
              } @else if (!photos().length) {
                <div class="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma foto enviada ainda.
                </div>
              } @else {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  @for (p of sortedPhotos(); track p.id) {
                    <div class="relative group aspect-square rounded-xl border border-border overflow-hidden bg-muted">
                      <img [src]="p.url" alt="Foto {{ p.position + 1 }}" class="w-full h-full object-cover" />
                      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-start justify-between p-2 opacity-0 group-hover:opacity-100">
                        <span class="bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-md">Posição {{ p.position + 1 }}</span>
                        <button
                          type="button"
                          class="bg-destructive/90 text-white rounded-md p-1.5 hover:bg-destructive transition"
                          (click)="deletePhoto(p.id)"
                          aria-label="Remover foto"
                        >
                          <hm-icon name="x" size="16" />
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage implements OnInit {
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly uploading = signal(false);
  readonly profile = signal<ProfileView | null>(null);
  readonly photos = signal<PhotoView[]>([]);

  readonly age = computed(() => {
    const p = this.profile();
    if (!p) return 0;
    const birth = new Date(p.birthDate);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  });

  readonly sortedPhotos = computed(() => [...this.photos()].sort((a, b) => a.position - b.position));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [p, ph] = await Promise.all([
        firstValueFrom(this.profileApi.me()),
        firstValueFrom(this.mediaApi.mine()).catch(() => [])
      ]);
      this.profile.set(p);
      this.photos.set(ph);
    } catch {
      this.error.set('Não foi possível carregar seu perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  async onPhotoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      const photo = await firstValueFrom(this.mediaApi.upload(file));
      this.photos.update(list => [...list, photo]);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async deletePhoto(id: string): Promise<void> {
    try {
      await firstValueFrom(this.mediaApi.delete(id));
      this.photos.update(list => list.filter(p => p.id !== id));
    } catch {}
  }
}
