import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { AuthApi } from '../../core/api/auth.api';
import { SessionStore } from '../../core/auth/session.store';
import { BrandComponent } from '../../shared/brand.component';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [FormField, RouterLink, BrandComponent, CommonModule, IconComponent],
  standalone: true,
  template: `
    <div class="hm-auth-shell">
      <section class="hm-auth-hero">
        <hm-brand variant="primary" [height]="56" />
        <div class="hm-auth-hero-copy">
          <p class="hm-auth-eyebrow">Começar agora</p>
          <h2 class="hm-auth-title">Crie seu perfil e comece a descobrir pessoas que compartilham da sua visão.</h2>
          <p class="hm-auth-sub">Registro seguro, verificação por senha forte e zero coleta desnecessária.</p>
        </div>
        <p class="hm-auth-footnote">Privacidade e segurança por design. 18+</p>
      </section>

      <section class="hm-auth-card-wrap">
        <div class="hm-auth-card">
          <div class="hm-auth-card-brand"><hm-brand /></div>
          <div class="hm-auth-card-header">
            <p class="hm-auth-eyebrow">Conta nova</p>
            <h1>Criar conta no Himeros</h1>
            <p>Em seguida você completa seu perfil de descoberta.</p>
          </div>

          <form (submit)="onSubmit($event)" novalidate class="hm-auth-form">
            <div class="hm-field">
              <label class="hm-field-label" for="reg-email">E-mail</label>
              <div class="hm-input-wrap has-no-icon-right">
                <span class="hm-input-icon is-leading"><hm-icon name="mail" /></span>
                <input
                  id="reg-email"
                  type="email"
                  autocomplete="email"
                  class="hm-input"
                  [formField]="registerForm.email"
                />
              </div>
              @if (registerForm.email().touched() && registerForm.email().invalid()) {
                <p class="hm-field-error">{{ registerForm.email().errors()[0]?.message }}</p>
              }
            </div>

            <div class="hm-field">
              <label class="hm-field-label" for="reg-password">Senha</label>
              <div class="hm-input-wrap has-no-icon-right">
                <span class="hm-input-icon is-leading"><hm-icon name="lock" /></span>
                <input
                  id="reg-password"
                  type="password"
                  autocomplete="new-password"
                  class="hm-input"
                  [formField]="registerForm.password"
                />
              </div>
              @if (registerForm.password().touched() && registerForm.password().invalid()) {
                <p class="hm-field-error">{{ registerForm.password().errors()[0]?.message }}</p>
              }
            </div>

            <div class="hm-field">
              <label class="hm-field-label" for="reg-confirm">Confirmar senha</label>
              <div class="hm-input-wrap has-no-icon-right">
                <span class="hm-input-icon is-leading is-valid"><hm-icon name="check" /></span>
                <input
                  id="reg-confirm"
                  type="password"
                  autocomplete="new-password"
                  class="hm-input"
                  [formField]="registerForm.confirmPassword"
                />
              </div>
              @if (registerForm.confirmPassword().touched() && passwordsMismatch()) {
                <p class="hm-field-error">As senhas não coincidem</p>
              }
              @if (registerForm.confirmPassword().touched() && registerForm.confirmPassword().invalid() && !passwordsMismatch()) {
                <p class="hm-field-error">{{ registerForm.confirmPassword().errors()[0]?.message }}</p>
              }
            </div>

            @if (error()) {
              <div role="alert" class="hm-auth-alert">
                {{ error() }}
              </div>
            }

            <button
              type="submit"
              class="hm-auth-submit"
              [disabled]="registerForm().invalid() || registerForm().submitting() || passwordsMismatch()"
            >
              @if (registerForm().submitting()) {
                <span class="hm-auth-submit-spinner" aria-hidden="true"></span>
              }
              Criar conta
              <hm-icon name="arrow-right" size="15" />
            </button>
          </form>

          <p class="hm-auth-cta">
            Já tem conta?
            <a routerLink="/login">Entrar</a>
          </p>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterPage {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly model = signal({ email: '', password: '', confirmPassword: '' });

  readonly passwordsMismatch = signal(false);

  readonly registerForm = form(this.model, p => {
    required(p.email, { message: 'Informe seu e-mail' });
    email(p.email, { message: 'E-mail inválido' });
    required(p.password, { message: 'Crie uma senha' });
    minLength(p.password, 10, { message: 'Use ao menos 10 caracteres' });
    required(p.confirmPassword, { message: 'Confirme a senha' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.model().password !== this.model().confirmPassword) {
      this.passwordsMismatch.set(true);
      return;
    }
    this.passwordsMismatch.set(false);
    void submit(this.registerForm, async () => {
      this.error.set('');
      try {
        await firstValueFrom(this.authApi.register({ email: this.model().email, password: this.model().password }));
        await this.session.login(this.model().email, this.model().password);
        await this.router.navigate(['/onboarding']);
      } catch {
        this.error.set('Não foi possível criar a conta. Tente novamente.');
      }
    });
  }
}
