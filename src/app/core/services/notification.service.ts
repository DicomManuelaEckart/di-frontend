import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  readonly message: string;
  readonly type: NotificationType;
  readonly correlationId?: string;
  readonly translatable: boolean;
  readonly autoClose: boolean;
  readonly displayTime: number;
}

const SUCCESS_DISPLAY_TIME = 3000;
const ERROR_DISPLAY_TIME = 8000;
const DEFAULT_DISPLAY_TIME = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationSignal = signal<Notification | null>(null);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly notification = this.notificationSignal.asReadonly();

  showSuccess(message: string): void {
    this.show({
      message,
      type: 'success',
      translatable: true,
      autoClose: true,
      displayTime: SUCCESS_DISPLAY_TIME,
    });
  }

  showError(message: string, correlationId?: string, translatable = true): void {
    this.show({
      message,
      type: 'error',
      correlationId,
      translatable,
      autoClose: true,
      displayTime: ERROR_DISPLAY_TIME,
    });
  }

  showWarning(message: string, translatable = true): void {
    this.show({
      message,
      type: 'warning',
      translatable,
      autoClose: true,
      displayTime: DEFAULT_DISPLAY_TIME,
    });
  }

  showInfo(message: string): void {
    this.show({
      message,
      type: 'info',
      translatable: true,
      autoClose: true,
      displayTime: DEFAULT_DISPLAY_TIME,
    });
  }

  dismiss(): void {
    this.clearTimer();
    this.notificationSignal.set(null);
  }

  private show(notification: Notification): void {
    this.clearTimer();
    this.notificationSignal.set(notification);

    if (notification.autoClose) {
      this.closeTimer = setTimeout(() => {
        this.notificationSignal.set(null);
      }, notification.displayTime);
    }
  }

  private clearTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
