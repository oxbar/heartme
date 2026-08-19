import { ChangeDetectionStrategy, Component, inject, input, signal, OnInit, OnDestroy, ViewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, MessageView, PublicProfileView } from '../../core/api/contracts';
import { MessagingApi } from '../../core/api/messaging.api';
import { ProfileApi } from '../../core/api/profile.api';
import { MessageBubbleComponent } from '../../shared/message-bubble.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { SessionStore } from '../../core/auth/session.store';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [CommonModule, FormsModule, RouterLink, MessageBubbleComponent, AvatarComponent, IconComponent],
  standalone: true,
  template: `
    <div class="h-[calc(100dvh-2rem)] flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-border flex-none">
        <a
          routerLink="/app/messages"
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition text-foreground"
          aria-label="Voltar"
        >
          <hm-icon name="arrow-left" size="20" />
        </a>
        @if (profile(); as p) {
          <hm-avatar [name]="p.displayName" [size]="40" />
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-card-foreground truncate">{{ p.displayName }}</h2>
            <p class="text-xs text-muted-foreground">{{ p.city }}, {{ p.age }} anos</p>
          </div>
        } @else {
          <div class="flex-1">
            <div class="h-4 w-1/3 rounded bg-muted animate-skeleton-pulse mb-1"></div>
            <div class="h-3 w-1/4 rounded bg-muted animate-skeleton-pulse"></div>
          </div>
        }
      </header>

      <div #scrollRef class="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-background/40">
        @if (loading()) {
          <div class="space-y-3">
            @for (_ of [0,1,2,3,4]; track _) {
              <div class="flex" [ngClass]="_ % 2 === 0 ? 'justify-start' : 'justify-end'">
                <div class="max-w-[70%] h-16 rounded-2xl bg-muted animate-skeleton-pulse"></div>
              </div>
            }
          </div>
        } @else if (error()) {
          <div class="h-full flex flex-col items-center justify-center text-center py-10">
            <p class="text-destructive mb-4">{{ error() }}</p>
            <button
              type="button"
              (click)="load()"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
            >
              <hm-icon name="refresh-ccw" size="16" />
              Tentar novamente
            </button>
          </div>
        } @else if (!messages().length) {
          <div class="h-full flex flex-col items-center justify-center text-center py-10">
            <p class="text-muted-foreground max-w-sm">
              Envie a primeira mensagem para começar a conversa. Seja gentil e respeitoso(a).
            </p>
          </div>
        } @else {
          @for (m of messages(); track m.id) {
            <hm-message-bubble [message]="m" />
          }
        }
      </div>

      <form (submit)="sendMessage($event)" class="flex-none border-t border-border p-3 bg-card flex items-end gap-2">
        <input
          [(ngModel)]="inputContent"
          [ngModelOptions]="{ standalone: true }"
          type="text"
          [placeholder]="'Mensagem para ' + (profile()?.displayName || 'pessoa')"
          class="flex-1 min-h-[42px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
        />
        <button
          type="submit"
          [disabled]="!inputContent.trim() || sending()"
          class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex-none"
          aria-label="Enviar mensagem"
        >
          <hm-icon name="send" size="20" />
        </button>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPage implements OnInit, OnDestroy {
  private readonly messagingApi = inject(MessagingApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly session = inject(SessionStore);

  @ViewChild('scrollRef') scrollRef?: ElementRef<HTMLDivElement>;

  readonly id = input<string>('');

  readonly loading = signal(true);
  readonly error = signal('');
  readonly sending = signal(false);
  readonly messages = signal<MessageView[]>([]);
  readonly profile = signal<PublicProfileView | null>(null);

  inputContent = '';
  private realtimeSub: any = null;

  constructor() {
    afterNextRender(() => this.scrollToBottom());
  }

  async ngOnInit(): Promise<void> {
    await this.load();
    this.tryRealtime();
  }

  ngOnDestroy(): void {
    try { this.realtimeSub?.unsubscribe?.(); } catch {}
  }

  tryRealtime(): void {
    import('../../core/realtime/chat-realtime')
      .then(m => {
        const svc = inject(m.ChatRealtime);
        const conversationId = this.id();
        if (!conversationId) return;
        try {
          const sub = svc.messages(conversationId).subscribe((msg: MessageView) => {
            this.messages.update(list => list.some(x => x.id === msg.id) ? list : [...list, msg]);
            this.scrollToBottom();
          });
          this.realtimeSub = sub;
        } catch {}
      })
      .catch(() => {});
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        const el = this.scrollRef?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      } catch {}
    }, 30);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const conversationId = this.id();
      if (!conversationId) throw new Error('id inválido');
      const list = await firstValueFrom(this.messagingApi.messages(conversationId, undefined, 100));
      this.messages.set([...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()));
      try {
        const convs = await firstValueFrom(this.messagingApi.conversations());
        const conv = convs.find(c => c.id === conversationId);
        if (conv) {
          const otherId = conv.userA === this.session.userId() ? conv.userB : conv.userA;
          try { this.profile.set(await firstValueFrom(this.profileApi.byUser(otherId))); } catch {}
        }
      } catch {}
      try { await firstValueFrom(this.messagingApi.markRead(conversationId)); } catch {}
      this.scrollToBottom();
    } catch {
      this.error.set('Não foi possível carregar a conversa.');
    } finally {
      this.loading.set(false);
    }
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    const content = (this.inputContent || '').trim();
    if (!content || this.sending()) return;
    const conversationId = this.id();
    if (!conversationId) return;
    void (async () => {
      this.sending.set(true);
      try {
        const msg = await firstValueFrom(this.messagingApi.send(conversationId, content));
        this.messages.update(list => [...list, msg]);
        this.inputContent = '';
        this.scrollToBottom();
      } catch {}
      finally { this.sending.set(false); }
    })();
  }
}
