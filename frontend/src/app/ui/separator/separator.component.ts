// standalone:true, imports:[CommonModule]
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

type SeparatorOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'hm-separator',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeparatorComponent {
  readonly orientation = input<SeparatorOrientation>('horizontal');
  readonly class = input<string>('');

  @HostBinding('attr.role')
  readonly role = 'separator';

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'shrink-0 bg-border',
      this.orientation() === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      this.class()
    )
  );
}
