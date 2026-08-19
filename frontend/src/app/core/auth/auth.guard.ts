import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProfileApi } from '../api/profile.api';
import { SessionStore } from './session.store';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session.authenticated() ? true : router.createUrlTree(['/login']);
};

export const authCanMatch: CanMatchFn = () => {
  const session = inject(SessionStore);
  return session.authenticated();
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session.authenticated() ? router.createUrlTree(['/app/discover']) : true;
};

export const guestCanMatch: CanMatchFn = () => {
  const session = inject(SessionStore);
  return !session.authenticated();
};

export const profileGuard: CanActivateFn = async () => {
  const api = inject(ProfileApi);
  const router = inject(Router);
  try {
    await firstValueFrom(api.me());
    return true;
  } catch {
    return router.createUrlTree(['/onboarding']);
  }
};

export const onboardingGuard: CanActivateFn = async () => {
  const api = inject(ProfileApi);
  const router = inject(Router);
  try {
    await firstValueFrom(api.me());
    return router.createUrlTree(['/app/discover']);
  } catch {
    return true;
  }
};
