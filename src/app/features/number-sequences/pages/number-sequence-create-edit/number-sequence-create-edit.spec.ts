import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { NumberSequenceCreateEdit } from './number-sequence-create-edit';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';

describe('NumberSequenceCreateEdit', () => {
  let component: NumberSequenceCreateEdit;
  let fixture: ComponentFixture<NumberSequenceCreateEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberSequenceCreateEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NumberSequenceCreateEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be in create mode when no id is provided', () => {
    expect(component.isEditMode()).toBe(false);
  });

  it('should have a valid form when default values are present', () => {
    // documentType defaults to 0, numberPattern is empty (required), startValue defaults to 1
    // So form should be invalid initially because numberPattern is required and empty
    expect(component.form.valid).toBe(false);
  });

  it('should have a valid form when all required fields are filled', () => {
    component.form.patchValue({
      documentType: 1,
      numberPattern: 'INV-{YYYY}-{####}',
      startValue: 1,
      yearlyReset: false,
    });
    expect(component.form.valid).toBe(true);
  });

  it('should require numberPattern', () => {
    component.form.controls.numberPattern.setValue('');
    component.form.controls.numberPattern.updateValueAndValidity();
    expect(component.form.controls.numberPattern.errors).toHaveProperty('required');
  });

  it('should require documentType', () => {
    component.form.controls.documentType.setValue(null as unknown as number);
    component.form.controls.documentType.updateValueAndValidity();
    expect(component.form.controls.documentType.errors).toHaveProperty('required');
  });

  it('should validate documentType minimum value', () => {
    component.form.controls.documentType.setValue(-1);
    component.form.controls.documentType.updateValueAndValidity();
    expect(component.form.controls.documentType.errors).toHaveProperty('min');
  });

  it('should require startValue', () => {
    component.form.controls.startValue.setValue(null as unknown as number);
    component.form.controls.startValue.updateValueAndValidity();
    expect(component.form.controls.startValue.errors).toHaveProperty('required');
  });

  it('should validate startValue minimum value', () => {
    component.form.controls.startValue.setValue(-1);
    component.form.controls.startValue.updateValueAndValidity();
    expect(component.form.controls.startValue.errors).toHaveProperty('min');
  });

  it('should default yearlyReset to false', () => {
    expect(component.form.controls.yearlyReset.value).toBe(false);
  });

  it('should expose form validity as signal', () => {
    expect(component.isValid()).toBe(false);

    component.form.patchValue({
      documentType: 1,
      numberPattern: 'INV-{YYYY}-{####}',
      startValue: 1,
    });
    component.form.updateValueAndValidity();
    expect(component.isValid()).toBe(true);
  });

  it('should expose form dirty state as signal', () => {
    expect(component.isDirty()).toBe(false);

    component.form.controls.numberPattern.markAsDirty();
    component.form.controls.numberPattern.setValue('changed');
    expect(component.isDirty()).toBe(true);
  });

  it('should mark all controls as touched on invalid submit', () => {
    component.form.patchValue({ numberPattern: '' });
    component['onSubmit']();
    expect(component.form.controls.numberPattern.touched).toBe(true);
    expect(component.form.controls.documentType.touched).toBe(true);
    expect(component.form.controls.startValue.touched).toBe(true);
  });

  it('should show errors only for touched invalid fields', () => {
    expect(component['showErrors']('numberPattern')).toBe(false);
    component.form.controls.numberPattern.markAsTouched();
    expect(component['showErrors']('numberPattern')).toBe(true);
  });
});
