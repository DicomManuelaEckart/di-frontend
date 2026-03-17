/**
 * List item — fields shown in the grid.
 * Maps to OpenAPI: CurrencyListItemResponse
 */
export interface CurrencyListItem {
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly currencyName: string;
  readonly currencyNameEN: string;
  readonly symbol: string | null;
  readonly decimalDigits: number;
  readonly isActive: boolean;
}

/**
 * Query filter parameters for the list endpoint.
 */
export interface CurrencyFilterParams {
  readonly isActive?: boolean;
}
