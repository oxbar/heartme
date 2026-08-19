import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { PhotoView, PublicProfileView } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { SafetyApi } from '../../core/api/safety.api';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [FormsModule, IconComponent],
  standalone: true,
  template: `
    <section class="hm-profile-edit-shell" aria-label="Perfil público">
      @if (loading()) {
        <div class="mx-auto grid w-[min(940px,100%)] gap-7 lg:grid-cols-[430px_1fr]">
          <div class="h-[650px] animate-pulse rounded-xl bg-white/5"></div>
          <div class="h-[520px] animate-pulse rounded-xl bg-white/5"></div>
        </div>
      } @else if (error()) {
        <div class="hm-page-empty-center min-h-full">
          <div class="hm-page-empty-icon"><hm-icon name="user" size="28" /></div>
          <strong>Perfil indisponível</strong>
          <span>{{ error() }}</span>
          <button type="button" class="hm-dark-button" (click)="goBack()">Voltar</button>
        </div>
      } @else if (profile(); as currentProfile) {
        <div class="mx-auto grid w-[min(940px,100%)] gap-7 lg:grid-cols-[430px_1fr]">
          <article class="hm-profile-preview-card self-start">
            <header class="hm-profile-preview-header">
              <strong>{{ currentProfile.displayName }}, {{ currentProfile.age }}</strong>
              <button type="button" class="hm-mobile-icon-button" (click)="goBack()" aria-label="Fechar perfil">
                <hm-icon name="x" size="19" />
              </button>
            </header>

            <div class="hm-profile-preview-media">
              <div class="hm-photo-progress">
                @for (photo of orderedPhotos(); track photo.id; let index = $index) {
                  <span [class.is-active]="index <= photoIndex()"></span>
                }
                @if (!orderedPhotos().length) { <span class="is-active"></span> }
              </div>
              @if (activePhoto(); as photo) {
                <img [src]="photo.url" [alt]="currentProfile.displayName" />
              } @else {
                <div class="hm-dating-card-fallback">{{ initials(currentProfile.displayName) }}</div>
              }
              @if (orderedPhotos().length > 1) {
                <div class="hm-card-photo-nav">
                  <button type="button" (click)="previousPhoto()" aria-label="Foto anterior"></button>
                  <button type="button" (click)="nextPhoto()" aria-label="Próxima foto"></button>
                </div>
              }
            </div>

            <footer class="hm-profile-preview-footer">
              <div class="hm-profile-location">
                <hm-icon name="map-pin" size="15" />
                {{ currentProfile.city }}{{ currentProfile.state ? ', ' + currentProfile.state : '' }}
              </div>
              @if (currentProfile.interests.length) {
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (interest of currentProfile.interests.slice(0, 6); track interest) {
                    <span class="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/75">{{ interest }}</span>
                  }
                </div>
              }
            </footer>
          </article>

          <div class="space-y-3">
            @if (currentProfile.bio) {
              <section class="hm-dark-panel p-5">
                <h2 class="text-xs font-black uppercase tracking-wide text-white/45">Sobre</h2>
                <p class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-white/90">{{ currentProfile.bio }}</p>
              </section>
            }

            <section class="hm-dark-panel p-5">
              <h2 class="text-xs font-black uppercase tracking-wide text-white/45">Informações</h2>
              <div class="mt-3 divide-y divide-white/10 text-sm text-white/85">
                <div class="flex min-h-12 items-center gap-3">
                  <hm-icon name="map-pin" size="17" class="text-white/45" />
                  <span>{{ currentProfile.city }}{{ currentProfile.state ? ', ' + currentProfile.state : '' }}</span>
                </div>
                <div class="flex min-h-12 items-center gap-3">
                  <hm-icon name="user" size="17" class="text-white/45" />
                  <span>{{ genderLabel(currentProfile.gender) }}</span>
                </div>
                <div class="flex min-h-12 items-center gap-3">
                  <hm-icon name="check-check" size="17" class="text-primary" />
                  <span>Perfil Himeros</span>
                </div>
              </div>
            </section>

            <section class="hm-dark-panel overflow-hidden">
              <button type="button" class="flex min-h-14 w-full items-center justify-center gap-2 border-b border-white/10 text-sm font-bold text-white/75 hover:bg-white/[0.04]" (click)="onBlock()">
                <hm-icon name="shield-alert" size="17" />
                Bloquear {{ currentProfile.displayName }}
              </button>
              <button type="button" class="flex min-h-14 w-full items-center justify-center gap-2 text-sm font-bold text-red-400 hover:bg-red-400/[0.06]" (click)="showReportDialog.set(true)">
                <hm-icon name="flag" size="17" />
                Denunciar {{ currentProfile.displayName }}
              </button>
            </section>
          </div>
        </div>

        @if (showReportDialog()) {
          <div class="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div class="hm-dark-panel w-full max-w-md overflow-hidden shadow-2xl">
              <header class="hm-dark-panel-header">
                <h2 id="report-title">Denunciar perfil</h2>
                <button type="button" class="hm-mobile-icon-button" (click)="showReportDialog.set(false)" aria-label="Fechar">
                  <hm-icon name="x" size="18" />
                </button>
              </header>
              <div class="p-5">
                <p class="mb-5 text-sm leading-relaxed text-white/50">Ajude a manter a comunidade segura. Escolha o motivo que melhor descreve a situação.</p>
                <div class="hm-dark-field">
                  <label for="report-reason">Motivo</label>
                  <select id="report-reason" [(ngModel)]="reportReason" [ngModelOptions]="{ standalone: true }">
                    <option value="">Selecione…</option>
                    <option value="SPAM">Spam ou comportamento suspeito</option>
                    <option value="INAPPROPRIATE">Conteúdo inapropriado</option>
                    <option value="HARASSMENT">Assédio ou abuso</option>
                    <option value="FAKE">Perfil falso</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div class="hm-dark-field">
                  <label for="report-details">Detalhes</label>
                  <textarea id="report-details" rows="4" [(ngModel)]="reportDetails" [ngModelOptions]="{ standalone: true }" placeholder="Descreva o ocorrido…"></textarea>
                </div>
                <button type="button" class="hm-dark-button is-primary w-full" [disabled]="!reportReason || reportSubmitting()" (click)="onReport()">
                  @if (reportSubmitting()) { <hm-icon name="loader-2" size="16" class="animate-spin" /> }
                  Enviar denúncia
                </button>
              </div>
            </div>
          </div>
        }
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfilePage {
  private readonly router = inject(Router);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly safetyApi = inject(SafetyApi);

  readonly id = input('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = signal<PublicProfileView | null>(null);
  readonly photos = signal<PhotoView[]>([]);
  readonly photoIndex = signal(0);
  readonly showReportDialog = signal(false);
  readonly reportSubmitting = signal(false);
  reportReason = '';
  reportDetails = '';

  readonly orderedPhotos = computed(() => [...this.photos()].sort((a, b) => a.position - b.position));
  readonly activePhoto = computed(() => this.orderedPhotos()[this.photoIndex()] ?? null);

  constructor() {
    effect(() => {
      const profileId = this.id();
      if (!profileId) return;
      this.photoIndex.set(0);
      void this.load(profileId);
    });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'H';
  }

  genderLabel(gender: PublicProfileView['gender']): string {
    const labels: Record<PublicProfileView['gender'], string> = {
      MAN: 'Homem',
      WOMAN: 'Mulher',
      NON_BINARY: 'Não-binário',
      OTHER: 'Outro'
    };
    return labels[gender];
  }

  previousPhoto(): void {
    const count = this.orderedPhotos().length;
    if (count <= 1) return;
    this.photoIndex.update(index => (index - 1 + count) % count);
  }

  nextPhoto(): void {
    const count = this.orderedPhotos().length;
    if (count <= 1) return;
    this.photoIndex.update(index => (index + 1) % count);
  }

  async load(profileId = this.id()): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!profileId) throw new Error('invalid profile');
      const [profile, photos] = await Promise.all([
        firstValueFrom(this.profileApi.byUser(profileId)),
        firstValueFrom(this.mediaApi.forUser(profileId)).catch(() => [] as PhotoView[])
      ]);
      this.profile.set(profile);
      this.photos.set(photos);
    } catch {
      this.error.set('Este perfil pode ter sido removido ou estar temporariamente indisponível.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/app/discover']);
  }

  async onBlock(): Promise<void> {
    const userId = this.profile()?.userId;
    if (!userId) return;
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Bloquear este perfil? Vocês deixarão de aparecer um para o outro.')
      : true;
    if (!confirmed) return;
    try {
      await firstValueFrom(this.safetyApi.block(userId));
      await this.router.navigate(['/app/discover']);
    } catch {
      this.error.set('Não foi possível bloquear este perfil agora.');
    }
  }

  async onReport(): Promise<void> {
    const userId = this.profile()?.userId;
    if (!userId || !this.reportReason || this.reportSubmitting()) return;
    this.reportSubmitting.set(true);
    try {
      await firstValueFrom(this.safetyApi.report(userId, this.reportReason, this.reportDetails));
      this.showReportDialog.set(false);
      this.reportReason = '';
      this.reportDetails = '';
    } catch {
      this.error.set('Não foi possível enviar a denúncia agora.');
    } finally {
      this.reportSubmitting.set(false);
    }
  }
}
