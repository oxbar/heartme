import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingGuard, profileGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.page').then(m => m.LandingPage)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'onboarding',
    canActivate: [authGuard, onboardingGuard],
    loadComponent: () => import('./features/onboarding/onboarding.page').then(m => m.OnboardingPage)
  },
  {
    path: 'app',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'discover' },
      { path: 'discover', loadComponent: () => import('./features/discover/discover.page').then(m => m.DiscoverPage) },
      { path: 'matches', loadComponent: () => import('./features/matches/matches.page').then(m => m.MatchesPage) },
      { path: 'messages', loadComponent: () => import('./features/messages/conversations.page').then(m => m.ConversationsPage) },
      { path: 'messages/:id', loadComponent: () => import('./features/messages/chat.page').then(m => m.ChatPage) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
      { path: 'profile/edit', loadComponent: () => import('./features/profile/profile-edit.page').then(m => m.ProfileEditPage) },
      { path: 'profiles/:id', loadComponent: () => import('./features/profile/public-profile.page').then(m => m.PublicProfilePage) },
      { path: 'premium', loadComponent: () => import('./features/premium/premium.page').then(m => m.PremiumPage) },
      { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.page').then(m => m.NotificationsPage) },
      { path: 'safety', loadComponent: () => import('./features/safety/safety.page').then(m => m.SafetyPage) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage) }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage)
  }
];
