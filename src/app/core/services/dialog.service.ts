import { Injectable, ViewContainerRef } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface DialogConfig {
  readonly title?: string;
  readonly message?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

export interface DialogRef<T = unknown> {
  close(result?: T): void;
  readonly afterClosed: Observable<T | undefined>;
}

/**
 * Central service for programmatic dialog management.
 *
 * The `confirm()` method currently returns a stub observable (always `false`).
 * Wire it to `ConfirmDialog` + `IgxDialogComponent` once a ViewContainerRef
 * host is registered via `registerViewContainerRef()` in the shell component.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private viewContainerRef: ViewContainerRef | null = null;

  registerViewContainerRef(vcr: ViewContainerRef): void {
    this.viewContainerRef = vcr;
  }

  /**
   * Opens a confirmation dialog and returns the user's choice.
   *
   * Stub implementation – returns `of(false)` until wired to the
   * `ConfirmDialog` component via dynamic component creation.
   */
  confirm(message: string, title = 'Bestätigung'): Observable<boolean> {
    void title;
    void message;

    return of(false);
  }

  getViewContainerRef(): ViewContainerRef | null {
    return this.viewContainerRef;
  }
}
