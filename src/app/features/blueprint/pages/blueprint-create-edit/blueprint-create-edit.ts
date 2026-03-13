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
import { IgxCheckboxComponent } from '@infragistics/igniteui-angular/checkbox';
import { map } from 'rxjs';

import { BlueprintService } from '../../services/blueprint.service';
import {
  CustomValidators,
  uniqueNameValidator,
} from '../../../../shared/validators/custom-validators';

/**
 * Reference implementation: Typed Reactive Forms with Signals.
 *
 * Demonstrates:
 * - Typed FormBuilder (Task 2)
 * - Form-State with Signals via toSignal() (Task 3)
 * - IgniteUI Form-Component integration (Task 4)
 * - Sync & Async Validators (Task 5)
 * - i18n-ready validation messages (Task 5)
 *
 * Reference: ADR-10500 – Forms, Validation & CRUD Operations
 */
@Component({
  selector: 'app-blueprint-create-edit',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
    IgxHintDirective,
    IgxCheckboxComponent,
  ],
  templateUrl: './blueprint-create-edit.html',
  styleUrl: './blueprint-create-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintCreateEdit implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly blueprintService = inject(BlueprintService);

  /** Route parameter: article ID for edit mode, absent for create mode. */
  readonly id = input<string>();

  /** Whether this is edit mode (true) or create mode (false). */
  readonly isEditMode = computed(() => !!this.id());

  /** Page title key for i18n. */
  readonly titleKey = computed(() =>
    this.isEditMode() ? 'blueprint.createEdit.titleEdit' : 'blueprint.createEdit.titleCreate',
  );

  // ── Typed Reactive Form (Task 2) ──────────────────────────────────
  readonly form = this.fb.group({
    articleId: ['', [Validators.required, CustomValidators.notBlank]],
    name: [
      '',
      [Validators.required, CustomValidators.notBlank, CustomValidators.trimmedMinLength(2)],
    ],
    description: [
      '',
      [Validators.required, CustomValidators.notBlank, CustomValidators.trimmedMaxLength(500)],
    ],
    isActive: [true],
  });

  // ── Form-State Signals (Task 3) ───────────────────────────────────
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
    this.setupAsyncValidators();
    this.loadArticleForEdit();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const article = {
      articleId: value.articleId ?? '',
      name: value.name ?? '',
      description: value.description ?? '',
    };

    if (this.isEditMode()) {
      this.blueprintService.removeArticle(this.id()!);
      this.blueprintService.addArticle(article);
    } else {
      this.blueprintService.addArticle(article);
    }

    void this.router.navigate(['/blueprint']);
  }

  protected onCancel(): void {
    void this.router.navigate(['/blueprint']);
  }

  /**
   * Returns whether a field should show validation errors.
   * Errors are shown after first interaction (touched) or after submit attempt.
   */
  protected showErrors(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private setupAsyncValidators(): void {
    const articleIdControl = this.form.controls.articleId;
    const currentId = this.id();

    articleIdControl.addAsyncValidators(
      uniqueNameValidator(() => {
        const existing = this.blueprintService
          .getArticles()
          .map((a) => a.articleId)
          .filter((id) => id !== currentId);
        return existing;
      }),
    );
  }

  private loadArticleForEdit(): void {
    const articleId = this.id();
    if (!articleId) {
      return;
    }

    const article = this.blueprintService.getArticleById(articleId);
    if (article) {
      this.form.patchValue({
        articleId: article.articleId,
        name: article.name,
        description: article.description,
      });
      this.form.controls.articleId.disable();
    }
  }
}
