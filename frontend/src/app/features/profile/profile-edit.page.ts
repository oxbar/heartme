import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { form, FormField, max, min, minLength, required, submit } from '@angular/forms/signals';
import type { Gender, PhotoView, ProfileRequest } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { ProfileStore } from '../../core/state/profile.store';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'hm-profile-edit-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormField, IconComponent],
  template: `
    <section class="hm-profile-edit-shell" aria-labelledby="edit-profile-title">
      @if (loading()) {
        <div class="h-[560px] animate-pulse rounded-xl bg-white/5"></div>
      } @else {
        <header class="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 class="text-2xl font-extrabold tracking-tight text-foreground" id="edit-profile-title">Editar perfil</h1>
            <p class="text-muted-foreground text-sm mt-0.5">Atualize suas informações pessoais.</p>
          </div>
          <a routerLink="/app/profile" class="hm-mobile-icon-button" aria-label="Fechar edição">
            <hm-icon name="x" size="19" />
          </a>
        </header>

        <form (submit)="onSubmit($event)" novalidate class="hm-profile-edit-grid">
          <div class="hm-dark-panel overflow-hidden">
            @if (error()) {
              <div role="alert" class="mx-5 mt-5 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {{ error() }}
              </div>
            }

            <div class="hm-dark-form">
              <div class="hm-dark-field">
                <label for="edit-displayName">Nome exibido</label>
                <input id="edit-displayName" type="text" [formField]="editForm.displayName" autocomplete="name" />
                @if (editForm.displayName().touched() && editForm.displayName().invalid()) {
                  <p class="hm-dark-field-error">{{ editForm.displayName().errors()[0]?.message }}</p>
                }
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="hm-dark-field">
                  <label for="edit-birthDate">Data de nascimento</label>
                  <input id="edit-birthDate" type="date" [formField]="editForm.birthDate" />
                </div>
                <div class="hm-dark-field">
                  <label for="edit-gender">Gênero</label>
                  <select id="edit-gender" [formField]="editForm.gender">
                    <option value="">Selecione…</option>
                    <option value="MAN">Homem</option>
                    <option value="WOMAN">Mulher</option>
                    <option value="NON_BINARY">Não-binário</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="hm-dark-field">
                  <label for="edit-city">Cidade</label>
                  <input id="edit-city" type="text" [formField]="editForm.city" autocomplete="address-level2" />
                </div>
                <div class="hm-dark-field">
                  <label for="edit-state">Estado</label>
                  <input id="edit-state" type="text" [formField]="editForm.state" autocomplete="address-level1" />
                </div>
              </div>

              <div class="hm-dark-field">
                <label for="edit-bio">Sobre você</label>
                <textarea id="edit-bio" rows="4" [formField]="editForm.bio"></textarea>
              </div>

              <div class="hm-dark-field">
                <label>Interessado em</label>
                <div class="hm-chip-row">
                  @for (option of genderOptions; track option.value) {
                    <button
                      type="button"
                      class="hm-choice-chip"
                      [class.is-selected]="lookingForSet().has(option.value)"
                      (click)="toggleLookingFor(option.value)"
                      [attr.aria-pressed]="lookingForSet().has(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="hm-dark-field">
                <label for="edit-interests">Interesses</label>
                <input id="edit-interests" type="text" [formField]="editForm.interestsRaw" placeholder="viagens, música, cinema, academia…" />
                <p class="mt-1.5 text-[11px] text-white/35">Separe os interesses por vírgula.</p>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <div class="hm-dark-field">
                  <label for="edit-minAge">Idade mínima</label>
                  <input id="edit-minAge" type="number" [formField]="editForm.minAge" />
                  @if (editForm.minAge().touched() && editForm.minAge().invalid()) {
                    <p class="hm-dark-field-error">{{ editForm.minAge().errors()[0]?.message }}</p>
                  }
                </div>
                <div class="hm-dark-field">
                  <label for="edit-maxAge">Idade máxima</label>
                  <input id="edit-maxAge" type="number" [formField]="editForm.maxAge" />
                  @if (editForm.maxAge().touched() && editForm.maxAge().invalid()) {
                    <p class="hm-dark-field-error">{{ editForm.maxAge().errors()[0]?.message }}</p>
                  }
                </div>
                <div class="hm-dark-field">
                  <label for="edit-maxDistanceKm">Distância máxima</label>
                  <input id="edit-maxDistanceKm" type="number" [formField]="editForm.maxDistanceKm" />
                  @if (editForm.maxDistanceKm().touched() && editForm.maxDistanceKm().invalid()) {
                    <p class="hm-dark-field-error">{{ editForm.maxDistanceKm().errors()[0]?.message }}</p>
                  }
                </div>
              </div>
            </div>

            <footer class="hm-profile-edit-actions">
              <a routerLink="/app/profile" class="hm-dark-button">Cancelar</a>
              <button type="submit" class="hm-dark-button is-primary" [disabled]="editForm().invalid() || editForm().submitting()">
                @if (editForm().submitting()) {
                  <hm-icon name="loader-2" size="16" class="animate-spin" />
                  Salvando…
                } @else {
                  <hm-icon name="save" size="16" />
                  Salvar perfil
                }
              </button>
            </footer>
          </div>

          <aside class="hm-dark-panel overflow-hidden" aria-label="Editor de fotos">
            <div class="hm-photo-editor-tabs">
              <span class="is-active">Editar</span>
              <a routerLink="/app/profile">Preview</a>
            </div>
            <div class="hm-photo-editor">
              <h2 class="text-sm font-black uppercase tracking-wide text-white">Fotos do perfil</h2>
              <p class="mt-1 text-xs text-white/40">A primeira foto é a imagem principal.</p>

              <div class="hm-photo-grid">
                @for (photo of sortedPhotos(); track photo.id) {
                  <div class="hm-photo-cell">
                    <img [src]="photo.url" alt="Foto do perfil" loading="lazy" />
                    <button
                      type="button"
                      class="hm-photo-remove"
                      (click)="deletePhoto(photo.id)"
                      aria-label="Remover foto"
                    >
                      <hm-icon name="x" size="16" />
                    </button>
                  </div>
                }

                @if (sortedPhotos().length < 9) {
                  <label class="hm-photo-cell hm-photo-add" [class.opacity-50]="uploading()">
                    <hm-icon [name]="uploading() ? 'loader-2' : 'upload'" size="24" [class]="uploading() ? 'animate-spin' : ''" />
                    <span class="sr-only">Adicionar foto</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" (change)="onPhotoUpload($event)" [disabled]="uploading()" />
                  </label>
                }
              </div>

              <div class="mt-4 rounded-lg bg-white/[0.04] p-3 text-xs leading-relaxed text-white/45">
                Use fotos nítidas e atuais. Evite informações sensíveis visíveis na imagem.
              </div>
            </div>
          </aside>
        </form>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileEditPage implements OnInit {
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly uploading = signal(false);
  readonly photos = signal<PhotoView[]>([]);
  readonly sortedPhotos = computed(() => [...this.photos()].sort((a, b) => a.position - b.position));

  readonly genderOptions = [
    { value: 'MAN' as Gender, label: 'Homens' },
    { value: 'WOMAN' as Gender, label: 'Mulheres' },
    { value: 'NON_BINARY' as Gender, label: 'Não-binários' },
    { value: 'OTHER' as Gender, label: 'Outros' }
  ];
  readonly lookingForSet = signal<Set<Gender>>(new Set());

  readonly model = signal({
    displayName: '',
    birthDate: '',
    gender: '' as Gender | '',
    city: '',
    state: '',
    bio: '',
    minAge: 18,
    maxAge: 99,
    maxDistanceKm: 100,
    interestsRaw: '',
    country: 'BR',
    latitude: null as number | null,
    longitude: null as number | null,
    discoverable: true
  });

  readonly editForm = form(this.model, path => {
    required(path.displayName, { message: 'Informe seu nome' });
    minLength(path.displayName, 2, { message: 'Use pelo menos 2 caracteres' });
    required(path.birthDate, { message: 'Informe sua data de nascimento' });
    required(path.gender, { message: 'Selecione um gênero' });
    required(path.city, { message: 'Informe sua cidade' });
    min(path.minAge, 18, { message: 'A idade mínima deve ser 18 ou mais' });
    max(path.minAge, 100, { message: 'A idade mínima deve ser 100 ou menos' });
    min(path.maxAge, 18, { message: 'A idade máxima deve ser 18 ou mais' });
    max(path.maxAge, 100, { message: 'A idade máxima deve ser 100 ou menos' });
    min(path.maxDistanceKm, 1, { message: 'A distância mínima é 1 km' });
    max(path.maxDistanceKm, 500, { message: 'A distância máxima é 500 km' });
  });

  async ngOnInit(): Promise<void> {
    try {
      const [profile, photos] = await Promise.all([
        firstValueFrom(this.profileApi.me()),
        firstValueFrom(this.mediaApi.mine()).catch(() => [] as PhotoView[])
      ]);
      this.model.set({
        displayName: profile.displayName,
        birthDate: profile.birthDate,
        gender: profile.gender,
        city: profile.city,
        state: profile.state,
        bio: profile.bio || '',
        minAge: profile.minAge,
        maxAge: profile.maxAge,
        maxDistanceKm: profile.maxDistanceKm,
        interestsRaw: (profile.interests || []).join(', '),
        country: profile.country,
        latitude: profile.latitude,
        longitude: profile.longitude,
        discoverable: profile.discoverable
      });
      this.lookingForSet.set(new Set(profile.lookingFor || []));
      this.photos.set(photos);
    } catch {
      this.error.set('Não foi possível carregar seu perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleLookingFor(gender: Gender): void {
    const next = new Set(this.lookingForSet());
    next.has(gender) ? next.delete(gender) : next.add(gender);
    this.lookingForSet.set(next);
  }

  async onPhotoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploading()) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      const photo = await firstValueFrom(this.mediaApi.upload(file));
      this.photos.update(list => [...list, photo]);
    } catch {
      this.error.set('Não foi possível enviar a foto. Use JPEG, PNG ou WEBP e tente novamente.');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async deletePhoto(photoId: string): Promise<void> {
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Remover esta foto do seu perfil?')
      : true;
    if (!confirmed) return;

    try {
      await firstValueFrom(this.mediaApi.delete(photoId));
      this.photos.update(list => list.filter(photo => photo.id !== photoId));
    } catch {
      this.error.set('Não foi possível remover a foto.');
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.editForm, async () => {
      this.error.set('');
      try {
        const current = this.model();
        const interests = current.interestsRaw.split(',').map(item => item.trim()).filter(Boolean);
        const payload: ProfileRequest = {
          displayName: current.displayName,
          birthDate: current.birthDate,
          gender: current.gender as Gender,
          city: current.city,
          state: current.state,
          country: current.country,
          latitude: current.latitude,
          longitude: current.longitude,
          bio: current.bio || null,
          minAge: Number(current.minAge),
          maxAge: Number(current.maxAge),
          maxDistanceKm: Number(current.maxDistanceKm),
          discoverable: current.discoverable,
          interests,
          lookingFor: Array.from(this.lookingForSet())
        };
        await firstValueFrom(this.profileApi.save(payload));
        this.profileStore.clear();
        await this.profileStore.reload();
        await this.router.navigate(['/app/profile']);
      } catch {
        this.error.set('Não foi possível salvar as alterações. Revise os campos e tente novamente.');
      }
    });
  }
}
