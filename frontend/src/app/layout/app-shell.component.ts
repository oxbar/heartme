import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../core/auth/session.store';
import { ProfileStore } from '../core/state/profile.store';
import { IconComponent } from '../ui/icon/icon.component';
import { BrandComponent } from '../shared/brand.component';
import { AppSidebarComponent } from './app-sidebar.component';

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
    BrandComponent,
    AppSidebarComponent
  ],
  template: `
    <div class="hm-app-frame">
      <hm-app-sidebar class="hidden lg:block lg:w-[380px] lg:shrink-0" (logout)="logout()" />

      <div class="hm-app-main">
        <header class="hm-mobile-header lg:hidden">
          <button
            type="button"
            (click)="sheetOpen.set(true)"
            class="hm-mobile-icon-button"
            aria-label="Abrir menu"
          >
            <hm-icon name="menu" size="21" />
          </button>
          <hm-brand link="/app/discover" />
          <a routerLink="/app/profile" class="hm-mobile-avatar" aria-label="Abrir perfil">
            {{ userInitials() }}
          </a>
        </header>

        <main class="hm-route-stage">
          <router-outlet />
        </main>

        <nav class="hm-mobile-bottom-nav lg:hidden" aria-label="Navegação principal">
          @for (item of mobileNav(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="is-active"
              class="hm-mobile-nav-item"
            >
              <hm-icon [name]="item.icon" size="20" />
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </div>

      @if (sheetOpen()) {
        <div class="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button class="absolute inset-0 bg-black/70" type="button" aria-label="Fechar menu" (click)="sheetOpen.set(false)"></button>
          <aside class="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col border-r border-white/10 bg-[#101011] shadow-2xl">
            <div class="hm-mobile-drawer-brand">
              <hm-brand link="/app/discover" />
              <button type="button" class="hm-mobile-icon-button" aria-label="Fechar menu" (click)="sheetOpen.set(false)">
                <hm-icon name="x" size="20" />
              </button>
            </div>
            <nav class="flex-1 space-y-1 overflow-y-auto p-3">
              @for (item of nav(); track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-white/10 text-white"
                  (click)="sheetOpen.set(false)"
                  class="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <hm-icon [name]="item.icon" size="20" />
                  <span>{{ item.label }}</span>
                </a>
              }
            </nav>
            <div class="border-t border-white/10 p-3">
              <button
                type="button"
                (click)="logout(); sheetOpen.set(false)"
                class="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <hm-icon name="log-out" size="20" />
                <span>Sair</span>
              </button>
            </div>
          </aside>
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

  readonly nav = signal<NavItem[]>([
    { path: '/app/discover', label: 'Descobrir', icon: 'compass' },
    { path: '/app/matches', label: 'Matches', icon: 'heart' },
    { path: '/app/messages', label: 'Mensagens', icon: 'message-circle' },
    { path: '/app/profile', label: 'Perfil', icon: 'user' },
    { path: '/app/premium', label: 'Premium', icon: 'sparkles' },
    { path: '/app/notifications', label: 'Notificações', icon: 'bell' },
    { path: '/app/safety', label: 'Segurança', icon: 'shield-check' },
    { path: '/app/settings', label: 'Configurações', icon: 'settings' }
  ]);

  readonly mobileNav = computed(() => this.nav().slice(0, 4));

  readonly userInitials = computed(() => {
    const profile = this.profileStore.profile();
    if (!profile?.displayName) return 'H';
    return profile.displayName.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join('').toUpperCase() || 'H';
  });

  constructor() {
    void this.profileStore.load().catch(() => null);
  }

  async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/']);
  }
}
