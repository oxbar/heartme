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
    <div class="min-h-screen grid lg:grid-cols-2 bg-background">
      <section class="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-accent/15 via-secondary/10 to-primary/10">
        <hm-brand />
        <div class="max-w-md space-y-6 animate-fade-in">
          <p class="text-sm font-bold text-primary uppercase tracking-wider">Começar agora</p>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            Crie seu perfil e comece a descobrir pessoas que compartilham da sua visão.
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Registro seguro, verificação por senha forte e zero coleta desnecessária.
          </p>
        </div>
        <p class="text-sm text-muted-foreground">Privacidade e segurança por design. 18+</p>
      </section>
      <section class="flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div class="lg:hidden mb-8 flex justify-center"><hm-brand /></div>
          <p class="text-sm font-bold text-primary uppercase tracking-wider mb-2">Conta nova</p>
          <h1 class="text-2xl font-extrabold tracking-tight text-card-foreground mb-2">Criar conta no Himeros</h1>
          <p class="text-muted-foreground mb-8">Em seguida você completa seu perfil de descoberta.</p>
          <form (submit)="onSubmit($event)" novalidate class="space-y-5">
            <div>
              <label for="reg-email" class="block text-sm font-semibold text-foreground mb-1.5">E-mail</label>
              <div class="relative">
                <hm-icon name="mail" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-email" type="email" autocomplete="email"
                  class="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="registerForm.email"
                />
              </div>
              @if (registerForm.email().touched() && registerForm.email().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ registerForm.email().errors()[0]?.message }}</p>
              }
            </div>
            <div>
              <label for="reg-password" class="block text-sm font-semibold text-foreground mb-1.5">Senha</label>
              <div class="relative">
                <hm-icon name="lock" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-password" type="password" autocomplete="new-password"
                  class="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="registerForm.password"
                />
              </div>
              @if (registerForm.password().touched() && registerForm.password().invalid()) {
                <p class="mt-1.5 text-sm text-destructive">{{ registerForm.password().errors()[0]?.message }}</p>
              }
            </div>
            <div>
              <label for="reg-confirm" class="block text-sm font-semibold text-foreground mb-1.5">Confirmar senha</label>
              <div class="relative">
                <hm-icon name="check" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-confirm" type="password" autocomplete="new-password"
                  class="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50"
                  [formField]="registerForm.confirmPassword"
                />
              </div>
              @if (registerForm.confirmPassword().touched() && passwordsMismatch()) {
                <p class="mt-1.5 text-sm text-destructive">As senhas não coincidem</p>
              }
              @if (registerForm.confirmPassword().touched() && registerForm.confirmPassword().invalid() && !passwordsMismatch()) {
                <p class="mt-1.5 text-sm text-destructive">{{ registerForm.confirmPassword().errors()[0]?.message }}</p>
              }
            </div>
            @if (error()) {
              <div role="alert" class="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {{ error() }}
              </div>
            }
            <button
              type="submit"
              [disabled]="registerForm().invalid() || registerForm().submitting() || passwordsMismatch()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (registerForm().submitting()) {
                <span class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
              }
              Criar conta
              <hm-icon name="arrow-right" size="16" />
            </button>
          </form>
          <p class="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?
            <a routerLink="/login" class="font-semibold text-primary hover:underline ml-1">Entrar</a>
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
