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
import { map } from 'rxjs';

import { ArticleApiService } from '../../services/article-api.service';
import { UpdateWeightsDimensionsRequest } from '../../models/article.model';

@Component({
  selector: 'app-article-weights-dimensions',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
  ],
  templateUrl: './article-weights-dimensions.html',
  styleUrl: './article-weights-dimensions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleWeightsDimensions implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly articleApiService = inject(ArticleApiService);

  readonly id = input.required<string>();

  readonly form = this.fb.group({
    netWeight: [null as number | null],
    grossWeight: [null as number | null],
    weightUnit: [''],
    height: [null as number | null],
    width: [null as number | null],
    length: [null as number | null],
    dimensionUnit: [''],
    layersPerPallet: [null as number | null],
    unitsPerLayer: [null as number | null],
    cartonsPerPallet: [null as number | null],
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

    const request: UpdateWeightsDimensionsRequest = {
      netWeight: value.netWeight ?? null,
      grossWeight: value.grossWeight ?? null,
      weightUnit: value.weightUnit || null,
      height: value.height ?? null,
      width: value.width ?? null,
      length: value.length ?? null,
      dimensionUnit: value.dimensionUnit || null,
      layersPerPallet: value.layersPerPallet ?? null,
      unitsPerLayer: value.unitsPerLayer ?? null,
      cartonsPerPallet: value.cartonsPerPallet ?? null,
    };

    this.articleApiService.updateWeightsDimensions(this.id(), request).subscribe({
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
          netWeight: article.netWeight,
          grossWeight: article.grossWeight,
          weightUnit: article.weightUnit ?? '',
          height: article.height,
          width: article.width,
          length: article.length,
          dimensionUnit: article.dimensionUnit ?? '',
          layersPerPallet: article.layersPerPallet,
          unitsPerLayer: article.unitsPerLayer,
          cartonsPerPallet: article.cartonsPerPallet,
        });
      },
    });
  }
}
