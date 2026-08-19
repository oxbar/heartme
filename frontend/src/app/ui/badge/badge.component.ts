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

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground border border-border',
};

@Component({
  selector: 'hm-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('default');
  readonly class = input<string>('');

  @HostBinding('class')
  readonly hostClass = computed(() =>
    cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      variantClasses[this.variant()],
      this.class()
    )
  );
}
