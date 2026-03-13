import { ErrorHandler, inject, Injectable } from '@angular/core';

import { NotificationService } from '../services/notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notificationService = inject(NotificationService);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    console.error('[GlobalErrorHandler]', message, error);

    this.notificationService.showError('errors.unexpectedError');
  }
}
