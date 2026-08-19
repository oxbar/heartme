import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { ProfileApi } from '../../core/api/profile.api';
import { ProfileStore } from '../../core/state/profile.store';
import type { Gender } from '../../core/api/contracts';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../ui/icon/icon.component';
import { SliderComponent } from '../../ui/slider/slider.component';
import { SwitchComponent } from '../../ui/switch/switch.component';
import type { ProfileRequest, BodyType } from '../../core/api/contracts';

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

const GENDER_INTEREST_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MAN', label: 'Homens' },
  { value: 'WOMAN', label: 'Mulheres' },
  { value: 'NON_BINARY', label: 'Não-binários' },
  { value: 'OTHER', label: 'Outros' }
];

@Component({
  imports: [FormField, CommonModule, IconComponent, SliderComponent, SwitchComponent],
  standalone: true,
  template: `
    <div class="min-h-screen bg-background py-8 sm:py-12 px-4">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-8">
          <p class="text-sm font-bold text-primary uppercase tracking-wider mb-2">Passo 1 de 1</p>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">Complete seu perfil</h1>
          <p class="text-muted-foreground max-w-xl mx-auto">Essas informações nos ajudam a conectar você com as pessoas certas.</p>
        </div>

        <div class="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
          @if (error()) {
            <div role="alert" class="mb-8 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              <hm-icon name="alert-triangle" size="20" class="flex-none mt-0.5" />
              <div>{{ error() }}</div>
            </div>
          }

          <form (submit)="onSubmit($event)" novalidate class="space-y-8">
            <!-- DADOS BÁSICOS -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-5 pb-2 border-b border-border">
              Dados básicos
            </h2>

            <div class="space-y-5">
              <div>
                <label for="ob-displayName" class="block text-sm font-semibold text-foreground mb-1.5">Nome exibido</label>
                <input
                  id="ob-displayName" type="text"
                  class="hm-ob-input"
                  [formField]="onboardingForm.displayName"
                  placeholder="Como quer ser chamado(a)"
                />
                @if (onboardingForm.displayName().touched() && onboardingForm.displayName().invalid()) {
                  <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.displayName().errors()[0]?.message }}</p>
                }
              </div>

              <div class="grid sm:grid-cols-2 gap-5">
                <div>
                  <label for="ob-birthDate" class="block text-sm font-semibold text-foreground mb-1.5">Data de nascimento</label>
                  <input
                    id="ob-birthDate" type="date"
                    class="hm-ob-input"
                    [formField]="onboardingForm.birthDate"
                  />
                  @if (onboardingForm.birthDate().touched() && onboardingForm.birthDate().invalid()) {
                    <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.birthDate().errors()[0]?.message }}</p>
                  }
                </div>
                <div>
                  <label for="ob-gender" class="block text-sm font-semibold text-foreground mb-1.5">Gênero</label>
                  <select
                    id="ob-gender"
                    class="hm-ob-input"
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
            </div>
          </div>

            <!-- LOCALIZAÇÃO -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-5 pb-2 border-b border-border">
                Localização
              </h2>
              <div class="rounded-2xl border border-border bg-accent/30 p-5">
                <div class="flex items-start gap-3 mb-4">
                  <span class="flex-none grid h-10 w-10 rounded-xl bg-primary/15 text-primary place-items-center shadow-inner">
                    <hm-icon name="map-pin" size="18" />
                  </span>
                  <div class="min-w-0">
                    <div class="text-sm font-extrabold text-foreground">Onde você mora</div>
                    <div class="text-xs text-muted-foreground mt-0.5">Usada para encontrar pessoas próximas</div>
                  </div>
                </div>
                <div class="grid sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label for="ob-city" class="block text-xs font-semibold text-foreground/80 mb-1.5">Cidade</label>
                    <input
                      id="ob-city" type="text"
                      class="hm-ob-input"
                      [formField]="onboardingForm.city"
                      placeholder="São Paulo"
                    />
                    @if (onboardingForm.city().touched() && onboardingForm.city().invalid()) {
                      <p class="mt-1.5 text-sm text-destructive">{{ onboardingForm.city().errors()[0]?.message }}</p>
                    }
                  </div>
                  <div>
                    <label for="ob-state" class="block text-xs font-semibold text-foreground/80 mb-1.5">Estado</label>
                    <input
                      id="ob-state" type="text"
                      class="hm-ob-input"
                      [formField]="onboardingForm.state"
                      placeholder="SP"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- SOBRE VOCÊ -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-5 pb-2 border-b border-border">
                Sobre você
              </h2>
              <div>
                <label for="ob-bio" class="block text-sm font-semibold text-foreground mb-1.5">Biografia</label>
                <textarea
                  id="ob-bio" rows="4"
                  class="hm-ob-input resize-y"
                  [formField]="onboardingForm.bio"
                  placeholder="Conte um pouco sobre você e o que procura..."
                ></textarea>
              </div>
            </div>

            <!-- SEU TIPO DE CORPO -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-4 pb-2 border-b border-border">
                Seu tipo de corpo
              </h2>
              <p class="text-sm text-muted-foreground mb-5">Como você se descreve? Ajuda a combinar com quem procura perfis como o seu.</p>
              <div class="grid sm:grid-cols-2 gap-3">
                @for (opt of BODY_TYPE_OPTIONS; track opt.value) {
                  <button
                    type="button"
                    class="hm-ob-body-card"
                    [class.is-selected]="bodyType() === opt.value"
                    (click)="setBodyType(opt.value)"
                  >
                    <span class="hm-ob-body-icon" [class.is-selected]="bodyType() === opt.value">
                      <hm-icon [name]="opt.icon" size="18" />
                    </span>
                    <div class="flex-1 min-w-0 text-left">
                      <div class="text-sm font-extrabold text-foreground">{{ opt.label }}</div>
                      <div class="text-xs text-muted-foreground mt-0.5">{{ opt.hint }}</div>
                    </div>
                    @if (bodyType() === opt.value) {
                      <hm-icon name="check" size="16" class="flex-none text-primary" />
                    }
                  </button>
                }
              </div>
              <button type="button" class="mt-3 text-xs font-semibold text-muted-foreground hover:text-destructive underline-offset-4 hover:underline" (click)="setBodyType(null)">Prefiro não informar</button>
            </div>

            <!-- INTERESSES -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-4 pb-2 border-b border-border">
                Interesses
              </h2>
              <p class="text-sm text-muted-foreground mb-4">Escreva abaixo e pressione Enter ou vírgula para adicionar. Remova clicando no X.</p>
              <div class="flex flex-wrap gap-2 mb-3">
                @for (tag of interests(); track tag) {
                  <span class="hm-ob-chip" (click)="removeInterest(tag)">
                    <span class="text-xs font-extrabold text-foreground">{{ tag }}</span>
                    <hm-icon name="x" size="14" />
                  </span>
                }
              </div>
              <input
                type="text"
                class="hm-ob-input"
                [value]="interestDraft()"
                (input)="onInterestInput($event)"
                (keydown)="onInterestKey($event)"
                (blur)="commitDraft()"
                placeholder="Adicione um interesse (ex: trilhas, música, cinema, academia)…"
              />
            </div>

            <!-- CONFIGURAÇÕES DE DESCOBERTA -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-5 pb-2 border-b border-border">
                Configurações de descoberta
              </h2>

              <div class="space-y-3 mb-5">
                <label class="block text-sm font-bold text-foreground mb-2 mt-3">Interessado em</label>
                <div class="flex flex-wrap gap-2">
                  @for (opt of GENDER_INTEREST_OPTIONS; track opt.value) {
                    <button
                      type="button"
                      class="hm-ob-choice-chip"
                      [class.is-selected]="lookingForSet().has(opt.value)"
                      (click)="toggleLookingFor(opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  }
                </div>
                <p class="mt-2 text-xs text-muted-foreground">Selecione pelo menos uma opção. Essa escolha define quem aparece no seu Discovery.</p>
              </div>

              <div class="hm-ob-slider-card">
                <hm-slider
                  [dual]="true"
                  [min]="18"
                  [max]="100"
                  [valueMin]="minAge()"
                  [valueMax]="maxAge()"
                  label="Faixa de idade"
                  suffix=" anos"
                  (valueMinChange)="minAge.set($event)"
                  (valueMaxChange)="maxAge.set($event)"
                />
                <div class="hm-ob-divider"></div>
                <div class="hm-ob-toggle-row">
                  <div>
                    <div class="text-sm font-extrabold text-foreground">Só mostrar nesta faixa</div>
                    <div class="text-xs text-muted-foreground mt-0.5">Fora da faixa não entra na descoberta</div>
                  </div>
                  <hm-switch
                    [checked]="strictAge()"
                    (checkedChange)="strictAge.set($event)"
                  />
                </div>
              </div>

              <div class="hm-ob-slider-card">
                <hm-slider
                  [min]="1"
                  [max]="500"
                  [valueMin]="maxDistanceKm()"
                  label="Distância máxima"
                  suffix=" km"
                  (valueMinChange)="maxDistanceKm.set($event)"
                />
                <div class="hm-ob-divider"></div>
                <div class="hm-ob-toggle-row">
                  <div>
                    <div class="text-sm font-extrabold text-foreground">Só mostrar neste raio</div>
                    <div class="text-xs text-muted-foreground mt-0.5">Quem estiver mais longe fica de fora</div>
                  </div>
                  <hm-switch
                    [checked]="strictDistance()"
                    (checkedChange)="strictDistance.set($event)"
                  />
                </div>
              </div>
            </div>

            <!-- CORPO QUE VOCÊ BUSCA -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-4 pb-2 border-b border-border">
                Corpo que você busca
              </h2>
              <p class="text-sm text-muted-foreground mb-4">Selecione os tipos de corpo que você deseja ver na descoberta. Deixe vazio para ver todos.</p>
              <div class="flex flex-wrap gap-2">
                @for (opt of BODY_TYPE_OPTIONS; track opt.value) {
                  <button
                    type="button"
                    class="hm-ob-choice-chip is-soft"
                    [class.is-selected]="preferredBodySet().has(opt.value)"
                    (click)="togglePreferredBody(opt.value)"
                  >
                    <hm-icon [name]="opt.icon" size="15" />
                    {{ opt.label }}
                  </button>
                }
              </div>
            </div>

            <!-- RECOMENDAÇÕES -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-5 pb-2 border-b border-border">
                Recomendações
              </h2>
              <div class="space-y-1">
                <div class="hm-ob-toggle-row is-standalone">
                  <div>
                    <div class="text-sm font-extrabold text-foreground">Recentes primeiro</div>
                    <div class="text-xs text-muted-foreground mt-0.5">Prioriza pessoas que usaram o app recentemente</div>
                  </div>
                  <hm-switch
                    [checked]="recentlyActiveFirst()"
                    (checkedChange)="recentlyActiveFirst.set($event)"
                  />
                </div>
                <div class="hm-ob-toggle-row is-standalone">
                  <div>
                    <div class="text-sm font-extrabold text-foreground">Modo global</div>
                    <div class="text-xs text-muted-foreground mt-0.5">Depois que acabar os perfis perto de você, mostra pessoas de qualquer lugar</div>
                  </div>
                  <hm-switch
                    [checked]="globalMode()"
                    (checkedChange)="globalMode.set($event)"
                  />
                </div>
              </div>
            </div>

            <!-- VISIBILIDADE -->
            <div>
              <h2 class="text-[11px] font-extrabold uppercase tracking-[0.24em] text-foreground/55 mb-5 pb-2 border-b border-border">
                Visibilidade
              </h2>
              <div class="hm-ob-toggle-row is-standalone">
                <div>
                  <div class="text-sm font-extrabold text-foreground">Ativar descoberta</div>
                  <div class="text-xs text-muted-foreground mt-0.5">Desligado, seu perfil não aparece na pilha de ninguém (matches antigos continuam)</div>
                </div>
                <hm-switch
                  [checked]="discoverable()"
                  (checkedChange)="discoverable.set($event)"
                />
              </div>
            </div>

            <!-- BOTÃO -->
            <button
              type="submit"
              [disabled]="onboardingForm().invalid() || onboardingForm().submitting()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

  protected readonly BODY_TYPE_OPTIONS = BODY_TYPE_OPTIONS;
  protected readonly GENDER_INTEREST_OPTIONS = GENDER_INTEREST_OPTIONS;

  readonly error = signal('');

  readonly lookingForSet = signal<Set<Gender>>(new Set());
  readonly preferredBodySet = signal<Set<BodyType>>(new Set());

  readonly minAge = signal(18);
  readonly maxAge = signal(99);
  readonly maxDistanceKm = signal(100);
  readonly strictAge = signal(false);
  readonly strictDistance = signal(false);
  readonly recentlyActiveFirst = signal(false);
  readonly globalMode = signal(false);
  readonly discoverable = signal(true);
  readonly bodyType = signal<BodyType | null>(null);

  readonly interests = signal<string[]>([]);
  readonly interestDraft = signal('');

  readonly model = signal({
    displayName: '',
    birthDate: '',
    gender: '' as Gender | '',
    city: '',
    state: '',
    bio: '',
    interestsRaw: '',
    country: 'BR',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  readonly onboardingForm = form(this.model, p => {
    required(p.displayName, { message: 'Informe seu nome' });
    minLength(p.displayName, 2, { message: 'Nome muito curto' });
    required(p.birthDate, { message: 'Informe sua data de nascimento' });
    required(p.gender, { message: 'Selecione um gênero' });
    required(p.city, { message: 'Informe sua cidade' });
    minLength(p.city, 2, { message: 'Cidade muito curta' });
  });

  toggleLookingFor(gender: Gender): void {
    const next = new Set(this.lookingForSet());
    next.has(gender) ? next.delete(gender) : next.add(gender);
    this.lookingForSet.set(next);
  }

  setBodyType(value: BodyType | null): void {
    this.bodyType.set(value);
  }

  togglePreferredBody(value: BodyType): void {
    const next = new Set(this.preferredBodySet());
    next.has(value) ? next.delete(value) : next.add(value);
    this.preferredBodySet.set(next);
  }

  onInterestInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.interestDraft.set(value);
  }

  onInterestKey(event: KeyboardEvent): void {
    const value = this.interestDraft();
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      this.commitDraft();
      return;
    }
    if (event.key === 'Backspace' && value.trim() === '' && this.interests().length > 0) {
      event.preventDefault();
      const list = this.interests().slice(0, -1);
      this.interests.set(list);
    }
  }

  commitDraft(): void {
    const raw = this.interestDraft();
    if (!raw) return;
    const parts = raw.split(/[,;]/g).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      const trimmed = raw.trim();
      if (trimmed) parts.push(trimmed);
    }
    if (parts.length === 0) return;
    const deduped = Array.from(new Set([...this.interests(), ...parts])).slice(0, 50);
    this.interests.set(deduped);
    this.interestDraft.set('');
  }

  removeInterest(tag: string): void {
    this.interests.set(this.interests().filter(i => i !== tag));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.commitDraft();

    if (this.lookingForSet().size === 0) {
      this.error.set('Selecione pelo menos uma opção em “Interessado em” para configurar seu Discovery.');
      return;
    }

    void submit(this.onboardingForm, async () => {
      this.error.set('');
      try {
        const m = this.model();
        const payload: ProfileRequest = {
          displayName: m.displayName,
          birthDate: m.birthDate,
          gender: m.gender as Gender,
          bodyType: this.bodyType() ?? null,
          city: m.city,
          state: m.state,
          country: m.country,
          latitude: m.latitude,
          longitude: m.longitude,
          bio: m.bio || null,
          minAge: Number(this.minAge()),
          maxAge: Number(this.maxAge()),
          maxDistanceKm: Number(this.maxDistanceKm()),
          strictAge: this.strictAge(),
          strictDistance: this.strictDistance(),
          discoverable: this.discoverable(),
          recentlyActiveFirst: this.recentlyActiveFirst(),
          globalMode: this.globalMode(),
          interests: this.interests(),
          lookingFor: Array.from(this.lookingForSet()),
          preferredBodyTypes: Array.from(this.preferredBodySet()),
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
