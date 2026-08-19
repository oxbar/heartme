import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, FormsModule, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="h-full overflow-y-auto p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl">
      <hm-page-header title="Configurações" subtitle="Personalize sua experiência no Himeros." icon="settings"></hm-page-header>

      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <hm-icon name="bell" size="20" class="text-primary" />
            Notificações
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-foreground">Notificações push</p>
                <p class="text-sm text-muted-foreground">Receber avisos sobre matches e mensagens.</p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="pushEnabled()"
                (click)="pushEnabled.set(!pushEnabled())"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition flex-none"
                [ngClass]="pushEnabled() ? 'bg-primary' : 'bg-input'"
              >
                <span
                  class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                  [ngClass]="pushEnabled() ? 'translate-x-5' : 'translate-x-0.5'"
                ></span>
              </button>
            </div>
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-foreground">Som</p>
                <p class="text-sm text-muted-foreground">Reproduzir som em novas mensagens.</p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="soundEnabled()"
                (click)="soundEnabled.set(!soundEnabled())"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition flex-none"
                [ngClass]="soundEnabled() ? 'bg-primary' : 'bg-input'"
              >
                <span
                  class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                  [ngClass]="soundEnabled() ? 'translate-x-5' : 'translate-x-0.5'"
                ></span>
              </button>
            </div>
          </div>
        </div>

        <div class="h-px bg-border"></div>

        <div>
          <h2 class="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <hm-icon name="mail" size="20" class="text-primary" />
            Preferências de e-mail
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-foreground">Resumo semanal</p>
                <p class="text-sm text-muted-foreground">E-mail com destaques de perfis compatíveis.</p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="emailWeekly()"
                (click)="emailWeekly.set(!emailWeekly())"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition flex-none"
                [ngClass]="emailWeekly() ? 'bg-primary' : 'bg-input'"
              >
                <span
                  class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                  [ngClass]="emailWeekly() ? 'translate-x-5' : 'translate-x-0.5'"
                ></span>
              </button>
            </div>
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-foreground">Atualizações de produto</p>
                <p class="text-sm text-muted-foreground">Novidades e melhorias no Himeros.</p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="emailProduct()"
                (click)="emailProduct.set(!emailProduct())"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition flex-none"
                [ngClass]="emailProduct() ? 'bg-primary' : 'bg-input'"
              >
                <span
                  class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                  [ngClass]="emailProduct() ? 'translate-x-5' : 'translate-x-0.5'"
                ></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-destructive mb-2 flex items-center gap-2">
          <hm-icon name="shield-alert" size="20" />
          Zona de perigo
        </h2>
        <p class="text-sm text-muted-foreground mb-5">
          Ações abaixo afetam o acesso de todos os dispositivos conectados à sua conta.
        </p>
        <button
          type="button"
          [disabled]="loggingOutAll()"
          (click)="logoutAll()"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          @if (loggingOutAll()) {
            <hm-icon name="loader-2" size="16" class="animate-spin" />
            Saindo...
          } @else {
            <hm-icon name="log-out" size="16" />
            Sair de todos os dispositivos
          }
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPage implements OnInit {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  readonly loggingOutAll = signal(false);

  readonly pushEnabled = signal(true);
  readonly soundEnabled = signal(true);
  readonly emailWeekly = signal(true);
  readonly emailProduct = signal(false);

  async ngOnInit(): Promise<void> {}

  async logoutAll(): Promise<void> {
    if (this.loggingOutAll()) return;
    this.loggingOutAll.set(true);
    try {
      await this.session.logoutAll();
      await this.router.navigate(['/']);
    } finally {
      this.loggingOutAll.set(false);
    }
  }
}
