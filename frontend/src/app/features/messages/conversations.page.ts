import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, PhotoView, PresenceView, PublicProfileView } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { SessionStore } from '../../core/auth/session.store';
import { SocialStateStore } from '../../core/state/social-state.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [RouterLink, AvatarComponent, IconComponent],
  standalone: true,
  template: `
    <section class="h-full bg-[hsl(var(--dating-canvas))]">
      <div class="hidden h-full lg:flex">
        <div class="hm-page-empty-center">
          <div class="hm-page-empty-icon"><hm-icon name="message-circle" size="30" /></div>
          <strong>Escolha uma conversa</strong>
          <span>Suas mensagens ficam na coluna à esquerda. Selecione um match para continuar.</span>
        </div>
      </div>

      <div class="h-full overflow-y-auto p-4 pb-28 lg:hidden hm-conversations-scroll">
        <header class="mb-5 flex items-center justify-between px-1 pt-1">
          <div>
            <h1 class="text-[28px] font-black tracking-tight text-white">Mensagens</h1>
            <p class="mt-1.5 text-xs text-white/50">Converse com seus matches.</p>
          </div>
          <button type="button" class="hm-mobile-icon-button" aria-label="Atualizar conversas" (click)="load()">
            <hm-icon name="refresh-ccw" size="18" [class]="enriching() ? 'animate-spin' : ''" />
          </button>
        </header>

        @if (showSkeleton()) {
          <div class="space-y-3">
            @for (_ of [0,1,2,3,4,5]; track _) {
              <div class="h-[92px] animate-pulse rounded-2xl bg-white/[0.06]"></div>
            }
          </div>
        } @else if (error()) {
          <div class="hm-page-empty-center min-h-[50vh]">
            <div class="hm-page-empty-icon"><hm-icon name="alert-circle" size="27" /></div>
            <strong>Não foi possível carregar as conversas</strong>
            <span>{{ error() }}</span>
            <button type="button" class="hm-dark-button is-primary" (click)="load()">Tentar novamente</button>
          </div>
        } @else if (!conversations().length) {
          <div class="hm-page-empty-center min-h-[50vh]">
            <div class="hm-page-empty-icon"><hm-icon name="heart" size="27" /></div>
            <strong>Sem conversas ainda</strong>
            <span>Quando surgir um match, você poderá conversar por aqui.</span>
            <a routerLink="/app/discover" class="hm-dark-button is-primary">Descobrir pessoas</a>
          </div>
        } @else {
          <div class="space-y-2">
            @for (conversation of conversations(); track conversation.id) {
              @let userId = otherUser(conversation);
              @let last = lastSnippet(conversation.id);
              @let ts = last?.sentAt || conversation.lastMessageAt;
              @let unread = unreadCount(conversation);
              <a
                [routerLink]="['/app/messages', conversation.id]"
                class="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-transparent px-4 py-3 text-white no-underline transition hover:border-white/[0.06] hover:bg-white/[0.05]"
                [class.border-hm-primary/30]="unread > 0"
                [class.bg-white/[0.035]]="unread > 0"
              >
                <div class="relative shrink-0">
                  <hm-avatar [src]="firstPhoto(userId)" [name]="profileFor(userId)?.displayName || 'Match'" [size]="60" />
                  @if (presenceFor(userId)?.online) { <span class="hm-online-dot"></span> }
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-3">
                    <strong
                      class="block truncate text-[16px]"
                      [class.text-white]="unread > 0"
                      [class.font-black]="unread > 0"
                      [class.text-white/90]="unread === 0"
                      [class.font-extrabold]="unread === 0"
                    >
                      {{ profileFor(userId)?.displayName || 'Match' }}
                    </strong>
                    <span
                      class="shrink-0 text-[11px]"
                      [class.text-hm-primary]="unread > 0"
                      [class.font-semibold]="unread > 0"
                      [class.text-white/38]="unread === 0"
                    >
                      {{ formatTime(ts) }}
                    </span>
                  </div>
                  <div class="mt-1.5 flex items-center gap-2">
                    <span
                      class="min-w-0 flex-1 truncate text-[13px] leading-snug"
                      [class.text-white/78]="unread === 0"
                      [class.text-white/92]="unread > 0"
                    >
                      @if (last) {
                        {{ last.isMine ? 'Você: ' : '' }}{{ last.content }}
                      } @else {
                        <span class="italic" [class.text-white/45]="unread === 0" [class.text-white/65]="unread > 0">{{ presenceFor(userId)?.online ? 'Online agora · toque para conversar' : 'Toque para iniciar a conversa' }}</span>
                      }
                    </span>
                    @if (unread > 0) {
                      <span class="hm-unread-badge hm-unread-dot shrink-0 rounded-full" aria-label="Nova mensagem"></span>
                    }
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationsPage implements OnInit {
  private readonly social = inject(SocialStateStore);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly session = inject(SessionStore);

  readonly enriching = signal(false);
  readonly error = signal('');
  readonly conversations = this.social.conversations;
  readonly socialLoading = this.social.loading;
  readonly profiles = signal<Record<string, PublicProfileView>>({});
  readonly photos = signal<Record<string, PhotoView[]>>({});
  readonly presences = signal<Record<string, PresenceView>>({});
  readonly lastMessages = this.social.lastMessages;
  readonly readAtMap = this.social.readAtMap;

  readonly showSkeleton = computed(() =>
    this.conversations().length === 0 && (!this.social.loaded() || this.socialLoading())
  );

  async ngOnInit(): Promise<void> {
    const convosInit = this.conversations();
    if (convosInit.length > 0) {
      void this.enrich(convosInit);
    }
    await this.load();
  }

  otherUser(conversation: ConversationView): string {
    return conversation.userA === this.session.userId() ? conversation.userB : conversation.userA;
  }

  profileFor(userId: string): PublicProfileView | null {
    return this.profiles()[userId] ?? null;
  }

  firstPhoto(userId: string): string | null {
    return [...(this.photos()[userId] ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  }

  presenceFor(userId: string): PresenceView | null {
    return this.presences()[userId] ?? null;
  }

  lastSnippet(conversationId: string): { content: string; isMine: boolean; sentAt: string } | null {
    const msg = this.lastMessages()[conversationId];
    if (!msg) return null;
    const content = msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content;
    return { content, isMine: msg.senderId === this.session.userId(), sentAt: msg.sentAt };
  }

  unreadCount(conversation: ConversationView): number {
    const lastMsg = this.lastMessages()[conversation.id];
    if (!lastMsg || lastMsg.senderId === this.session.userId()) return 0;
    const readAt = this.readAtMap()[conversation.id];
    if (!readAt) {
      return 1;
    }
    return new Date(lastMsg.sentAt).getTime() > new Date(readAt).getTime() ? 1 : 0;
  }

  formatTime(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      await this.social.refresh({ preserveKnown: true, retryEmpty: true });
      if (this.social.error() && !this.conversations().length && !this.social.matches().length) {
        this.error.set('Tente novamente em alguns instantes.');
        return;
      }
      const list = this.conversations();
      await this.enrich(list);
    } catch {
      this.error.set('Tente novamente em alguns instantes.');
    }
  }


  private async enrich(list: ConversationView[]): Promise<void> {
    this.enriching.set(true);
    try {
      const ids = Array.from(new Set(list.map(item => this.otherUser(item)).filter(Boolean)));

      const pairs = await Promise.all(ids.map(async id => {
        try {
          return [id, await firstValueFrom(this.profileApi.byUser(id))] as const;
        } catch {
          return null;
        }
      }));
      const profileMap: Record<string, PublicProfileView> = {};
      for (const pair of pairs) {
        if (pair) profileMap[pair[0]] = pair[1];
      }
      this.profiles.set(profileMap);
      if (ids.length) {
        const [photos, presencePairs] = await Promise.all([
          firstValueFrom(this.mediaApi.batch(ids)).catch(() => ({})),
          Promise.all(ids.map(async id => {
            try { return [id, await firstValueFrom(this.profileApi.presence(id))] as const; }
            catch { return null; }
          }))
        ]);
        this.photos.set(photos);
        const map: Record<string, PresenceView> = {};
        for (const pair of presencePairs) if (pair) map[pair[0]] = pair[1];
        this.presences.set(map);
      } else {
        this.photos.set({});
        this.presences.set({});
      }
    } finally {
      this.enriching.set(false);
    }
  }
}
