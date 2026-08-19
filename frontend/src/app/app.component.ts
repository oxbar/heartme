import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionStore } from './core/auth/session.store';

@Component({
  selector: 'hm-app-root',
  imports: [RouterOutlet],
  template: `
    @if (sessionStore.restoring()) {
      <div class="fixed inset-0 flex items-center justify-center bg-background">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  readonly sessionStore = inject(SessionStore);
}
