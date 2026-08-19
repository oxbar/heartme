import { Routes } from '@angular/router';

export const SAFETY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./safety.page').then(m => m.SafetyPage)
  }
];
