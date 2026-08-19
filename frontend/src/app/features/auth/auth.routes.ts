import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./register.page').then(m => m.RegisterPage)
  }
];
