export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface PagedResponse<T> {
  readonly data: T[];
  readonly pagination: PaginationMeta;
}
