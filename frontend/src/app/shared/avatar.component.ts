import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'hm-avatar',
  imports: [CommonModule],
  standalone: true,
  template: `
    <div
      class="rounded-full overflow-hidden inline-grid place-items-center bg-gradient-to-br from-blue-100 to-indigo-50 text-primary font-extrabold flex-none"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      @if (src()) {
        <img class="w-full h-full object-cover" [src]="src()" [alt]="name()" />
      } @else {
        <span>{{ initials() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarComponent {
  readonly src = input<string | null>(null);
  readonly name = input('Himeros');
  readonly size = input(48);
  readonly initials = computed(() => this.name().trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'H');
}
