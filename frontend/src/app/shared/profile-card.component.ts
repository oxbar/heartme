import { ChangeDetectionStrategy, Component, computed, input, output, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PhotoView, PublicProfileView } from '../core/api/contracts';
import { IconComponent } from '../ui/icon/icon.component';
import { PhotoCarouselComponent } from '../ui/photo-carousel/photo-carousel.component';

type SwipeDecision = 'LIKE' | 'PASS';

@Component({
  selector: 'hm-profile-card',
  imports: [RouterLink, IconComponent, PhotoCarouselComponent],
  standalone: true,
  template: `
    <div class="relative z-10">
      <article
        class="hm-dating-card hm-swipe-card"
        [class.is-dragging]="isDragging()"
        [class.is-swiping-like]="swipeDecision() === 'LIKE'"
        [class.is-swiping-pass]="swipeDecision() === 'PASS'"
        [style.transform]="cardTransform()"
        [style.transition]="cardTransition()"
        [attr.aria-label]="cardLabel()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerCancel($event)"
      >
        <hm-photo-carousel
          class="hm-dating-carousel"
          [photos]="photos()"
          [fallbackName]="profile()?.displayName || 'Himeros'"
          [ariaLabel]="cardLabel()"
          [dragEnabled]="false"
        />

        <div class="hm-dating-card-shade" aria-hidden="true"></div>

        <div
          class="hm-swipe-feedback is-like"
          [class.is-committed]="swipeDecision() === 'LIKE'"
          [style.opacity]="likeFeedbackOpacity()"
          aria-hidden="true"
        >
          <hm-icon name="heart" size="72" strokeWidth="2.3" />
          <strong>CURTI</strong>
        </div>

        <div
          class="hm-swipe-feedback is-pass"
          [class.is-committed]="swipeDecision() === 'PASS'"
          [style.opacity]="passFeedbackOpacity()"
          aria-hidden="true"
        >
          <hm-icon name="x" size="82" strokeWidth="2.5" />
          <strong>PASSAR</strong>
        </div>

        @if (profile(); as currentProfile) {
          <div class="hm-card-info">
            <div class="hm-card-name-row">
              <strong>{{ currentProfile.displayName }}</strong>
              <span>{{ currentProfile.age }}</span>
              <hm-icon name="check-check" size="19" class="text-white/90" />
            </div>

            <div class="hm-card-meta">
              <hm-icon name="map-pin" size="15" />
              <span>{{ locationLine() }}</span>
            </div>

            @if (currentProfile.bio) {
              <p class="hm-card-bio">{{ currentProfile.bio }}</p>
            }

            @if (currentProfile.interests.length) {
              <div class="mt-3 flex max-h-[54px] flex-wrap gap-1.5 overflow-hidden">
                @for (interest of currentProfile.interests.slice(0, 4); track interest) {
                  <span class="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                    {{ interest }}
                  </span>
                }
              </div>
            }

            <a
              [routerLink]="['/app/profiles', currentProfile.userId]"
              class="absolute bottom-0 right-0 inline-grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Abrir perfil completo"
            >
              <hm-icon name="arrow-right" size="18" />
            </a>
          </div>
        }
      </article>

      @if (showActions()) {
        <div class="hm-action-dock" aria-label="Ações do perfil">
          <button type="button" class="hm-round-action" [disabled]="isActionBlocked() || !rewindEnabled()" (click)="rewind.emit()" aria-label="Voltar" title="Voltar">
            <hm-icon name="rotate-ccw" size="23" />
          </button>
          <button type="button" class="hm-round-action is-pass" [disabled]="isActionBlocked()" (click)="swipePass()" aria-label="Passar" title="Passar">
            <hm-icon name="x" size="31" strokeWidth="2.4" />
          </button>
          <button type="button" class="hm-round-action is-super" [disabled]="isActionBlocked()" (click)="superLike.emit()" aria-label="Super like" title="Super like">
            <hm-icon name="star" size="26" strokeWidth="2.2" />
          </button>
          <button type="button" class="hm-round-action is-like" [disabled]="isActionBlocked()" (click)="swipeLike()" aria-label="Curtir" title="Curtir">
            <hm-icon name="heart" size="28" strokeWidth="2.4" />
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCardComponent {
  private static readonly SWIPE_THRESHOLD_PX = 112;
  private static readonly MAX_DRAG_ROTATION_DEG = 13;

  readonly profile = input<PublicProfileView | null>(null);
  readonly photos = input<PhotoView[]>([]);
  readonly distanceKm = input<number | null>(null);
  readonly showActions = input(true);
  readonly rewindEnabled = input(false);
  readonly busy = input(false);

  readonly like = output<void>();
  readonly pass = output<void>();
  readonly superLike = output<void>();
  readonly rewind = output<void>();

  @ViewChild(PhotoCarouselComponent) carousel?: PhotoCarouselComponent;

  readonly dragX = signal(0);
  readonly dragY = signal(0);
  readonly isDragging = signal(false);
  readonly swipeDecision = signal<SwipeDecision | null>(null);

  private pointerId: number | null = null;
  private pointerStartX = 0;
  private pointerStartY = 0;

  readonly initials = computed(() => {
    const name = this.profile()?.displayName || 'Himeros';
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'H';
  });

  readonly locationLine = computed(() => {
    const profile = this.profile();
    if (!profile) return '';
    const distance = this.distanceKm();
    if (distance !== null && Number.isFinite(distance)) {
      return `${Math.max(1, Math.round(distance))} km de distância`;
    }
    return [profile.city, profile.state].filter(Boolean).join(', ');
  });

  readonly cardLabel = computed(() => {
    const profile = this.profile();
    return profile ? `${profile.displayName}, ${profile.age} anos` : 'Perfil recomendado';
  });

  readonly cardTransform = computed(() => {
    const decision = this.swipeDecision();
    if (decision === 'LIKE') return 'translate3d(118vw, -12px, 0) rotate(18deg)';
    if (decision === 'PASS') return 'translate3d(-118vw, -12px, 0) rotate(-18deg)';

    const x = this.dragX();
    const y = Math.max(-70, Math.min(70, this.dragY())) * 0.18;
    const rotation = Math.max(
      -ProfileCardComponent.MAX_DRAG_ROTATION_DEG,
      Math.min(ProfileCardComponent.MAX_DRAG_ROTATION_DEG, x / 18)
    );
    return `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
  });

  readonly cardTransition = computed(() => {
    if (this.isDragging()) return 'none';
    if (this.swipeDecision()) return 'transform 280ms cubic-bezier(.22,.72,.18,1), opacity 220ms ease';
    return 'transform 180ms cubic-bezier(.22,.72,.18,1)';
  });

  readonly likeFeedbackOpacity = computed(() => {
    if (this.swipeDecision() === 'LIKE') return 1;
    return Math.min(1, Math.max(0, this.dragX() / ProfileCardComponent.SWIPE_THRESHOLD_PX));
  });

  readonly passFeedbackOpacity = computed(() => {
    if (this.swipeDecision() === 'PASS') return 1;
    return Math.min(1, Math.max(0, -this.dragX() / ProfileCardComponent.SWIPE_THRESHOLD_PX));
  });

  isActionBlocked(): boolean {
    return this.busy() || this.swipeDecision() !== null;
  }

  previousPhoto(): void {
    this.carousel?.prev();
  }

  nextPhoto(): void {
    this.carousel?.next();
  }

  swipeLike(): void {
    this.commitSwipe('LIKE');
  }

  swipePass(): void {
    this.commitSwipe('PASS');
  }

  resetSwipe(): void {
    this.pointerId = null;
    this.isDragging.set(false);
    this.dragX.set(0);
    this.dragY.set(0);
    this.swipeDecision.set(null);
  }

  onPointerDown(event: PointerEvent): void {
    if (this.isActionBlocked() || event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('.hm-action-dock')) return;

    this.pointerId = event.pointerId;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.dragX.set(0);
    this.dragY.set(0);
    this.isDragging.set(false);
  }

  onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;

    const deltaX = event.clientX - this.pointerStartX;
    const deltaY = event.clientY - this.pointerStartY;
    const horizontalIntent = Math.abs(deltaX) > 5 && Math.abs(deltaX) >= Math.abs(deltaY) * 0.72;

    // Pointer capture starts only after horizontal intent is clear. A normal click
    // therefore still reaches the carousel photo zones and the profile link.
    if (horizontalIntent && !this.isDragging()) {
      this.isDragging.set(true);
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    }
    if (horizontalIntent) event.preventDefault();

    if (this.isDragging()) {
      this.dragX.set(deltaX);
      this.dragY.set(deltaY);
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;

    const deltaX = this.dragX();
    if (this.isDragging()) event.preventDefault();
    this.releasePointer(event);

    if (deltaX >= ProfileCardComponent.SWIPE_THRESHOLD_PX) {
      this.commitSwipe('LIKE');
      return;
    }
    if (deltaX <= -ProfileCardComponent.SWIPE_THRESHOLD_PX) {
      this.commitSwipe('PASS');
      return;
    }

    this.dragX.set(0);
    this.dragY.set(0);
  }

  onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.releasePointer(event);
    this.dragX.set(0);
    this.dragY.set(0);
  }

  private releasePointer(event: PointerEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture?.(event.pointerId);
    }
    this.pointerId = null;
    this.isDragging.set(false);
  }

  private commitSwipe(decision: SwipeDecision): void {
    if (this.isActionBlocked()) return;

    this.isDragging.set(false);
    this.swipeDecision.set(decision);
    this.dragX.set(decision === 'LIKE' ? ProfileCardComponent.SWIPE_THRESHOLD_PX : -ProfileCardComponent.SWIPE_THRESHOLD_PX);
    this.dragY.set(0);

    if (decision === 'LIKE') this.like.emit();
    else this.pass.emit();
  }
}
