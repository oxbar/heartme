import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { PhotoView, ProfileView } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { IconComponent } from '../../ui/icon/icon.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { PhotoCarouselComponent } from '../../ui/photo-carousel/photo-carousel.component';

@Component({
  selector: 'hm-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, AvatarComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PhotoCarouselComponent],
  template: `
    <section class="hm-profile-screen" aria-labelledby="profile-title">
      @if (loading()) {
        <div class="hm-profile-preview-card">
          <header class="hm-profile-preview-header">
            <div class="h-7 w-52 rounded bg-white/5"></div>
          </header>
          <div class="hm-profile-preview-media bg-white/5 h-80"></div>
          <div class="h-28 bg-white/[0.03]"></div>
        </div>
      } @else if (error()) {
        <div class="hm-page-empty-center max-w-md">
          <div class="hm-page-empty-icon"><hm-icon name="user" size="28" /></div>
          <strong>Não foi possível carregar seu perfil</strong>
          <span>{{ error() }}</span>
          <button type="button" class="hm-dark-button is-primary" (click)="load()">Tentar novamente</button>
        </div>
      } @else if (profile(); as currentProfile) {
        <article class="hm-profile-preview-card">
          <header class="hm-profile-preview-header">
            <strong id="profile-title">{{ currentProfile.displayName }}</strong>
            <span class="inline-grid h-8 w-8 place-items-center rounded-full border border-white/25 text-white/70" title="Perfil completo">
              <hm-icon name="check-check" size="18" />
            </span>
          </header>

          <div class="hm-profile-preview-media">
            <hm-photo-carousel
              [photos]="photos()"
              [fallbackName]="currentProfile.displayName"
              ariaLabel="Suas fotos do perfil"
            />
          </div>

          <footer class="hm-profile-preview-footer">
            <div class="hm-looking-label">
              <hm-icon name="compass" size="16" />
              <span>Seu perfil na descoberta</span>
            </div>
            <div class="hm-profile-name">{{ currentProfile.displayName }}, {{ age() }}</div>
            <div class="hm-profile-location">
              <hm-icon name="map-pin" size="15" />
              <span>{{ currentProfile.city }}{{ currentProfile.state ? ', ' + currentProfile.state : '' }}</span>
            </div>
            @if (currentProfile.interests.length) {
              <div class="mt-3 flex flex-wrap gap-2">
                @for (interest of currentProfile.interests.slice(0, 5); track interest) {
                  <span class="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/75">{{ interest }}</span>
                }
              </div>
            }
            <a routerLink="/app/profile/edit" class="hm-profile-cta">
              <hm-icon name="pencil" size="16" />
              Editar informações
            </a>
          </footer>
        </article>
      } @else {
        <hm-empty-state title="Sem dados do perfil" />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage implements OnInit {
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = signal<ProfileView | null>(null);
  readonly photos = signal<PhotoView[]>([]);

  readonly age = computed(() => {
    const birthDate = this.profile()?.birthDate;
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [profile, photos] = await Promise.all([
        firstValueFrom(this.profileApi.me()),
        firstValueFrom(this.mediaApi.mine()).catch(() => [] as PhotoView[])
      ]);
      this.profile.set(profile);
      this.photos.set(photos);
    } catch {
      this.error.set('Verifique sua conexão e tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
