import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ConversationView, MatchView, PhotoView, PresenceView, PublicProfileView } from '../core/api/contracts';
import { MatchApi } from '../core/api/match.api';
import { MessagingApi } from '../core/api/messaging.api';
import { ProfileApi } from '../core/api/profile.api';
import { MediaApi } from '../core/api/media.api';
import { SessionStore } from '../core/auth/session.store';
import { ProfileStore } from '../core/state/profile.store';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AvatarComponent, IconComponent],
  template: `
    <aside class="hm-desktop-sidebar" aria-label="Navegação principal">
      <header class="hm-sidebar-brandbar">
        <a routerLink="/app/profile" class="hm-sidebar-user" aria-label="Abrir meu perfil">
          <hm-avatar
            [src]="ownPhoto()"
            [name]="ownName()"
            [size]="38"
          />
          <span class="truncate">{{ ownName() }}</span>
        </a>

        <nav class="hm-sidebar-actions" aria-label="Atalhos">
          <a routerLink="/app/premium" class="hm-sidebar-circle" aria-label="Premium" title="Premium">
            <hm-icon name="sparkles" size="19" />
          </a>
          <a routerLink="/app/discover" class="hm-sidebar-circle" aria-label="Descobrir" title="Descobrir">
            <hm-icon name="compass" size="19" />
          </a>
          <a routerLink="/app/settings" class="hm-sidebar-circle" aria-label="Configurações" title="Configurações">
            <hm-icon name="settings" size="19" />
          </a>
          <a routerLink="/app/safety" class="hm-sidebar-circle" aria-label="Central de segurança" title="Segurança">
            <hm-icon name="shield-check" size="19" />
          </a>
        </nav>
      </header>

      @if (profileMode()) {
        <section class="hm-sidebar-scroll hm-profile-sidebar" aria-label="Configurações do perfil">
          <div class="hm-upgrade-stack">
            <a routerLink="/app/premium" class="hm-upgrade-card">
              <strong>HIMEROS <span>PREMIUM</span></strong>
              <small>Mais controle, mais destaque e recursos extras</small>
            </a>
            <a routerLink="/app/profile/edit" class="hm-upgrade-card">
              <strong>Editar informações</strong>
              <small>Fotos, bio, interesses e preferências</small>
            </a>
          </div>

          <div class="hm-sidebar-section-title">CONTA</div>
          <nav class="hm-settings-list" aria-label="Configurações da conta">
            <a routerLink="/app/profile/edit"><span>Editar perfil</span><hm-icon name="arrow-right" size="18" /></a>
            <a routerLink="/app/premium"><span>Assinatura e benefícios</span><hm-icon name="arrow-right" size="18" /></a>
            <a routerLink="/app/notifications"><span>Notificações</span><hm-icon name="arrow-right" size="18" /></a>
            <a routerLink="/app/safety"><span>Privacidade e segurança</span><hm-icon name="arrow-right" size="18" /></a>
            <a routerLink="/app/settings"><span>Configurações</span><hm-icon name="arrow-right" size="18" /></a>
          </nav>

          <div class="hm-sidebar-section-title">DESCOBERTA</div>
          <nav class="hm-settings-list" aria-label="Descoberta">
            <a routerLink="/app/discover"><span>Perfis recomendados</span><hm-icon name="arrow-right" size="18" /></a>
            <a routerLink="/app/matches"><span>Meus matches</span><hm-icon name="arrow-right" size="18" /></a>
          </nav>

          <button type="button" class="hm-sidebar-logout" (click)="logout.emit()">
            <hm-icon name="log-out" size="17" />
            Sair
          </button>
        </section>
      } @else {
        <div class="hm-sidebar-tabs" role="tablist" aria-label="Relacionamentos">
          <a
            routerLink="/app/matches"
            [class.is-active]="!messagesMode()"
            class="hm-sidebar-tab"
            role="tab"
          >Matches</a>
          <a
            routerLink="/app/messages"
            [class.is-active]="messagesMode()"
            class="hm-sidebar-tab"
            role="tab"
          >Mensagens</a>
        </div>

        <section class="hm-sidebar-scroll" aria-live="polite">
          @if (socialLoading()) {
            <div class="hm-sidebar-loading">
              @for (_ of [0,1,2,3,4,5]; track _) {
                <div class="hm-sidebar-skeleton"></div>
              }
            </div>
          } @else if (messagesMode()) {
            @if (!conversations().length) {
              <div class="hm-sidebar-empty">
                <hm-icon name="message-circle" size="28" />
                <strong>Nenhuma conversa ainda</strong>
                <span>Seus novos matches aparecerão aqui.</span>
              </div>
            } @else {
              <div class="hm-conversation-list">
                @for (conversation of conversations(); track conversation.id) {
                  <a [routerLink]="['/app/messages', conversation.id]" routerLinkActive="is-selected" class="hm-conversation-row">
                    <div class="relative shrink-0">
                      <hm-avatar
                        [src]="photoFor(otherUser(conversation))"
                        [name]="profileFor(otherUser(conversation))?.displayName || 'Match'"
                        [size]="58"
                      />
                      @if (presenceFor(otherUser(conversation))?.online) {
                        <span class="hm-online-dot" aria-label="Online"></span>
                      }
                    </div>
                    <div class="min-w-0 flex-1">
                      <strong class="truncate">{{ profileFor(otherUser(conversation))?.displayName || 'Match' }}</strong>
                      <span class="truncate">{{ presenceFor(otherUser(conversation))?.online ? 'Online agora' : 'Vocês deram match — toque para conversar' }}</span>
                    </div>
                  </a>
                }
              </div>
            }
          } @else {
            <div class="hm-match-grid">
              <a routerLink="/app/premium" class="hm-like-tile" aria-label="Ver curtidas recebidas">
                <span class="hm-like-heart"><hm-icon name="heart" size="28" /></span>
                <strong>Curtidas</strong>
              </a>
              @for (match of matches().slice(0, 17); track match.id) {
                @let otherId = otherUser(match);
                <a [routerLink]="matchRoute(match)" class="hm-match-tile">
                  @if (photoFor(otherId)) {
                    <img [src]="photoFor(otherId)!" [alt]="profileFor(otherId)?.displayName || 'Match'" loading="lazy" />
                  } @else {
                    <div class="hm-match-fallback">{{ initials(profileFor(otherId)?.displayName || 'H') }}</div>
                  }
                  <span class="hm-match-name">{{ profileFor(otherId)?.displayName || 'Match' }}</span>
                  @if (presenceFor(otherId)?.online) { <span class="hm-match-dot" aria-label="Online"></span> }
                </a>
              }
            </div>
          }
        </section>
      }
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSidebarComponent {
  private readonly matchApi = inject(MatchApi);
  private readonly messagingApi = inject(MessagingApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly session = inject(SessionStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly logout = output<void>();

  readonly activeUrl = signal(this.router.url);
  readonly socialLoading = signal(true);
  readonly matches = signal<MatchView[]>([]);
  readonly conversations = signal<ConversationView[]>([]);
  readonly profiles = signal<Record<string, PublicProfileView>>({});
  readonly photos = signal<Record<string, PhotoView[]>>({});
  readonly presences = signal<Record<string, PresenceView>>({});
  readonly ownPhoto = signal<string | null>(null);
  private presenceHeartbeat: ReturnType<typeof setInterval> | null = null;

  readonly profileMode = computed(() => {
    const path = this.activeUrl().split(/[?#]/)[0];
    return [
      '/app/profile',
      '/app/profile/edit',
      '/app/premium',
      '/app/notifications',
      '/app/safety',
      '/app/settings'
    ].includes(path);
  });
  readonly messagesMode = computed(() => this.activeUrl().startsWith('/app/messages'));
  readonly ownName = computed(() => this.profileStore.profile()?.displayName || 'Você');

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        this.activeUrl.set(event.urlAfterRedirects);
        if (event.urlAfterRedirects.startsWith('/app/matches') || event.urlAfterRedirects.startsWith('/app/messages')) {
          void this.load();
        }
      });

    void this.load();
    void firstValueFrom(this.profileApi.pingPresence()).catch(() => null);
    this.presenceHeartbeat = setInterval(
      () => void firstValueFrom(this.profileApi.pingPresence()).catch(() => null),
      45_000
    );
    this.destroyRef.onDestroy(() => {
      if (this.presenceHeartbeat) clearInterval(this.presenceHeartbeat);
    });
  }

  profileFor(userId: string): PublicProfileView | null {
    return this.profiles()[userId] ?? null;
  }

  photoFor(userId: string): string | null {
    const list = this.photos()[userId] ?? [];
    return [...list].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  }

  presenceFor(userId: string): PresenceView | null {
    return this.presences()[userId] ?? null;
  }

  otherUser(item: MatchView | ConversationView): string {
    const currentUserId = this.session.userId();
    return item.userA === currentUserId ? item.userB : item.userA;
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'H';
  }

  matchRoute(match: MatchView): (string | number)[] {
    const conversation = this.conversations().find(item => item.matchId === match.id);
    return conversation ? ['/app/messages', conversation.id] : ['/app/profiles', this.otherUser(match)];
  }

  private async load(): Promise<void> {
    this.socialLoading.set(true);
    try {
      const [, ownPhotos, matches, conversations] = await Promise.all([
        this.profileStore.load().catch(() => null),
        firstValueFrom(this.mediaApi.mine()).catch(() => [] as PhotoView[]),
        firstValueFrom(this.matchApi.list()).catch(() => [] as MatchView[]),
        firstValueFrom(this.messagingApi.conversations()).catch(() => [] as ConversationView[])
      ]);

      this.ownPhoto.set([...ownPhotos].sort((a, b) => a.position - b.position)[0]?.url ?? null);
      this.matches.set(matches);
      this.conversations.set([...conversations].sort((a, b) => {
        const left = new Date(a.lastMessageAt || a.createdAt).getTime();
        const right = new Date(b.lastMessageAt || b.createdAt).getTime();
        return right - left;
      }));

      const userIds = Array.from(new Set([
        ...matches.map(match => this.otherUser(match)),
        ...conversations.map(conversation => this.otherUser(conversation))
      ].filter(Boolean)));

      const profilePairs = await Promise.all(userIds.map(async userId => {
        try {
          return [userId, await firstValueFrom(this.profileApi.byUser(userId))] as const;
        } catch {
          return null;
        }
      }));

      const profileMap: Record<string, PublicProfileView> = {};
      for (const pair of profilePairs) {
        if (pair) profileMap[pair[0]] = pair[1];
      }
      this.profiles.set(profileMap);

      if (userIds.length) {
        const [photos, presencePairs] = await Promise.all([
          firstValueFrom(this.mediaApi.batch(userIds)).catch(() => ({})),
          Promise.all(userIds.map(async userId => {
            try { return [userId, await firstValueFrom(this.profileApi.presence(userId))] as const; }
            catch { return null; }
          }))
        ]);
        this.photos.set(photos);
        const presenceMap: Record<string, PresenceView> = {};
        for (const pair of presencePairs) if (pair) presenceMap[pair[0]] = pair[1];
        this.presences.set(presenceMap);
      }
    } finally {
      this.socialLoading.set(false);
    }
  }
}
