import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

export type BrandVariant =
  | 'primary'
  | 'horizontal-gold'
  | 'horizontal-white'
  | 'horizontal-black'
  | 'wordmark'
  | 'emblem'
  | 'icon';

@Component({
  selector: 'hm-brand',
  imports: [RouterLink, CommonModule],
  standalone: true,
  host: {
    '[attr.data-variant]': 'variant()',
    class: 'hm-brand'
  },
  template: `
    <a
      class="hm-brand-link"
      [routerLink]="link()"
      [aria-label]="ariaLabel()"
      [style.height.px]="height()"
      [style.maxHeight.px]="height()"
    >
      <img
        [src]="src()"
        [alt]="ariaLabel()"
        class="hm-brand-img"
        [style.height.px]="height()"
        loading="eager"
        decoding="async"
      />
    </a>
  `,
  styles: [`
    :host { display: inline-block; }
    .hm-brand-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      outline: none;
      user-select: none;
      border-radius: 8px;
    }
    .hm-brand-link:focus-visible {
      box-shadow: 0 0 0 3px hsl(var(--ring) / 0.45);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--himeros-ring) 45%, transparent);
    }
    .hm-brand-img {
      display: block;
      width: auto;
      height: 100%;
      max-height: 100%;
      object-fit: contain;
      flex: 0 0 auto;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandComponent {
  readonly link = input<string>('/');
  readonly variant = input<BrandVariant>('horizontal-gold');
  readonly height = input<number>(38);
  readonly ariaLabel = input<string>('Himeros');

  private readonly ASSET_BASE = '/assets/brand/png';

  protected readonly src = computed<string>(() => {
    const base = this.ASSET_BASE;
    switch (this.variant()) {
      case 'primary':           return `${base}/logo-primary-gold.png`;
      case 'horizontal-white':  return `${base}/logo-horizontal-white.png`;
      case 'horizontal-black':  return `${base}/logo-horizontal-black.png`;
      case 'wordmark':          return `${base}/logo-wordmark-gold.png`;
      case 'emblem':            return `${base}/emblem-gold.png`;
      case 'icon':              return `${base}/icon-gold.png`;
      case 'horizontal-gold':
      default:                  return `${base}/logo-horizontal-gold.png`;
    }
  });
}
