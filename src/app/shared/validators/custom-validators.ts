import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, map, timer } from 'rxjs';

/**
 * Custom synchronous validators for reactive forms.
 *
 * Reference: ADR-10500 – Forms, Validation & CRUD Operations
 */
export class CustomValidators {
  /**
   * Validates that a trimmed string has at least `min` characters.
   * Unlike `Validators.minLength`, this trims whitespace before checking.
   */
  static trimmedMinLength(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim() ?? '';
      if (value.length > 0 && value.length < min) {
        return { trimmedMinLength: { requiredLength: min, actualLength: value.length } };
      }
      return null;
    };
  }

  /**
   * Validates that a trimmed string does not exceed `max` characters.
   */
  static trimmedMaxLength(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim() ?? '';
      if (value.length > max) {
        return { trimmedMaxLength: { requiredLength: max, actualLength: value.length } };
      }
      return null;
    };
  }

  /**
   * Validates that the value is not blank (only whitespace).
   * Complements `Validators.required` which does not trim.
   */
  static notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (typeof value === 'string' && value.length > 0 && value.trim().length === 0) {
      return { notBlank: true };
    }
    return null;
  };

  /**
   * Validates that the value matches a specific pattern with a custom error key.
   */
  static patternWithName(pattern: RegExp, errorKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const valid = pattern.test(control.value as string);
      return valid
        ? null
        : { [errorKey]: { requiredPattern: pattern.toString(), actualValue: control.value } };
    };
  }
}

/**
 * Creates an async validator that checks uniqueness against an existing list.
 *
 * @param existingValuesFn Function that returns the current list of existing values
 * @param debounceMs Debounce time in milliseconds (default: 300)
 * @returns AsyncValidatorFn
 *
 * Reference: ADR-10500 – Async Validators for unique checks
 */
export function uniqueNameValidator(
  existingValuesFn: () => string[],
  debounceMs = 300,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return timer(debounceMs).pipe(
      map(() => {
        const value = (control.value as string)?.trim().toLowerCase() ?? '';
        if (!value) {
          return null;
        }
        const exists = existingValuesFn().some((v) => v.toLowerCase() === value);
        return exists ? { uniqueName: { value: control.value } } : null;
      }),
    );
  };
}
