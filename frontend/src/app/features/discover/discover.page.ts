import { ChangeDetectionStrategy, Component, HostListener, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { InteractionType, PhotoView, Recommendation } from '../../core/api/contracts';
import { DiscoveryApi } from '../../core/api/discovery.api';
import { MediaApi } from '../../core/api/media.api';
import { MatchApi } from '../../core/api/match.api';
import { ProfileCardComponent } from '../../shared/profile-card.component';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [ProfileCardComponent, IconComponent],
  standalone: true,
  template: `
    <section class="hm-dating-stage" aria-label="Descobrir pessoas">
      @if (loading()) {
        <div class="relative z-10 w-[min(430px,calc(100vw-44px))]">
          <div class="hm-dating-card animate-pulse">
            <div class="absolute inset-0 bg-white/5"></div>
            <div class="absolute inset-x-5 bottom-7 space-y-3">
              <div class="h-8 w-2/3 rounded-full bg-white/10"></div>
              <div class="h-4 w-1/2 rounded-full bg-white/10"></div>
            </div>
          </div>
        </div>
      } @else if (error()) {
        <div class="hm-page-empty-center max-w-md">
          <div class="hm-page-empty-icon"><hm-icon name="alert-circle" size="28" /></div>
          <strong>Não foi possível carregar os perfis</strong>
          <span>{{ error() }}</span>
          <button type="button" class="hm-dark-button is-primary mt-2" (click)="load()">
            <hm-icon name="refresh-ccw" size="17" />
            Tentar novamente
          </button>
        </div>
      } @else if (!activeRecommendation()) {
        <div class="hm-page-empty-center max-w-md">
          <div class="hm-page-empty-icon"><hm-icon name="sparkles" size="30" /></div>
          <strong>Você viu todos os perfis por agora</strong>
          <span>Novas recomendações aparecerão quando houver pessoas compatíveis.</span>
          <button type="button" class="hm-dark-button is-primary mt-2" (click)="load()">
            <hm-icon name="refresh-ccw" size="17" />
            Atualizar recomendações
          </button>
        </div>
      } @else {
        @if (nextRecommendation(); as next) {
          <div class="hm-card-next" aria-hidden="true">
            @if (firstPhoto(next.profile.userId); as photo) {
              <img [src]="photo" alt="" loading="eager" />
            } @else {
              <div class="hm-dating-card-fallback">{{ initials(next.profile.displayName) }}</div>
            }
            <div class="hm-dating-card-shade"></div>
            <div class="hm-card-info">
              <div class="hm-card-name-row">
                <strong>{{ next.profile.displayName }}</strong>
                <span>{{ next.profile.age }}</span>
              </div>
              <div class="hm-card-meta">
                <hm-icon name="map-pin" size="15" />
                <span>{{ distanceLabel(next) }}</span>
              </div>
            </div>
          </div>
        }

        @if (activeRecommendation(); as current) {
          <hm-profile-card
            [profile]="current.profile"
            [photos]="photosFor(current.profile.userId)"
            [distanceKm]="current.distanceKm"
            [rewindEnabled]="false"
            [busy]="actionPending()"
            (like)="onInteract(current.profile.userId, 'LIKE')"
            (pass)="onInteract(current.profile.userId, 'PASS')"
            (superLike)="onInteract(current.profile.userId, 'SUPER_LIKE')"
          />
        }

        <div class="hm-discover-shortcuts" aria-hidden="true">
          <span>← Passar</span>
          <span>→ Curtir</span>
          <span>↑ Abrir perfil</span>
          <span>↵ Super like</span>
          <span>Espaço Próxima foto</span>
        </div>
      }
    </section>

    @if (matchCelebration(); as match) {
      <div class="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="match-title">
        <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111214] p-7 text-center shadow-2xl">
          <div class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary">
            <hm-icon name="heart" size="32" />
          </div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">É recíproco</p>
          <h2 id="match-title" class="text-3xl font-extrabold text-white">Deu match!</h2>
          <p class="mt-2 text-sm leading-relaxed text-white/65">Você e {{ match.displayName }} curtiram um ao outro.</p>
          <div class="mt-6 grid gap-3">
            <button type="button" class="hm-dark-button is-primary justify-center" (click)="openMatches()">
              <hm-icon name="message-circle" size="17" />
              Conversar agora
            </button>
            <button type="button" class="hm-dark-button justify-center" (click)="dismissMatch()">
              Continuar descobrindo
            </button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscoverPage implements OnInit {
  private readonly api = inject(DiscoveryApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly matchApi = inject(MatchApi);
  private readonly router = inject(Router);

  @ViewChild(ProfileCardComponent) profileCard?: ProfileCardComponent;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly recommendations = signal<Recommendation[]>([]);
  readonly photosByUser = signal<Record<string, PhotoView[]>>({});
  readonly actionPending = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly matchCelebration = signal<{ userId: string; displayName: string } | null>(null);

  readonly activeRecommendation = computed(() => this.recommendations()[0] ?? null);
  readonly nextRecommendation = computed(() => this.recommendations()[1] ?? null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }


  @HostListener('window:keydown', ['$event'])
  onKeyboard(event: KeyboardEvent): void {
    if (event.repeat || this.loading() || this.actionPending()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    const current = this.activeRecommendation();
    if (!current) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        void this.onInteract(current.profile.userId, 'PASS');
        break;
      case 'ArrowRight':
        event.preventDefault();
        void this.onInteract(current.profile.userId, 'LIKE');
        break;
      case 'ArrowUp':
        event.preventDefault();
        void this.router.navigate(['/app/profiles', current.profile.userId]);
        break;
      case 'Enter':
        event.preventDefault();
        void this.onInteract(current.profile.userId, 'SUPER_LIKE');
        break;
      case ' ':
        event.preventDefault();
        this.profileCard?.nextPhoto();
        break;
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const page = await firstValueFrom(this.api.discoverPage(24));
      this.recommendations.set(page.items);
      this.nextCursor.set(page.nextCursor);
      const ids = page.items.map(item => item.profile.userId);
      if (ids.length) {
        this.photosByUser.set(await firstValueFrom(this.mediaApi.batch(ids)).catch(() => ({})));
      } else {
        this.photosByUser.set({});
      }
    } catch {
      this.error.set('Verifique sua conexão e tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  photosFor(userId: string): PhotoView[] {
    return this.photosByUser()[userId] ?? [];
  }

  firstPhoto(userId: string): string | null {
    return [...this.photosFor(userId)].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'H';
  }

  distanceLabel(recommendation: Recommendation): string {
    if (recommendation.distanceKm !== null && Number.isFinite(recommendation.distanceKm)) {
      return `${Math.max(1, Math.round(recommendation.distanceKm))} km de distância`;
    }
    return recommendation.profile.city;
  }


  private async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor) return;
    const page = await firstValueFrom(this.api.discoverPage(24, cursor)).catch(() => null);
    if (!page) return;
    this.nextCursor.set(page.nextCursor);
    const existing = new Set(this.recommendations().map(item => item.profile.userId));
    const fresh = page.items.filter(item => !existing.has(item.profile.userId));
    if (!fresh.length) return;
    this.recommendations.update(list => [...list, ...fresh]);
    const photoIds = fresh.map(item => item.profile.userId);
    const photos = await firstValueFrom(this.mediaApi.batch(photoIds)).catch(() => ({}));
    this.photosByUser.update(current => ({ ...current, ...photos }));
  }

  async onInteract(userId: string, type: InteractionType): Promise<void> {
    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.error.set('');
    const candidate = this.recommendations().find(item => item.profile.userId === userId)?.profile ?? null;

    try {
      const result = await firstValueFrom(this.api.interact(userId, type));
      let matched = false;
      if (type === 'LIKE' || type === 'SUPER_LIKE') {
        matched = result.mutualLike || await this.waitForActiveMatch(userId);
      }

      this.recommendations.update(list => list.filter(item => item.profile.userId !== userId));

      if (matched) {
        this.matchCelebration.set({
          userId,
          displayName: candidate?.displayName || 'essa pessoa'
        });
      }

      if (this.recommendations().length <= 5 && this.nextCursor()) {
        await this.loadMore();
      }
    } catch {
      this.error.set('Não foi possível registrar essa ação. Tente novamente.');
    } finally {
      this.actionPending.set(false);
    }
  }

  dismissMatch(): void {
    this.matchCelebration.set(null);
  }

  async openMatches(): Promise<void> {
    this.matchCelebration.set(null);
    await this.router.navigate(['/app/matches']);
  }

  private async waitForActiveMatch(targetUserId: string): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const matches = await firstValueFrom(this.matchApi.list()).catch(() => []);
      if (matches.some(match =>
        match.status === 'ACTIVE' && (match.userA === targetUserId || match.userB === targetUserId)
      )) {
        return true;
      }
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 80 * (attempt + 1)));
      }
    }
    return false;
  }
}
