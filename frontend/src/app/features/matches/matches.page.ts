import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { MatchView } from '../../core/api/contracts';
import { MatchApi } from '../../core/api/match.api';
import { ProfileApi } from '../../core/api/profile.api';
import { MatchCardComponent } from '../../shared/match-card.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, MatchCardComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Matches" subtitle="Todas as pessoas que deram match com você." icon="heart">
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
      } @else if (!matches().length) {
        <hm-empty-state
          icon="heart"
          title="Nenhum match ainda"
          description="Continue dando like em perfis compatíveis para aparecerem aqui."
        />
      } @else {
        <div class="grid gap-3">
          @for (match of matches(); track match.id) {
            <hm-match-card
              [match]="match"
              [profile]="profiles()[match.userA === currentUserId() ? match.userB : match.userA]"
              [lastMessage]="''"
            />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchesPage implements OnInit {
  private readonly matchApi = inject(MatchApi);
  private readonly profileApi = inject(ProfileApi);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly matches = signal<MatchView[]>([]);
  readonly profiles = signal<Record<string, any>>({});
  readonly currentUserId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const session = await import('../../core/auth/session.store').then(m => m.SessionStore);
    const store = inject(session);
    this.currentUserId.set(store.userId());
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const list = await firstValueFrom(this.matchApi.list());
      this.matches.set(list);
      const ids = Array.from(new Set(list.flatMap(m => [m.userA, m.userB]))).filter(id => id !== this.currentUserId());
      const profilesMap: Record<string, any> = {};
      if (ids.length) {
        for (const id of ids) {
          try {
            const p = await firstValueFrom(this.profileApi.byUser(id));
            profilesMap[id] = p;
          } catch {}
        }
      }
      this.profiles.set(profilesMap);
    } catch {
      this.error.set('Não foi possível carregar seus matches.');
    } finally {
      this.loading.set(false);
    }
  }
}
