import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { form, FormField, max, min, minLength, required, submit } from '@angular/forms/signals';
import type { BodyType, Gender, PhotoView, ProfileRequest } from '../../core/api/contracts';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { ProfileStore } from '../../core/state/profile.store';
import { IconComponent } from '../../ui/icon/icon.component';
import { SwitchComponent } from '../../ui/switch/switch.component';
import { SliderComponent } from '../../ui/slider/slider.component';

interface BodyTypeOption {
  value: BodyType;
  label: string;
  icon: string;
  hint: string;
}

const BODY_TYPE_OPTIONS: BodyTypeOption[] = [
  { value: 'SLIM',       label: 'Magro(a)',      icon: 'person-standing', hint: 'Estrutura física mais leve' },
  { value: 'ATHLETIC',   label: 'Atlético(a)',   icon: 'dumbbell',        hint: 'Faz atividade física regular' },
  { value: 'AVERAGE',    label: 'Médio(a)',      icon: 'user',            hint: 'Estrutura física equilibrada' },
  { value: 'MUSCULAR',   label: 'Musculoso(a)',  icon: 'flame',           hint: 'Massa muscular definida' },
  { value: 'CURVY',      label: 'Curvilíneo(a)', icon: 'heart',           hint: 'Curvas mais acentuadas' },
  { value: 'PLUS_SIZE',  label: 'Plus Size',     icon: 'sparkles',        hint: 'Auto-descrição volumosa' }
];

@Component({
  selector: 'hm-profile-edit-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormField, IconComponent, SwitchComponent, SliderComponent],
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
          <div class="hm-dark-panel">
            @if (error()) {
              <div role="alert" class="mx-5 mt-5 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {{ error() }}
              </div>
            }

            <div class="hm-dark-form">
              <h3 class="hm-settings-section-title">Dados básicos</h3>

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

              <div class="hm-location-card">
                <div class="hm-location-card-header">
                  <hm-icon name="map-pin" size="18" class="text-primary" />
                  <span class="hm-location-card-title">Localização</span>
                  <span class="hm-location-card-sub">Usada para encontrar pessoas próximas</span>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="hm-dark-field !mb-0">
                    <label for="edit-city">Cidade</label>
                    <input id="edit-city" type="text" [formField]="editForm.city" autocomplete="address-level2" />
                  </div>
                  <div class="hm-dark-field !mb-0">
                    <label for="edit-state">Estado</label>
                    <input id="edit-state" type="text" [formField]="editForm.state" autocomplete="address-level1" />
                  </div>
                </div>
              </div>

              <div class="hm-dark-field">
                <label for="edit-bio">Sobre você</label>
                <textarea id="edit-bio" rows="4" [formField]="editForm.bio"></textarea>
              </div>

              <h3 class="hm-settings-section-title mt-6">Seu tipo de corpo</h3>
              <p class="hm-settings-section-sub">Como você se descreve? Ajuda a combinar com quem procura perfis como o seu.</p>
              <div class="hm-bodytype-grid" role="radiogroup" aria-label="Tipo de corpo">
                @for (opt of bodyTypeOptions; track opt.value) {
                  <button
                    type="button"
                    class="hm-bodytype-card"
                    [class.is-selected]="model().bodyType === opt.value"
                    [attr.aria-checked]="model().bodyType === opt.value"
                    role="radio"
                    (click)="setBodyType(opt.value)"
                  >
                    <div class="hm-bodytype-card-icon">
                      <hm-icon [name]="opt.icon" size="22" />
                    </div>
                    <div class="hm-bodytype-card-copy">
                      <span class="hm-bodytype-card-label">{{ opt.label }}</span>
                      <span class="hm-bodytype-card-hint">{{ opt.hint }}</span>
                    </div>
                    @if (model().bodyType === opt.value) {
                      <div class="hm-bodytype-card-check">
                        <hm-icon name="check" size="14" />
                      </div>
                    }
                  </button>
                }
              </div>
              <button type="button" class="hm-muted-link" (click)="setBodyType(null)">Prefiro não informar</button>

              <h3 class="hm-settings-section-title mt-6">Interesses</h3>
              <p class="hm-settings-section-sub">Escreva abaixo e pressione Enter ou vírgula para adicionar. Remove clicando no X.</p>
              <div class="hm-chip-row is-wrapping mt-3" role="list">
                @for (tag of interestTags(); track tag) {
                  <span class="hm-interess-chip" role="listitem">
                    {{ tag }}
                    <button type="button" (click)="removeInterest(tag)" aria-label="Remover interesse {{ tag }}">
                      <hm-icon name="x" size="12" />
                    </button>
                  </span>
                }
              </div>
              <input
                class="hm-interest-input mt-2"
                type="text"
                [value]="interestDraft()"
                (input)="onInterestInput($event)"
                (keydown)="onInterestKey($event)"
                (blur)="commitDraft()"
                placeholder="Adicione um interesse (ex: trilhas, música, cinema, academia)…"
              />

              <h3 class="hm-settings-section-title mt-8">Configurações de descoberta</h3>

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

              <div class="hm-slider-card">
                <hm-slider
                  label="Faixa de idade"
                  prefix="" suffix=" anos"
                  [dual]="true"
                  [min]="18" [max]="100" [step]="1"
                  [valueMin]="model().minAge"
                  [valueMax]="model().maxAge"
                  (valueMinChange)="patchAge('min', $event)"
                  (valueMaxChange)="patchAge('max', $event)"
                />
                <div class="hm-slider-strict-row">
                  <span class="hm-slider-strict-label">
                    <strong>Só mostrar nesta faixa</strong>
                    <span class="hm-muted">Fora da faixa não entra na descoberta</span>
                  </span>
                  <hm-switch
                    [checked]="model().strictAge"
                    (checkedChange)="patchBool('strictAge', $event)"
                  />
                </div>
              </div>

              <div class="hm-slider-card">
                <hm-slider
                  label="Distância máxima"
                  suffix=" km"
                  [dual]="false"
                  [min]="1" [max]="500" [step]="1"
                  [valueMin]="model().maxDistanceKm"
                  (valueMinChange)="patchInt('maxDistanceKm', $event)"
                />
                <div class="hm-slider-strict-row">
                  <span class="hm-slider-strict-label">
                    <strong>Só mostrar neste raio</strong>
                    <span class="hm-muted">Quem estiver mais longe fica de fora</span>
                  </span>
                  <hm-switch
                    [checked]="model().strictDistance"
                    (checkedChange)="patchBool('strictDistance', $event)"
                  />
                </div>
              </div>

              <h3 class="hm-settings-section-title mt-8">Corpo que você busca</h3>
              <p class="hm-settings-section-sub">Selecione os tipos de corpo que você deseja ver na descoberta. Deixe vazio para ver todos.</p>
              <div class="hm-chip-row is-wrapping mt-3">
                @for (opt of bodyTypeOptions; track opt.value) {
                  <button
                    type="button"
                    class="hm-choice-chip is-soft"
                    [class.is-selected]="preferredBodySet().has(opt.value)"
                    (click)="togglePreferredBody(opt.value)"
                    [attr.aria-pressed]="preferredBodySet().has(opt.value)"
                  >
                    <hm-icon [name]="opt.icon" size="14" />
                    {{ opt.label }}
                  </button>
                }
              </div>

              <h3 class="hm-settings-section-title mt-8">Recomendações</h3>

              <div class="hm-toggle-row">
                <div class="hm-toggle-row-copy">
                  <strong>Recentes primeiro</strong>
                  <span class="hm-muted">Prioriza pessoas que usaram o app recentemente</span>
                </div>
                <hm-switch
                  [checked]="model().recentlyActiveFirst"
                  (checkedChange)="patchBool('recentlyActiveFirst', $event)"
                />
              </div>

              <div class="hm-toggle-row">
                <div class="hm-toggle-row-copy">
                  <strong>Modo global</strong>
                  <span class="hm-muted">Depois que acabar os perfis perto de você, mostra pessoas de qualquer lugar</span>
                </div>
                <hm-switch
                  [checked]="model().globalMode"
                  (checkedChange)="patchBool('globalMode', $event)"
                />
              </div>

              <h3 class="hm-settings-section-title mt-8">Visibilidade</h3>

              <div class="hm-toggle-row">
                <div class="hm-toggle-row-copy">
                  <strong>Ativar descoberta</strong>
                  <span class="hm-muted">Desligado, seu perfil não aparece na pilha de ninguém (matches antigos continuam)</span>
                </div>
                <hm-switch
                  [checked]="model().discoverable"
                  (checkedChange)="patchBool('discoverable', $event)"
                />
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

          <aside class="hm-dark-panel" aria-label="Editor de fotos">
            <div class="hm-photo-editor-tabs">
              <span class="is-active">Editar</span>
              <a routerLink="/app/profile">Preview</a>
            </div>
            <div class="hm-photo-editor">
              <h2 class="text-sm font-black uppercase tracking-wide text-white">Fotos do perfil</h2>
              <p class="mt-1 text-xs text-white/40">A primeira foto é a imagem principal. Clique em "Adicionar foto" para enviar.</p>

              <div class="hm-photo-grid">
                @for (photo of sortedPhotos(); track photo.id; let i = $index) {
                  <div class="hm-photo-cell" [title]="'Foto ' + (i + 1)">
                    <img [src]="photo.url" alt="Foto do perfil {{ i + 1 }}" loading="lazy" onerror="this.style.display='none'" />
                    <button
                      type="button"
                      class="hm-photo-remove"
                      (click)="deletePhoto(photo.id)"
                      aria-label="Remover foto {{ i + 1 }}"
                    >
                      <hm-icon name="x" size="16" />
                    </button>
                  </div>
                }

                @if (sortedPhotos().length < 9) {
                  <label class="hm-photo-cell hm-photo-add" [class.opacity-50]="uploading()" for="photo-upload-input">
                    <hm-icon [name]="uploading() ? 'loader-2' : 'upload'" size="22" [class]="uploading() ? 'animate-spin' : ''" />
                    <span class="sr-only">Adicionar foto</span>
                    <input
                      id="photo-upload-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      class="sr-only"
                      (change)="onPhotoUpload($event)"
                      [disabled]="uploading()"
                    />
                  </label>
                }
              </div>

              <div class="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.04] p-4 text-xs leading-relaxed text-white/45">
                <strong class="block text-white/60 mb-1.5 text-[11px] uppercase tracking-wide">Dicas</strong>
                Use fotos nítidas e atuais. Evite informações sensíveis visíveis na imagem. Envie JPEG, PNG ou WEBP até 15 MB.
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

  readonly bodyTypeOptions = BODY_TYPE_OPTIONS;
  readonly genderOptions: { value: Gender; label: string }[] = [
    { value: 'MAN', label: 'Homens' },
    { value: 'WOMAN', label: 'Mulheres' },
    { value: 'NON_BINARY', label: 'Não-binários' },
    { value: 'OTHER', label: 'Outros' }
  ];
  readonly lookingForSet = signal<Set<Gender>>(new Set());
  readonly preferredBodySet = signal<Set<BodyType>>(new Set());
  readonly interestDraft = signal('');
  readonly interestTags = signal<string[]>([]);

  readonly model = signal({
    displayName: '',
    birthDate: '',
    gender: '' as Gender | '',
    bodyType: null as BodyType | null,
    city: '',
    state: '',
    bio: '',
    minAge: 18,
    maxAge: 99,
    maxDistanceKm: 100,
    strictAge: false,
    strictDistance: false,
    discoverable: true,
    recentlyActiveFirst: false,
    globalMode: false,
    country: 'BR',
    latitude: null as number | null,
    longitude: null as number | null
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
        bodyType: profile.bodyType,
        city: profile.city,
        state: profile.state,
        bio: profile.bio || '',
        minAge: profile.minAge,
        maxAge: profile.maxAge,
        maxDistanceKm: profile.maxDistanceKm,
        strictAge: profile.strictAge,
        strictDistance: profile.strictDistance,
        discoverable: profile.discoverable,
        recentlyActiveFirst: profile.recentlyActiveFirst,
        globalMode: profile.globalMode,
        country: profile.country,
        latitude: profile.latitude,
        longitude: profile.longitude
      });
      this.lookingForSet.set(new Set(profile.lookingFor || []));
      this.preferredBodySet.set(new Set((profile.preferredBodyTypes || []) as BodyType[]));
      this.interestTags.set([...(profile.interests || [])]);
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

  togglePreferredBody(bt: BodyType): void {
    const next = new Set(this.preferredBodySet());
    next.has(bt) ? next.delete(bt) : next.add(bt);
    this.preferredBodySet.set(next);
  }

  setBodyType(bt: BodyType | null): void {
    this.model.update(m => ({ ...m, bodyType: bt }));
  }

  patchInt(key: 'maxDistanceKm' | 'minAge' | 'maxAge', v: number): void {
    this.model.update(m => ({ ...m, [key]: v }));
  }
  patchBool(key: 'strictAge' | 'strictDistance' | 'discoverable' | 'recentlyActiveFirst' | 'globalMode', v: boolean): void {
    this.model.update(m => ({ ...m, [key]: v }));
  }
  patchAge(which: 'min' | 'max', v: number): void {
    this.patchInt(which === 'min' ? 'minAge' : 'maxAge', v);
  }

  removeInterest(tag: string): void {
    this.interestTags.update(list => list.filter(t => t !== tag));
  }
  onInterestInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.interestDraft.set(v);
  }
  onInterestKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.commitDraft();
    } else if (e.key === 'Backspace' && !this.interestDraft() && this.interestTags().length > 0) {
      this.interestTags.update(list => list.slice(0, -1));
    }
  }
  commitDraft(): void {
    const raw = this.interestDraft().trim();
    if (!raw) return;
    const pieces = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    if (!pieces.length) return;
    const merged = [...this.interestTags()];
    for (const p of pieces) if (!merged.includes(p) && merged.length < 30) merged.push(p);
    this.interestTags.set(merged);
    this.interestDraft.set('');
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
        const payload: ProfileRequest = {
          displayName: current.displayName,
          birthDate: current.birthDate,
          gender: current.gender as Gender,
          bodyType: current.bodyType,
          city: current.city,
          state: current.state,
          country: current.country,
          latitude: current.latitude,
          longitude: current.longitude,
          bio: current.bio || null,
          minAge: Number(current.minAge),
          maxAge: Number(current.maxAge),
          maxDistanceKm: Number(current.maxDistanceKm),
          strictAge: current.strictAge,
          strictDistance: current.strictDistance,
          discoverable: current.discoverable,
          recentlyActiveFirst: current.recentlyActiveFirst,
          globalMode: current.globalMode,
          interests: this.interestTags(),
          lookingFor: Array.from(this.lookingForSet()),
          preferredBodyTypes: Array.from(this.preferredBodySet())
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
