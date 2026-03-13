import { TestBed } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';

import { GlobalErrorHandler } from './global-error-handler';
import { NotificationService } from '../services/notification.service';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }],
    });

    handler = TestBed.inject(ErrorHandler) as GlobalErrorHandler;
    notificationService = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(handler).toBeTruthy();
  });

  it('should show error notification when handling an Error', () => {
    const showErrorSpy = vi.spyOn(notificationService, 'showError');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    handler.handleError(new Error('Test error'));

    expect(showErrorSpy).toHaveBeenCalledWith('errors.unexpectedError');
    consoleSpy.mockRestore();
  });

  it('should log error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Test error');

    handler.handleError(error);

    expect(consoleSpy).toHaveBeenCalledWith('[GlobalErrorHandler]', 'Test error', error);
    consoleSpy.mockRestore();
  });

  it('should handle non-Error objects', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const showErrorSpy = vi.spyOn(notificationService, 'showError');

    handler.handleError('string error');

    expect(consoleSpy).toHaveBeenCalledWith('[GlobalErrorHandler]', 'string error', 'string error');
    expect(showErrorSpy).toHaveBeenCalledWith('errors.unexpectedError');
    consoleSpy.mockRestore();
  });

  it('should handle null/undefined errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const showErrorSpy = vi.spyOn(notificationService, 'showError');

    handler.handleError(null);

    expect(consoleSpy).toHaveBeenCalled();
    expect(showErrorSpy).toHaveBeenCalledWith('errors.unexpectedError');
    consoleSpy.mockRestore();
  });
});
