import { Routes } from '@angular/router';

export const MESSAGES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./conversations.page').then(m => m.ConversationsPage)
  },
  {
    path: ':id',
    loadComponent: () => import('./chat.page').then(m => m.ChatPage)
  }
];
