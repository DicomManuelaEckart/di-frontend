import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ArticleCreateEdit } from './article-create-edit';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';

describe('ArticleCreateEdit', () => {
  let component: ArticleCreateEdit;
  let fixture: ComponentFixture<ArticleCreateEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleCreateEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleCreateEdit);
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
      articleName: 'Test Article',
      articleType: 0,
      taxRateId: 'tr-1',
    });
    expect(component.form.valid).toBe(true);
  });

  it('should require articleName', () => {
    expect(component.form.controls.articleName.errors).toHaveProperty('required');
  });

  it('should require taxRateId', () => {
    expect(component.form.controls.taxRateId.errors).toHaveProperty('required');
  });

  it('should validate articleType min 0', () => {
    component.form.controls.articleType.setValue(-1);
    expect(component.form.controls.articleType.errors).toHaveProperty('min');
  });

  it('should expose form validity as signal', () => {
    expect(component.isValid()).toBe(false);

    component.form.patchValue({
      articleName: 'Test Article',
      articleType: 0,
      taxRateId: 'tr-1',
    });
    component.form.updateValueAndValidity();
    expect(component.isValid()).toBe(true);
  });

  it('should expose form dirty state as signal', () => {
    expect(component.isDirty()).toBe(false);

    component.form.controls.articleName.markAsDirty();
    component.form.controls.articleName.setValue('Changed');
    expect(component.isDirty()).toBe(true);
  });

  it('should mark all controls as touched on invalid submit', () => {
    component['onSubmit']();
    expect(component.form.controls.articleName.touched).toBe(true);
    expect(component.form.controls.taxRateId.touched).toBe(true);
  });

  it('should show errors only for touched invalid fields', () => {
    expect(component['showErrors']('articleName')).toBe(false);
    component.form.controls.articleName.markAsTouched();
    expect(component['showErrors']('articleName')).toBe(true);
  });
});
