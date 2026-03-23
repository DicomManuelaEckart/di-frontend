import { computed, Injectable, signal } from '@angular/core';

import { ArticleResponse, ArticleStatus, PaginationMetadata } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class ArticleService {
  private readonly itemsSignal = signal<ArticleResponse[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly paginationSignal = signal<PaginationMetadata>({
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();
  readonly itemCount = computed(() => this.paginationSignal().totalCount);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: ArticleResponse[]): void {
    this.itemsSignal.set(items);
  }

  setPagination(pagination: PaginationMetadata): void {
    this.paginationSignal.set(pagination);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  deactivateItem(articleId: string): void {
    this.itemsSignal.update((items) =>
      items.map((item) =>
        item.articleId === articleId ? { ...item, articleStatus: ArticleStatus.Inactive } : item,
      ),
    );
  }

  reactivateItem(articleId: string): void {
    this.itemsSignal.update((items) =>
      items.map((item) =>
        item.articleId === articleId ? { ...item, articleStatus: ArticleStatus.Active } : item,
      ),
    );
  }

  discontinueItem(articleId: string): void {
    this.itemsSignal.update((items) =>
      items.map((item) =>
        item.articleId === articleId
          ? { ...item, articleStatus: ArticleStatus.Discontinued }
          : item,
      ),
    );
  }
}
