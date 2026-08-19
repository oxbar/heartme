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

@Component({
  selector: 'hm-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'rounded-md bg-muted animate-skeleton-pulse',
      this.class()
    )
  );
}
