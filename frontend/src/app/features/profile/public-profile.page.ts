import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { PhotoView, PublicProfileView } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { SafetyApi } from '../../core/api/safety.api';
import { AvatarComponent } from '../../shared/avatar.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [CommonModule, FormsModule, AvatarComponent, LoadingStateComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Perfil público" subtitle="Visualize e interaja com este perfil." icon="user">
        <div pageHeaderActions>
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted transition text-foreground"
            aria-label="Voltar"
          >
            <hm-icon name="arrow-left" size="20" />
          </button>
        </div>
      </hm-page-header>

      @if (loading()) {
        <hm-loading-state />
      } @else if (error()) {
        <div class="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p class="text-destructive mb-4">{{ error() }}</p>
          <button
            type="button"
            (click)="load()"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            <hm-icon name="rotate-ccw" size="16" />
            Tentar novamente
          </button>
        </div>
      } @else if (!profile()) {
        <hm-empty-state icon="user" title="Perfil não encontrado" description="Este perfil não existe ou foi removido." />
      } @else {
        <div class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 space-y-6">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center">
              @if (photos().length) {
                <div class="w-full aspect-[4/5] rounded-xl border border-border overflow-hidden mb-5 bg-muted">
                  <img [src]="photos()[0].url" [alt]="profile()!.displayName" class="w-full h-full object-cover" />
                </div>
              } @else {
                <hm-avatar [name]="profile()!.displayName" [size]="120" class="mb-5" />
              }
              <h2 class="text-xl font-bold text-card-foreground">
                {{ profile()!.displayName }}, {{ profile()!.age }}
              </h2>
              <p class="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <hm-icon name="map-pin" size="16" />
                {{ profile()!.city }}{{ profile()!.state ? ', ' + profile()!.state : '' }}
              </p>
              @if (profile()!.bio) {
                <p class="text-sm text-muted-foreground mt-4 text-left w-full">{{ profile()!.bio }}</p>
              }
              @if (profile()!.interests.length) {
                <div class="flex flex-wrap justify-start gap-2 mt-4 w-full">
                  @for (i of profile()!.interests; track i) {
                    <span class="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      <hm-icon name="sparkles" size="12" class="mr-1" />
                      {{ i }}
                    </span>
                  }
                </div>
              }
            </div>
            <div class="rounded-2xl border border-border bg-card p-4 shadow-sm grid grid-cols-2 gap-3">
              <button
                type="button"
                (click)="onBlock()"
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
              >
                <hm-icon name="shield-alert" size="16" />
                Bloquear
              </button>
              <button
                type="button"
                (click)="showReportDialog.set(true)"
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
              >
                <hm-icon name="flag" size="16" />
                Denunciar
              </button>
            </div>
          </div>
          <div class="lg:col-span-2 space-y-6">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 class="text-lg font-semibold text-card-foreground mb-4">Galeria</h3>
              @if (photos().length <= 1) {
                <div class="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma outra foto disponível.
                </div>
              } @else {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  @for (p of photos().slice(1); track p.id) {
                    <div class="aspect-square rounded-xl border border-border overflow-hidden bg-muted">
                      <img [src]="p.url" alt="Foto" class="w-full h-full object-cover" />
                    </div>
                  }
                </div>
              }
            </div>
            @if (showReportDialog()) {
              <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-fade-in">
                  <h3 class="text-xl font-bold text-card-foreground mb-2 flex items-center gap-2">
                    <hm-icon name="flag" size="20" class="text-destructive" />
                    Denunciar {{ profile()!.displayName }}
                  </h3>
                  <p class="text-sm text-muted-foreground mb-4">Selecione o motivo e forneça detalhes.</p>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-semibold text-foreground mb-1.5">Motivo</label>
                      <select
                        [(ngModel)]="reportReason"
                        [ngModelOptions]="{ standalone: true }"
                        class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                      >
                        <option value="">Selecione…</option>
                        <option value="SPAM">Spam ou comportamento suspeito</option>
                        <option value="INAPPROPRIATE">Conteúdo inapropriado</option>
                        <option value="HARASSMENT">Assédio ou abuso</option>
                        <option value="FAKE">Perfil falso</option>
                        <option value="OTHER">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-foreground mb-1.5">Detalhes</label>
                      <textarea
                        [(ngModel)]="reportDetails"
                        [ngModelOptions]="{ standalone: true }"
                        rows="4"
                        class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input resize-none"
                        placeholder="Descreva o ocorrido..."
                      ></textarea>
                    </div>
                    <div class="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        (click)="showReportDialog.set(false)"
                        class="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        [disabled]="reportSubmitting() || !reportReason"
                        (click)="onReport()"
                        class="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50"
                      >
                        @if (reportSubmitting()) {
                          <span class="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin"></span>
                        }
                        Enviar denúncia
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly safetyApi = inject(SafetyApi);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = signal<PublicProfileView | null>(null);
  readonly photos = signal<PhotoView[]>([]);
  showReportDialog = signal(false);
  readonly reportSubmitting = signal(false);

  reportReason = '';
  reportDetails = '';

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const id = this.route.snapshot.params['id'];
      if (!id) throw new Error('id inválido');
      const [p, ph] = await Promise.all([
        firstValueFrom(this.profileApi.byUser(id)),
        firstValueFrom(this.mediaApi.forUser(id)).catch(() => [])
      ]);
      this.profile.set(p);
      this.photos.set(ph);
    } catch {
      this.error.set('Não foi possível carregar este perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    try { this.router.navigate(['/app/discover']); } catch {}
  }

  async onBlock(): Promise<void> {
    const id = this.profile()?.userId;
    if (!id) return;
    try {
      await firstValueFrom(this.safetyApi.block(id));
      await this.router.navigate(['/app/discover']);
    } catch {}
  }

  async onReport(): Promise<void> {
    const id = this.profile()?.userId;
    if (!id || !this.reportReason) return;
    this.reportSubmitting.set(true);
    try {
      await firstValueFrom(this.safetyApi.report(id, this.reportReason, this.reportDetails));
      this.showReportDialog.set(false);
    } finally {
      this.reportSubmitting.set(false);
    }
  }
}
