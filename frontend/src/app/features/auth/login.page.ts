import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { SessionStore } from '../../core/auth/session.store';
import { BrandComponent } from '../../shared/brand.component';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  imports: [FormField, RouterLink, BrandComponent, CommonModule, IconComponent],
  standalone: true,
  template: `
    <div class="hm-auth-shell">
      <section class="hm-auth-hero">
        <hm-brand variant="primary" [height]="56" />
        <div class="hm-auth-hero-copy">
          <p class="hm-auth-eyebrow">Bem-vindo de volta</p>
          <h2 class="hm-auth-title">Conexões melhores começam com uma experiência melhor.</h2>
          <p class="hm-auth-sub">
            Seu refresh token permanece fora do JavaScript; o navegador usa cookie HttpOnly e o access token fica apenas em memória.
          </p>
        </div>
        <p class="hm-auth-footnote">Privacidade e segurança por design.</p>
      </section>

      <section class="hm-auth-card-wrap">
        <div class="hm-auth-card">
          <div class="hm-auth-card-brand"><hm-brand /></div>
          <div class="hm-auth-card-header">
            <p class="hm-auth-eyebrow">Acessar</p>
            <h1>Entre no Himeros</h1>
            <p>Continue suas conversas e descubra novos perfis.</p>
          </div>

          <form (submit)="onSubmit($event)" novalidate class="hm-auth-form">
            <div class="hm-field">
              <label class="hm-field-label" for="email">E-mail</label>
              <div class="hm-input-wrap has-no-icon-right">
                <span class="hm-input-icon is-leading"><hm-icon name="mail" /></span>
                <input
                  id="email"
                  type="email"
                  autocomplete="email"
                  class="hm-input"
                  [formField]="loginForm.email"
                />
              </div>
              @if (loginForm.email().touched() && loginForm.email().invalid()) {
                <p class="hm-field-error">{{ loginForm.email().errors()[0]?.message }}</p>
              }
            </div>

            <div class="hm-field">
              <label class="hm-field-label" for="password">Senha</label>
              <div class="hm-input-wrap has-no-icon-right">
                <span class="hm-input-icon is-leading"><hm-icon name="lock" /></span>
                <input
                  id="password"
                  type="password"
                  autocomplete="current-password"
                  class="hm-input"
                  [formField]="loginForm.password"
                />
              </div>
              @if (loginForm.password().touched() && loginForm.password().invalid()) {
                <p class="hm-field-error">{{ loginForm.password().errors()[0]?.message }}</p>
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
              [disabled]="loginForm().invalid() || loginForm().submitting()"
            >
              @if (loginForm().submitting()) {
                <span class="hm-auth-submit-spinner" aria-hidden="true"></span>
              }
              Entrar
              <hm-icon name="arrow-right" size="15" />
            </button>
          </form>

          <p class="hm-auth-cta">
            Ainda não tem conta?
            <a routerLink="/register">Criar conta</a>
          </p>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly model = signal({ email: '', password: '' });
  readonly loginForm = form(this.model, p => {
    required(p.email, { message: 'Informe seu e-mail' });
    email(p.email, { message: 'E-mail inválido' });
    required(p.password, { message: 'Informe sua senha' });
    minLength(p.password, 10, { message: 'Use ao menos 10 caracteres' });
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.loginForm, async () => {
      this.error.set('');
      try {
        await this.session.login(this.model().email, this.model().password);
        await this.router.navigate(['/app/discover']);
      } catch {
        this.error.set('Não foi possível entrar. Confira suas credenciais.');
      }
    });
  }
}
