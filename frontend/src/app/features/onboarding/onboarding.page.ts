import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, min, minLength, required, submit } from '@angular/forms/signals';
import { ProfileApi } from '../../core/api/profile.api';
import { ProfileStore } from '../../core/state/profile.store';
import type { Gender } from '../../core/api/contracts';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../ui/icon/icon.component';
import type { ProfileRequest } from '../../core/api/contracts';

@Component({
  imports: [FormField, CommonModule, IconComponent],
  standalone: true,
  template: `
    <div class="min-h-screen bg-background py-10 px-4">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-10">
          <p class="text-sm font-bold text-primary uppercase tracking-wider mb-2">Passo 1 de 1</p>
          <h1 class="text-3xl font-extrabold tracking-tight text-foreground mb-3">Complete seu perfil</h1>
          <p class="text-muted-foreground">Essas informações nos ajudam a conectar você com as pessoas certas.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          @if (error()) {
            <div role="alert" class="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              <hm-icon name="alert-triangle" size="20" class="flex-none mt-0.5" />
              <div>{{ error() }}</div>
            </div>
          }
          <form (submit)="onSubmit($event)" novalidate class="space-y-5">
            <div>
              <label for="displayName" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="user" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Nome exibido
              </label>
              <input
                id="displayName" type="text"
                class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                [formField]="onboardingForm.displayName"
                placeholder="Como quer ser chamado(a)"
              />
              @if (onboardingForm.displayName().touched() && onboardingForm.displayName().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.displayName().errors()[0]?.message }}</p>
              }
            </div>
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label for="birthDate" class="block text-sm font-semibold text-foreground mb-1.5">
                  <hm-icon name="calendar" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Data de nascimento
                </label>
                <input
                  id="birthDate" type="date"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="onboardingForm.birthDate"
                />
                @if (onboardingForm.birthDate().touched() && onboardingForm.birthDate().invalid()) {
                  <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.birthDate().errors()[0]?.message }}</p>
                }
              </div>
              <div>
                <label for="gender" class="block text-sm font-semibold text-foreground mb-1.5">
                  <hm-icon name="user" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Gênero
                </label>
                <select
                  id="gender"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="onboardingForm.gender"
                >
                  <option value="">Selecione…</option>
                  <option value="MAN">Homem</option>
                  <option value="WOMAN">Mulher</option>
                  <option value="NON_BINARY">Não-binário</option>
                  <option value="OTHER">Outro</option>
                </select>
                @if (onboardingForm.gender().touched() && onboardingForm.gender().invalid()) {
                  <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.gender().errors()[0]?.message }}</p>
                }
              </div>
            </div>
            <div>
              <label for="city" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="map-pin" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Cidade
              </label>
              <input
                id="city" type="text"
                class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                [formField]="onboardingForm.city"
                placeholder="São Paulo, SP"
              />
              @if (onboardingForm.city().touched() && onboardingForm.city().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.city().errors()[0]?.message }}</p>
              }
            </div>
            <div>
              <label for="bio" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="file-text" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Biografia
              </label>
              <textarea
                id="bio" rows="4"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                [formField]="onboardingForm.bio"
                placeholder="Conte um pouco sobre você e o que procura..."
              ></textarea>
            </div>
            <div class="grid sm:grid-cols-3 gap-5">
              <div>
                <label for="minAge" class="block text-sm font-semibold text-foreground mb-1.5">
                  <hm-icon name="ruler" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Idade mínima
                </label>
                <input
                  id="minAge" type="number"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="onboardingForm.minAge"
                />
                @if (onboardingForm.minAge().touched() && onboardingForm.minAge().invalid()) {
                  <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.minAge().errors()[0]?.message }}</p>
                }
              </div>
              <div>
                <label for="maxAge" class="block text-sm font-semibold text-foreground mb-1.5">
                  <hm-icon name="ruler" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Idade máxima
                </label>
                <input
                  id="maxAge" type="number"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="onboardingForm.maxAge"
                />
              </div>
              <div>
                <label for="maxDistanceKm" class="block text-sm font-semibold text-foreground mb-1.5">
                  <hm-icon name="map-pin" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Distância máxima (km)
                </label>
                <input
                  id="maxDistanceKm" type="number"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="onboardingForm.maxDistanceKm"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-foreground mb-2">
                <hm-icon name="heart" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Procurando por
              </label>
              <div class="flex flex-wrap gap-2">
                @for (opt of genderOptions; track opt.value) {
                  <button
                  type="button"
                  (click)="toggleLookingFor(opt.value)"
                  class="inline-flex items-center rounded-full border px-3 px-4 py-1.5 text-sm font-semibold transition"
                  [ngClass]="lookingForSet().has(opt.value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                  ">
                    {{ opt.label }}
                  </button>
                }
              </div>
            </div>
            <div>
              <label for="interests" class="block text-sm font-semibold text-foreground mb-1.5">
              <hm-icon name="sparkles" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Interesses (separados por vírgula)
              </label>
              <input
                id="interests" type="text"
                class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                [formField]="onboardingForm.interestsRaw"
                placeholder="música, viagem, cinema, café..."
              />
              <p class="mt-1 text-xs text-muted-foreground">Exemplos: leitura, yoga, tecnologia, gastronomia</p>
            </div>
            <button
              type="submit"
              [disabled]="onboardingForm().invalid() || onboardingForm().submitting()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (onboardingForm().submitting()) {
                <hm-icon name="refresh-cw" size="16" class="animate-spin" />
                Salvando...
              } @else {
                Salvar e começar
                <hm-icon name="sparkles" size="16" />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingPage {
  private readonly profileApi = inject(ProfileApi);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  readonly error = signal('');
  readonly genderOptions = [
    { value: 'MAN' as Gender, label: 'Homens' },
    { value: 'WOMAN' as Gender, label: 'Mulheres' },
    { value: 'NON_BINARY' as Gender, label: 'Não-binários' },
    { value: 'OTHER' as Gender, label: 'Outros' }
  ];
  readonly lookingForSet = signal<Set<Gender>>(new Set(['WOMAN']));

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

  readonly onboardingForm = form(this.model, p => {
    required(p.displayName, { message: 'Informe seu nome' });
    minLength(p.displayName, 2, { message: 'Nome muito curto' });
    required(p.birthDate, { message: 'Informe sua data de nascimento' });
    required(p.gender, { message: 'Selecione um gênero' });
    required(p.city, { message: 'Informe sua cidade' });
    min(p.minAge, 18, { message: 'Idade mínima 18' });
  });

  toggleLookingFor(gender: Gender): void {
    const next = new Set(this.lookingForSet());
    next.has(gender) ? next.delete(gender) : next.add(gender);
    this.lookingForSet.set(next);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.onboardingForm, async () => {
      this.error.set('');
      try {
        const m = this.model();
        const interests = m.interestsRaw.split(',').map(i => i.trim()).filter(Boolean);
        const payload: ProfileRequest = {
          displayName: m.displayName,
          birthDate: m.birthDate,
          gender: m.gender as Gender,
          bodyType: null,
          city: m.city,
          state: m.state,
          country: m.country,
          latitude: m.latitude,
          longitude: m.longitude,
          bio: m.bio || null,
          minAge: Number(m.minAge),
          maxAge: Number(m.maxAge),
          maxDistanceKm: Number(m.maxDistanceKm),
          strictAge: false,
          strictDistance: false,
          discoverable: m.discoverable,
          recentlyActiveFirst: false,
          globalMode: false,
          interests,
          lookingFor: Array.from(this.lookingForSet()),
          preferredBodyTypes: []
        };
        const saved = await firstValueFrom(this.profileApi.save(payload));
        this.profileStore.clear();
        await this.profileStore.reload();
        await this.router.navigate(['/app/discover']);
      } catch {
        this.error.set('Não foi possível salvar seu perfil. Tente novamente.');
      }
    });
  }
}
