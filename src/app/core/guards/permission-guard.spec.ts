import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { permissionGuard } from './permission-guard';

describe('permissionGuard', () => {
  let authService: AuthService;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => permissionGuard(...guardParameters));

  const createRoute = (permission?: string): ActivatedRouteSnapshot => {
    return {
      data: permission ? { permission } : {},
    } as unknown as ActivatedRouteSnapshot;
  };

  const fakeState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService],
    });
    authService = TestBed.inject(AuthService);
  });

  it('should allow access when no permission is required', () => {
    const result = executeGuard(createRoute(), fakeState);
    expect(result).toBe(true);
  });

  it('should allow access when user has required permission', () => {
    const result = executeGuard(createRoute('blueprint.edit'), fakeState);
    expect(result).toBe(true);
  });

  it('should redirect to access-denied when user lacks permission', () => {
    vi.spyOn(authService, 'hasPermission').mockReturnValue(false);
    const result = executeGuard(createRoute('admin.access'), fakeState);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/access-denied');
  });

  it('should check the correct permission from route data', () => {
    const spy = vi.spyOn(authService, 'hasPermission').mockReturnValue(true);
    executeGuard(createRoute('blueprint.create'), fakeState);
    expect(spy).toHaveBeenCalledWith('blueprint.create');
  });
});
