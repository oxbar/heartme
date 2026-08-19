import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { NotificationView } from '../core/api/contracts';
import { NotificationApi } from '../core/api/notification.api';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-notification-item',
  imports: [CommonModule, IconComponent],
  standalone: true,
  template: `
    <button
      type="button"
      class="w-full flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-muted/50 transition text-left"
      [ngClass]="{ 'ring-1 ring-primary/30': !isRead() }"
      (click)="markAsRead()"
    >
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted flex-none">
        @if (type() === 'MATCH' || type() === 'LIKE') {
          <hm-icon name="heart" size="20" class="text-primary" />
        } @else if (type() === 'MESSAGE') {
          <hm-icon name="message-circle" size="20" class="text-accent" />
        } @else if (type() === 'SAFETY' || type() === 'BLOCK') {
          <hm-icon name="shield" size="20" class="text-destructive" />
        } @else if (type() === 'WARNING' || type() === 'ERROR') {
          <hm-icon name="alert-circle" size="20" class="text-destructive" />
        } @else {
          <hm-icon name="bell" size="20" class="text-muted-foreground" />
        }
      </div>
      <div class="flex-1 min-w-0">
        @if (notification()) {
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-semibold text-card-foreground">{{ notification()!.title }}</h4>
            <span class="text-xs text-muted-foreground flex-none">{{ time() }}</span>
          </div>
          <p class="text-sm text-muted-foreground mt-1">{{ notification()!.body }}</p>
          @if (!isRead()) {
            <div class="mt-2 flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full bg-primary"></span>
              <span class="text-xs font-medium text-primary">Não lida</span>
            </div>
          }
        }
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationItemComponent {
  private readonly api = inject(NotificationApi);
  readonly notification = input<NotificationView | null>(null);
  readonly markedRead = output<void>();

  readonly type = computed(() => this.notification()?.type?.toUpperCase() || '');
  readonly isRead = computed(() => !!this.notification()?.readAt);
  readonly time = computed(() => {
    const d = this.notification()?.createdAt;
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  async markAsRead(): Promise<void> {
    const n = this.notification();
    if (!n || n.readAt) return;
    try { await firstValueFrom(this.api.markRead(n.id)); this.markedRead.emit(); } catch {}
  }
}
