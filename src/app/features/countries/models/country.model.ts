/**
 * List item — fields shown in the grid.
 * Maps to OpenAPI: CountryResponse
 */
export interface CountryListItem {
  readonly countryId: string;
  readonly countryCodeAlpha2: string;
  readonly countryCodeAlpha3: string;
  readonly countryCodeNumeric: string | null;
  readonly countryName: string;
  readonly countryNameEN: string;
  readonly phonePrefix: string | null;
  readonly postalCodeFormat: string | null;
  readonly isEuMember: boolean;
  readonly isActive: boolean;
}

/**
 * Query filter parameters for the list endpoint.
 */
export interface CountryFilterParams {
  readonly search?: string;
  readonly isActive?: boolean;
}
