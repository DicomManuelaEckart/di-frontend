import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { BlueprintCreateEdit } from './blueprint-create-edit';
import { BlueprintService } from '../../services/blueprint.service';

describe('BlueprintCreateEdit', () => {
  let component: BlueprintCreateEdit;
  let fixture: ComponentFixture<BlueprintCreateEdit>;

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [BlueprintCreateEdit],
      providers: [
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        BlueprintService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlueprintCreateEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('should have a valid form when all required fields are filled', async () => {
    component.form.patchValue({
      articleId: 'art-001',
      name: 'Test Article',
      description: 'A test description',
      isActive: true,
    });
    vi.advanceTimersByTime(500);
    await fixture.whenStable();
    expect(component.form.valid).toBe(true);
  });

  it('should require articleId', () => {
    expect(component.form.controls.articleId.errors).toHaveProperty('required');
  });

  it('should require name', () => {
    expect(component.form.controls.name.errors).toHaveProperty('required');
  });

  it('should require description', () => {
    expect(component.form.controls.description.errors).toHaveProperty('required');
  });

  it('should validate name minimum length', () => {
    component.form.controls.name.setValue('A');
    expect(component.form.controls.name.errors).toHaveProperty('trimmedMinLength');
  });

  it('should expose form validity as signal', async () => {
    expect(component.isValid()).toBe(false);

    component.form.patchValue({
      articleId: 'art-001',
      name: 'Test',
      description: 'Description',
    });
    component.form.updateValueAndValidity();
    vi.advanceTimersByTime(500);
    await fixture.whenStable();
    expect(component.isValid()).toBe(true);
  });

  it('should expose form dirty state as signal', () => {
    expect(component.isDirty()).toBe(false);

    component.form.controls.name.markAsDirty();
    component.form.controls.name.setValue('Changed');
    expect(component.isDirty()).toBe(true);
  });

  it('should mark all controls as touched on invalid submit', () => {
    component.form.patchValue({ articleId: '', name: '', description: '' });
    component['onSubmit']();
    expect(component.form.controls.articleId.touched).toBe(true);
    expect(component.form.controls.name.touched).toBe(true);
    expect(component.form.controls.description.touched).toBe(true);
  });

  it('should default isActive to true', () => {
    expect(component.form.controls.isActive.value).toBe(true);
  });

  it('should show errors only for touched invalid fields', () => {
    expect(component['showErrors']('name')).toBe(false);
    component.form.controls.name.markAsTouched();
    expect(component['showErrors']('name')).toBe(true);
  });
});
