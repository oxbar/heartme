import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, signal, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'hm-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hm-slider" [class]="class()">
      @if (label()) {
        <div class="hm-slider-header">
          <span class="hm-slider-label">{{ label() }}</span>
          <span class="hm-slider-value">{{ formattedValue() }}</span>
        </div>
      }
      <div class="hm-slider-track-wrap" #trackRef (pointerdown)="onTrackPointerDown($event)">
        <div class="hm-slider-track">
          <div class="hm-slider-fill" [style]="fillStyle()"></div>
        </div>
        @if (dual()) {
          <div class="hm-slider-thumb hm-slider-thumb--min" #thumbMin
            [style.left.%]="minPercent()" (pointerdown)="onThumbPointerDown($event,'min')"
            role="slider" [attr.aria-valuemin]="min()" [attr.aria-valuemax]="max()"
            [attr.aria-valuenow]="valueMin()" tabindex="0"
            (keydown)="onKey($event,'min')"></div>
          <div class="hm-slider-thumb hm-slider-thumb--max" #thumbMax
            [style.left.%]="maxPercent()" (pointerdown)="onThumbPointerDown($event,'max')"
            role="slider" [attr.aria-valuemin]="min()" [attr.aria-valuemax]="max()"
            [attr.aria-valuenow]="valueMax()" tabindex="0"
            (keydown)="onKey($event,'max')"></div>
        } @else {
          <div class="hm-slider-thumb" #thumbMin
            [style.left.%]="minPercent()" (pointerdown)="onThumbPointerDown($event,'min')"
            role="slider" [attr.aria-valuemin]="min()" [attr.aria-valuemax]="max()"
            [attr.aria-valuenow]="valueMin()" tabindex="0"
            (keydown)="onKey($event,'min')"></div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent implements OnInit, OnDestroy {
  readonly class = input<string>('');
  readonly label = input<string>('');
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly dual = input<boolean>(false);
  readonly valueMin = input<number>(0);
  readonly valueMax = input<number>(100);
  readonly suffix = input<string>('');
  readonly prefix = input<string>('');

  readonly valueMinChange = output<number>();
  readonly valueMaxChange = output<number>();

  @ViewChild('trackRef') trackRef?: ElementRef<HTMLDivElement>;

  private dragging: 'min' | 'max' | null = null;
  private onDocUp = () => this.onPointerUp();
  private onDocMove = (e: PointerEvent) => this.onPointerMove(e);

  readonly minPercent = computed(() =>
    ((this.valueMin() - this.min()) / (this.max() - this.min())) * 100
  );
  readonly maxPercent = computed(() =>
    this.dual()
      ? ((this.valueMax() - this.min()) / (this.max() - this.min())) * 100
      : 100
  );

  readonly fillStyle = computed(() => {
    if (this.dual()) {
      const l = this.minPercent();
      const r = this.maxPercent();
      return `left:${l}%; right:${100 - r}%;`;
    }
    return `left:0%; right:${100 - this.minPercent()}%;`;
  });

  readonly formattedValue = computed(() => {
    const p = this.prefix();
    const s = this.suffix();
    if (this.dual()) {
      return `${p}${this.valueMin()}${s} – ${p}${this.valueMax()}${this.valueMax() >= this.max() ? '+' : ''}${s}`;
    }
    return `${p}${this.valueMin()}${s}`;
  });

  ngOnInit(): void {
    document.addEventListener('pointerup', this.onDocUp);
    document.addEventListener('pointercancel', this.onDocUp);
    document.addEventListener('pointermove', this.onDocMove);
  }
  ngOnDestroy(): void {
    document.removeEventListener('pointerup', this.onDocUp);
    document.removeEventListener('pointercancel', this.onDocUp);
    document.removeEventListener('pointermove', this.onDocMove);
  }

  private clampStep(v: number): number {
    const mn = this.min(), mx = this.max(), st = this.step();
    const val = Math.min(mx, Math.max(mn, v));
    return Math.round((val - mn) / st) * st + mn;
  }

  private emitNext(which: 'min' | 'max', nextRaw: number): void {
    const next = this.clampStep(nextRaw);
    if (this.dual()) {
      if (which === 'min') {
        const capped = Math.min(next, this.valueMax());
        if (capped !== this.valueMin()) this.valueMinChange.emit(capped);
      } else {
        const floored = Math.max(next, this.valueMin());
        if (floored !== this.valueMax()) this.valueMaxChange.emit(floored);
      }
    } else {
      if (next !== this.valueMin()) this.valueMinChange.emit(next);
    }
  }

  onTrackPointerDown(e: PointerEvent): void {
    if (!this.trackRef) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const value = this.min() + pct * (this.max() - this.min());
    if (this.dual()) {
      const dMin = Math.abs(value - this.valueMin());
      const dMax = Math.abs(value - this.valueMax());
      const which: 'min' | 'max' = dMin <= dMax ? 'min' : 'max';
      this.dragging = which;
      this.emitNext(which, value);
    } else {
      this.dragging = 'min';
      this.emitNext('min', value);
    }
  }

  onThumbPointerDown(e: PointerEvent, which: 'min' | 'max'): void {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.dragging = which;
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.dragging || !this.trackRef) return;
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const value = this.min() + pct * (this.max() - this.min());
    this.emitNext(this.dragging, value);
  }

  onPointerUp(): void {
    this.dragging = null;
  }

  onKey(e: KeyboardEvent, which: 'min' | 'max'): void {
    const step = (e.shiftKey ? 10 : 1) * this.step();
    const cur = which === 'min' ? this.valueMin() : this.valueMax();
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        this.emitNext(which, cur - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        this.emitNext(which, cur + step);
        break;
      case 'Home':
        e.preventDefault();
        this.emitNext(which, this.min());
        break;
      case 'End':
        e.preventDefault();
        this.emitNext(which, this.max());
        break;
    }
  }
}
