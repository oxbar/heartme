import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PhotoView } from '../../core/api/contracts';

@Component({
  selector: 'hm-photo-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #viewportRef
      class="hm-photo-carousel"
      [class.is-dragging]="isDragging()"
      [attr.aria-roledescription]="'carousel'"
      [attr.aria-label]="ariaLabel()"
    >
      <div
        class="hm-photo-track"
        [style.transform]="trackTransform()"
        [style.transition]="isDragging() ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
      >
        @for (photo of orderedPhotos(); track photo.id) {
          <div class="hm-photo-slide" [style.background-image]="'url(' + photo.url + ')'">
            <img [src]="photo.url" [alt]="slideAlt(photo, $index)" loading="eager" draggable="false" />
          </div>
        } @empty {
          <div class="hm-photo-slide is-fallback">
            <span>{{ fallbackText() }}</span>
          </div>
        }
      </div>

      @if (orderedPhotos().length > 1) {
        <div class="hm-photo-progress" aria-hidden="true">
          @for (_ of orderedPhotos(); track $index) {
            <span [class.is-active]="$index === currentIndex()"></span>
          }
        </div>

        <button
          type="button"
          class="hm-photo-nav is-prev"
          (click)="prev()"
          aria-label="Foto anterior"
          [disabled]="isDragging()"
        ></button>
        <button
          type="button"
          class="hm-photo-nav is-next"
          (click)="next()"
          aria-label="Próxima foto"
          [disabled]="isDragging()"
        ></button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.ArrowLeft)': 'prev()',
    '(keydown.ArrowRight)': 'next()',
  },
})
export class PhotoCarouselComponent {
  readonly photos = input<PhotoView[]>([]);
  readonly fallbackName = input('Himeros');
  readonly ariaLabel = input('Fotos do perfil');

  readonly indexChange = output<number>();

  @ViewChild('viewportRef') viewportRef?: ElementRef<HTMLDivElement>;

  readonly currentIndex = signal(0);
  readonly isDragging = signal(false);

  private dragStartX = 0;
  private dragOffsetX = signal(0);
  private pointerId: number | null = null;

  readonly orderedPhotos = computed(() =>
    [...this.photos()].sort((a, b) => a.position - b.position),
  );

  readonly trackTransform = computed(() => {
    const count = Math.max(1, this.orderedPhotos().length);
    const base = -(this.currentIndex() * 100);
    const offsetPct = this.viewportRef?.nativeElement
      ? (this.dragOffsetX() / this.viewportRef.nativeElement.clientWidth) * 100
      : 0;
    return `translate3d(${base + offsetPct}%, 0, 0)`;
  });

  readonly fallbackText = computed(() => {
    const name = this.fallbackName() || 'Himeros';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'H';
  });

  constructor() {
    effect(() => {
      this.photos();
      this.goTo(Math.min(this.currentIndex(), Math.max(0, this.orderedPhotos().length - 1)), false);
    });
  }

  slideAlt(photo: PhotoView, index: number): string {
    return `Foto ${index + 1} de ${this.orderedPhotos().length}${this.fallbackName() ? ' de ' + this.fallbackName() : ''}`;
  }

  prev(): void {
    const count = this.orderedPhotos().length;
    if (count <= 1) return;
    this.goTo((this.currentIndex() - 1 + count) % count, true);
  }

  next(): void {
    const count = this.orderedPhotos().length;
    if (count <= 1) return;
    this.goTo((this.currentIndex() + 1) % count, true);
  }

  goTo(index: number, emit = true): void {
    const count = this.orderedPhotos().length;
    const safe = count ? ((index % count) + count) % count : 0;
    if (safe === this.currentIndex() && !emit) return;
    this.currentIndex.set(safe);
    if (emit) this.indexChange.emit(safe);
  }

  onPointerDown(event: PointerEvent): void {
    if (this.orderedPhotos().length <= 1) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) return;
    this.pointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.dragStartX = event.clientX;
    this.dragOffsetX.set(0);
    this.isDragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging() || event.pointerId !== this.pointerId) return;
    const deltaX = event.clientX - this.dragStartX;
    const viewport = this.viewportRef?.nativeElement;
    if (viewport) {
      const atStart = this.currentIndex() === 0 && deltaX > 0;
      const atEnd = this.currentIndex() === this.orderedPhotos().length - 1 && deltaX < 0;
      const damped = atStart || atEnd ? deltaX * 0.35 : deltaX;
      this.dragOffsetX.set(damped);
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging() || event.pointerId !== this.pointerId) return;
    const viewport = this.viewportRef?.nativeElement;
    const threshold = viewport ? viewport.clientWidth * 0.18 : 60;
    const delta = this.dragOffsetX();
    this.isDragging.set(false);
    this.dragOffsetX.set(0);
    this.pointerId = null;
    if (delta < -threshold) {
      this.next();
    } else if (delta > threshold) {
      this.prev();
    }
  }
}
