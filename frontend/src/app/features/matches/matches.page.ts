import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, MatchView, PhotoView, PublicProfileView } from '../../core/api/contracts';
import { MatchApi } from '../../core/api/match.api';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { MessagingApi } from '../../core/api/messaging.api';
import { SessionStore } from '../../core/auth/session.store';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [RouterLink, IconComponent],
  standalone: true,
  template: `
    <section class="hm-matches-screen" aria-labelledby="matches-title">
      <div class="hm-matches-content">
        <header class="hm-matches-heading">
          <div>
            <h1 id="matches-title">Seus matches</h1>
            <p>Pessoas que também curtiram você.</p>
          </div>
          <button type="button" class="hm-dark-button" (click)="load()" [disabled]="loading()">
            <hm-icon name="refresh-ccw" size="16" [class]="loading() ? 'animate-spin' : ''" />
            Atualizar
          </button>
        </header>

        @if (loading()) {
          <div class="hm-matches-grid" aria-label="Carregando matches">
            @for (_ of [0,1,2,3,4,5,6,7]; track _) {
              <div class="aspect-[0.78] animate-pulse rounded-[10px] bg-white/5"></div>
            }
          </div>
        } @else if (error()) {
          <div class="hm-page-empty-center min-h-[420px]">
            <div class="hm-page-empty-icon"><hm-icon name="heart" size="28" /></div>
            <strong>Não foi possível carregar seus matches</strong>
            <span>{{ error() }}</span>
            <button type="button" class="hm-dark-button is-primary" (click)="load()">Tentar novamente</button>
          </div>
        } @else if (!matches().length) {
          <div class="hm-page-empty-center min-h-[420px]">
            <div class="hm-page-empty-icon"><hm-icon name="heart" size="28" /></div>
            <strong>Nenhum match ainda</strong>
            <span>Continue descobrindo pessoas. Quando a curtida for recíproca, ela aparece aqui.</span>
            <a routerLink="/app/discover" class="hm-dark-button is-primary">Descobrir pessoas</a>
          </div>
        } @else {
          <div class="hm-matches-grid">
            @for (match of matches(); track match.id) {
              @let userId = otherUser(match);
              <a [routerLink]="conversationRoute(match)" class="hm-match-card-large">
                @if (firstPhoto(userId); as photo) {
                  <img [src]="photo" [alt]="profileFor(userId)?.displayName || 'Match'" loading="lazy" />
                } @else {
                  <div class="hm-dating-card-fallback">{{ initials(profileFor(userId)?.displayName || 'H') }}</div>
                }
                <strong>{{ profileFor(userId)?.displayName || 'Match' }}</strong>
                <span>{{ conversationByMatch()[match.id] ? 'Vocês deram match · conversar' : 'Vocês deram match · ver perfil' }}</span>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchesPage implements OnInit {
  private readonly matchApi = inject(MatchApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly messagingApi = inject(MessagingApi);
  private readonly session = inject(SessionStore);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly matches = signal<MatchView[]>([]);
  readonly profiles = signal<Record<string, PublicProfileView>>({});
  readonly photos = signal<Record<string, PhotoView[]>>({});
  readonly conversationByMatch = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  otherUser(match: MatchView): string {
    return match.userA === this.session.userId() ? match.userB : match.userA;
  }

  profileFor(userId: string): PublicProfileView | null {
    return this.profiles()[userId] ?? null;
  }

  firstPhoto(userId: string): string | null {
    return [...(this.photos()[userId] ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'H';
  }

  conversationRoute(match: MatchView): (string | number)[] {
    const conversationId = this.conversationByMatch()[match.id];
    return conversationId ? ['/app/messages', conversationId] : ['/app/profiles', this.otherUser(match)];
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [list, conversations]: [MatchView[], ConversationView[]] = await Promise.all([
        firstValueFrom(this.matchApi.list()),
        firstValueFrom(this.messagingApi.conversations()).catch(() => [] as ConversationView[])
      ]);
      this.matches.set(list);
      const conversationMap: Record<string, string> = {};
      for (const conversation of conversations) conversationMap[conversation.matchId] = conversation.id;
      this.conversationByMatch.set(conversationMap);
      const ids = Array.from(new Set(list.map(match => this.otherUser(match)).filter(Boolean)));

      const profilePairs: Array<readonly [string, PublicProfileView] | null> = await Promise.all(ids.map(async id => {
        try {
          return [id, await firstValueFrom(this.profileApi.byUser(id))] as const;
        } catch {
          return null;
        }
      }));
      const profileMap: Record<string, PublicProfileView> = {};
      for (const pair of profilePairs) {
        if (pair) profileMap[pair[0]] = pair[1];
      }
      this.profiles.set(profileMap);
      this.photos.set(ids.length ? await firstValueFrom(this.mediaApi.batch(ids)).catch(() => ({})) : {});
    } catch {
      this.error.set('Tente novamente em alguns instantes.');
    } finally {
      this.loading.set(false);
    }
  }
}
