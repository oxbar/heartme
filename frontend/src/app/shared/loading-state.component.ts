import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'hm-loading-state',
  imports: [CommonModule],
  standalone: true,
  template: `
    <div class="flex flex-col gap-4 py-6 animate-fade-in">
      <div class="h-8 w-1/3 rounded-md bg-muted animate-skeleton-pulse"></div>
      @for (_ of [0, 1, 2]; track _) {
        <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-muted animate-skeleton-pulse flex-none"></div>
            <div class="flex-1 flex flex-col gap-3">
              <div class="h-4 w-1/3 rounded bg-muted animate-skeleton-pulse"></div>
              <div class="h-3 w-2/3 rounded bg-muted animate-skeleton-pulse"></div>
              <div class="h-3 w-1/2 rounded bg-muted animate-skeleton-pulse"></div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {}
