/**
 * List item — fields shown in the grid.
 * Maps to OpenAPI: TaxRateListItemResponse
 */
export interface TaxRateListItem {
  readonly taxRateId: string;
  readonly name: string;
  readonly percentage: number;
  readonly taxType: number;
  readonly countryCode: string;
  readonly regionCode: string | null;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly ediTaxCode: string | null;
  readonly isActive: boolean;
}

/**
 * Create request body.
 * Maps to OpenAPI: CreateTaxRateRequest
 */
export interface CreateTaxRateRequest {
  readonly taxRateName: string | null;
  readonly taxPercentage: number;
  readonly taxType: number;
  readonly countryCode: string | null;
  readonly regionCode: string | null;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly ediTaxCode: string | null;
}

/**
 * Create response.
 * Maps to OpenAPI: CreateTaxRateResponse
 */
export interface CreateTaxRateResponse {
  readonly taxRateId: string;
}

/**
 * Resolve tax rate response.
 * Maps to OpenAPI: ResolveTaxRateResponse
 */
export interface ResolveTaxRateResponse {
  readonly taxRateId: string;
  readonly name: string;
  readonly percentage: number;
  readonly taxType: number;
  readonly countryCode: string;
  readonly regionCode: string | null;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly ediTaxCode: string | null;
  readonly isActive: boolean;
}

/**
 * Query filter parameters for the list endpoint.
 */
export interface TaxRateFilterParams {
  readonly countryCode?: string;
  readonly taxType?: number;
  readonly isActive?: boolean;
}
