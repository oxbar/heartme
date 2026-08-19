import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'hm-select',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div [class]="wrapperClass()">
      <select
        [class]="selectClass()"
        [attr.disabled]="disabled() ? '' : null"
      >
        <ng-content />
      </select>
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
        <hm-icon name="chevron-down" size="16" />
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent {
  readonly class = input<string>('');
  readonly disabled = input(false);

  readonly wrapperClass = computed(() =>
    cn('relative w-full', this.class())
  );

  readonly selectClass = computed(() =>
    cn(
      'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
    )
  );
}
