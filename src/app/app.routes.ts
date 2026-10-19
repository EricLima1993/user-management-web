import { Routes } from '@angular/router';
import { adminGuard, authGuard, selfOrAdminGuard } from './core/auth/auth.guard';

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
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/user-list/user-list').then((m) => m.UserList),
      },
      {
        path: 'users/new',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/user-form/user-form').then((m) => m.UserForm),
      },
      {
        path: 'users/:id/details',
        canActivate: [selfOrAdminGuard],
        loadComponent: () => import('./features/users/user-details/user-details').then((m) => m.UserDetails),
      },
      {
        path: 'users/:id',
        canActivate: [selfOrAdminGuard],
        loadComponent: () => import('./features/users/user-form/user-form').then((m) => m.UserForm),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];