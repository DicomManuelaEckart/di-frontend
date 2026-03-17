import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
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

import { NumberSequenceApiService } from '../../services/number-sequence-api.service';
import { CustomValidators } from '../../../../shared/validators/custom-validators';

/**
 * Create page for NumberSequences.
 *
 * Note: The API does not provide update or get-by-ID endpoints,
 * so this component only supports create mode.
 */
@Component({
  selector: 'app-number-sequence-create-edit',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
    IgxHintDirective,
    IgxCheckboxComponent,
  ],
  templateUrl: './number-sequence-create-edit.html',
  styleUrl: './number-sequence-create-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberSequenceCreateEdit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly numberSequenceApiService = inject(NumberSequenceApiService);

  /** Route parameter: id for edit mode (not currently supported by API). */
  readonly id = input<string>();

  readonly isEditMode = computed(() => !!this.id());

  readonly titleKey = computed(() =>
    this.isEditMode()
      ? 'numberSequences.createEdit.titleEdit'
      : 'numberSequences.createEdit.titleCreate',
  );

  readonly form = this.fb.group({
    documentType: [0, [Validators.required, Validators.min(0)]],
    numberPattern: ['', [Validators.required, CustomValidators.notBlank]],
    prefix: [''],
    startValue: [1, [Validators.required, Validators.min(0)]],
    yearlyReset: [false],
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

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      documentType: value.documentType ?? 0,
      numberPattern: value.numberPattern ?? '',
      prefix: value.prefix || null,
      startValue: value.startValue ?? 1,
      yearlyReset: value.yearlyReset ?? false,
    };

    this.numberSequenceApiService.create(request).subscribe({
      next: () => {
        void this.router.navigate(['/number-sequences']);
      },
    });
  }

  protected onCancel(): void {
    void this.router.navigate(['/number-sequences']);
  }

  protected showErrors(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}
