import { ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IgxInputGroupComponent,
  IgxInputDirective,
  IgxLabelDirective,
} from '@infragistics/igniteui-angular/input-group';
import { IgxCheckboxComponent } from '@infragistics/igniteui-angular/checkbox';
import { map } from 'rxjs';

import { ArticleApiService } from '../../services/article-api.service';
import { UpdateArticlePropertiesRequest } from '../../models/article.model';

@Component({
  selector: 'app-article-properties',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
    IgxCheckboxComponent,
  ],
  templateUrl: './article-properties.html',
  styleUrl: './article-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleProperties implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly articleApiService = inject(ArticleApiService);

  readonly id = input.required<string>();

  readonly form = this.fb.group({
    isEligibleForBonus: [false],
    isReturnable: [false],
    conditionBlock: [false],
    neverOutOfStock: [false],
    availableFrom: [''],
    earliestSaleDate: [''],
    colorCode: [''],
    colorName: [''],
    sizeCode: [''],
    sizeName: [''],
    seasonCode: [''],
    countryOfOrigin: [''],
    minimumOrderQuantity: [null as number | null],
    lotFactor: [null as number | null],
    successorArticleId: [''],
    predecessorArticleId: [''],
  });

  readonly isValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: true,
  });

  readonly isDirty = toSignal(this.form.valueChanges.pipe(map(() => this.form.dirty)), {
    initialValue: false,
  });

  private saving = false;

  ngOnInit(): void {
    this.loadArticle(this.id());
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.saving) {
      return;
    }

    this.saving = true;
    const value = this.form.getRawValue();

    const request: UpdateArticlePropertiesRequest = {
      isEligibleForBonus: value.isEligibleForBonus ?? false,
      isReturnable: value.isReturnable ?? false,
      conditionBlock: value.conditionBlock ?? false,
      neverOutOfStock: value.neverOutOfStock ?? false,
      availableFrom: value.availableFrom || null,
      earliestSaleDate: value.earliestSaleDate || null,
      colorCode: value.colorCode || null,
      colorName: value.colorName || null,
      sizeCode: value.sizeCode || null,
      sizeName: value.sizeName || null,
      seasonCode: value.seasonCode || null,
      countryOfOrigin: value.countryOfOrigin || null,
      minimumOrderQuantity: value.minimumOrderQuantity ?? null,
      lotFactor: value.lotFactor ?? null,
      successorArticleId: value.successorArticleId || null,
      predecessorArticleId: value.predecessorArticleId || null,
    };

    this.articleApiService.updateProperties(this.id(), request).subscribe({
      next: () => {
        this.saving = false;
        void this.router.navigate(['/articles']);
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  protected onCancel(): void {
    void this.router.navigate(['/articles']);
  }

  private loadArticle(articleId: string): void {
    this.articleApiService.getById(articleId).subscribe({
      next: (article) => {
        this.form.patchValue({
          isEligibleForBonus: article.isEligibleForBonus,
          isReturnable: article.isReturnable,
          conditionBlock: article.conditionBlock,
          neverOutOfStock: article.neverOutOfStock,
          availableFrom: article.availableFrom ?? '',
          earliestSaleDate: article.earliestSaleDate ?? '',
          colorCode: article.colorCode ?? '',
          colorName: article.colorName ?? '',
          sizeCode: article.sizeCode ?? '',
          sizeName: article.sizeName ?? '',
          seasonCode: article.seasonCode ?? '',
          countryOfOrigin: article.countryOfOrigin ?? '',
          minimumOrderQuantity: article.minimumOrderQuantity,
          lotFactor: article.lotFactor,
          successorArticleId: article.successorArticleId ?? '',
          predecessorArticleId: article.predecessorArticleId ?? '',
        });
      },
    });
  }
}
