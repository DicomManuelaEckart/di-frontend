import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Permission-based route guard.
 *
 * Checks whether the current user has the permission specified
 * in the route's `data['permission']` property. If the user lacks
 * the required permission, navigation is redirected to `/access-denied`.
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'admin',
 *   loadComponent: () => import('./admin/admin'),
 *   canActivate: [permissionGuard],
 *   data: { permission: 'admin.access' },
 * }
 * ```
 *
 * Reference: ADR-03000 – Authentication Entra ID OIDC JWT
 */
export const permissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredPermission = route.data['permission'] as string | undefined;

  if (!requiredPermission) {
    return true;
  }

  if (authService.hasPermission(requiredPermission)) {
    return true;
  }

  return router.createUrlTree(['/access-denied']);
};
