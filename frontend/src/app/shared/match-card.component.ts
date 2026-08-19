import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { MatchView, PublicProfileView } from '../core/api/contracts';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-match-card',
  imports: [CommonModule, AvatarComponent, IconComponent],
  standalone: true,
  template: `
    <button
      type="button"
      class="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-muted/50 transition text-left"
      (click)="openChat()"
    >
      <hm-avatar [name]="profile()?.displayName || 'Match'" [size]="56" />
      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-card-foreground truncate">{{ profile()?.displayName || 'Match' }}</h4>
        <p class="text-sm text-muted-foreground truncate">{{ lastMessage() || 'Vocês deram match!' }}</p>
      </div>
      <div class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
        <hm-icon name="message-circle" size="16" />
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchCardComponent {
  private readonly router = inject(Router);
  readonly match = input<MatchView | null>(null);
  readonly profile = input<PublicProfileView | null>(null);
  readonly lastMessage = input<string>('');

  openChat(): void {
    const m = this.match();
    if (!m) return;
    void this.router.navigate(['/app/messages', m.id]);
  }
}
