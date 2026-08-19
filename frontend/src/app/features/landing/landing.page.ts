import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandComponent } from '../../shared/brand.component';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [RouterLink, BrandComponent, CommonModule, IconComponent],
  standalone: true,
  template: `
    <div class="min-h-screen bg-background">
      <header class="container max-w-6xl mx-auto h-20 flex items-center justify-between px-4">
        <hm-brand />
        <nav class="flex items-center gap-4">
          <a routerLink="/login" class="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Entrar</a>
          <a routerLink="/register" class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition">
            Criar conta
          </a>
        </nav>
      </header>
      <main>
        <section class="relative overflow-hidden">
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-accent/5 to-transparent pointer-events-none"></div>
          <div class="container max-w-6xl mx-auto px-4 py-20 relative">
            <div class="grid lg:grid-cols-2 gap-12 items-center">
              <div class="animate-slide-in-up">
                <p class="text-sm font-bold text-primary uppercase tracking-wider mb-4">Conexões com intenção</p>
                <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight mb-6">
                  Conheça pessoas que combinam com a sua vida.
                </h1>
                <p class="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                  Himeros une descoberta inteligente, segurança e conversas reais em uma experiência de relacionamento feita para durar.
                </p>
                <div class="flex flex-wrap gap-3 mb-10">
                  <a routerLink="/register" class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md hover:opacity-90 transition">
                    <hm-icon name="user-plus" size="20" />
                    Criar conta
                  </a>
                  <a href="#como-funciona" class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-base font-semibold text-foreground hover:bg-muted transition">
                    Como funciona
                    <hm-icon name="arrow-right" size="16" />
                  </a>
                </div>
                <div class="flex flex-wrap gap-4 text-sm font-bold text-muted-foreground">
                  <span class="inline-flex items-center gap-1">18+</span>
                  <span>Privacidade por design</span>
                  <span>Perfis com contexto</span>
                </div>
              </div>
              <div class="relative min-h-[500px] rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex items-center justify-center">
                <div class="w-full max-w-sm rounded-2xl bg-card shadow-xl overflow-hidden border border-border">
                  <div class="aspect-[4/5] bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/40 flex items-center justify-center relative">
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,_white_0_10%,_transparent_11%)] opacity-50"></div>
                    <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <hm-icon name="heart" size="48" class="text-primary" />
                    </div>
                  </div>
                  <div class="p-5 space-y-2">
                    <strong class="block text-lg text-card-foreground">Uma experiência centrada em compatibilidade</strong>
                    <span class="text-sm text-muted-foreground">Interesses • intenção • localização</span>
                  </div>
                </div>
                <div class="absolute -right-3 bottom-16 bg-card border border-border rounded-xl px-4 py-3 shadow-lg font-semibold text-foreground">
                  <span class="text-primary mr-1">✦</span> Descoberta personalizada
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="como-funciona" class="container max-w-6xl mx-auto px-4 py-20">
          <p class="text-sm font-bold text-primary uppercase tracking-wider mb-3">Produto</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-12 max-w-2xl">Menos ruído. Mais contexto.</h2>
          <div class="grid md:grid-cols-3 gap-6">
            @for (feature of features; track feature.title) {
              <article class="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <hm-icon [name]="feature.icon" size="16" />
                </div>
                <b class="text-primary font-bold">{{ feature.number }}</b>
                <h3 class="text-xl font-semibold text-card-foreground mt-1 mb-2">{{ feature.title }}</h3>
                <p class="text-muted-foreground">{{ feature.description }}</p>
              </article>
            }
          </div>
        </section>
      </main>
      <footer class="border-t border-border">
        <div class="container max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <hm-brand />
          <p class="text-sm text-muted-foreground">© 2026 Himeros · Segurança, privacidade e conexões reais. 18+</p>
        </div>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage {
  readonly features = [
    { number: '01', title: 'Monte seu perfil', description: 'Preferências, interesses e o que você procura.', icon: 'user-plus' },
    { number: '02', title: 'Descubra', description: 'Um ranking simples hoje, preparado para evoluir com dados reais.', icon: 'sparkles' },
    { number: '03', title: 'Converse com segurança', description: 'Match mútuo, chat em tempo real, bloqueio e denúncia.', icon: 'shield' }
  ];
}
