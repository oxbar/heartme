import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../core/auth/session.store';
import { ProfileStore } from '../core/state/profile.store';
import { IconComponent } from '../ui/icon/icon.component';
import { BrandComponent } from '../shared/brand.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'hm-app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    BrandComponent
  ],
  template: `
    <div class="flex min-h-screen bg-background">
      <aside class="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div class="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <hm-brand link="/app/discover" />
        </div>
        <nav class="flex-1 space-y-1 p-4">
          @for (item of nav(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
            >
              <hm-icon [name]="item.icon" size="20" />
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="border-t border-sidebar-border p-4">
          <button
            type="button"
            (click)="logout()"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <hm-icon name="log-out" size="20" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div class="flex flex-1 flex-col">
        <header class="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:hidden">
          <button
            type="button"
            (click)="sheetOpen.set(true)"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Abrir menu"
          >
            <hm-icon name="menu" size="20" />
          </button>
          <hm-brand link="/app/discover" />
          <div class="relative">
            <button
              type="button"
              (click)="dropdownOpen.set(!dropdownOpen())"
              class="inline-flex items-center gap-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Menu do usuário"
            >
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                {{ userInitials() }}
              </div>
              <hm-icon name="chevron-down" size="16" class="text-muted-foreground" />
            </button>
            @if (dropdownOpen()) {
              <div class="absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95">
                <a
                  routerLink="/app/profile"
                  (click)="dropdownOpen.set(false)"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  <hm-icon name="user" size="16" />
                  <span>Perfil</span>
                </a>
                <a
                  routerLink="/app/settings"
                  (click)="dropdownOpen.set(false)"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  <hm-icon name="settings" size="16" />
                  <span>Configurações</span>
                </a>
                <div class="my-1 h-px bg-border" role="separator"></div>
                <button
                  type="button"
                  (click)="logout(); dropdownOpen.set(false);"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-destructive focus:text-destructive"
                >
                  <hm-icon name="log-out" size="16" />
                  <span>Sair</span>
                </button>
              </div>
            }
          </div>
        </header>

        <div class="w-full flex-1 min-w-0">
          <main class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-20 lg:pb-8">
            <router-outlet />
          </main>
        </div>

        <nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background lg:hidden">
          <div class="grid grid-cols-5 px-2 py-2">
            @for (item of mobileNav(); track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="text-primary"
                class="flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
              >
                <hm-icon [name]="item.icon" size="20" />
                <span>{{ item.label }}</span>
              </a>
            }
          </div>
        </nav>
      </div>

      @if (sheetOpen()) {
        <div class="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div class="fixed inset-0 bg-background/80 backdrop-blur-sm" (click)="sheetOpen.set(false)"></div>
          <div class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-xl animate-in slide-in-from-left">
            <div class="flex h-16 items-center justify-between border-b border-border px-6">
              <a class="flex items-center gap-2" routerLink="/app/discover" (click)="sheetOpen.set(false)">
                <hm-brand link="/app/discover" />
              </a>
            </div>
            <nav class="flex-1 space-y-1 p-4 overflow-y-auto">
              @for (item of nav(); track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-accent text-accent-foreground"
                  (click)="sheetOpen.set(false)"
                  class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
                >
                  <hm-icon [name]="item.icon" size="20" />
                  <span>{{ item.label }}</span>
                </a>
              }
            </nav>
            <div class="border-t border-border p-4">
              <button
                type="button"
                (click)="logout(); sheetOpen.set(false);"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <hm-icon name="log-out" size="20" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly profileStore = inject(ProfileStore);

  readonly sheetOpen = signal(false);
  readonly dropdownOpen = signal(false);

  readonly nav = signal<NavItem[]>([
    { path: '/app/discover', label: 'Descobrir', icon: 'compass' },
    { path: '/app/matches', label: 'Matches', icon: 'heart' },
    { path: '/app/messages', label: 'Mensagens', icon: 'message-square' },
    { path: '/app/notifications', label: 'Notificações', icon: 'bell' },
    { path: '/app/profile', label: 'Perfil', icon: 'user' },
    { path: '/app/premium', label: 'Premium', icon: 'crown' },
    { path: '/app/safety', label: 'Segurança', icon: 'shield-check' },
    { path: '/app/settings', label: 'Configurações', icon: 'settings' }
  ]);

  readonly mobileNav = computed(() => this.nav().slice(0, 5));

  readonly userInitials = computed(() => {
    const profile = this.profileStore.profile();
    if (profile?.displayName) {
      return profile.displayName.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'H';
    }
    return 'H';
  });

  async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/']);
  }
}
