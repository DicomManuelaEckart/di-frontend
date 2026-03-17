/**
 * List item — fields shown in the grid.
 * Maps to OpenAPI: NumberSequenceListItemResponse
 */
export interface NumberSequenceListItem {
  readonly numberSequenceId: string;
  readonly companyId: string;
  readonly documentType: number;
  readonly numberPattern: string;
  readonly prefix: string | null;
  readonly currentValue: number;
  readonly startValue: number;
  readonly yearlyReset: boolean;
  readonly isActive: boolean;
}

/**
 * Create request body.
 * Maps to OpenAPI: CreateNumberSequenceRequest
 */
export interface CreateNumberSequenceRequest {
  readonly documentType: number;
  readonly numberPattern: string;
  readonly prefix: string | null;
  readonly startValue: number;
  readonly yearlyReset: boolean;
}

/**
 * Create response.
 * Maps to OpenAPI: CreateNumberSequenceResponse
 */
export interface CreateNumberSequenceResponse {
  readonly numberSequenceId: string;
}

/**
 * Allocate next number response.
 * Maps to OpenAPI: AllocateNextNumberResponse
 */
export interface AllocateNextNumberResponse {
  readonly formattedNumber: string;
}

/**
 * Preview next number response.
 * Maps to OpenAPI: PreviewNextNumberResponse
 */
export interface PreviewNextNumberResponse {
  readonly previewNumber: string;
}

/**
 * Query filter parameters for the list endpoint.
 */
export interface NumberSequenceFilterParams {
  readonly documentType?: number;
  readonly isActive?: boolean;
}
