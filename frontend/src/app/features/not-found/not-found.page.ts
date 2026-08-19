import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [CommonModule, RouterLink, IconComponent],
  standalone: true,
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div class="max-w-lg w-full text-center animate-fade-in">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-8">
          <hm-icon name="alert-triangle" size="40" />
        </div>
        <p class="text-7xl sm:text-9xl font-black tracking-tighter text-primary leading-none mb-6">404</p>
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">Essa página não existe.</h1>
        <p class="text-muted-foreground mb-10 max-w-sm mx-auto">
          O endereço que você tentou acessar não foi encontrado ou foi movido.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            routerLink="/"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            <hm-icon name="home" size="20" />
            Voltar para início
          </a>
          <a
            routerLink="/app/discover"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition"
          >
            Ir para Descobrir
          </a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundPage {}
