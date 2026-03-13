import { Injectable, signal } from '@angular/core';

/**
 * Authentication & authorization service.
 *
 * Provides user authentication state, permissions, and role checks.
 * Currently a stub implementation that grants all access for local
 * development. Will be replaced with Entra ID OIDC integration.
 *
 * Reference: ADR-03000 – Authentication Entra ID OIDC JWT
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authenticatedSignal = signal(true);
  private readonly permissionsSignal = signal<readonly string[]>([]);

  /** Whether the user is currently authenticated. */
  readonly isAuthenticated = this.authenticatedSignal.asReadonly();

  /** The current user's permissions. */
  readonly permissions = this.permissionsSignal.asReadonly();

  /**
   * Checks whether the user has a specific permission.
   *
   * In the stub implementation this always returns `true`.
   * Once Entra ID is integrated, this will check JWT claims.
   */
  hasPermission(_permission: string): boolean {
    // Stub: grant all permissions during development
    return true;
  }

  /**
   * Sets the user's permissions (used during login/token refresh).
   */
  setPermissions(permissions: readonly string[]): void {
    this.permissionsSignal.set(permissions);
  }

  /**
   * Sets the authentication state (used during login/logout).
   */
  setAuthenticated(authenticated: boolean): void {
    this.authenticatedSignal.set(authenticated);
  }
}
