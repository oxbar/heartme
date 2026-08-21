import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, firstValueFrom, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ConversationView, MatchView, MessageView, PhotoView, PresenceView, PublicProfileView } from '../core/api/contracts';
import { MessagingApi } from '../core/api/messaging.api';
import { ProfileApi } from '../core/api/profile.api';
import { MediaApi } from '../core/api/media.api';
import { ChatRealtime } from '../core/realtime/chat-realtime';
import { SessionStore } from '../core/auth/session.store';
import { ProfileStore } from '../core/state/profile.store';
import { SocialStateStore } from '../core/state/social-state.store';
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
          @if (socialLoading() && !matches().length && !conversations().length) {
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
                <span>Quando vocês começarem a conversar, as mensagens mais recentes aparecerão aqui em tempo real.</span>
              </div>
            } @else {
              <div class="hm-conversation-list hm-conversation-list-enhanced">
                @for (conversation of conversations(); track conversation.id) {
                  @let otherId = otherUser(conversation);
                  @let last = lastSnippet(conversation.id);
                  @let unread = unreadCount(conversation);
                  <a
                    [routerLink]="['/app/messages', conversation.id]"
                    routerLinkActive="is-selected"
                    class="hm-conversation-row hm-conversation-row-enhanced"
                    [class.has-unread]="unread > 0"
                  >
                    <div class="relative shrink-0">
                      <hm-avatar
                        [src]="photoFor(otherId)"
                        [name]="profileFor(otherId)?.displayName || 'Match'"
                        [size]="58"
                      />
                      @if (presenceFor(otherId)?.online) {
                        <span class="hm-online-dot" aria-label="Online"></span>
                      }
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-baseline justify-between gap-3">
                        <strong
                          class="truncate"
                          [class.text-white]="unread > 0"
                          [class.font-black]="unread > 0"
                        >
                          {{ profileFor(otherId)?.displayName || 'Match' }}
                        </strong>
                        <span
                          class="shrink-0 text-[11px]"
                          [class.text-hm-primary]="unread > 0"
                          [class.font-semibold]="unread > 0"
                          [class.text-white/38]="unread === 0"
                        >
                          {{ formatTime(last?.sentAt || conversation.lastMessageAt) }}
                        </span>
                      </div>
                      <div class="mt-1.5 flex items-center gap-2">
                        <span
                          class="min-w-0 flex-1 truncate text-[12.5px] leading-snug"
                          [class.text-white/72]="unread === 0"
                          [class.text-white/90]="unread > 0"
                        >
                          @if (last) {
                            {{ last.isMine ? 'Você: ' : '' }}{{ last.content }}
                          } @else {
                            <span
                              class="italic"
                              [class.text-white/45]="unread === 0"
                              [class.text-white/65]="unread > 0"
                            >{{ presenceFor(otherId)?.online ? 'Online agora · toque para conversar' : 'Toque para iniciar a conversa' }}</span>
                          }
                        </span>
                        @if (unread > 0) {
                          <span
                            class="hm-unread-badge hm-unread-dot shrink-0 rounded-full"
                            aria-label="Nova mensagem"
                          ></span>
                        }
                      </div>
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
  private readonly social = inject(SocialStateStore);
  private readonly messagingApi = inject(MessagingApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly realtime = inject(ChatRealtime);
  private readonly session = inject(SessionStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly logout = output<void>();

  readonly activeUrl = signal(this.router.url);
  readonly socialLoading = this.social.loading;
  readonly matches = this.social.matches;
  readonly conversations = this.social.conversations;
  readonly profiles = signal<Record<string, PublicProfileView>>({});
  readonly photos = signal<Record<string, PhotoView[]>>({});
  readonly presences = signal<Record<string, PresenceView>>({});
  readonly lastMessages = this.social.lastMessages;
  readonly readAtMap = this.social.readAtMap;
  readonly ownPhoto = signal<string | null>(null);
  private presenceHeartbeat: ReturnType<typeof setInterval> | null = null;
  private enrichmentLoadInFlight: Promise<void> | null = null;
  private readonly realtimeConversationSubs = new Map<string, Subscription>();

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
          void this.load(false);
        }
      });

    effect(() => {
      const conversationIds = this.conversations().map(conversation => conversation.id);
      this.syncRealtimeSubscriptions(conversationIds);
    });

    void this.load(true);
    void firstValueFrom(this.profileApi.pingPresence()).catch(() => null);
    this.presenceHeartbeat = setInterval(
      () => void firstValueFrom(this.profileApi.pingPresence()).catch(() => null),
      45_000
    );
    this.destroyRef.onDestroy(() => {
      if (this.presenceHeartbeat) clearInterval(this.presenceHeartbeat);
      for (const subscription of this.realtimeConversationSubs.values()) subscription.unsubscribe();
      this.realtimeConversationSubs.clear();
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

  lastSnippet(conversationId: string): { content: string; isMine: boolean; sentAt: string } | null {
    const msg = this.lastMessages()[conversationId];
    if (!msg) return null;
    const content = msg.content.length > 56 ? msg.content.slice(0, 56) + '…' : msg.content;
    return { content, isMine: msg.senderId === this.session.userId(), sentAt: msg.sentAt };
  }

  unreadCount(conversation: ConversationView): number {
    const lastMsg = this.lastMessages()[conversation.id];
    if (!lastMsg || lastMsg.senderId === this.session.userId()) return 0;
    const readAt = this.readAtMap()[conversation.id];
    if (!readAt) return 1;
    return new Date(lastMsg.sentAt).getTime() > new Date(readAt).getTime() ? 1 : 0;
  }

  formatTime(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  private load(refreshSocial: boolean): Promise<void> {
    if (this.enrichmentLoadInFlight) return this.enrichmentLoadInFlight;
    this.enrichmentLoadInFlight = this.performLoad(refreshSocial).finally(() => {
      this.enrichmentLoadInFlight = null;
    });
    return this.enrichmentLoadInFlight;
  }

  private async performLoad(refreshSocial: boolean): Promise<void> {
    const [, ownPhotosResult] = await Promise.all([
      this.profileStore.load().catch(() => null),
      Promise.resolve(firstValueFrom(this.mediaApi.mine())).then(
        value => ({ ok: true as const, value }),
        () => ({ ok: false as const })
      ),
      refreshSocial
        ? this.social.refresh({ preserveKnown: true, retryEmpty: true })
        : this.social.ensureLoaded()
    ]);

    if (ownPhotosResult.ok) {
      this.ownPhoto.set([...ownPhotosResult.value].sort((a, b) => a.position - b.position)[0]?.url ?? null);
    }

    const matches = this.matches();
    const conversations = this.conversations();
    const userIds = Array.from(new Set([
      ...matches.map(match => this.otherUser(match)),
      ...conversations.map(conversation => this.otherUser(conversation))
    ].filter(Boolean)));

    const [profilePairs, lastMessagesResult] = await Promise.all([
      Promise.all(userIds.map(async userId => {
        try { return [userId, await firstValueFrom(this.profileApi.byUser(userId))] as const; }
        catch { return null; }
      })),
      this.loadSidebarLastMessages(conversations)
    ]);

    const profileMap: Record<string, PublicProfileView> = { ...this.profiles() };
    for (const pair of profilePairs) {
      if (pair) profileMap[pair[0]] = pair[1];
    }
    this.profiles.set(profileMap);
    this.social.rememberLatestMessages(lastMessagesResult);

    if (userIds.length) {
      const [photos, presencePairs] = await Promise.all([
        firstValueFrom(this.mediaApi.batch(userIds)).catch(() => ({})),
        Promise.all(userIds.map(async userId => {
          try { return [userId, await firstValueFrom(this.profileApi.presence(userId))] as const; }
          catch { return null; }
        }))
      ]);
      this.photos.update(current => ({ ...current, ...photos }));
      const presenceMap: Record<string, PresenceView> = { ...this.presences() };
      for (const pair of presencePairs) if (pair) presenceMap[pair[0]] = pair[1];
      this.presences.set(presenceMap);
    }
  }

  private async loadSidebarLastMessages(list: ConversationView[]): Promise<Record<string, MessageView>> {
    if (!list.length) return {};
    const cached = this.lastMessages();
    const stale = list.filter(conversation => {
      if (!conversation.lastMessageAt) return false;
      const known = cached[conversation.id];
      if (!known) return true;
      return new Date(known.sentAt).getTime() < new Date(conversation.lastMessageAt).getTime();
    });
    if (!stale.length) return {};

    try {
      const pairs = await Promise.all(stale.map(async conversation => {
        try {
          const messages = await firstValueFrom(this.messagingApi.messages(conversation.id, undefined, 1));
          const latest = messages[0] ?? null;
          return latest ? [conversation.id, latest] as const : null;
        } catch {
          return null;
        }
      }));
      const byId: Record<string, MessageView> = {};
      for (const pair of pairs) if (pair) byId[pair[0]] = pair[1];
      return byId;
    } catch {
      return {};
    }
  }

  private syncRealtimeSubscriptions(conversationIds: string[]): void {
    const wanted = new Set(conversationIds);

    for (const [conversationId, subscription] of this.realtimeConversationSubs) {
      if (!wanted.has(conversationId)) {
        subscription.unsubscribe();
        this.realtimeConversationSubs.delete(conversationId);
      }
    }

    for (const conversationId of wanted) {
      if (this.realtimeConversationSubs.has(conversationId)) continue;
      const subscription = this.realtime.messages(conversationId).subscribe(message => {
        this.social.rememberMessage(message);
        if (message.senderId !== this.session.userId() && this.isConversationOpen(conversationId)) {
          this.social.markConversationReadLocal(conversationId, message.sentAt);
        }
      });
      this.realtimeConversationSubs.set(conversationId, subscription);
    }
  }

  private isConversationOpen(conversationId: string): boolean {
    if (typeof document !== 'undefined' && document.hidden) return false;
    const path = this.activeUrl().split(/[?#]/)[0];
    return path === `/app/messages/${conversationId}`;
  }

}
