import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import {
  IgxColumnComponent,
  IgxCellTemplateDirective,
} from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

import { ArticleService } from '../../services/article.service';
import { ArticleApiService } from '../../services/article-api.service';
import { ArticleResponse, ArticleStatus, ArticleFilterParams } from '../../models/article.model';

@Component({
  selector: 'app-articles-list',
  imports: [
    TranslatePipe,
    IgxGridComponent,
    IgxColumnComponent,
    IgxCellTemplateDirective,
    IgxPaginatorComponent,
    IgxIconComponent,
  ],
  templateUrl: './articles-list.html',
  styleUrl: './articles-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesList implements OnInit {
  private readonly articleService = inject(ArticleService);
  private readonly articleApiService = inject(ArticleApiService);
  private readonly router = inject(Router);

  protected readonly items = this.articleService.items;
  protected readonly loading = this.articleService.loading;
  protected readonly pagination = this.articleService.pagination;

  protected readonly actionInProgressId = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  readonly ArticleStatus = ArticleStatus;

  ngOnInit(): void {
    this.loadData();
  }

  protected onCreate(): void {
    void this.router.navigate(['/articles/create']);
  }

  protected onEdit(item: ArticleResponse): void {
    void this.router.navigate(['/articles', item.articleId, 'edit']);
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.loadData({ searchTerm: value || undefined });
  }

  protected onDeactivate(item: ArticleResponse): void {
    this.actionInProgressId.set(item.articleId);
    this.articleApiService.deactivate(item.articleId).subscribe({
      next: () => {
        this.articleService.deactivateItem(item.articleId);
        this.actionInProgressId.set(null);
      },
      error: () => {
        this.actionInProgressId.set(null);
      },
    });
  }

  protected onReactivate(item: ArticleResponse): void {
    this.actionInProgressId.set(item.articleId);
    this.articleApiService.reactivate(item.articleId).subscribe({
      next: () => {
        this.articleService.reactivateItem(item.articleId);
        this.actionInProgressId.set(null);
      },
      error: () => {
        this.actionInProgressId.set(null);
      },
    });
  }

  protected isActive(item: ArticleResponse): boolean {
    return item.articleStatus === ArticleStatus.Active;
  }

  protected isInactive(item: ArticleResponse): boolean {
    return item.articleStatus === ArticleStatus.Inactive;
  }

  private loadData(params?: ArticleFilterParams): void {
    this.articleService.setLoading(true);
    this.articleApiService.getAll(params).subscribe({
      next: (response) => {
        this.articleService.setItems(response.data);
        this.articleService.setPagination(response.pagination);
        this.articleService.setLoading(false);
      },
      error: () => {
        this.articleService.setLoading(false);
      },
    });
  }
}
