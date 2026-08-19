import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, afterNextRender, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import type { MessageView, PhotoView, PublicProfileView } from '../../core/api/contracts';
import { MessagingApi } from '../../core/api/messaging.api';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { ChatRealtime } from '../../core/realtime/chat-realtime';
import { SessionStore } from '../../core/auth/session.store';
import { MessageBubbleComponent } from '../../shared/message-bubble.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PhotoCarouselComponent } from '../../ui/photo-carousel/photo-carousel.component';

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
            <hm-avatar [src]="primaryPhoto()" [name]="currentProfile.displayName" [size]="42" />
            <div class="min-w-0 flex-1">
              <h2>{{ currentProfile.displayName }}</h2>
              <p>Vocês deram match · seja respeitoso e autêntico</p>
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
          @if (loading()) {
            <div class="space-y-4">
              @for (_ of [0,1,2,3,4,5]; track _) {
                <div class="flex" [class.justify-end]="_ % 2 === 1">
                  <div class="h-14 w-[min(65%,320px)] animate-pulse rounded-2xl bg-white/5"></div>
                </div>
              }
            </div>
          } @else if (error()) {
            <div class="hm-page-empty-center min-h-full">
              <div class="hm-page-empty-icon"><hm-icon name="alert-circle" size="27" /></div>
              <strong>Não foi possível abrir a conversa</strong>
              <span>{{ error() }}</span>
              <button type="button" class="hm-dark-button is-primary" (click)="load()">Tentar novamente</button>
            </div>
          } @else if (!messages().length) {
            <div class="hm-page-empty-center min-h-full">
              <div class="hm-page-empty-icon"><hm-icon name="message-circle" size="29" /></div>
              <strong>Comece a conversa</strong>
              <span>Uma mensagem simples e personalizada costuma ser um ótimo começo.</span>
            </div>
          } @else {
            <div class="space-y-3">
              @for (message of messages(); track message.id) {
                <hm-message-bubble [message]="message" />
              }
            </div>
          }
        </div>

        <form class="hm-chat-compose" (submit)="sendMessage($event)">
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
        </form>
      </div>

      <aside class="hm-chat-profile" aria-label="Perfil do match">
        @if (profile(); as currentProfile) {
          <div class="hm-chat-profile-title">{{ currentProfile.displayName }} {{ currentProfile.age }}</div>
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

          <div class="p-4">
            <a [routerLink]="['/app/profiles', currentProfile.userId]" class="hm-dark-button w-full">Ver perfil completo</a>
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
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly realtime = inject(ChatRealtime);
  private readonly session = inject(SessionStore);

  @ViewChild('scrollRef') scrollRef?: ElementRef<HTMLDivElement>;

  readonly id = input('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly sending = signal(false);
  readonly messages = signal<MessageView[]>([]);
  readonly profile = signal<PublicProfileView | null>(null);
  readonly photos = signal<PhotoView[]>([]);
  readonly primaryPhoto = signal<string | null>(null);

  inputContent = '';
  private realtimeSub: Subscription | null = null;

  constructor() {
    afterNextRender(() => this.scrollToBottom());
    effect(() => {
      const conversationId = this.id();
      if (!conversationId) return;
      this.profile.set(null);
      this.photos.set([]);
      this.primaryPhoto.set(null);
      void this.load(conversationId);
      this.startRealtime(conversationId);
    });
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private startRealtime(conversationId: string): void {
    this.realtimeSub?.unsubscribe();
    try {
      this.realtimeSub = this.realtime.messages(conversationId).subscribe(message => {
        this.messages.update(list => list.some(item => item.id === message.id) ? list : [...list, message]);
        this.scrollToBottom();
      });
    } catch {
      this.realtimeSub = null;
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const element = this.scrollRef?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
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

      const conversation = conversations.find(item => item.id === conversationId);
      if (conversation) {
        const otherId = conversation.userA === this.session.userId() ? conversation.userB : conversation.userA;
        const [profile, photos] = await Promise.all([
          firstValueFrom(this.profileApi.byUser(otherId)),
          firstValueFrom(this.mediaApi.forUser(otherId)).catch(() => [] as PhotoView[])
        ]);
        this.profile.set(profile);
        this.photos.set(photos);
        this.primaryPhoto.set([...photos].sort((a, b) => a.position - b.position)[0]?.url ?? null);
      }

      await firstValueFrom(this.messagingApi.markRead(conversationId)).catch(() => undefined);
      this.scrollToBottom();
    } catch {
      this.error.set('Verifique sua conexão e tente novamente.');
    } finally {
      this.loading.set(false);
    }
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
        this.messages.update(list => list.some(item => item.id === message.id) ? list : [...list, message]);
        this.inputContent = '';
        this.scrollToBottom();
      } catch {
        this.error.set('Sua mensagem não foi enviada. Tente novamente.');
      } finally {
        this.sending.set(false);
      }
    })();
  }
}
