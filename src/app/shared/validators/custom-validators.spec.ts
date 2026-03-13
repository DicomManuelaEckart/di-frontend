import { FormControl } from '@angular/forms';
import { firstValueFrom, Observable } from 'rxjs';

import { CustomValidators, uniqueNameValidator } from './custom-validators';

describe('CustomValidators', () => {
  describe('trimmedMinLength', () => {
    const validator = CustomValidators.trimmedMinLength(3);

    it('should return null for value meeting minimum length', () => {
      const control = new FormControl('abc');
      expect(validator(control)).toBeNull();
    });

    it('should return error for trimmed value below minimum length', () => {
      const control = new FormControl('ab');
      expect(validator(control)).toEqual({
        trimmedMinLength: { requiredLength: 3, actualLength: 2 },
      });
    });

    it('should trim whitespace before checking', () => {
      const control = new FormControl('  ab  ');
      expect(validator(control)).toEqual({
        trimmedMinLength: { requiredLength: 3, actualLength: 2 },
      });
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });
  });

  describe('trimmedMaxLength', () => {
    const validator = CustomValidators.trimmedMaxLength(5);

    it('should return null for value within max length', () => {
      const control = new FormControl('abc');
      expect(validator(control)).toBeNull();
    });

    it('should return error for trimmed value exceeding max length', () => {
      const control = new FormControl('abcdef');
      expect(validator(control)).toEqual({
        trimmedMaxLength: { requiredLength: 5, actualLength: 6 },
      });
    });

    it('should return null for value at exact max length', () => {
      const control = new FormControl('abcde');
      expect(validator(control)).toBeNull();
    });
  });

  describe('notBlank', () => {
    it('should return null for non-blank value', () => {
      const control = new FormControl('hello');
      expect(CustomValidators.notBlank(control)).toBeNull();
    });

    it('should return error for whitespace-only value', () => {
      const control = new FormControl('   ');
      expect(CustomValidators.notBlank(control)).toEqual({ notBlank: true });
    });

    it('should return null for empty string', () => {
      const control = new FormControl('');
      expect(CustomValidators.notBlank(control)).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      expect(CustomValidators.notBlank(control)).toBeNull();
    });
  });

  describe('patternWithName', () => {
    const validator = CustomValidators.patternWithName(/^[A-Z]/, 'startsWithUppercase');

    it('should return null for matching value', () => {
      const control = new FormControl('Hello');
      expect(validator(control)).toBeNull();
    });

    it('should return custom error key for non-matching value', () => {
      const control = new FormControl('hello');
      const result = validator(control);
      expect(result).toHaveProperty('startsWithUppercase');
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });
  });
});

describe('uniqueNameValidator', () => {
  it('should return null for a unique name', async () => {
    const existingNames = () => ['Alpha', 'Beta'];
    const validator = uniqueNameValidator(existingNames, 0);
    const control = new FormControl('Gamma');
    const result = await firstValueFrom(validator(control) as Observable<unknown>);
    expect(result).toBeNull();
  });

  it('should return error for a duplicate name', async () => {
    const existingNames = () => ['Alpha', 'Beta'];
    const validator = uniqueNameValidator(existingNames, 0);
    const control = new FormControl('Alpha');
    const result = await firstValueFrom(validator(control) as Observable<unknown>);
    expect(result).toEqual({ uniqueName: { value: 'Alpha' } });
  });

  it('should be case-insensitive', async () => {
    const existingNames = () => ['Alpha'];
    const validator = uniqueNameValidator(existingNames, 0);
    const control = new FormControl('alpha');
    const result = await firstValueFrom(validator(control) as Observable<unknown>);
    expect(result).toEqual({ uniqueName: { value: 'alpha' } });
  });

  it('should return null for empty value', async () => {
    const existingNames = () => ['Alpha'];
    const validator = uniqueNameValidator(existingNames, 0);
    const control = new FormControl('');
    const result = await firstValueFrom(validator(control) as Observable<unknown>);
    expect(result).toBeNull();
  });
});
