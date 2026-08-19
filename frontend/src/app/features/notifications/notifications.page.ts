import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { NotificationView } from '../../core/api/contracts';
import { NotificationApi } from '../../core/api/notification.api';
import { MessagingApi } from '../../core/api/messaging.api';
import { NotificationItemComponent } from '../../shared/notification-item.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, NotificationItemComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="h-full overflow-y-auto p-6 lg:p-8 space-y-6 animate-fade-in">
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
            *ngIf="notifications().length"
            (click)="clearNotifications()"
            [disabled]="clearing()"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
          >
            <hm-icon name="trash-2" size="16" />
            {{ clearing() ? 'Limpando...' : 'Limpar' }}
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
          <button type="button" (click)="load()" class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition">Tentar novamente</button>
        </div>
      } @else if (!notifications().length) {
        <hm-empty-state icon="bell" title="Sem notificações" description="Quando houver novidades, elas aparecerão aqui." />
      } @else {
        <div class="grid gap-3">
          @for (notification of notifications(); track notification.id) {
            <hm-notification-item
              [notification]="notification"
              (markedRead)="onMarkedRead(notification.id)"
              (opened)="openNotification($event)"
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
  private readonly messagingApi = inject(MessagingApi);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly markingAll = signal(false);
  readonly clearing = signal(false);
  readonly notifications = signal<NotificationView[]>([]);
  readonly hasUnread = computed(() => this.notifications().some(notification => !notification.readAt));

  async ngOnInit(): Promise<void> { await this.load(); }

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
    this.notifications.update(list => list.map(notification => notification.id === id
      ? { ...notification, readAt: new Date().toISOString() }
      : notification));
  }

  async openNotification(notification: NotificationView): Promise<void> {
    this.onMarkedRead(notification.id);
    let data: Record<string, string> = {};
    try { data = JSON.parse(notification.dataJson || '{}') as Record<string, string>; } catch {}

    if (data['conversationId']) {
      await this.router.navigate(['/app/messages', data['conversationId']]);
      return;
    }
    if (data['matchId']) {
      const conversations = await firstValueFrom(this.messagingApi.conversations()).catch(() => []);
      const conversation = conversations.find(item => item.matchId === data['matchId']);
      if (conversation) await this.router.navigate(['/app/messages', conversation.id]);
      else await this.router.navigate(['/app/matches']);
      return;
    }
    await this.router.navigate(['/app/notifications']);
  }

  async markAllRead(): Promise<void> {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    try {
      for (const notification of this.notifications()) {
        if (!notification.readAt) try { await firstValueFrom(this.api.markRead(notification.id)); } catch {}
      }
      this.notifications.update(list => list.map(notification => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString()
      })));
    } finally {
      this.markingAll.set(false);
    }
  }

  async clearNotifications(): Promise<void> {
    if (this.clearing() || !this.notifications().length) return;
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Limpar todas as notificações?')
      : true;
    if (!confirmed) return;
    this.clearing.set(true);
    try {
      await firstValueFrom(this.api.clear());
      this.notifications.set([]);
    } catch {
      this.error.set('Não foi possível limpar as notificações.');
    } finally {
      this.clearing.set(false);
    }
  }
}
