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
    <div class="min-h-screen grid lg:grid-cols-2 bg-background">
      <section class="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/20">
        <hm-brand />
        <div class="max-w-md space-y-6 animate-fade-in">
          <p class="text-sm font-bold text-primary uppercase tracking-wider">Bem-vindo de volta</p>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            Conexões melhores começam com uma experiência melhor.
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Seu refresh token permanece fora do JavaScript; o navegador usa cookie HttpOnly e o access token fica apenas em memória.
          </p>
        </div>
        <p class="text-sm text-muted-foreground">Privacidade e segurança por design.</p>
      </section>
      <section class="flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div class="lg:hidden mb-8 flex justify-center"><hm-brand /></div>
          <p class="text-sm font-bold text-primary uppercase tracking-wider mb-2">Acessar</p>
          <h1 class="text-2xl font-extrabold tracking-tight text-card-foreground mb-2">Entre no Himeros</h1>
          <p class="text-muted-foreground mb-8">Continue suas conversas e descubra novos perfis.</p>
          <form (submit)="onSubmit($event)" novalidate class="space-y-5">
            <div>
              <label for="email" class="block text-sm font-semibold text-foreground mb-1.5">E-mail</label>
              <div class="relative">
                <hm-icon name="mail" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email" type="email" autocomplete="email"
                  class="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="loginForm.email"
                />
              </div>
              @if (loginForm.email().touched() && loginForm.email().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ loginForm.email().errors()[0]?.message }}</p>
              }
            </div>
            <div>
              <label for="password" class="block text-sm font-semibold text-foreground mb-1.5">Senha</label>
              <div class="relative">
                <hm-icon name="lock" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password" type="password" autocomplete="current-password"
                  class="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="loginForm.password"
                />
              </div>
              @if (loginForm.password().touched() && loginForm.password().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ loginForm.password().errors()[0]?.message }}</p>
              }
            </div>
            @if (error()) {
              <div role="alert" class="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {{ error() }}
              </div>
            }
            <button
              type="submit"
              [disabled]="loginForm().invalid() || loginForm().submitting()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (loginForm().submitting()) {
                <span class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
              }
              Entrar
              <hm-icon name="arrow-right" size="16" />
            </button>
          </form>
          <p class="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta?
            <a routerLink="/register" class="font-semibold text-primary hover:underline ml-1">Criar conta</a>
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
