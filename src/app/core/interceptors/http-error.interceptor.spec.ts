import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';

import { httpErrorInterceptor } from './http-error.interceptor';
import { NotificationService } from '../services/notification.service';

describe('httpErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let notificationService: NotificationService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should pass through successful requests', () => {
    const body = { data: 'test' };

    httpClient.get('/api/test').subscribe((response) => {
      expect(response).toEqual(body);
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(body);
  });

  it('should navigate to access-denied on 401', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).toHaveBeenCalledWith(['/access-denied']);
  });

  it('should navigate to access-denied on 403', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(403);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(null, { status: 403, statusText: 'Forbidden' });

    expect(navigateSpy).toHaveBeenCalledWith(['/access-denied']);
  });

  it('should show warning notification on 404', () => {
    const showWarningSpy = vi.spyOn(notificationService, 'showWarning');

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(404);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(null, { status: 404, statusText: 'Not Found' });

    expect(showWarningSpy).toHaveBeenCalledWith('errors.resourceNotFound');
  });

  it('should extract title from ProblemDetails on 404', () => {
    const showWarningSpy = vi.spyOn(notificationService, 'showWarning');

    const problemDetails = {
      status: 404,
      type: 'https://api.example.com/errors/not-found',
      title: 'Resource not found',
    };

    httpClient.get('/api/test').subscribe({
      error: () => undefined,
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(problemDetails, { status: 404, statusText: 'Not Found' });

    expect(showWarningSpy).toHaveBeenCalledWith('Resource not found');
  });

  it('should show warning notification on 409', () => {
    const showWarningSpy = vi.spyOn(notificationService, 'showWarning');

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(409);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(null, { status: 409, statusText: 'Conflict' });

    expect(showWarningSpy).toHaveBeenCalledWith('errors.conflict');
  });

  it('should show error notification on 400 with ProblemDetails', () => {
    const showErrorSpy = vi.spyOn(notificationService, 'showError');

    const problemDetails = {
      status: 400,
      type: 'https://api.example.com/errors/validation',
      title: 'Validation failed',
      correlationId: 'corr-456',
    };

    httpClient.get('/api/test').subscribe({
      error: () => undefined,
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(problemDetails, { status: 400, statusText: 'Bad Request' });

    expect(showErrorSpy).toHaveBeenCalledWith('Validation failed', 'corr-456');
  });

  it('should show error notification on 500', () => {
    const showErrorSpy = vi.spyOn(notificationService, 'showError');

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(showErrorSpy).toHaveBeenCalledWith('errors.serverError', undefined);
  });

  it('should include correlationId from ProblemDetails on 500', () => {
    const showErrorSpy = vi.spyOn(notificationService, 'showError');

    const problemDetails = {
      status: 500,
      type: 'https://api.example.com/errors/internal',
      title: 'Internal Server Error',
      correlationId: 'corr-789',
    };

    httpClient.get('/api/test').subscribe({
      error: () => undefined,
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(problemDetails, { status: 500, statusText: 'Internal Server Error' });

    expect(showErrorSpy).toHaveBeenCalledWith('errors.serverError', 'corr-789');
  });

  it('should show error notification on network error (status 0)', () => {
    const showErrorSpy = vi.spyOn(notificationService, 'showError');

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(0);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.error(new ProgressEvent('error'));

    expect(showErrorSpy).toHaveBeenCalledWith('errors.networkError');
  });

  it('should re-throw the error so subscribers can handle it', () => {
    let caughtError: unknown;

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        caughtError = error;
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(caughtError).toBeTruthy();
  });
});
