import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile.page').then(m => m.ProfilePage)
  },
  {
    path: 'edit',
    loadComponent: () => import('./profile-edit.page').then(m => m.ProfileEditPage)
  },
  {
    path: ':id',
    loadComponent: () => import('./public-profile.page').then(m => m.PublicProfilePage)
  }
];
