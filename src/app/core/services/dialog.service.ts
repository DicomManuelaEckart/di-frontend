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

@Injectable({ providedIn: 'root' })
export class DialogService {
  private viewContainerRef: ViewContainerRef | null = null;

  registerViewContainerRef(vcr: ViewContainerRef): void {
    this.viewContainerRef = vcr;
  }

  confirm(message: string, title = 'Bestätigung'): Observable<boolean> {
    void title;
    void message;

    return of(false);
  }

  getViewContainerRef(): ViewContainerRef | null {
    return this.viewContainerRef;
  }
}
