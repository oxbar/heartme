import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { ConversationView } from '../../core/api/contracts';
import { MessagingApi } from '../../core/api/messaging.api';
import { ProfileApi } from '../../core/api/profile.api';
import { ConversationListItemComponent } from '../../shared/conversation-list-item.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { SessionStore } from '../../core/auth/session.store';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, ConversationListItemComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Mensagens" subtitle="Suas conversas com matches." icon="message-circle">
        <div pageHeaderActions>
          <button
            type="button"
            (click)="load()"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
          >
            <hm-icon name="rotate-ccw" size="16" [class]="loading() ? 'animate-spin' : ''" />
            Atualizar
          </button>
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
      } @else if (!conversations().length) {
        <hm-empty-state
          icon="message-circle"
          title="Sem conversas ainda"
          description="Quando você der match com alguém, a conversa aparecerá aqui."
        />
      } @else {
        <div class="grid gap-3">
          @for (c of conversations(); track c.id) {
            <hm-conversation-list-item
              [conversation]="c"
              [profile]="profiles()[otherUser(c)]"
              [preview]="previews()[c.id]"
              [unread]="0"
            />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationsPage implements OnInit {
  private readonly messagingApi = inject(MessagingApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly session = inject(SessionStore);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly conversations = signal<ConversationView[]>([]);
  readonly profiles = signal<Record<string, any>>({});
  readonly previews = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  otherUser(c: ConversationView): string {
    return c.userA === this.session.userId() ? c.userB : c.userA;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const list = await firstValueFrom(this.messagingApi.conversations());
      const sorted = [...list].sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
        return tb - ta;
      });
      this.conversations.set(sorted);
      const otherIds = sorted.map(c => this.otherUser(c)).filter((v, i, a) => a.indexOf(v) === i);
      const profilesMap: Record<string, any> = {};
      const previewsMap: Record<string, string> = {};
      for (const id of otherIds) {
        try { profilesMap[id] = await firstValueFrom(this.profileApi.byUser(id)); } catch {}
      }
      for (const c of sorted) {
        try {
          const msgs = await firstValueFrom(this.messagingApi.messages(c.id, undefined, 1));
          if (msgs.length) previewsMap[c.id] = msgs[msgs.length - 1].content;
        } catch {}
      }
      this.profiles.set(profilesMap);
      this.previews.set(previewsMap);
    } catch {
      this.error.set('Não foi possível carregar suas conversas.');
    } finally {
      this.loading.set(false);
    }
  }
}
