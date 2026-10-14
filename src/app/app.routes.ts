import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { UserForm } from './features/users/user-form/user-form';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list/user-list').then((m) => m.UserList),
      },
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      { path: 'users/new', component: UserForm },
    ],
  },
  { path: '**', redirectTo: '' },
];