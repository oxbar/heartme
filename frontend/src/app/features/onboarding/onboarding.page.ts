import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { ProfileApi } from '../../core/api/profile.api';
import { MediaApi } from '../../core/api/media.api';
import { LocationApi } from '../../core/api/location.api';
import { ProfileStore } from '../../core/state/profile.store';
import type { BrazilianCityView, BrazilianStateView, Gender, ProfileRequest, BodyType, PhotoView } from '../../core/api/contracts';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../ui/icon/icon.component';
import { SliderComponent } from '../../ui/slider/slider.component';

interface OnboardingFormModel {
  displayName: string;
  birthDate: string;
  gender: Gender | '';
  city: string;
  state: string;
  bio: string;
  interestsRaw: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface InterestGroup {
  title: string;
  items: readonly string[];
}

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

const ONBOARDING_INTEREST_GROUPS: InterestGroup[] = [
  { title: 'Estilo de vida', items: ['Academia', 'Viagens', 'Trilhas', 'Praia', 'Gastronomia', 'Café', 'Pets', 'Natureza'] },
  { title: 'Cultura', items: ['Música', 'Cinema', 'Séries', 'Livros', 'Fotografia', 'Arte', 'Museus', 'Teatro'] },
  { title: 'Social', items: ['Amigos', 'Família', 'Festas', 'Bares', 'Shows', 'Festivais', 'Churrasco', 'Eventos'] },
  { title: 'Esportes & hobbies', items: ['Corrida', 'Ciclismo', 'Futebol', 'Dança', 'Games', 'Tecnologia', 'Culinária', 'Yoga'] }
];


@Component({
  imports: [FormField, CommonModule, IconComponent, SliderComponent],
  standalone: true,
  template: `
    <div class="hm-ob-shell">
      <div class="hm-ob-inner">
        <div class="hm-ob-header">
          <p class="hm-auth-eyebrow">Seu perfil, sem burocracia</p>
          <h1>Vamos montar seu matching</h1>
          <p>Quatro passos curtos para entendermos quem você é, quem procura, suas afinidades e como você quer aparecer.</p>
        </div>

        <nav class="hm-ob-progress" aria-label="Progresso do cadastro">
          @for (step of steps; track step.id) {
            <div
              class="hm-ob-progress-item"
              [class.is-active]="currentStep() === step.id"
              [class.is-complete]="currentStep() > step.id"
            >
              <span class="hm-ob-progress-dot">
                @if (currentStep() > step.id) { <hm-icon name="check" size="14" /> }
                @else { {{ step.id }} }
              </span>
              <span class="hm-ob-progress-copy">
                <strong>{{ step.title }}</strong>
                <small>{{ step.caption }}</small>
              </span>
            </div>
          }
        </nav>

        <div class="hm-ob-card">
          <div class="hm-ob-step-heading">
            <span>Passo {{ currentStep() }} de {{ steps.length }}</span>
            <h2>{{ currentStepMeta().title }}</h2>
            <p>{{ currentStepMeta().description }}</p>
          </div>

          @if (error()) {
            <div role="alert" class="hm-auth-alert hm-ob-alert">
              <span class="hm-ob-alert-icon"><hm-icon name="alert-triangle" size="18" /></span>
              <div>{{ error() }}</div>
            </div>
          }

          <form (submit)="onSubmit($event)" novalidate>
            @if (currentStep() === 1) {
              <section class="hm-ob-step-panel" aria-labelledby="ob-step-basics">
                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading">
                    <span class="hm-ob-section-number">01</span>
                    <div>
                      <h3 id="ob-step-basics">O essencial sobre você</h3>
                      <p>Usamos idade, gênero e localização para formar o conjunto inicial de candidatos.</p>
                    </div>
                  </div>

                  <div class="hm-field">
                    <label class="hm-field-label" for="ob-displayName">Nome exibido</label>
                    <input
                      id="ob-displayName" type="text"
                      class="hm-ob-input"
                      [formField]="onboardingForm.displayName"
                      placeholder="Como quer ser chamado(a)"
                    />
                    @if (onboardingForm.displayName().touched() && onboardingForm.displayName().invalid()) {
                      <p class="hm-field-error">{{ onboardingForm.displayName().errors()[0]?.message }}</p>
                    }
                  </div>

                  <div class="hm-ob-grid-2">
                    <div class="hm-field">
                      <label class="hm-field-label" for="ob-birthDate">Data de nascimento</label>
                      <input id="ob-birthDate" type="date" class="hm-ob-input" [formField]="onboardingForm.birthDate" />
                      @if (onboardingForm.birthDate().touched() && onboardingForm.birthDate().invalid()) {
                        <p class="hm-field-error">{{ onboardingForm.birthDate().errors()[0]?.message }}</p>
                      }
                    </div>
                    <div class="hm-field">
                      <label class="hm-field-label" for="ob-gender">Gênero</label>
                      <select id="ob-gender" class="hm-ob-input" [formField]="onboardingForm.gender">
                        <option value="">Selecione…</option>
                        <option value="MAN">Homem</option>
                        <option value="WOMAN">Mulher</option>
                        <option value="NON_BINARY">Não-binário</option>
                        <option value="OTHER">Outro</option>
                      </select>
                      @if (onboardingForm.gender().touched() && onboardingForm.gender().invalid()) {
                        <p class="hm-field-error">{{ onboardingForm.gender().errors()[0]?.message }}</p>
                      }
                    </div>
                  </div>
                </div>

                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading is-compact">
                    <span class="hm-ob-section-number"><hm-icon name="map-pin" size="16" /></span>
                    <div>
                      <h3>Onde você está</h3>
                      <p>Cidade e coordenadas melhoram a relevância geográfica sem expor sua posição exata.</p>
                    </div>
                  </div>

                  <div class="hm-ob-location-callout">
                    <div class="hm-ob-grid-2">
                      <div class="hm-field">
                        <label class="hm-field-label is-subtle" for="ob-state">Estado</label>
                        <input
                          id="ob-state" type="text"
                          class="hm-ob-input"
                          list="ob-state-options"
                          [formField]="onboardingForm.state"
                          (input)="onStateInput($event)"
                          placeholder="Santa Catarina"
                        />
                        <datalist id="ob-state-options">
                          @for (state of states(); track state.code) { <option [value]="state.name">{{ state.code }}</option> }
                        </datalist>
                        @if (onboardingForm.state().touched() && onboardingForm.state().invalid()) {
                          <p class="hm-field-error">{{ onboardingForm.state().errors()[0]?.message }}</p>
                        }
                      </div>
                      <div class="hm-field">
                        <label class="hm-field-label is-subtle" for="ob-city">Cidade</label>
                        <div class="hm-input-wrap has-icon-right">
                          <input
                            id="ob-city" type="text"
                            class="hm-ob-input"
                            list="ob-city-options"
                            [formField]="onboardingForm.city"
                            (input)="onCityInput($event)"
                            [placeholder]="cityLoading() ? 'Carregando cidades…' : 'Blumenau'"
                          />
                          @if (cityLoading()) {
                            <span class="hm-ob-loader" aria-hidden="true"><hm-icon name="loader-2" class="animate-spin" /></span>
                          }
                        </div>
                        <datalist id="ob-city-options">
                          @for (city of cities(); track city.id) { <option [value]="city.name"></option> }
                        </datalist>
                        @if (onboardingForm.city().touched() && onboardingForm.city().invalid()) {
                          <p class="hm-field-error">{{ onboardingForm.city().errors()[0]?.message }}</p>
                        }
                      </div>
                    </div>

                    <div class="hm-ob-geo-row">
                      <div>
                        <strong>Distância mais precisa</strong>
                        @if (geoStatus() === 'ready') {
                          <span class="is-success">Localização precisa ativada</span>
                        } @else if (geoStatus() === 'denied') {
                          <span>Permissão recusada. Você pode continuar usando cidade e estado.</span>
                        } @else if (geoStatus() === 'unavailable') {
                          <span>Localização precisa indisponível neste navegador.</span>
                        } @else {
                          <span>Opcional, mas permite ao motor calcular quilômetros reais entre perfis.</span>
                        }
                      </div>
                      <button type="button" class="hm-ob-secondary-action" (click)="requestPreciseLocation()" [disabled]="geoStatus() === 'loading'">
                        <hm-icon [name]="geoStatus() === 'loading' ? 'loader-2' : 'crosshair'" [class]="geoStatus() === 'loading' ? 'animate-spin' : ''" />
                        {{ geoStatus() === 'ready' ? 'Atualizar' : 'Usar localização' }}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            }

            @if (currentStep() === 2) {
              <section class="hm-ob-step-panel" aria-labelledby="ob-step-preferences">
                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading">
                    <span class="hm-ob-section-number">02</span>
                    <div>
                      <h3 id="ob-step-preferences">Quem você quer encontrar</h3>
                      <p>Estas preferências têm impacto direto no filtro e na ordem dos perfis exibidos.</p>
                    </div>
                  </div>

                  <div class="hm-field">
                    <label class="hm-field-label">Tenho interesse em</label>
                    <div class="hm-ob-choice-row">
                      @for (opt of GENDER_INTEREST_OPTIONS; track opt.value) {
                        <button
                          type="button"
                          class="hm-ob-choice-chip"
                          [class.is-selected]="lookingForSet().has(opt.value)"
                          (click)="toggleLookingFor(opt.value)"
                        >
                          @if (lookingForSet().has(opt.value)) { <hm-icon name="check" size="15" /> }
                          {{ opt.label }}
                        </button>
                      }
                    </div>
                    <p class="hm-ob-choice-hint">Obrigatório: isso define o filtro de gênero aplicado no Discovery.</p>
                  </div>

                  <div class="hm-ob-slider-card">
                    <hm-slider
                      [dual]="true"
                      [min]="18"
                      [max]="100"
                      [valueMin]="minAge()"
                      [valueMax]="maxAge()"
                      label="Faixa de idade preferida"
                      suffix=" anos"
                      (valueMinChange)="minAge.set($event)"
                      (valueMaxChange)="maxAge.set($event)"
                    />
                    <p class="hm-ob-card-note">A idade funciona como preferência de ranking. Você poderá transformar isso em filtro rígido depois, nas configurações.</p>
                  </div>

                  @if (hasPreciseLocation()) {
                    <div class="hm-ob-slider-card">
                      <hm-slider
                        [min]="1"
                        [max]="500"
                        [valueMin]="maxDistanceKm()"
                        label="Distância preferida"
                        suffix=" km"
                        (valueMinChange)="maxDistanceKm.set($event)"
                      />
                      <p class="hm-ob-card-note">Com sua localização precisa ativa, a distância passa a participar do score do matching.</p>
                    </div>
                  } @else {
                    <div class="hm-ob-inline-note">
                      <hm-icon name="map-pin" size="17" />
                      <span>Distância em km ficou oculta porque ainda não temos coordenadas confiáveis. Assim evitamos prometer um filtro que o backend não conseguiria calcular.</span>
                    </div>
                  }
                </div>

                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading is-compact">
                    <span class="hm-ob-section-number"><hm-icon name="sparkles" size="16" /></span>
                    <div>
                      <h3>Preferência física <small>opcional</small></h3>
                      <p>Serve como sinal suave de ranking; deixar vazio mantém o Discovery mais aberto.</p>
                    </div>
                  </div>
                  <div class="hm-ob-choice-row">
                    @for (opt of BODY_TYPE_OPTIONS; track opt.value) {
                      <button
                        type="button"
                        class="hm-ob-choice-chip is-soft"
                        [class.is-selected]="preferredBodySet().has(opt.value)"
                        (click)="togglePreferredBody(opt.value)"
                      >
                        <hm-icon [name]="opt.icon" />
                        {{ opt.label }}
                      </button>
                    }
                  </div>
                </div>
              </section>
            }

            @if (currentStep() === 3) {
              <section class="hm-ob-step-panel" aria-labelledby="ob-step-affinity">
                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading">
                    <span class="hm-ob-section-number">03</span>
                    <div>
                      <h3 id="ob-step-affinity">Afinidade e personalidade</h3>
                      <p>Interesses em comum aumentam o score e ajudam a quebrar o gelo depois do match.</p>
                    </div>
                  </div>

                  <div class="hm-ob-interest-summary">
                    <div>
                      <strong>Escolha pelo menos 3 interesses</strong>
                      <span>O motor compara interesses em comum usando similaridade Jaccard.</span>
                    </div>
                    <span class="hm-ob-counter" [class.is-ready]="interests().length >= 3">{{ interests().length }}/30</span>
                  </div>

                  <div class="hm-ob-interest-groups">
                    @for (group of interestGroups; track group.title) {
                      <div class="hm-ob-interest-group">
                        <strong>{{ group.title }}</strong>
                        <div class="hm-ob-interest-list">
                          @for (interest of group.items; track interest) {
                            <button
                              type="button"
                              class="hm-ob-interest-option"
                              [class.is-selected]="hasInterest(interest)"
                              (click)="toggleInterest(interest)"
                            >
                              @if (hasInterest(interest)) { <hm-icon name="check" /> }
                              {{ interest }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <div class="hm-ob-custom-interest">
                    <div class="hm-field">
                      <label class="hm-field-label is-subtle">Não encontrou o seu?</label>
                      <input
                        type="text"
                        class="hm-ob-input"
                        [value]="interestDraft()"
                        (input)="onInterestInput($event)"
                        (keydown)="onInterestKey($event)"
                        (blur)="commitDraft()"
                        placeholder="Adicionar outro interesse…"
                      />
                    </div>
                    <button type="button" class="hm-ob-add-interest" (click)="commitDraft()">Adicionar</button>
                  </div>
                </div>

                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading is-compact">
                    <span class="hm-ob-section-number"><hm-icon name="user" size="16" /></span>
                    <div>
                      <h3>Como você se descreve <small>opcional</small></h3>
                      <p>Esses dados melhoram a qualidade do perfil e podem aumentar compatibilidade.</p>
                    </div>
                  </div>

                  <div class="hm-ob-body-grid">
                    @for (opt of BODY_TYPE_OPTIONS; track opt.value) {
                      <button
                        type="button"
                        class="hm-ob-body-card"
                        [class.is-selected]="bodyType() === opt.value"
                        (click)="setBodyType(opt.value)"
                      >
                        <span class="hm-ob-body-icon" [class.is-selected]="bodyType() === opt.value"><hm-icon [name]="opt.icon" /></span>
                        <div class="hm-ob-body-copy"><strong>{{ opt.label }}</strong><span>{{ opt.hint }}</span></div>
                        @if (bodyType() === opt.value) { <span class="hm-ob-body-check"><hm-icon name="check" /></span> }
                      </button>
                    }
                  </div>
                  <button type="button" class="hm-ob-muted-link" (click)="setBodyType(null)">Prefiro não informar</button>

                  <div class="hm-field hm-ob-bio-field">
                    <label class="hm-field-label" for="ob-bio">Uma bio curta <span class="hm-ob-optional">opcional</span></label>
                    <textarea
                      id="ob-bio" rows="4"
                      class="hm-ob-input"
                      [formField]="onboardingForm.bio"
                      placeholder="Conte um pouco sobre você e o que gostaria de encontrar…"
                    ></textarea>
                    <p class="hm-ob-choice-hint">Perfis com bio completa também recebem sinal positivo de qualidade no ranking.</p>
                  </div>
                </div>

                <div class="hm-ob-ready-card">
                  <span class="hm-ob-ready-icon"><hm-icon name="upload" /></span>
                  <div>
                    <strong>Falta só mostrar quem você é</strong>
                    <span>No próximo passo você adiciona de 2 a 6 fotos. A primeira será a foto principal do seu perfil.</span>
                  </div>
                </div>
              </section>
            }

            @if (currentStep() === 4) {
              <section class="hm-ob-step-panel" aria-labelledby="ob-step-photos">
                <div class="hm-ob-section">
                  <div class="hm-ob-section-heading">
                    <span class="hm-ob-section-number">04</span>
                    <div>
                      <h3 id="ob-step-photos">Mostre quem você é</h3>
                      <p>Adicione entre 2 e 6 fotos nítidas e atuais. A primeira foto enviada será usada como principal.</p>
                    </div>
                  </div>

                  <div class="hm-ob-photo-summary">
                    <div>
                      <strong>{{ photosReady() ? 'Fotos prontas para começar' : 'Adicione pelo menos 2 fotos' }}</strong>
                      <span>JPEG, PNG ou WEBP · até 15 MB por imagem · máximo de 6 fotos.</span>
                    </div>
                    <span class="hm-ob-counter" [class.is-ready]="photosReady()">{{ photos().length }}/6</span>
                  </div>

                  <div class="hm-ob-photo-grid">
                    @for (photo of sortedPhotos(); track photo.id; let i = $index) {
                      <article class="hm-ob-photo-card" [class.is-primary]="i === 0">
                        <img [src]="photo.url" alt="Foto do perfil {{ i + 1 }}" loading="lazy" />
                        <span class="hm-ob-photo-position">{{ i === 0 ? 'Principal' : (i + 1) }}</span>
                        <button
                          type="button"
                          class="hm-ob-photo-remove"
                          (click)="deletePhoto(photo.id)"
                          [disabled]="uploading()"
                          aria-label="Remover foto {{ i + 1 }}"
                        >
                          <hm-icon name="x" size="16" />
                        </button>
                      </article>
                    }

                    @if (photos().length < 6) {
                      <label class="hm-ob-photo-add" for="ob-photo-upload" [class.is-uploading]="uploading()">
                        <span class="hm-ob-photo-add-icon">
                          <hm-icon [name]="uploading() ? 'loader-2' : 'upload'" [class]="uploading() ? 'animate-spin' : ''" />
                        </span>
                        <strong>{{ uploading() ? 'Enviando…' : 'Adicionar fotos' }}</strong>
                        <span>{{ photos().length === 0 ? 'Escolha de 2 a 6 imagens' : 'Você ainda pode adicionar ' + (6 - photos().length) }}</span>
                        <input
                          id="ob-photo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          class="sr-only"
                          (change)="onPhotoUpload($event)"
                          [disabled]="uploading()"
                        />
                      </label>
                    }
                  </div>

                  <div class="hm-ob-photo-tips">
                    <div><hm-icon name="sparkles" size="16" /><span><strong>Boa luz</strong> e rosto visível na foto principal.</span></div>
                    <div><hm-icon name="users" size="16" /><span>Evite começar com foto em grupo: queremos reconhecer você rapidamente.</span></div>
                    <div><hm-icon name="shield-check" size="16" /><span>Não publique documentos, endereço ou outras informações sensíveis.</span></div>
                  </div>
                </div>

                <div class="hm-ob-ready-card" [class.is-pending]="!photosReady()">
                  <span class="hm-ob-ready-icon"><hm-icon [name]="photosReady() ? 'check' : 'upload'" /></span>
                  <div>
                    <strong>{{ photosReady() ? 'Tudo pronto para o Discovery' : 'Precisamos de mais ' + (2 - photos().length) + (photos().length === 1 ? ' foto' : ' fotos') }}</strong>
                    <span>{{ photosReady() ? 'Ao tocar em Começar, salvamos o perfil e ativamos sua descoberta.' : 'Duas fotos reduzem perfis vazios e dão contexto mínimo para uma decisão de like.' }}</span>
                  </div>
                </div>
              </section>
            }

            <div class="hm-ob-actions">
              @if (currentStep() > 1) {
                <button type="button" class="hm-ob-back" (click)="previousStep()">
                  <hm-icon name="arrow-left" />
                  Voltar
                </button>
              } @else {
                <span></span>
              }

              @if (currentStep() < steps.length) {
                <button type="button" class="hm-ob-next" (click)="nextStep()">
                  Continuar
                  <hm-icon name="arrow-right" />
                </button>
              } @else {
                <button type="submit" class="hm-ob-submit" [disabled]="onboardingForm().submitting() || uploading()">
                  @if (onboardingForm().submitting()) {
                    <hm-icon name="refresh-cw" class="animate-spin" />
                    Salvando...
                  } @else {
                    Começar
                    <hm-icon name="sparkles" />
                  }
                </button>
              }
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingPage implements OnInit {
  private readonly profileApi = inject(ProfileApi);
  private readonly mediaApi = inject(MediaApi);
  private readonly locationApi = inject(LocationApi);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly BODY_TYPE_OPTIONS = BODY_TYPE_OPTIONS;
  protected readonly GENDER_INTEREST_OPTIONS = GENDER_INTEREST_OPTIONS;
  protected readonly interestGroups = ONBOARDING_INTEREST_GROUPS;
  protected readonly steps = [
    { id: 1, title: 'Sobre você', caption: 'Identidade e localização', description: 'Primeiro, precisamos do mínimo necessário para saber quem é você e de onde parte a descoberta.' },
    { id: 2, title: 'Quem você procura', caption: 'Preferências de descoberta', description: 'Agora definimos os sinais que mais influenciam quais pessoas entram e sobem no seu Discovery.' },
    { id: 3, title: 'Afinidades', caption: 'Interesses e contexto', description: 'Adicionamos sinais de compatibilidade para ordenar melhor os perfis e melhorar a qualidade das conexões.' },
    { id: 4, title: 'Mostre quem você é', caption: 'Fotos do perfil', description: 'Finalize com fotos nítidas. Elas são essenciais para confiança, contexto e qualidade das decisões no Discovery.' },
  ] as const;

  readonly currentStep = signal(1);
  readonly currentStepMeta = computed(() => this.steps[this.currentStep() - 1] ?? this.steps[0]);
  readonly geoStatus = signal<'idle' | 'loading' | 'ready' | 'denied' | 'unavailable'>('idle');
  readonly uploading = signal(false);
  readonly photos = signal<PhotoView[]>([]);
  readonly sortedPhotos = computed(() => [...this.photos()].sort((a, b) => a.position - b.position));
  readonly photosReady = computed(() => this.photos().length >= 2);

  readonly error = signal('');
  readonly states = signal<BrazilianStateView[]>([]);
  readonly cities = signal<BrazilianCityView[]>([]);
  readonly cityLoading = signal(false);
  private loadedCitiesFor = '';

  async ngOnInit(): Promise<void> {
    const [states, photos] = await Promise.all([
      firstValueFrom(this.locationApi.states()).catch(() => [] as BrazilianStateView[]),
      firstValueFrom(this.mediaApi.mine()).catch(() => [] as PhotoView[]),
    ]);
    this.states.set(states);
    this.photos.set(photos);
  }

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

  readonly onboardingForm = form(this.model, (p) => {
    required(p.displayName, { message: 'Informe seu nome' });
    minLength(p.displayName, 2, { message: 'Nome muito curto' });
    required(p.birthDate, { message: 'Informe sua data de nascimento' });
    required(p.gender, { message: 'Selecione um gênero' });
    required(p.state, { message: 'Informe seu estado' });
    minLength(p.state, 2, { message: 'Estado inválido' });
    required(p.city, { message: 'Informe sua cidade' });
    minLength(p.city, 2, { message: 'Cidade muito curta' });
  });

  toggleLookingFor(gender: Gender): void {
    const next = new Set(this.lookingForSet());
    next.has(gender) ? next.delete(gender) : next.add(gender);
    this.lookingForSet.set(next);
  }

  nextStep(): void {
    this.commitDraft();
    this.error.set('');

    if (this.currentStep() === 1) {
      const current = this.model();
      if (!current.displayName.trim() || current.displayName.trim().length < 2 || !current.birthDate || !current.gender || !current.state.trim() || !current.city.trim()) {
        this.error.set('Preencha nome, data de nascimento, gênero, estado e cidade para continuar.');
        return;
      }
      if (!this.isAdult(current.birthDate)) {
        this.error.set('O Himeros é exclusivo para maiores de 18 anos. Confira sua data de nascimento.');
        return;
      }
      if (!this.locationSelectionValid()) {
        this.error.set('Escolha um estado brasileiro e, quando houver sugestões, uma cidade da lista.');
        return;
      }
    }

    if (this.currentStep() === 2 && this.lookingForSet().size === 0) {
      this.error.set('Selecione pelo menos uma opção em “Tenho interesse em” para configurar seu Discovery.');
      return;
    }

    if (this.currentStep() === 3 && this.interests().length < 3) {
      this.error.set('Escolha pelo menos 3 interesses para dar sinais mínimos de afinidade ao motor de matching.');
      return;
    }

    this.currentStep.update(step => Math.min(this.steps.length, step + 1));
    this.scrollToTop();
  }

  previousStep(): void {
    this.error.set('');
    this.currentStep.update(step => Math.max(1, step - 1));
    this.scrollToTop();
  }

  hasPreciseLocation(): boolean {
    const current = this.model();
    return current.latitude !== null && current.longitude !== null;
  }

  requestPreciseLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.geoStatus.set('unavailable');
      return;
    }

    this.geoStatus.set('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.model.update(model => ({ ...model, latitude: coords.latitude, longitude: coords.longitude }));
        this.geoStatus.set('ready');
      },
      (locationError) => {
        this.geoStatus.set(locationError.code === locationError.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  setBodyType(value: BodyType | null): void {
    this.bodyType.set(value);
  }

  togglePreferredBody(value: BodyType): void {
    const next = new Set(this.preferredBodySet());
    next.has(value) ? next.delete(value) : next.add(value);
    this.preferredBodySet.set(next);
  }

  hasInterest(interest: string): boolean {
    const key = this.normalize(interest);
    return this.interests().some((item: string) => this.normalize(item) === key);
  }

  toggleInterest(interest: string): void {
    const key = this.normalize(interest);
    const existing = this.interests().find((item: string) => this.normalize(item) === key);
    if (existing) this.removeInterest(existing);
    else if (this.interests().length < 30) this.interests.update((list: string[]) => [...list, interest]);
  }

  onStateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.hasPreciseLocation()) this.geoStatus.set('idle');
    const previous = this.model().state;
    const state = this.states().find((item: BrazilianStateView) =>
      this.normalize(item.name) === this.normalize(value) || this.normalize(item.code) === this.normalize(value));
    this.model.update((model: OnboardingFormModel) => ({
      ...model,
      state: value,
      city: state && this.normalize(previous) !== this.normalize(value) ? '' : model.city,
      latitude: null,
      longitude: null
    }));
    if (state) {
      void this.loadCities(state.code);
    } else {
      this.cities.set([]);
      this.loadedCitiesFor = '';
    }
  }

  onCityInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.hasPreciseLocation()) this.geoStatus.set('idle');
    this.model.update((model: OnboardingFormModel) => ({ ...model, city: value, latitude: null, longitude: null }));
  }

  private async loadCities(state: string): Promise<void> {
    const key = this.normalize(state);
    if (!key || this.loadedCitiesFor === key) return;
    this.loadedCitiesFor = key;
    this.cityLoading.set(true);
    try { this.cities.set(await firstValueFrom(this.locationApi.cities(state))); }
    catch { this.cities.set([]); }
    finally { this.cityLoading.set(false); }
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
    const parts: string[] = raw.split(/[,;]/g).map((p: string) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      const trimmed = raw.trim();
      if (trimmed) parts.push(trimmed);
    }
    if (parts.length === 0) return;
    const merged = [...this.interests()];
    for (const part of parts) {
      if (merged.length >= 30) break;
      if (!merged.some((item: string) => this.normalize(item) === this.normalize(part))) merged.push(part);
    }
    this.interests.set(merged);
    this.interestDraft.set('');
  }

  removeInterest(tag: string): void {
    this.interests.set(this.interests().filter((i: string) => i !== tag));
  }

  async onPhotoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length || this.uploading()) return;

    const availableSlots = 6 - this.photos().length;
    if (files.length > availableSlots) {
      this.error.set(`Você pode adicionar no máximo 6 fotos. Selecione até ${availableSlots} ${availableSlots === 1 ? 'imagem' : 'imagens'} agora.`);
      input.value = '';
      return;
    }

    const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const invalid = files.find(file => !acceptedTypes.has(file.type) || file.size > 15 * 1024 * 1024);
    if (invalid) {
      this.error.set('Use somente JPEG, PNG ou WEBP com até 15 MB por imagem.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.error.set('');
    let uploaded = 0;
    try {
      for (const file of files) {
        const photo = await firstValueFrom(this.mediaApi.upload(file));
        this.photos.update(list => [...list, photo]);
        uploaded++;
      }
    } catch {
      this.error.set(uploaded > 0
        ? 'Algumas fotos foram enviadas, mas uma delas falhou. Revise as imagens e tente novamente.'
        : 'Não foi possível enviar as fotos. Use JPEG, PNG ou WEBP e tente novamente.');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async deletePhoto(photoId: string): Promise<void> {
    if (this.uploading()) return;
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Remover esta foto do seu perfil?')
      : true;
    if (!confirmed) return;

    this.error.set('');
    try {
      await firstValueFrom(this.mediaApi.delete(photoId));
      this.photos.update(list => list.filter(photo => photo.id !== photoId));
    } catch {
      this.error.set('Não foi possível remover a foto. Tente novamente.');
    }
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private locationSelectionValid(): boolean {
    const current = this.model();
    if (this.states().length) {
      const state = this.states().find((item: BrazilianStateView) =>
        this.normalize(item.name) === this.normalize(current.state) || this.normalize(item.code) === this.normalize(current.state));
      if (!state) return false;
    }
    if (this.cities().length && !this.cities().some((city: BrazilianCityView) => this.normalize(city.name) === this.normalize(current.city))) {
      return false;
    }
    return true;
  }

  private isAdult(rawBirthDate: string): boolean {
    if (!rawBirthDate) return false;
    const birth = new Date(`${rawBirthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDelta = today.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 18;
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.commitDraft();

    if (this.uploading()) {
      this.currentStep.set(4);
      this.error.set('Aguarde o envio das fotos terminar antes de começar.');
      return;
    }

    if (!this.isAdult(this.model().birthDate)) {
      this.currentStep.set(1);
      this.error.set('O Himeros é exclusivo para maiores de 18 anos. Confira sua data de nascimento.');
      return;
    }
    if (this.lookingForSet().size === 0) {
      this.currentStep.set(2);
      this.error.set('Selecione pelo menos uma opção em “Tenho interesse em” para configurar seu Discovery.');
      return;
    }
    if (this.interests().length < 3) {
      this.currentStep.set(3);
      this.error.set('Escolha pelo menos 3 interesses para dar sinais mínimos de afinidade ao motor de matching.');
      return;
    }
    if (!this.photosReady()) {
      this.currentStep.set(4);
      this.error.set('Adicione pelo menos 2 fotos para começar. Você pode enviar até 6.');
      return;
    }
    if (!this.locationSelectionValid()) {
      this.currentStep.set(1);
      this.error.set('Escolha um estado brasileiro e, quando houver sugestões, uma cidade da lista.');
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
        await firstValueFrom(this.profileApi.save(payload));
        this.profileStore.clear();
        await this.profileStore.reload();
        await this.router.navigate(['/app/discover']);
      } catch {
        this.error.set('Não foi possível salvar seu perfil. Tente novamente.');
      }
    });
  }
}
