import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'hm-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon [name]="name()" [size]="size()" [strokeWidth]="strokeWidth()" [class]="'inline ' + class()" aria-hidden="true"></lucide-icon>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number | string>(20);
  readonly strokeWidth = input<number | string>(2);
  readonly class = input<string>('');
}
