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
  selector: 'hm-label, label[hmLabel]',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelComponent {
  readonly class = input<string>('');
  readonly for = input<string>('');

  @HostBinding('attr.for')
  get forAttr() {
    return this.for() || null;
  }

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      this.class()
    )
  );
}
