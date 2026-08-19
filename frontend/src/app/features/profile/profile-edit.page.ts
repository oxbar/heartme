import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { form, FormField, min, minLength, required, submit } from '@angular/forms/signals';
import { ProfileApi } from '../../core/api/profile.api';
import { ProfileStore } from '../../core/state/profile.store';
import type { Gender, ProfileRequest } from '../../core/api/contracts';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../ui/icon/icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';

@Component({
  imports: [RouterLink, FormField, CommonModule, IconComponent, PageHeaderComponent],
  standalone: true,
  template: `
    <div class="space-y-6 animate-fade-in">
      <hm-page-header title="Editar perfil" subtitle="Atualize suas informações pessoais." icon="pencil">
        <div pageHeaderActions>
          <a
            routerLink="/app/profile"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted transition text-foreground"
            aria-label="Voltar"
          >
            <hm-icon name="arrow-left" size="20" />
          </a>
        </div>
      </hm-page-header>

      <div class="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        @if (error()) {
          <div role="alert" class="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {{ error() }}
          </div>
        }
        @if (loading()) {
          <div class="space-y-4 py-10">
            @for (_ of [0,1,2,3,4,5]; track _) {
              <div class="h-10 rounded-lg bg-muted animate-skeleton-pulse"></div>
            }
          </div>
        } @else {
          <form (submit)="onSubmit($event)" novalidate class="space-y-5">
            <div>
              <label for="edit-displayName" class="block text-sm font-semibold text-foreground mb-1.5">
              <hm-icon name="user" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Nome exibido
              </label>
              <input
                id="edit-displayName" type="text"
                class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                [formField]="editForm.displayName"
              />
              @if (editForm.displayName().touched() && editForm.displayName().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ editForm.displayName().errors()[0]?.message }}</p>
              }
            </div>
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label for="edit-birthDate" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="calendar" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Data de nascimento
                </label>
                <input
                  id="edit-birthDate" type="date"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="editForm.birthDate"
                />
              </div>
              <div>
                <label for="edit-gender" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="user" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Gênero
                </label>
                <select
                  id="edit-gender"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="editForm.gender"
                >
                  <option value="">Selecione…</option>
                  <option value="MAN">Homem</option>
                  <option value="WOMAN">Mulher</option>
                  <option value="NON_BINARY">Não-binário</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
            </div>
            <div>
              <label for="edit-city" class="block text-sm font-semibold text-foreground mb-1.5">
              <hm-icon name="map-pin" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Cidade
              </label>
              <input
                id="edit-city" type="text"
                class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                [formField]="editForm.city"
              />
            </div>
            <div>
              <label for="edit-bio" class="block text-sm font-semibold text-foreground mb-1.5">
              <hm-icon name="file-text" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Biografia
              </label>
              <textarea
                id="edit-bio" rows="4"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                [formField]="editForm.bio"
              ></textarea>
            </div>
            <div class="grid sm:grid-cols-3 gap-5">
              <div>
                <label for="edit-minAge" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="ruler" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Idade mínima
                </label>
                <input
                  id="edit-minAge" type="number"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="editForm.minAge"
                />
              </div>
              <div>
                <label for="edit-maxAge" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="ruler" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Idade máxima
                </label>
                <input
                  id="edit-maxAge" type="number"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="editForm.maxAge"
                />
              </div>
              <div>
                <label for="edit-maxDistanceKm" class="block text-sm font-semibold text-foreground mb-1.5">
                <hm-icon name="map-pin" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  Distância (km)
                </label>
                <input
                  id="edit-maxDistanceKm" type="number"
                  class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="editForm.maxDistanceKm"
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
                  class="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition"
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
              <label for="edit-interests" class="block text-sm font-semibold text-foreground mb-1.5">
              <hm-icon name="sparkles" size="16" class="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Interesses (separados por vírgula)
              </label>
              <input
                id="edit-interests" type="text"
                class="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                [formField]="editForm.interestsRaw"
                placeholder="música, viagem, cinema..."
              />
            </div>
            <div class="flex items-center justify-end gap-3 pt-2">
              <a
                routerLink="/app/profile"
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition"
              >
                <hm-icon name="x" size="16" />
                Cancelar
              </a>
              <button
                type="submit"
                [disabled]="editForm().invalid() || editForm().submitting()"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (editForm().submitting()) {
                  <hm-icon name="rotate-ccw" size="16" class="animate-spin" />
                  Salvando...
                } @else {
                  <hm-icon name="save" size="16" />
                  Salvar
                }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileEditPage implements OnInit {
  private readonly profileApi = inject(ProfileApi);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal('');

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

  readonly editForm = form(this.model, p => {
    required(p.displayName, { message: 'Informe seu nome' });
    minLength(p.displayName, 2, { message: 'Nome muito curto' });
    required(p.birthDate, { message: 'Informe sua data de nascimento' });
    required(p.gender, { message: 'Selecione um gênero' });
    required(p.city, { message: 'Informe sua cidade' });
    min(p.minAge, 18, { message: 'Idade mínima 18' });
  });

  async ngOnInit(): Promise<void> {
    try {
      const p = await firstValueFrom(this.profileApi.me());
      this.model.set({
        displayName: p.displayName,
        birthDate: p.birthDate,
        gender: p.gender,
        city: p.city,
        state: p.state,
        bio: p.bio || '',
        minAge: p.minAge,
        maxAge: p.maxAge,
        maxDistanceKm: p.maxDistanceKm,
        interestsRaw: (p.interests || []).join(', '),
        country: p.country,
        latitude: p.latitude,
        longitude: p.longitude,
        discoverable: p.discoverable
      });
      this.lookingForSet.set(new Set(p.lookingFor || []));
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

  onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.editForm, async () => {
      this.error.set('');
      try {
        const m = this.model();
        const interests = m.interestsRaw.split(',').map(i => i.trim()).filter(Boolean);
        const payload: ProfileRequest = {
          displayName: m.displayName,
          birthDate: m.birthDate,
          gender: m.gender as Gender,
          city: m.city,
          state: m.state,
          country: m.country,
          latitude: m.latitude,
          longitude: m.longitude,
          bio: m.bio || null,
          minAge: Number(m.minAge),
          maxAge: Number(m.maxAge),
          maxDistanceKm: Number(m.maxDistanceKm),
          discoverable: m.discoverable,
          interests,
          lookingFor: Array.from(this.lookingForSet())
        };
        await firstValueFrom(this.profileApi.save(payload));
        this.profileStore.clear();
        await this.profileStore.reload();
        await this.router.navigate(['/app/profile']);
      } catch {
        this.error.set('Não foi possível salvar as alterações.');
      }
    });
  }
}
