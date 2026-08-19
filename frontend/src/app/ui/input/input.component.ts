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
  selector: 'hm-input, input[hmInput]',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  readonly class = input<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly disabled = input(false);

  @HostBinding('attr.type')
  get typeAttr() {
    return this.type();
  }

  @HostBinding('attr.placeholder')
  get placeholderAttr() {
    return this.placeholder();
  }

  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.disabled() ? '' : null;
  }

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.class()
    )
  );
}
