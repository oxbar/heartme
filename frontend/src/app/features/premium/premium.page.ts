import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { SubscriptionPlan } from '../../core/api/contracts';
import { PremiumApi } from '../../core/api/premium.api';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, LoadingStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-8 animate-fade-in">
      <hm-page-header title="Himeros Premium" subtitle="Desbloqueie recursos exclusivos para encontrar melhores conexões." icon="crown"></hm-page-header>

      <div class="text-center max-w-2xl mx-auto">
        @if (active()) {
          <div class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <hm-icon name="sparkles" size="16" />
            Assinatura ativa · Plano {{ planLabel() }}
          </div>
        }
      </div>

      @if (loading()) {
        <hm-loading-state />
      } @else {
        <div class="grid md:grid-cols-3 gap-6">
          @for (plan of plans; track plan.value) {
            <div
              class="relative rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col transition"
              [ngClass]="plan.highlighted
                ? 'border-primary ring-2 ring-primary/20 scale-[1.02]'
                : 'border-border hover:shadow-md'"
            >
              @if (plan.highlighted) {
                <div class="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider text-center py-1.5">
                  Mais popular
                </div>
              }
              <div class="p-6 flex flex-col flex-1">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center"
                    [ngClass]="plan.highlighted
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'"
                  >
                    <hm-icon [name]="plan.icon" size="20" />
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-card-foreground">{{ plan.name }}</h3>
                    <p class="text-xs text-muted-foreground">{{ plan.tagline }}</p>
                  </div>
                </div>
                <div class="mb-5">
                  <span class="text-4xl font-extrabold tracking-tight text-card-foreground">R$ {{ plan.price }}</span>
                  <span class="text-sm text-muted-foreground ml-1">/mês</span>
                  <p class="text-xs text-muted-foreground mt-1">Cobrado {{ plan.billing }}</p>
                </div>
                <ul class="space-y-2.5 mb-6 flex-1">
                  @for (feature of plan.features; track feature) {
                    <li class="flex items-start gap-2 text-sm">
                      <hm-icon name="check" size="16" class="text-primary flex-none mt-0.5" />
                      <span class="text-foreground">{{ feature }}</span>
                    </li>
                  }
                </ul>
                <button
                  type="button"
                  (click)="purchase(plan.value)"
                  [disabled]="purchasing() === plan.value || (active() && !plan.highlighted)"
                  class="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  [ngClass]="plan.highlighted
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'border border-border bg-background text-foreground hover:bg-muted'"
                >
                  @if (purchasing() === plan.value) {
                    <span class="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></span>
                    Processando...
                  } @else if (active() && plan.highlighted) {
                    <hm-icon name="sparkles" size="16" />
                    Seu plano atual
                  } @else {
                    Assinar {{ plan.name }}
                  }
                </button>
              </div>
            </div>
          }
        </div>
      }

      <p class="text-center text-xs text-muted-foreground">
        Pagamento seguro via Stripe. Cancele a qualquer momento nas configurações.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PremiumPage implements OnInit {
  private readonly api = inject(PremiumApi);

  readonly loading = signal(true);
  readonly purchasing = signal<SubscriptionPlan | ''>('');
  readonly subscription = signal<any>(null);

  readonly active = computed(() => !!this.subscription()?.status && ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(this.subscription()!.status.toUpperCase()));
  readonly planLabel = computed(() => {
    const p = this.subscription()?.plan;
    if (p === 'MONTHLY') return 'Mensal';
    if (p === 'QUARTERLY') return 'Trimestral';
    if (p === 'YEARLY') return 'Anual';
    return '';
  });

  readonly plans = [
    {
      value: 'MONTHLY' as SubscriptionPlan,
      name: 'Mensal',
      tagline: 'Flexibilidade mensal',
      price: '29,90',
      billing: 'mensalmente',
      icon: 'zap',
      highlighted: false,
      features: [
        'Descoberta ilimitada',
        'Até 10 Super Likes por dia',
        'Ver quem curtiu você',
        'Suporte prioritário'
      ]
    },
    {
      value: 'QUARTERLY' as SubscriptionPlan,
      name: 'Trimestral',
      tagline: 'Melhor custo-benefício',
      price: '24,90',
      billing: 'a cada 3 meses (R$ 74,70)',
      icon: 'sparkles',
      highlighted: true,
      features: [
        'Tudo do Mensal',
        'Até 20 Super Likes por dia',
        'Desfazer últimos passes',
        'Filtros avançados',
        'Modo incógnito'
      ]
    },
    {
      value: 'YEARLY' as SubscriptionPlan,
      name: 'Anual',
      tagline: 'Compromisso, maior economia',
      price: '19,90',
      billing: 'anualmente (R$ 238,80)',
      icon: 'gem',
      highlighted: false,
      features: [
        'Tudo do Trimestral',
        'Super Likes ilimitados',
        'Posição destacada no ranking',
        'Badge Premium exclusivo',
        'Descontos em parceiros'
      ]
    }
  ];

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.subscription());
      this.subscription.set(data?.subscription || null);
    } catch {}
    finally { this.loading.set(false); }
  }

  async purchase(plan: SubscriptionPlan): Promise<void> {
    if (this.purchasing()) return;
    this.purchasing.set(plan);
    try {
      await firstValueFrom(this.api.purchase(plan));
    } catch {}
    finally { this.purchasing.set(''); }
  }
}
