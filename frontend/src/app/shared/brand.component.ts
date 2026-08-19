import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-brand',
  imports: [RouterLink, IconComponent],
  standalone: true,
  template: `
    <a class="inline-flex items-center gap-2 text-decoration-none font-extrabold tracking-tight text-xl text-foreground" [routerLink]="link()" aria-label="Himeros">
      <span class="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <hm-icon name="heart" size="20" />
      </span>
      <span>Himeros</span>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandComponent {
  readonly link = input<string>('/');
}
