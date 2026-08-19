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
  selector: 'hm-textarea, textarea[hmTextarea]',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaComponent {
  readonly class = input<string>('');
  readonly placeholder = input<string>('');
  readonly disabled = input(false);

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
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.class()
    )
  );
}
