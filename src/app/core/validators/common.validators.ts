import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Reject values that start with whitespace. */
export function noLeadingSpace(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') return null;
    return /^(?!\s)/.test(String(value)) ? null : { noLeadingSpace: true };
  };
}

/** Reject values that end with whitespace. */
export function noTrailingSpace(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') return null;
    return /(?<!\s)$/.test(String(value)) ? null : { noTrailingSpace: true };
  };
}

/** No leading or trailing spaces (YupStringNoLeadingTrailingSpaces equivalent). */
export function noLeadingTrailingSpaces(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const leading = noLeadingSpace()(control);
    if (leading) return leading;
    return noTrailingSpace()(control);
  };
}

/** Strict email format matching the React YupEmail rule. */
export function strictEmail(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') return null;
    const email = String(value);
    return EMAIL_PATTERN.test(email) ? null : { strictEmail: true };
  };
}

/** Strong password: 8–64 chars, upper, lower, number, symbol (YupPassword equivalent). */
export function strongPassword(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') return null;
    const password = String(value);
    const errors: ValidationErrors = {};

    if (password.length < 8) errors['passwordMin'] = { requiredLength: 8 };
    if (password.length > 64) errors['passwordMax'] = { requiredLength: 64 };
    if (!/[0-9]/.test(password)) errors['passwordNumber'] = true;
    if (!/[a-z]/.test(password)) errors['passwordLower'] = true;
    if (!/[A-Z]/.test(password)) errors['passwordUpper'] = true;
    if (!/[\W_]/.test(password)) errors['passwordSymbol'] = true;

    return Object.keys(errors).length ? errors : null;
  };
}
