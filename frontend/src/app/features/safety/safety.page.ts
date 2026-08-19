import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

type SafetyTab = 'blocks' | 'reports';

@Component({
  imports: [CommonModule, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Segurança" subtitle="Gerencie bloqueios e denúncias." icon="shield-check"></hm-page-header>

      <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div role="tablist" class="flex items-center border-b border-border">
          @for (tab of tabs; track tab.value) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.value"
              (click)="activeTab.set(tab.value)"
              class="flex-1 sm:flex-none px-5 py-3 text-sm font-semibold transition relative"
              [ngClass]="activeTab() === tab.value
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'"
            >
              <span class="inline-flex items-center gap-2">
                <hm-icon [name]="tab.icon" size="16" />
                {{ tab.label }}
              </span>
              @if (activeTab() === tab.value) {
                <span class="absolute left-3 right-3 bottom-0 h-0.5 bg-primary rounded-t"></span>
              }
            </button>
          }
        </div>

        <div class="p-6">
          @if (activeTab() === 'blocks') {
            <div>
              @if (loading()) {
                <div class="space-y-3">
                  @for (_ of [0,1,2]; track _) {
                    <div class="h-16 rounded-lg bg-muted animate-skeleton-pulse"></div>
                  }
                </div>
              } @else if (!blocksList().length) {
                <hm-empty-state
                  icon="ban"
                  title="Nenhum bloqueio ativo"
                  description="Bloqueie usuários inconvenientes aqui. Eles não poderão interagir com você."
                />
              } @else {
                <div class="grid gap-3">
                  @for (b of blocksList(); track b.id) {
                    <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                          {{ b.name[0] }}
                        </div>
                        <div class="min-w-0">
                          <p class="font-semibold text-foreground truncate">{{ b.name }}</p>
                          <p class="text-xs text-muted-foreground">Bloqueado em {{ b.date }}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                      >
                        Desbloquear
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (activeTab() === 'reports') {
            <div>
              @if (loading()) {
                <div class="space-y-3">
                  @for (_ of [0,1,2]; track _) {
                    <div class="h-20 rounded-lg bg-muted animate-skeleton-pulse"></div>
                  }
                </div>
              } @else if (!reportsList().length) {
                <hm-empty-state
                  icon="flag"
                  title="Nenhuma denúncia enviada"
                  description="Denúncias ajudam a manter a comunidade segura para todos."
                />
              } @else {
                <div class="grid gap-3">
                  @for (r of reportsList(); track r.id) {
                    <div class="rounded-xl border border-border bg-background p-4">
                      <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="min-w-0">
                          <p class="font-semibold text-foreground truncate">Denúncia contra {{ r.name }}</p>
                          <p class="text-xs text-muted-foreground mt-0.5">Motivo: {{ r.reason }} · {{ r.date }}</p>
                        </div>
                        <span class="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground flex-none">
                          {{ r.status }}
                        </span>
                      </div>
                      @if (r.details) {
                        <p class="text-sm text-muted-foreground line-clamp-2">{{ r.details }}</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SafetyPage implements OnInit {
  readonly activeTab = signal<SafetyTab>('blocks');
  readonly loading = signal(true);
  readonly blocksList = signal<any[]>([]);
  readonly reportsList = signal<any[]>([]);

  readonly tabs: { value: SafetyTab; label: string; icon: string }[] = [
    { value: 'blocks', label: 'Bloqueados', icon: 'ban' },
    { value: 'reports', label: 'Denúncias', icon: 'flag' }
  ];

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      this.blocksList.set([]);
      this.reportsList.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
