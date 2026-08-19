import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'hm-page-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div class="flex items-start gap-3 min-w-0">
        @if (icon()) {
          <div class="hidden sm:flex h-10 w-10 items-center justify-center shrink-0 rounded-xl bg-primary/10 text-primary">
            <hm-icon [name]="icon()" size="20" />
          </div>
        }
        <div class="min-w-0">
          <h1 class="text-2xl font-extrabold tracking-tight text-foreground">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="text-sm text-muted-foreground mt-1">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <ng-content select="[pageHeaderActions]" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly icon = input<string>('');
}
