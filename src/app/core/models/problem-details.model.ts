/**
 * RFC 7807 ProblemDetails interface for API error responses.
 *
 * Matches the backend error format defined in ADR-05200.
 */
export interface FieldError {
  readonly field: string;
  readonly code: string;
  readonly resourceKey?: string;
}

export interface ProblemDetails {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly errorCode?: string;
  readonly resourceKey?: string;
  readonly correlationId?: string;
  readonly errors?: Record<string, FieldError[]>;
}
