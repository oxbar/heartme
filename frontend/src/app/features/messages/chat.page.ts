import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import type { ConversationView, MessageView, PhotoView, PresenceView, PublicProfileView } from '../../core/api/contracts';
import { MatchApi } from '../../core/api/match.api';
import { MessagingApi } from '../../core/api/messaging.api';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { ChatRealtime } from '../../core/realtime/chat-realtime';
import { SessionStore } from '../../core/auth/session.store';
import { SocialStateStore } from '../../core/state/social-state.store';
import { MessageBubbleComponent } from '../../shared/message-bubble.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PhotoCarouselComponent } from '../../ui/photo-carousel/photo-carousel.component';

const READ_KEY = 'hm.conversations.readAt.v1';

function updateLocalRead(conversationId: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(READ_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[conversationId] = new Date().toISOString();
    sessionStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

@Component({
  imports: [FormsModule, RouterLink, MessageBubbleComponent, AvatarComponent, IconComponent, PhotoCarouselComponent],
  standalone: true,
  template: `
    <section class="hm-chat-shell" aria-label="Conversa">
      <div class="hm-chat-column">
        <header class="hm-chat-header">
          <a routerLink="/app/messages" class="hm-mobile-icon-button lg:hidden" aria-label="Voltar para mensagens">
            <hm-icon name="arrow-left" size="19" />
          </a>
          @if (profile(); as currentProfile) {
            <div class="relative shrink-0">
              <hm-avatar [src]="primaryPhoto()" [name]="currentProfile.displayName" [size]="44" />
              @if (presence()?.online) { <span class="hm-online-dot is-chat" aria-label="Online"></span> }
            </div>
            <div class="min-w-0 flex-1">
              <h2>{{ currentProfile.displayName }}</h2>
              <p [class.text-emerald-400]="presence()?.online">{{ presenceLabel() }}</p>
            </div>
            <a [routerLink]="['/app/profiles', currentProfile.userId]" class="hm-mobile-icon-button" aria-label="Abrir perfil">
              <hm-icon name="menu" size="19" />
            </a>
          } @else {
            <div class="h-10 w-10 animate-pulse rounded-full bg-white/5"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 w-36 animate-pulse rounded bg-white/5"></div>
              <div class="h-3 w-52 animate-pulse rounded bg-white/5"></div>
            </div>
          }
        </header>

        <div #scrollRef class="hm-chat-messages" aria-live="polite">
          <div class="hm-chat-thread">
            @if (loading()) {
              <div class="space-y-4">
                @for (_ of [0,1,2,3,4,5]; track _) {
                  <div class="flex" [class.justify-end]="_ % 2 === 1">
                    <div class="h-14 w-[min(65%,320px)] animate-pulse rounded-2xl bg-white/5"></div>
                  </div>
                }
              </div>
            } @else if (error()) {
              <div class="hm-page-empty-center min-h-[50vh]">
                <div class="hm-page-empty-icon"><hm-icon name="alert-circle" size="27" /></div>
                <strong>Não foi possível abrir a conversa</strong>
                <span>{{ error() }}</span>
                <button type="button" class="hm-dark-button is-primary" (click)="load()">Tentar novamente</button>
              </div>
            } @else if (!messages().length) {
              <div class="hm-page-empty-center min-h-[50vh]">
                <div class="hm-page-empty-icon"><hm-icon name="message-circle" size="29" /></div>
                <strong>Comece a conversa</strong>
                <span>Uma mensagem simples e personalizada costuma ser um ótimo começo.</span>
              </div>
            } @else {
              <div class="hm-message-stack">
                @for (message of messages(); track message.id) {
                  <hm-message-bubble
                    [message]="message"
                    [isNew]="justArrived().has(message.id)"
                    (toggleHeart)="toggleHeart($event)"
                  />
                }
              </div>
            }
          </div>
        </div>

        @if (showNewMessageBanner()) {
          <button
            type="button"
            class="hm-new-messages-banner"
            (click)="scrollToBottom(); dismissNewMessageBanner()"
            aria-label="Ir para novas mensagens"
          >
            <hm-icon name="chevrons-down" size="15" />
            <span>{{ pendingNewCount() }} nova{{ pendingNewCount() === 1 ? '' : 's' }} mensagem{{ pendingNewCount() === 1 ? '' : 'ns' }}</span>
          </button>
        }

        <form class="hm-chat-compose" (submit)="sendMessage($event)">
          <div class="hm-chat-compose-inner">
            <input
              [(ngModel)]="inputContent"
              [ngModelOptions]="{ standalone: true }"
              type="text"
              autocomplete="off"
              [placeholder]="'Mensagem para ' + (profile()?.displayName || 'seu match')"
              aria-label="Mensagem"
            />
            <button type="submit" class="hm-chat-send" [disabled]="!inputContent.trim() || sending()" aria-label="Enviar mensagem">
              <hm-icon name="send" size="19" />
            </button>
          </div>
        </form>
      </div>

      <aside class="hm-chat-profile" aria-label="Perfil do match">
        @if (profile(); as currentProfile) {
          <div class="hm-chat-profile-title">
            <span>{{ currentProfile.displayName }} {{ currentProfile.age }}</span>
            @if (presence()?.online) { <span class="hm-presence-badge">Online</span> }
          </div>
          <div class="hm-chat-profile-photo">
            <hm-photo-carousel
              [photos]="photos()"
              [fallbackName]="currentProfile.displayName"
              [ariaLabel]="'Fotos de ' + currentProfile.displayName"
            />
          </div>

          <section class="hm-chat-profile-section">
            <h3>PROCURANDO CONEXÃO</h3>
            <p>{{ currentProfile.city }}{{ currentProfile.state ? ', ' + currentProfile.state : '' }}</p>
          </section>

          @if (currentProfile.bio) {
            <section class="hm-chat-profile-section">
              <h3>SOBRE</h3>
              <p>{{ currentProfile.bio }}</p>
            </section>
          }

          @if (currentProfile.interests.length) {
            <section class="hm-chat-profile-section">
              <h3>INTERESSES</h3>
              <div class="hm-chat-tags">
                @for (interest of currentProfile.interests; track interest) {
                  <span class="hm-chat-tag">{{ interest }}</span>
                }
              </div>
            </section>
          }

          <div class="grid gap-2 p-4">
            <a [routerLink]="['/app/profiles', currentProfile.userId]" class="hm-dark-button w-full">Ver perfil completo</a>
            <button type="button" class="hm-dark-button is-danger w-full" [disabled]="unmatching()" (click)="unmatch()">
              <hm-icon name="heart-off" size="16" />
              {{ unmatching() ? 'Desfazendo…' : 'Desfazer match' }}
            </button>
          </div>
        } @else {
          <div class="space-y-3 p-5">
            <div class="h-8 w-1/2 animate-pulse rounded bg-white/5"></div>
            <div class="aspect-square animate-pulse rounded-xl bg-white/5"></div>
          </div>
        }
      </aside>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPage implements OnDestroy {
  private readonly messagingApi = inject(MessagingApi);
  private readonly matchApi = inject(MatchApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly realtime = inject(ChatRealtime);
  private readonly session = inject(SessionStore);
  private readonly social = inject(SocialStateStore);
  private readonly router = inject(Router);

  @ViewChild('scrollRef') scrollRef?: ElementRef<HTMLDivElement>;

  readonly id = input('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly reactionError = signal('');
  readonly sending = signal(false);
  readonly unmatching = signal(false);
  readonly messages = signal<MessageView[]>([]);
  readonly profile = signal<PublicProfileView | null>(null);
  readonly photos = signal<PhotoView[]>([]);
  readonly primaryPhoto = signal<string | null>(null);
  readonly conversation = signal<ConversationView | null>(null);
  readonly presence = signal<PresenceView | null>(null);
  readonly otherUserId = signal<string | null>(null);

  readonly justArrived = signal<Set<string>>(new Set());
  readonly showNewMessageBanner = signal(false);
  readonly pendingNewCount = signal(0);
  readonly isAtBottom = signal(true);

  readonly presenceLabel = computed(() => {
    const value = this.presence();
    if (!value?.lastSeenAt) return 'Vocês deram match · comece uma conversa';
    if (value.online) return 'Online agora';
    const last = new Date(value.lastSeenAt);
    const now = new Date();
    const sameDay = last.toDateString() === now.toDateString();
    if (sameDay) return `Visto por último hoje às ${last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `Visto por último ${last.toLocaleDateString([], { day: '2-digit', month: 'short' })} às ${last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  inputContent = '';
  private realtimeSubs = new Subscription();
  private presenceTimer: ReturnType<typeof setInterval> | null = null;

  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (!document.hidden && this.id()) {
      updateLocalRead(this.id());
      void this.markConversationRead(this.id());
    }
  }

  constructor() {
    afterNextRender(() => this.scrollToBottom());
    effect(() => {
      const conversationId = this.id();
      if (!conversationId) return;
      this.profile.set(null);
      this.photos.set([]);
      this.primaryPhoto.set(null);
      this.presence.set(null);
      this.justArrived.set(new Set());
      this.showNewMessageBanner.set(false);
      this.pendingNewCount.set(0);
      void this.load(conversationId);
      this.startRealtime(conversationId);
    });
  }

  ngOnDestroy(): void {
    this.realtimeSubs.unsubscribe();
    if (this.presenceTimer) clearInterval(this.presenceTimer);
  }

  dismissNewMessageBanner(): void {
    this.showNewMessageBanner.set(false);
    this.pendingNewCount.set(0);
  }

  private startRealtime(conversationId: string): void {
    this.realtimeSubs.unsubscribe();
    this.realtimeSubs = new Subscription();
    try {
      this.realtimeSubs.add(this.realtime.messages(conversationId).subscribe(message => {
        const isNew = !this.messages().some(item => item.id === message.id);
        const isMine = message.senderId === this.session.userId();
        if (isNew) {
          this.messages.update(list => [...list, message]);
          this.justArrived.update(prev => {
            const next = new Set(prev);
            next.add(message.id);
            return next;
          });
          setTimeout(() => {
            this.justArrived.update(prev => {
              const next = new Set(prev);
              next.delete(message.id);
              return next;
            });
          }, 2200);

          if (!isMine) {
            void this.markConversationRead(conversationId);
            if (!this.isAtBottom()) {
              this.pendingNewCount.update(n => n + 1);
              this.showNewMessageBanner.set(true);
            } else {
              this.scrollToBottom();
            }
          } else {
            this.scrollToBottom();
          }
        } else {
          if (!isMine) void this.markConversationRead(conversationId);
        }
      }));
      this.realtimeSubs.add(this.realtime.receipts(conversationId).subscribe(receipt => {
        if (receipt.readerId === this.session.userId()) return;
        this.messages.update(list => list.map(message =>
          message.senderId === this.session.userId() && !message.readAt
            ? { ...message, readAt: receipt.readAt }
            : message
        ));
      }));
      this.realtimeSubs.add(this.realtime.reactions(conversationId).subscribe(reaction => {
        this.messages.update(list => list.map(message => message.id === reaction.messageId ? {
          ...message,
          heartReactionCount: reaction.heartReactionCount,
          heartReactedByMe: reaction.actorId === this.session.userId() ? reaction.active : message.heartReactedByMe
        } : message));
      }));
    } catch {
      this.realtimeSubs = new Subscription();
    }
  }

  private checkScrollPosition(): void {
    const el = this.scrollRef?.nativeElement;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.isAtBottom.set(distance < 80);
    if (this.isAtBottom()) this.dismissNewMessageBanner();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const element = this.scrollRef?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
        this.isAtBottom.set(true);
        this.dismissNewMessageBanner();
      }
    }, 30);
  }

  async load(conversationId = this.id()): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!conversationId) throw new Error('invalid conversation');

      const [messages, conversations] = await Promise.all([
        firstValueFrom(this.messagingApi.messages(conversationId, undefined, 100)),
        firstValueFrom(this.messagingApi.conversations())
      ]);
      this.messages.set([...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()));

      const conversation = conversations.find(item => item.id === conversationId) ?? null;
      this.conversation.set(conversation);
      if (conversation) {
        const otherId = conversation.userA === this.session.userId() ? conversation.userB : conversation.userA;
        this.otherUserId.set(otherId);
        const [profile, photos, presence] = await Promise.all([
          firstValueFrom(this.profileApi.byUser(otherId)),
          firstValueFrom(this.mediaApi.forUser(otherId)).catch(() => [] as PhotoView[]),
          firstValueFrom(this.profileApi.presence(otherId)).catch(() => null)
        ]);
        this.profile.set(profile);
        this.photos.set(photos);
        this.primaryPhoto.set([...photos].sort((a, b) => a.position - b.position)[0]?.url ?? null);
        this.presence.set(presence);
        this.startPresencePolling(otherId);
      }

      updateLocalRead(conversationId);
      await this.markConversationRead(conversationId);
      this.scrollToBottom();

      const el = this.scrollRef?.nativeElement;
      if (el) el.addEventListener('scroll', () => this.checkScrollPosition(), { passive: true });
    } catch {
      this.error.set('Verifique sua conexão e tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  private startPresencePolling(otherId: string): void {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    const tick = async () => {
      await firstValueFrom(this.profileApi.pingPresence()).catch(() => null);
      const presence = await firstValueFrom(this.profileApi.presence(otherId)).catch(() => null);
      if (presence) this.presence.set(presence);
    };
    void tick();
    this.presenceTimer = setInterval(() => void tick(), 30_000);
  }

  private async markConversationRead(conversationId: string): Promise<void> {
    updateLocalRead(conversationId);
    await firstValueFrom(this.messagingApi.markRead(conversationId)).catch(() => undefined);
  }

  toggleHeart(messageId: string): void {
    const conversationId = this.id();
    if (!conversationId) return;
    void (async () => {
      this.reactionError.set('');
      const previous = this.messages();
      const optimistic = previous.map(message => {
        if (message.id !== messageId) return message;
        const nextActive = !message.heartReactedByMe;
        return {
          ...message,
          heartReactedByMe: nextActive,
          heartReactionCount: nextActive ? message.heartReactionCount + 1 : Math.max(0, message.heartReactionCount - 1)
        };
      });
      this.messages.set(optimistic);

      try {
        const reaction = await firstValueFrom(this.messagingApi.toggleHeart(conversationId, messageId));
        this.messages.update(list => list.map(message => message.id === messageId ? {
          ...message,
          heartReactionCount: reaction.heartReactionCount,
          heartReactedByMe: reaction.heartReactedByMe
        } : message));
      } catch {
        this.messages.set(previous);
        this.reactionError.set('Não foi possível reagir à mensagem.');
        setTimeout(() => this.reactionError() && this.reactionError.set(''), 2500);
      }
    })();
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    const content = this.inputContent.trim();
    const conversationId = this.id();
    if (!content || !conversationId || this.sending()) return;

    void (async () => {
      this.sending.set(true);
      try {
        const message = await firstValueFrom(this.messagingApi.send(conversationId, content));
        const isNew = !this.messages().some(item => item.id === message.id);
        if (isNew) this.messages.update(list => [...list, message]);
        this.inputContent = '';
        this.scrollToBottom();
      } catch {
        this.error.set('Sua mensagem não foi enviada. Tente novamente.');
      } finally {
        this.sending.set(false);
      }
    })();
  }

  unmatch(): void {
    const conversation = this.conversation();
    if (!conversation || this.unmatching()) return;
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Desfazer este match? A conversa deixará de aparecer para vocês.')
      : true;
    if (!confirmed) return;

    void (async () => {
      this.unmatching.set(true);
      try {
        await firstValueFrom(this.matchApi.unmatch(conversation.matchId));
        this.social.removeMatch(conversation.matchId);
        await this.router.navigate(['/app/matches']);
      } catch {
        this.error.set('Não foi possível desfazer o match. Tente novamente.');
      } finally {
        this.unmatching.set(false);
      }
    })();
  }
}
