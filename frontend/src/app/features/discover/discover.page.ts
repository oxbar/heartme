import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { Recommendation } from '../../core/api/contracts';
import { DiscoveryApi } from '../../core/api/discovery.api';
import { ProfileCardComponent } from '../../shared/profile-card.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, ProfileCardComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Perfis para você" subtitle="Baseado em seus interesses e localização." icon="sparkles">
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
      } @else if (!recommendations().length) {
        <hm-empty-state
          icon="sparkles"
          title="Novos perfis aparecerão em breve"
          description="Continue utilizando o app e volte aqui para descobrir pessoas com interesses parecidos."
        />
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          @for (rec of recommendations(); track rec.profile.userId) {
            <div>
              <hm-profile-card
                [profile]="rec.profile"
                (like)="onInteract(rec.profile.userId, 'LIKE')"
                (pass)="onInteract(rec.profile.userId, 'PASS')"
                (superLike)="onInteract(rec.profile.userId, 'SUPER_LIKE')"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscoverPage implements OnInit {
  private readonly api = inject(DiscoveryApi);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly recommendations = signal<Recommendation[]>([]);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await firstValueFrom(this.api.discover(24));
      this.recommendations.set(data);
    } catch {
      this.error.set('Não foi possível carregar os perfis agora.');
    } finally {
      this.loading.set(false);
    }
  }

  async onInteract(userId: string, type: 'LIKE' | 'PASS' | 'SUPER_LIKE'): Promise<void> {
    try {
      await firstValueFrom(this.api.interact(userId, type));
      this.recommendations.update(list => list.filter(r => r.profile.userId !== userId));
    } catch {}
  }
}
