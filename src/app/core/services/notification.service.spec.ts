import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be provided in root', () => {
    const injected = TestBed.inject(NotificationService);
    expect(injected).toBe(service);
  });

  it('should have no notification initially', () => {
    expect(service.notification()).toBeNull();
  });

  it('should show success notification', () => {
    service.showSuccess('Operation successful');

    const notification = service.notification();
    expect(notification).not.toBeNull();
    expect(notification!.message).toBe('Operation successful');
    expect(notification!.type).toBe('success');
    expect(notification!.autoClose).toBe(true);
    expect(notification!.displayTime).toBe(3000);
  });

  it('should show error notification', () => {
    service.showError('Something went wrong', 'corr-123');

    const notification = service.notification();
    expect(notification).not.toBeNull();
    expect(notification!.message).toBe('Something went wrong');
    expect(notification!.type).toBe('error');
    expect(notification!.correlationId).toBe('corr-123');
    expect(notification!.displayTime).toBe(8000);
  });

  it('should show error notification without correlationId', () => {
    service.showError('Something went wrong');

    const notification = service.notification();
    expect(notification).not.toBeNull();
    expect(notification!.correlationId).toBeUndefined();
  });

  it('should show warning notification', () => {
    service.showWarning('Be careful');

    const notification = service.notification();
    expect(notification).not.toBeNull();
    expect(notification!.message).toBe('Be careful');
    expect(notification!.type).toBe('warning');
    expect(notification!.displayTime).toBe(5000);
  });

  it('should show info notification', () => {
    service.showInfo('FYI');

    const notification = service.notification();
    expect(notification).not.toBeNull();
    expect(notification!.message).toBe('FYI');
    expect(notification!.type).toBe('info');
  });

  it('should dismiss notification', () => {
    service.showSuccess('Hello');
    expect(service.notification()).not.toBeNull();

    service.dismiss();
    expect(service.notification()).toBeNull();
  });

  it('should replace previous notification when a new one is shown', () => {
    service.showSuccess('First');
    service.showError('Second');

    expect(service.notification()!.message).toBe('Second');
    expect(service.notification()!.type).toBe('error');
  });

  it('should auto-close success notification after displayTime', () => {
    service.showSuccess('Auto close');
    expect(service.notification()).not.toBeNull();

    vi.advanceTimersByTime(3000);
    expect(service.notification()).toBeNull();
  });

  it('should auto-close error notification after displayTime', () => {
    service.showError('Auto close error');
    expect(service.notification()).not.toBeNull();

    vi.advanceTimersByTime(8000);
    expect(service.notification()).toBeNull();
  });

  it('should cancel previous auto-close timer when showing new notification', () => {
    service.showSuccess('First');
    vi.advanceTimersByTime(2000);

    service.showSuccess('Second');
    vi.advanceTimersByTime(1000);
    expect(service.notification()).not.toBeNull();
    expect(service.notification()!.message).toBe('Second');

    vi.advanceTimersByTime(2000);
    expect(service.notification()).toBeNull();
  });

  it('should cancel auto-close timer when dismissed manually', () => {
    service.showSuccess('Manual dismiss');
    vi.advanceTimersByTime(1000);

    service.dismiss();
    expect(service.notification()).toBeNull();

    vi.advanceTimersByTime(5000);
    expect(service.notification()).toBeNull();
  });
});
