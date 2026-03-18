/**
 * List item — fields shown in the grid.
 * Maps to OpenAPI: RegionResponse
 */
export interface RegionListItem {
  readonly regionId: string;
  readonly regionCode: string;
  readonly regionName: string;
  readonly countryCodeAlpha2: string;
  readonly isActive: boolean;
}

/**
 * Query filter parameters for the list endpoint.
 */
export interface RegionFilterParams {
  readonly isActive?: boolean;
}
