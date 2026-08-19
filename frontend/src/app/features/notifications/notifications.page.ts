import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { NotificationView } from '../../core/api/contracts';
import { NotificationApi } from '../../core/api/notification.api';
import { NotificationItemComponent } from '../../shared/notification-item.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, NotificationItemComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Notificações" subtitle="Atualizações sobre matches, mensagens e segurança." icon="bell">
        <div pageHeaderActions class="flex items-center gap-2">
          <button
            type="button"
            *ngIf="hasUnread()"
            (click)="markAllRead()"
            [disabled]="markingAll()"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition disabled:opacity-50"
          >
            <hm-icon name="check-check" size="16" />
            {{ markingAll() ? 'Marcando...' : 'Tudo lido' }}
          </button>
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
      } @else if (!notifications().length) {
        <hm-empty-state
          icon="bell"
          title="Sem notificações"
          description="Quando houver novidades, elas aparecerão aqui."
        />
      } @else {
        <div class="grid gap-3">
          @for (n of notifications(); track n.id) {
            <hm-notification-item
              [notification]="n"
              (markedRead)="onMarkedRead(n.id)"
            />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsPage implements OnInit {
  private readonly api = inject(NotificationApi);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly markingAll = signal(false);
  readonly notifications = signal<NotificationView[]>([]);

  readonly hasUnread = computed(() => this.notifications().some(n => !n.readAt));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const list = await firstValueFrom(this.api.list(50));
      this.notifications.set([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      this.error.set('Não foi possível carregar suas notificações.');
    } finally {
      this.loading.set(false);
    }
  }

  onMarkedRead(id: string): void {
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  }

  async markAllRead(): Promise<void> {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    try {
      const items = [...this.notifications()];
      for (const n of items) {
        if (!n.readAt) try { await firstValueFrom(this.api.markRead(n.id)); } catch {}
      }
      this.notifications.update(list => list.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } finally {
      this.markingAll.set(false);
    }
  }
}
