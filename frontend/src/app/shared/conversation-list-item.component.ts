import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { ConversationView, PublicProfileView } from '../core/api/contracts';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'hm-conversation-list-item',
  imports: [CommonModule, AvatarComponent],
  standalone: true,
  template: `
    <button
      type="button"
      class="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:bg-muted/50 transition text-left"
      (click)="open()"
    >
      <hm-avatar [name]="profile()?.displayName || 'Usuário'" [size]="48" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <h4 class="font-semibold text-card-foreground truncate">{{ profile()?.displayName || 'Usuário' }}</h4>
          @if (unread()) {
            <span class="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {{ unread() }}
            </span>
          }
        </div>
        <p class="text-sm text-muted-foreground truncate mt-0.5">{{ preview() || 'Sem mensagens ainda' }}</p>
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationListItemComponent {
  private readonly router = inject(Router);
  readonly conversation = input<ConversationView | null>(null);
  readonly profile = input<PublicProfileView | null>(null);
  readonly preview = input<string>('');
  readonly unread = input<number>(0);

  open(): void {
    const c = this.conversation();
    if (!c) return;
    void this.router.navigate(['/app/messages', c.id]);
  }
}
