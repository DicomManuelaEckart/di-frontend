import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be authenticated by default (dev stub)', () => {
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should grant all permissions by default (dev stub)', () => {
    expect(service.hasPermission('any.permission')).toBe(true);
  });

  it('should update authentication state', () => {
    service.setAuthenticated(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should update permissions', () => {
    service.setPermissions(['read', 'write']);
    expect(service.permissions()).toEqual(['read', 'write']);
  });

  it('should start with empty permissions', () => {
    expect(service.permissions()).toEqual([]);
  });
});
