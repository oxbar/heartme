import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ConversationView, PhotoView, PublicProfileView } from '../../core/api/contracts';
import { MessagingApi } from '../../core/api/messaging.api';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { SessionStore } from '../../core/auth/session.store';
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

      <div class="h-full overflow-y-auto p-3 pb-24 lg:hidden">
        <header class="mb-4 flex items-center justify-between px-1 pt-2">
          <div>
            <h1 class="text-2xl font-black text-white">Mensagens</h1>
            <p class="mt-1 text-xs text-white/50">Converse com seus matches.</p>
          </div>
          <button type="button" class="hm-mobile-icon-button" aria-label="Atualizar conversas" (click)="load()">
            <hm-icon name="refresh-ccw" size="18" [class]="loading() ? 'animate-spin' : ''" />
          </button>
        </header>

        @if (loading()) {
          <div class="space-y-2">
            @for (_ of [0,1,2,3,4,5]; track _) {
              <div class="h-[76px] animate-pulse rounded-xl bg-white/5"></div>
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
          <div class="space-y-1">
            @for (conversation of conversations(); track conversation.id) {
              @let userId = otherUser(conversation);
              <a
                [routerLink]="['/app/messages', conversation.id]"
                class="flex min-h-[78px] items-center gap-3 rounded-xl px-3 text-white no-underline transition hover:bg-white/[0.07]"
              >
                <div class="relative shrink-0">
                  <hm-avatar [src]="firstPhoto(userId)" [name]="profileFor(userId)?.displayName || 'Match'" [size]="56" />
                  <span class="hm-online-dot"></span>
                </div>
                <div class="min-w-0 flex-1">
                  <strong class="block truncate text-[15px]">{{ profileFor(userId)?.displayName || 'Match' }}</strong>
                  <span class="mt-1 block truncate text-xs text-white/45">Toque para abrir a conversa</span>
                </div>
                <hm-icon name="arrow-right" size="18" class="text-white/30" />
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
  private readonly messagingApi = inject(MessagingApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly session = inject(SessionStore);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly conversations = signal<ConversationView[]>([]);
  readonly profiles = signal<Record<string, PublicProfileView>>({});
  readonly photos = signal<Record<string, PhotoView[]>>({});

  async ngOnInit(): Promise<void> {
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

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const list = await firstValueFrom(this.messagingApi.conversations());
      const sorted = [...list].sort((a, b) => {
        const left = new Date(a.lastMessageAt || a.createdAt).getTime();
        const right = new Date(b.lastMessageAt || b.createdAt).getTime();
        return right - left;
      });
      this.conversations.set(sorted);
      const ids = Array.from(new Set(sorted.map(item => this.otherUser(item)).filter(Boolean)));

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
      this.photos.set(ids.length ? await firstValueFrom(this.mediaApi.batch(ids)).catch(() => ({})) : {});
    } catch {
      this.error.set('Tente novamente em alguns instantes.');
    } finally {
      this.loading.set(false);
    }
  }
}
