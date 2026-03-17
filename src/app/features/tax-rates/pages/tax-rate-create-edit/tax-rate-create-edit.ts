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
import { map } from 'rxjs';

import { TaxRateApiService } from '../../services/tax-rate-api.service';
import { CustomValidators } from '../../../../shared/validators/custom-validators';

/**
 * Create page for TaxRates.
 *
 * Note: The API does not provide update or get-by-ID endpoints,
 * so this component only supports create mode.
 */
@Component({
  selector: 'app-tax-rate-create-edit',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IgxInputGroupComponent,
    IgxInputDirective,
    IgxLabelDirective,
    IgxHintDirective,
  ],
  templateUrl: './tax-rate-create-edit.html',
  styleUrl: './tax-rate-create-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxRateCreateEdit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly taxRateApiService = inject(TaxRateApiService);

  /** Route parameter: id for edit mode (not currently supported by API). */
  readonly id = input<string>();

  readonly isEditMode = computed(() => !!this.id());

  readonly titleKey = computed(() =>
    this.isEditMode() ? 'taxRates.createEdit.titleEdit' : 'taxRates.createEdit.titleCreate',
  );

  readonly form = this.fb.group({
    taxRateName: ['', [Validators.required, CustomValidators.notBlank]],
    taxPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    taxType: [0, [Validators.required, Validators.min(0)]],
    countryCode: ['', [Validators.required, CustomValidators.notBlank]],
    regionCode: [''],
    validFrom: ['', [Validators.required]],
    validTo: [''],
    ediTaxCode: [''],
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
      taxRateName: value.taxRateName || null,
      taxPercentage: value.taxPercentage ?? 0,
      taxType: value.taxType ?? 0,
      countryCode: value.countryCode || null,
      regionCode: value.regionCode || null,
      validFrom: value.validFrom ?? '',
      validTo: value.validTo || null,
      ediTaxCode: value.ediTaxCode || null,
    };

    this.taxRateApiService.create(request).subscribe({
      next: () => {
        void this.router.navigate(['/tax-rates']);
      },
    });
  }

  protected onCancel(): void {
    void this.router.navigate(['/tax-rates']);
  }

  protected showErrors(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}
