/**
 * Full article response — maps to OpenAPI: ArticleResponse.
 * Used for both list items (via paged response) and single get-by-id.
 */
export interface ArticleResponse {
  readonly articleId: string;
  readonly articleNr: string;
  readonly gtin: string | null;
  readonly articleName: string;
  readonly articleLongText: string | null;
  readonly articleType: number;
  readonly supplierArticleNr: string | null;
  readonly buyerArticleNr: string | null;
  readonly brandName: string | null;
  readonly modelDescription: string | null;
  readonly receiptText: string | null;
  readonly productGroupId: string | null;
  readonly taxRateId: string;
  readonly articleStatus: number;
  readonly createdAt: string;
  readonly modifiedAt: string | null;
  readonly isEligibleForBonus: boolean;
  readonly isReturnable: boolean;
  readonly conditionBlock: boolean;
  readonly neverOutOfStock: boolean;
  readonly availableFrom: string | null;
  readonly earliestSaleDate: string | null;
  readonly colorCode: string | null;
  readonly colorName: string | null;
  readonly sizeCode: string | null;
  readonly sizeName: string | null;
  readonly seasonCode: string | null;
  readonly countryOfOrigin: string | null;
  readonly minimumOrderQuantity: number | null;
  readonly lotFactor: number | null;
  readonly successorArticleId: string | null;
  readonly predecessorArticleId: string | null;
  readonly netWeight: number | null;
  readonly grossWeight: number | null;
  readonly weightUnit: string | null;
  readonly height: number | null;
  readonly width: number | null;
  readonly length: number | null;
  readonly dimensionUnit: string | null;
  readonly layersPerPallet: number | null;
  readonly unitsPerLayer: number | null;
  readonly cartonsPerPallet: number | null;
}

/**
 * Create request body.
 * Maps to OpenAPI: CreateArticleRequest
 */
export interface CreateArticleRequest {
  readonly articleNr: string | null;
  readonly gtin: string | null;
  readonly articleName: string | null;
  readonly articleLongText: string | null;
  readonly articleType: number;
  readonly supplierArticleNr: string | null;
  readonly buyerArticleNr: string | null;
  readonly brandName: string | null;
  readonly modelDescription: string | null;
  readonly receiptText: string | null;
  readonly productGroupId: string | null;
  readonly taxRateId: string;
}

/**
 * Update request body.
 * Maps to OpenAPI: UpdateArticleRequest
 */
export interface UpdateArticleRequest {
  readonly articleName: string | null;
  readonly articleLongText: string | null;
  readonly articleType: number;
  readonly supplierArticleNr: string | null;
  readonly buyerArticleNr: string | null;
  readonly brandName: string | null;
  readonly modelDescription: string | null;
  readonly receiptText: string | null;
  readonly productGroupId: string | null;
  readonly taxRateId: string;
}

/**
 * Discontinue request body.
 * Maps to OpenAPI: DiscontinueArticleRequest
 */
export interface DiscontinueArticleRequest {
  readonly successorArticleId: string | null;
}

/**
 * Discontinue response.
 * Maps to OpenAPI: DiscontinueArticleResponse
 */
export interface DiscontinueArticleResponse {
  readonly articleId: string;
  readonly missingSuccessorWarning: boolean;
}

/**
 * Pagination metadata.
 * Maps to OpenAPI: PaginationMetadata
 */
export interface PaginationMetadata {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Paged response wrapper.
 * Maps to OpenAPI: PagedResponseOfArticleResponse
 */
export interface PagedArticleResponse {
  readonly data: ArticleResponse[];
  readonly pagination: PaginationMetadata;
}

/**
 * Query / filter parameters for the list endpoint.
 */
export interface ArticleFilterParams {
  readonly searchTerm?: string;
  readonly articleType?: number;
  readonly productGroup?: string;
  readonly status?: number;
  readonly brandName?: string;
  readonly sortBy?: string;
  readonly sortOrder?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

/**
 * Known article status values (derived from API behaviour).
 */
export enum ArticleStatus {
  Active = 0,
  Inactive = 1,
  Discontinued = 2,
}

/**
 * Known article type values (derived from API behaviour).
 */
export enum ArticleType {
  Standard = 0,
  Service = 1,
}
