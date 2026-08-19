import { Routes } from '@angular/router';

export const PREMIUM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./premium.page').then(m => m.PremiumPage)
  }
];
