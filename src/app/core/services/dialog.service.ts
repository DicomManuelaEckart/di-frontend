import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  Type,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

export interface DialogConfig {
  readonly title?: string;
  readonly message?: string;
}

export interface DialogRef<R = unknown> {
  readonly closed: Observable<R | undefined>;
  close(result?: R): void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  open<R = unknown>(component: Type<unknown>, config?: DialogConfig): DialogRef<R> {
    const result$ = new Subject<R | undefined>();

    const componentRef: ComponentRef<unknown> = createComponent(component, {
      environmentInjector: this.injector,
    });

    const instance = componentRef.instance as Record<string, unknown>;
    if (config?.title) {
      instance['title'] = config.title;
    }
    if (config?.message) {
      instance['message'] = config.message;
    }

    const dialogRef: DialogRef<R> = {
      closed: result$.asObservable(),
      close: (result?: R) => {
        result$.next(result);
        result$.complete();
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
      },
    };

    instance['dialogRef'] = dialogRef;

    this.appRef.attachView(componentRef.hostView);
    const domElem = (componentRef.hostView as never as { rootNodes: HTMLElement[] }).rootNodes[0];
    document.body.appendChild(domElem);

    return dialogRef;
  }

  confirm(message: string): Observable<boolean> {
    const ref = this.open<boolean>(ConfirmDialog, { message });
    return new Observable<boolean>((subscriber) => {
      ref.closed.pipe(take(1)).subscribe((result) => {
        subscriber.next(result ?? false);
        subscriber.complete();
      });
    });
  }
}
