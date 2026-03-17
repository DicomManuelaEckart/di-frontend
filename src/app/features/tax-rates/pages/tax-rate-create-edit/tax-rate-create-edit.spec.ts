import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { TaxRateCreateEdit } from './tax-rate-create-edit';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';

describe('TaxRateCreateEdit', () => {
  let component: TaxRateCreateEdit;
  let fixture: ComponentFixture<TaxRateCreateEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxRateCreateEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaxRateCreateEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be in create mode when no id is provided', () => {
    expect(component.isEditMode()).toBe(false);
  });

  it('should have an invalid form initially (required fields empty)', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should have a valid form when all required fields are filled', () => {
    component.form.patchValue({
      taxRateName: 'Standard VAT',
      taxPercentage: 19,
      taxType: 1,
      countryCode: 'DE',
      validFrom: '2024-01-01',
    });
    expect(component.form.valid).toBe(true);
  });

  it('should require taxRateName', () => {
    expect(component.form.controls.taxRateName.errors).toHaveProperty('required');
  });

  it('should require countryCode', () => {
    expect(component.form.controls.countryCode.errors).toHaveProperty('required');
  });

  it('should require validFrom', () => {
    expect(component.form.controls.validFrom.errors).toHaveProperty('required');
  });

  it('should validate taxPercentage max 100', () => {
    component.form.controls.taxPercentage.setValue(150);
    expect(component.form.controls.taxPercentage.errors).toHaveProperty('max');
  });

  it('should validate taxPercentage min 0', () => {
    component.form.controls.taxPercentage.setValue(-5);
    expect(component.form.controls.taxPercentage.errors).toHaveProperty('min');
  });

  it('should expose form validity as signal', () => {
    expect(component.isValid()).toBe(false);

    component.form.patchValue({
      taxRateName: 'Standard VAT',
      taxPercentage: 19,
      taxType: 1,
      countryCode: 'DE',
      validFrom: '2024-01-01',
    });
    component.form.updateValueAndValidity();
    expect(component.isValid()).toBe(true);
  });

  it('should expose form dirty state as signal', () => {
    expect(component.isDirty()).toBe(false);

    component.form.controls.taxRateName.markAsDirty();
    component.form.controls.taxRateName.setValue('Changed');
    expect(component.isDirty()).toBe(true);
  });

  it('should mark all controls as touched on invalid submit', () => {
    component['onSubmit']();
    expect(component.form.controls.taxRateName.touched).toBe(true);
    expect(component.form.controls.countryCode.touched).toBe(true);
    expect(component.form.controls.validFrom.touched).toBe(true);
  });

  it('should show errors only for touched invalid fields', () => {
    expect(component['showErrors']('taxRateName')).toBe(false);
    component.form.controls.taxRateName.markAsTouched();
    expect(component['showErrors']('taxRateName')).toBe(true);
  });
});
