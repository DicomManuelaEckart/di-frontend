import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Authentication guard that checks whether the user is authenticated.
 *
 * If not authenticated, redirects to `/access-denied`.
 * Currently a stub that always grants access during development.
 *
 * Reference: ADR-03000 – Authentication Entra ID OIDC JWT
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/access-denied']);
};
