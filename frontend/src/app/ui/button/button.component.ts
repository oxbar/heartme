// standalone:true, imports:[CommonModule]
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'outline';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

@Component({
  selector: 'hm-button, button[hmButton]',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');
  readonly disabled = input(false);
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      variantClasses[this.variant()],
      sizeClasses[this.size()],
      this.class()
    )
  );

  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.disabled() ? '' : null;
  }
}
