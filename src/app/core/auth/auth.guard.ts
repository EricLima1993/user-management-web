import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAdmin()) return true;

  // USER não vê a listagem: vai para o próprio perfil
  const id = auth.session()?.userId;
  return id ? router.createUrlTree(['/users', id]) : router.createUrlTree(['/login']);
};

export const selfOrAdminGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAdmin()) return true;

  const ownId = auth.session()?.userId;
  if (ownId && String(ownId) === route.paramMap.get('id')) return true;

  return ownId ? router.createUrlTree(['/users', ownId]) : router.createUrlTree(['/login']);
};