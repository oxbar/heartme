import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'hm-guest-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="flex min-h-screen flex-col bg-background">
      <header class="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container flex h-16 items-center justify-between">
          <a class="flex items-center gap-2 font-bold text-lg tracking-tight" routerLink="/" aria-label="Himeros">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black">H</span>
            <span>Himeros</span>
          </a>
          <nav class="flex items-center gap-2">
            <a
              routerLink="/login"
              class="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Entrar
            </a>
            <a
              routerLink="/register"
              class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Criar conta
            </a>
          </nav>
        </div>
      </header>
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestLayoutComponent {}
