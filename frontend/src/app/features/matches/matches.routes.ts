import { Routes } from '@angular/router';

export const MATCHES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./matches.page').then(m => m.MatchesPage)
  }
];
