import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import {
  IgxColumnComponent,
  IgxCellTemplateDirective,
} from '@infragistics/igniteui-angular/grids/core';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';
import {
  IgxInputGroupComponent,
  IgxInputDirective,
  IgxLabelDirective,
} from '@infragistics/igniteui-angular/input-group';
import { IgxCheckboxComponent } from '@infragistics/igniteui-angular/checkbox';

import { ArticleApiService } from '../../services/article-api.service';
import {
  ArticleHierarchyResponse,
  CreateArticleHierarchyRequest,
} from '../../models/article.model';

@Component({
  selector: 'app-article-hierarchy',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxGridComponent,
    IgxColumnComponent,
    IgxCellTemplateDirective,
    IgxIconComponent,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
    IgxCheckboxComponent,
  ],
  templateUrl: './article-hierarchy.html',
  styleUrl: './article-hierarchy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHierarchy implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly articleApiService = inject(ArticleApiService);

  readonly id = input.required<string>();

  protected readonly hierarchies = signal<ArticleHierarchyResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly showCreateForm = signal(false);
  protected readonly actionInProgressId = signal<string | null>(null);

  readonly createForm = this.fb.group({
    childArticleId: ['', [Validators.required]],
    containedQuantity: [1, [Validators.required, Validators.min(1)]],
    isMainUnit: [false],
    isSubUnit: [false],
    isOrderUnit: [false],
    isDeliveryUnit: [false],
    isConsumerUnit: [false],
    isSmallestUnit: [false],
  });

  ngOnInit(): void {
    this.loadHierarchies();
  }

  protected toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    if (!this.showCreateForm()) {
      this.createForm.reset({
        childArticleId: '',
        containedQuantity: 1,
        isMainUnit: false,
        isSubUnit: false,
        isOrderUnit: false,
        isDeliveryUnit: false,
        isConsumerUnit: false,
        isSmallestUnit: false,
      });
    }
  }

  protected onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    const request: CreateArticleHierarchyRequest = {
      childArticleId: value.childArticleId ?? '',
      containedQuantity: value.containedQuantity ?? 1,
      isMainUnit: value.isMainUnit ?? false,
      isSubUnit: value.isSubUnit ?? false,
      isOrderUnit: value.isOrderUnit ?? false,
      isDeliveryUnit: value.isDeliveryUnit ?? false,
      isConsumerUnit: value.isConsumerUnit ?? false,
      isSmallestUnit: value.isSmallestUnit ?? false,
    };

    this.articleApiService.createHierarchy(this.id(), request).subscribe({
      next: (created) => {
        this.hierarchies.update((items) => [...items, created]);
        this.toggleCreateForm();
      },
    });
  }

  protected onDelete(hierarchy: ArticleHierarchyResponse): void {
    this.actionInProgressId.set(hierarchy.hierarchyId);
    this.articleApiService.deleteHierarchy(this.id(), hierarchy.hierarchyId).subscribe({
      next: () => {
        this.hierarchies.update((items) =>
          items.filter((h) => h.hierarchyId !== hierarchy.hierarchyId),
        );
        this.actionInProgressId.set(null);
      },
      error: () => {
        this.actionInProgressId.set(null);
      },
    });
  }

  protected onBack(): void {
    void this.router.navigate(['/articles']);
  }

  private loadHierarchies(): void {
    this.loading.set(true);
    this.articleApiService.getHierarchies(this.id()).subscribe({
      next: (data) => {
        this.hierarchies.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
