import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IgxInputGroupComponent,
  IgxInputDirective,
  IgxLabelDirective,
  IgxHintDirective,
} from '@infragistics/igniteui-angular/input-group';
import { map } from 'rxjs';

import { ArticleApiService } from '../../services/article-api.service';
import { CustomValidators } from '../../../../shared/validators/custom-validators';

/**
 * Create / Edit page for Articles.
 *
 * - Create mode: no route param `id`
 * - Edit mode: route param `id` is provided → loads existing article
 */
@Component({
  selector: 'app-article-create-edit',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
    IgxHintDirective,
  ],
  templateUrl: './article-create-edit.html',
  styleUrl: './article-create-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCreateEdit implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly articleApiService = inject(ArticleApiService);

  /** Route parameter: id for edit mode. */
  readonly id = input<string>();

  readonly isEditMode = computed(() => !!this.id());

  readonly titleKey = computed(() =>
    this.isEditMode() ? 'articles.createEdit.titleEdit' : 'articles.createEdit.titleCreate',
  );

  readonly form = this.fb.group({
    articleNr: [''],
    gtin: [''],
    articleName: ['', [Validators.required, CustomValidators.notBlank]],
    articleLongText: [''],
    articleType: [0, [Validators.required, Validators.min(0)]],
    supplierArticleNr: [''],
    buyerArticleNr: [''],
    brandName: [''],
    modelDescription: [''],
    receiptText: [''],
    productGroupId: [''],
    taxRateId: ['', [Validators.required, CustomValidators.notBlank]],
  });

  readonly isValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: false,
  });

  readonly isDirty = toSignal(this.form.valueChanges.pipe(map(() => this.form.dirty)), {
    initialValue: false,
  });

  readonly isPending = toSignal(this.form.statusChanges.pipe(map(() => this.form.pending)), {
    initialValue: false,
  });

  ngOnInit(): void {
    if (this.isEditMode()) {
      this.loadArticle(this.id()!);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    if (this.isEditMode()) {
      const updateRequest = {
        articleName: value.articleName || null,
        articleLongText: value.articleLongText || null,
        articleType: value.articleType ?? 0,
        supplierArticleNr: value.supplierArticleNr || null,
        buyerArticleNr: value.buyerArticleNr || null,
        brandName: value.brandName || null,
        modelDescription: value.modelDescription || null,
        receiptText: value.receiptText || null,
        productGroupId: value.productGroupId || null,
        taxRateId: value.taxRateId ?? '',
      };
      this.articleApiService.update(this.id()!, updateRequest).subscribe({
        next: () => {
          void this.router.navigate(['/articles']);
        },
      });
    } else {
      const createRequest = {
        articleNr: value.articleNr || null,
        gtin: value.gtin || null,
        articleName: value.articleName || null,
        articleLongText: value.articleLongText || null,
        articleType: value.articleType ?? 0,
        supplierArticleNr: value.supplierArticleNr || null,
        buyerArticleNr: value.buyerArticleNr || null,
        brandName: value.brandName || null,
        modelDescription: value.modelDescription || null,
        receiptText: value.receiptText || null,
        productGroupId: value.productGroupId || null,
        taxRateId: value.taxRateId ?? '',
      };
      this.articleApiService.create(createRequest).subscribe({
        next: () => {
          void this.router.navigate(['/articles']);
        },
      });
    }
  }

  protected onCancel(): void {
    void this.router.navigate(['/articles']);
  }

  protected showErrors(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private loadArticle(articleId: string): void {
    this.articleApiService.getById(articleId).subscribe({
      next: (article) => {
        this.form.patchValue({
          articleNr: article.articleNr,
          gtin: article.gtin ?? '',
          articleName: article.articleName,
          articleLongText: article.articleLongText ?? '',
          articleType: article.articleType,
          supplierArticleNr: article.supplierArticleNr ?? '',
          buyerArticleNr: article.buyerArticleNr ?? '',
          brandName: article.brandName ?? '',
          modelDescription: article.modelDescription ?? '',
          receiptText: article.receiptText ?? '',
          productGroupId: article.productGroupId ?? '',
          taxRateId: article.taxRateId,
        });
        // Disable immutable fields in edit mode
        this.form.controls.articleNr.disable();
        this.form.controls.gtin.disable();
      },
    });
  }
}
