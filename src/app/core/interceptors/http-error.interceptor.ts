import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ProblemDetails } from '../models/problem-details.model';
import { NotificationService } from '../services/notification.service';

function isProblemDetails(body: unknown): body is ProblemDetails {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    'type' in body &&
    'title' in body
  );
}

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        void router.navigate(['/access-denied']);
        return throwError(() => error);
      }

      if (error.status === 403) {
        void router.navigate(['/access-denied']);
        return throwError(() => error);
      }

      if (error.status === 404) {
        const problem = parseProblemDetails(error);
        const message = problem?.title ?? 'errors.resourceNotFound';
        notificationService.showWarning(message);
        return throwError(() => error);
      }

      if (error.status === 409) {
        const problem = parseProblemDetails(error);
        const message = problem?.title ?? 'errors.conflict';
        notificationService.showWarning(message);
        return throwError(() => error);
      }

      if (error.status >= 400 && error.status < 500) {
        const problem = parseProblemDetails(error);
        const message = problem?.title ?? 'errors.clientError';
        notificationService.showError(message, problem?.correlationId);
        return throwError(() => error);
      }

      if (error.status >= 500) {
        const problem = parseProblemDetails(error);
        const correlationId = problem?.correlationId;
        notificationService.showError('errors.serverError', correlationId);
        return throwError(() => error);
      }

      if (error.status === 0) {
        notificationService.showError('errors.networkError');
        return throwError(() => error);
      }

      notificationService.showError('errors.unknownError');
      return throwError(() => error);
    }),
  );
};

function parseProblemDetails(error: HttpErrorResponse): ProblemDetails | null {
  if (isProblemDetails(error.error)) {
    return error.error as ProblemDetails;
  }
  return null;
}
