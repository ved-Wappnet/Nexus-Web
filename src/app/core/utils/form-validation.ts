import { AbstractControl, ValidationErrors } from '@angular/forms';

export function controlError(control: AbstractControl | null, label = 'This field'): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) {
    return null;
  }
  return firstErrorMessage(control.errors, label);
}

export function firstErrorMessage(errors: ValidationErrors, label = 'This field'): string {
  if (errors['required']) return `${label} is required.`;
  if (errors['noLeadingSpace']) return `${label} cannot start with a space.`;
  if (errors['noTrailingSpace']) return `${label} cannot end with a space.`;
  if (errors['email'] || errors['strictEmail']) return 'Enter a valid email address.';
  if (errors['passwordMin']) return 'Password must be at least 8 characters.';
  if (errors['passwordMax']) return 'Password must be at most 64 characters.';
  if (errors['passwordNumber']) return 'Password must include at least one number.';
  if (errors['passwordLower']) return 'Password must include at least one lowercase letter.';
  if (errors['passwordUpper']) return 'Password must include at least one uppercase letter.';
  if (errors['passwordSymbol']) return 'Password must include at least one symbol.';
  if (errors['minlength']) {
    const req = errors['minlength'].requiredLength as number;
    return `${label} must be at least ${req} characters.`;
  }
  if (errors['maxlength']) {
    const req = errors['maxlength'].requiredLength as number;
    return `${label} must be at most ${req} characters.`;
  }
  if (errors['pattern']) {
    if (label === 'Verification code') return 'Enter the 6-digit verification code.';
    return `${label} format is invalid.`;
  }
  if (errors['min']) return `${label} is too small.`;
  if (errors['max']) return `${label} is too large.`;
  return `${label} is invalid.`;
}

export function markFormTouched(control: AbstractControl): void {
  control.markAllAsTouched();
  control.updateValueAndValidity({ onlySelf: false, emitEvent: false });
}
