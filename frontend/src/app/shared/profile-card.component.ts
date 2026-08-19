import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PublicProfileView } from '../core/api/contracts';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'hm-profile-card',
  imports: [CommonModule, AvatarComponent, IconComponent],
  standalone: true,
  template: `
    <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div class="aspect-[4/5] bg-gradient-to-br from-accent to-muted flex items-center justify-center">
        <hm-avatar [name]="profile()?.displayName || 'Perfil'" [size]="96" />
      </div>
      <div class="p-5 flex flex-col gap-3">
        @if (profile()) {
          <div>
            <h3 class="text-lg font-semibold text-card-foreground">
              {{ profile()!.displayName }}, {{ profile()!.age }}
            </h3>
            <div class="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <hm-icon name="map-pin" size="16" />
              <span>{{ profile()!.city }}{{ profile()!.state ? ', ' + profile()!.state : '' }}</span>
            </div>
          </div>
          @if (profile()!.bio) {
            <p class="text-sm text-muted-foreground line-clamp-2">{{ profile()!.bio }}</p>
          }
          @if (profile()!.interests.length) {
            <div class="flex flex-wrap gap-2">
              @for (interest of profile()!.interests; track interest) {
                <span class="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {{ interest }}
                </span>
              }
            </div>
          }
        }
        @if (showActions()) {
          <div class="flex items-center gap-2 pt-2">
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
              (click)="like.emit()"
            >
              Like
            </button>
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
              (click)="pass.emit()"
            >
              Passar
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 transition"
              (click)="superLike.emit()"
              title="Super Like"
            >
              ★
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCardComponent {
  readonly profile = input<PublicProfileView | null>(null);
  readonly showActions = input<boolean>(true);
  readonly like = output<void>();
  readonly pass = output<void>();
  readonly superLike = output<void>();
}
