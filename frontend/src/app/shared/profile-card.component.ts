import { ChangeDetectionStrategy, Component, computed, input, output, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PhotoView, PublicProfileView } from '../core/api/contracts';
import { IconComponent } from '../ui/icon/icon.component';
import { PhotoCarouselComponent } from '../ui/photo-carousel/photo-carousel.component';

@Component({
  selector: 'hm-profile-card',
  imports: [RouterLink, IconComponent, PhotoCarouselComponent],
  standalone: true,
  template: `
    <div class="relative z-10">
      <article class="hm-dating-card" [attr.aria-label]="cardLabel()">
        <hm-photo-carousel
          class="hm-dating-carousel"
          [photos]="photos()"
          [fallbackName]="profile()?.displayName || 'Himeros'"
          [ariaLabel]="cardLabel()"
        />

        <div class="hm-dating-card-shade" aria-hidden="true"></div>

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
          <button type="button" class="hm-round-action" [disabled]="busy() || !rewindEnabled()" (click)="rewind.emit()" aria-label="Voltar" title="Voltar">
            <hm-icon name="rotate-ccw" size="23" />
          </button>
          <button type="button" class="hm-round-action is-pass" [disabled]="busy()" (click)="pass.emit()" aria-label="Passar" title="Passar">
            <hm-icon name="x" size="31" strokeWidth="2.4" />
          </button>
          <button type="button" class="hm-round-action is-super" [disabled]="busy()" (click)="superLike.emit()" aria-label="Super like" title="Super like">
            <hm-icon name="star" size="26" strokeWidth="2.2" />
          </button>
          <button type="button" class="hm-round-action is-like" [disabled]="busy()" (click)="like.emit()" aria-label="Curtir" title="Curtir">
            <hm-icon name="heart" size="28" strokeWidth="2.4" />
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCardComponent {
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

  previousPhoto(): void {
    this.carousel?.prev();
  }

  nextPhoto(): void {
    this.carousel?.next();
  }
}
