import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { NotificationToast } from './notification-toast';
import { NotificationService } from '../../../core/services/notification.service';

describe('NotificationToast', () => {
  let component: NotificationToast;
  let fixture: ComponentFixture<NotificationToast>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToast],
      providers: [provideTranslateService({ defaultLanguage: 'en' })],
    }).compileComponents();

    notificationService = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(NotificationToast);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render anything when there is no notification', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.notification-toast')).toBeNull();
  });

  it('should render error notification', () => {
    notificationService.showError('Something went wrong');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toast = el.querySelector('.notification-toast');
    expect(toast).toBeTruthy();
    expect(toast!.classList.contains('notification-toast--error')).toBe(true);
    expect(toast!.textContent).toContain('Something went wrong');
  });

  it('should render raw API detail message without translating', () => {
    notificationService.showError('Country with code XY was not found.', undefined, false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const message = el.querySelector('.notification-toast__message');
    expect(message).toBeTruthy();
    expect(message!.textContent).toContain('Country with code XY was not found.');
  });

  it('should render success notification', () => {
    notificationService.showSuccess('Saved successfully');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toast = el.querySelector('.notification-toast');
    expect(toast).toBeTruthy();
    expect(toast!.classList.contains('notification-toast--success')).toBe(true);
  });

  it('should render warning notification', () => {
    notificationService.showWarning('Be careful');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toast = el.querySelector('.notification-toast');
    expect(toast).toBeTruthy();
    expect(toast!.classList.contains('notification-toast--warning')).toBe(true);
  });

  it('should render info notification', () => {
    notificationService.showInfo('FYI');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toast = el.querySelector('.notification-toast');
    expect(toast).toBeTruthy();
    expect(toast!.classList.contains('notification-toast--info')).toBe(true);
  });

  it('should display correlation ID when present', () => {
    notificationService.showError('Server error', 'corr-123');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const correlation = el.querySelector('.notification-toast__correlation');
    expect(correlation).toBeTruthy();
    expect(correlation!.textContent).toContain('errors.correlationIdHint');
  });

  it('should not display correlation ID when absent', () => {
    notificationService.showError('Something went wrong');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const correlation = el.querySelector('.notification-toast__correlation');
    expect(correlation).toBeNull();
  });

  it('should dismiss notification when close button is clicked', () => {
    notificationService.showError('Dismiss me');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const closeBtn = el.querySelector('.notification-toast__close') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    fixture.detectChanges();

    expect(el.querySelector('.notification-toast')).toBeNull();
  });

  it('should have role="alert" for accessibility', () => {
    notificationService.showError('Accessible error');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toast = el.querySelector('.notification-toast');
    expect(toast!.getAttribute('role')).toBe('alert');
    expect(toast!.getAttribute('aria-live')).toBe('assertive');
  });
});
