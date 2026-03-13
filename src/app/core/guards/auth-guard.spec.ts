import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  let authService: AuthService;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  const fakeRoute = {} as ActivatedRouteSnapshot;
  const fakeState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService],
    });
    authService = TestBed.inject(AuthService);
  });

  it('should allow access when authenticated', () => {
    const result = executeGuard(fakeRoute, fakeState);
    expect(result).toBe(true);
  });

  it('should redirect to access-denied when not authenticated', () => {
    authService.setAuthenticated(false);
    const result = executeGuard(fakeRoute, fakeState);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/access-denied');
  });
});
