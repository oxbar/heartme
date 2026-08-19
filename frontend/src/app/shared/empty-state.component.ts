import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-empty-state',
  imports: [CommonModule, IconComponent],
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center text-center py-16 px-6">
      @if (icon()) {
        <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5 text-muted-foreground">
          <hm-icon [name]="icon()!" size="28" />
        </div>
      }
      <h3 class="text-lg font-semibold text-foreground mb-2">{{ title() }}</h3>
      @if (description()) {
        <p class="text-muted-foreground max-w-sm mb-6">{{ description() }}</p>
      }
      @if (buttonLabel()) {
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
          (click)="action.emit()"
        >
          {{ buttonLabel() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly icon = input<string>('');
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly buttonLabel = input<string>('');
  readonly action = output<void>();
}
