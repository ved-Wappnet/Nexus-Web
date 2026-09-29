import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ACCOUNT_TYPE_OPTIONS, AccountTypes, UserRoles } from '@core/constants/user.constant';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { controlError, markFormTouched } from '@core/utils/form-validation';
import {
  noLeadingTrailingSpaces,
  strictEmail,
  strongPassword,
} from '@core/validators/common.validators';

import {
  SUPPORTED_COUNTRIES,
  CountryLocation,
  RegionLocation,
  CityLocation,
  applyPhoneMask,
} from '@core/constants/geo-locations.constant';
import { Select, SelectOption } from '@shared/ui/select/select';

type AuthView = 'signin' | 'signup' | 'forgot' | 'reset';

@Component({
  selector: 'app-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Select],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly AccountTypes = AccountTypes;
  readonly accountTypeOptions = ACCOUNT_TYPE_OPTIONS;

  readonly supportedCountries = SUPPORTED_COUNTRIES;
  readonly selectedCountry = signal<CountryLocation>(SUPPORTED_COUNTRIES[0]);
  readonly availableRegions = computed(() => this.selectedCountry().regions);
  readonly selectedRegion = signal<RegionLocation>(SUPPORTED_COUNTRIES[0].regions[0]);
  readonly availableCities = computed(() => this.selectedRegion()?.cities || []);
  readonly selectedCity = signal<CityLocation>(SUPPORTED_COUNTRIES[0].regions[0].cities[0]);

  readonly vehicleTypeOptions: SelectOption[] = [
    { value: 'CARGO_VAN', label: '🚐 Electric Cargo Van' },
    { value: 'MOTORCYCLE', label: '🏍️ Motorbike / Scooter Express' },
    { value: 'FREIGHT_TRUCK', label: '🚛 Medium Freight Truck' },
    { value: 'BICYCLE', label: '🚲 Eco Bicycle Courier' },
  ];

  readonly phoneCountryOptions = computed<SelectOption[]>(() =>
    this.supportedCountries.map((c) => ({
      value: c.code,
      label: `${c.flag} ${c.code} (${c.dialCode})`,
    })),
  );

  readonly countrySelectOptions = computed<SelectOption[]>(() =>
    this.supportedCountries.map((c) => ({
      value: c.name,
      label: `${c.flag} ${c.name}`,
    })),
  );

  readonly regionSelectOptions = computed<SelectOption[]>(() =>
    this.availableRegions().map((r) => ({
      value: r.name,
      label: r.name,
    })),
  );

  readonly citySelectOptions = computed<SelectOption[]>(() =>
    this.availableCities().map((c) => ({
      value: c.name,
      label: c.name,
    })),
  );

  readonly phoneCountry = signal<CountryLocation>(SUPPORTED_COUNTRIES[0]);
  readonly currentMobileDigits = signal<string>('');
  readonly isMobileValid = computed(() => {
    return this.currentMobileDigits().length === this.phoneCountry().phoneDigitCount;
  });
  readonly mobileDigitsCount = computed(() => this.currentMobileDigits().length);

  readonly currentPostalCodes = signal<string>(
    SUPPORTED_COUNTRIES[0].regions[0].cities[0].postalCodes,
  );
  readonly postalCodeChips = computed(() =>
    this.currentPostalCodes()
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0),
  );

  readonly view = signal<AuthView>('signin');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showSignInPassword = signal(false);
  readonly showSignUpPassword = signal(false);
  readonly showResetPassword = signal(false);
  readonly resetEmail = signal('');

  readonly signInForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, noLeadingTrailingSpaces(), strictEmail(), Validators.maxLength(255)]],
    password: ['', [Validators.required, noLeadingTrailingSpaces(), Validators.maxLength(64)]],
  });

  readonly signUpForm = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, noLeadingTrailingSpaces(), Validators.minLength(2), Validators.maxLength(100)],
    ],
    email: ['', [Validators.required, noLeadingTrailingSpaces(), strictEmail(), Validators.maxLength(255)]],
    password: ['', [Validators.required, noLeadingTrailingSpaces(), strongPassword()]],
    accountType: this.fb.nonNullable.control<AccountTypes>(AccountTypes.CUSTOMER, {
      validators: [Validators.required],
    }),
    countryCode: [SUPPORTED_COUNTRIES[0].code],
    phoneDialCode: [SUPPORTED_COUNTRIES[0].dialCode],
    mobileNumber: [
      '',
      [
        (control: AbstractControl) => {
          if (!control.value || !control.value.trim()) {
            return this.signUpForm?.controls.accountType.value === AccountTypes.DELIVERY_PARTNER
              ? { required: true }
              : null;
          }
          const digits = control.value.replace(/\D/g, '');
          const country = this.phoneCountry();
          if (digits.length !== country.phoneDigitCount) {
            return {
              phoneLength: {
                required: country.phoneDigitCount,
                actual: digits.length,
                country: country.name,
                placeholder: country.phonePlaceholder,
              },
            };
          }
          return null;
        },
      ],
    ],
    vehicleType: ['CARGO_VAN'],
    vehiclePlateNumber: [''],
    country: [SUPPORTED_COUNTRIES[0].name],
    regionState: [SUPPORTED_COUNTRIES[0].regions[0].name],
    city: [SUPPORTED_COUNTRIES[0].regions[0].cities[0].name],
    servicePostalCodes: [SUPPORTED_COUNTRIES[0].regions[0].cities[0].postalCodes],
  });

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, noLeadingTrailingSpaces(), strictEmail(), Validators.maxLength(255)]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, noLeadingTrailingSpaces(), strongPassword()]],
  });

  phoneErrorMessage(): string | null {
    const ctrl = this.signUpForm.controls.mobileNumber;
    if (!ctrl.touched && !ctrl.dirty) return null;
    if (ctrl.errors?.['required']) {
      return 'Mobile phone number is required for Delivery Partner registration.';
    }
    if (ctrl.errors?.['phoneLength']) {
      const err = ctrl.errors['phoneLength'];
      return `${err.country} mobile numbers require ${err.required} digits (currently ${err.actual}). Format: ${err.placeholder}`;
    }
    return null;
  }

  fieldError(control: AbstractControl | null, label: string): string | null {
    return controlError(control, label);
  }

  isInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  setView(view: AuthView) {
    this.view.set(view);
    this.error.set(null);
    this.showSignInPassword.set(false);
    this.showSignUpPassword.set(false);
    this.showResetPassword.set(false);
    this.signInForm.markAsUntouched();
    this.signUpForm.markAsUntouched();
    this.forgotForm.markAsUntouched();
    this.resetForm.markAsUntouched();
  }

  toggleSignInPassword() {
    this.showSignInPassword.update((v) => !v);
  }

  toggleSignUpPassword() {
    this.showSignUpPassword.update((v) => !v);
  }

  toggleResetPassword() {
    this.showResetPassword.update((v) => !v);
  }

  selectAccountType(type: AccountTypes) {
    this.signUpForm.controls.accountType.setValue(type);
  }

  openForgot() {
    this.forgotForm.reset({ email: this.signInForm.controls.email.value });
    this.setView('forgot');
  }

  submitSignIn() {
    markFormTouched(this.signInForm);
    if (this.signInForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.signInForm.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (session) => {
        this.loading.set(false);
        this.toast.success('Signed in successfully');
        const targetUrl = session.user.role === UserRoles.DELIVERY_PARTNER ? '/delivery-partner' : '/dashboard';
        void this.router.navigateByUrl(targetUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Unable to sign in');
      },
    });
  }

  onCountryChange(countryVal: string) {
    const country =
      this.supportedCountries.find((c) => c.name === countryVal || c.code === countryVal) ??
      this.supportedCountries[0];
    this.selectedCountry.set(country);
    this.phoneCountry.set(country);

    const firstRegion = country.regions[0] ?? { name: '', cities: [] };
    this.selectedRegion.set(firstRegion);

    const firstCity = firstRegion.cities[0] ?? { name: '', postalCodes: '' };
    this.selectedCity.set(firstCity);

    // Re-mask any existing digits with the new country's mask
    const currentDigits = this.signUpForm.controls.mobileNumber.value.replace(/\D/g, '').slice(0, country.phoneDigitCount);
    const remasked = applyPhoneMask(currentDigits, country.phoneMask);
    this.currentMobileDigits.set(currentDigits);

    this.signUpForm.patchValue({
      country: country.name,
      countryCode: country.code,
      phoneDialCode: country.dialCode,
      mobileNumber: remasked,
      regionState: firstRegion.name,
      city: firstCity.name,
      servicePostalCodes: firstCity.postalCodes,
    });
    this.currentPostalCodes.set(firstCity.postalCodes);
    this.signUpForm.controls.mobileNumber.updateValueAndValidity();
  }

  onRegionChange(regionName: string) {
    const currentCountry = this.selectedCountry();
    const region = currentCountry.regions.find((r) => r.name === regionName) ?? currentCountry.regions[0];
    if (region) {
      this.selectedRegion.set(region);
      const firstCity = region.cities[0] ?? { name: '', postalCodes: '' };
      this.selectedCity.set(firstCity);

      this.signUpForm.patchValue({
        regionState: region.name,
        city: firstCity.name,
        servicePostalCodes: firstCity.postalCodes,
      });
      this.currentPostalCodes.set(firstCity.postalCodes);
    }
  }

  onCityChange(cityName: string) {
    const currentRegion = this.selectedRegion();
    const city = currentRegion?.cities.find((c) => c.name === cityName) ?? currentRegion?.cities[0];
    if (city) {
      this.selectedCity.set(city);
      this.signUpForm.patchValue({
        city: city.name,
        servicePostalCodes: city.postalCodes,
      });
      this.currentPostalCodes.set(city.postalCodes);
    }
  }

  onPostalCodeInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.currentPostalCodes.set(val);
  }

  onPhoneCountryChange(countryCode: string) {
    const country = this.supportedCountries.find((c) => c.code === countryCode);
    if (country) {
      this.phoneCountry.set(country);
      const currentDigits = this.signUpForm.controls.mobileNumber.value.replace(/\D/g, '').slice(0, country.phoneDigitCount);
      const remasked = applyPhoneMask(currentDigits, country.phoneMask);
      this.currentMobileDigits.set(currentDigits);

      this.signUpForm.patchValue({
        countryCode: country.code,
        phoneDialCode: country.dialCode,
        mobileNumber: remasked,
      });
      this.signUpForm.controls.mobileNumber.updateValueAndValidity();
    }
  }

  onMobileNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const inputEvent = event as InputEvent;
    let digits = input.value.replace(/\D/g, '');
    const country = this.phoneCountry();

    if (inputEvent.inputType === 'deleteContentBackward') {
      const prevValue = this.signUpForm.controls.mobileNumber.value;
      const prevDigits = prevValue.replace(/\D/g, '');
      if (digits === prevDigits && digits.length > 0) {
        digits = digits.slice(0, -1);
      }
    }

    digits = digits.slice(0, country.phoneDigitCount);
    const masked = applyPhoneMask(digits, country.phoneMask);

    this.signUpForm.controls.mobileNumber.setValue(masked);
    this.currentMobileDigits.set(digits);
    input.value = masked;
    this.signUpForm.controls.mobileNumber.markAsDirty();
  }

  submitSignUp() {
    markFormTouched(this.signUpForm);
    if (this.signUpForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    const {
      name,
      email,
      password,
      accountType,
      phoneDialCode,
      mobileNumber,
      vehicleType,
      vehiclePlateNumber,
      country,
      regionState,
      city,
      servicePostalCodes,
    } = this.signUpForm.getRawValue();

    if (accountType === AccountTypes.DELIVERY_PARTNER) {
      const digits = mobileNumber.replace(/\D/g, '');
      const reqDigits = this.phoneCountry().phoneDigitCount;
      if (digits.length !== reqDigits) {
        this.loading.set(false);
        this.error.set(
          `Please provide a valid ${reqDigits}-digit phone number for ${this.phoneCountry().name}. Format: ${this.phoneCountry().phonePlaceholder}`,
        );
        this.signUpForm.controls.mobileNumber.markAsTouched();
        return;
      }
    }

    const formattedPhone = mobileNumber.trim()
      ? `${phoneDialCode} ${mobileNumber.trim()}`
      : `${phoneDialCode} 555-0199`;

    const extra =
      accountType === AccountTypes.DELIVERY_PARTNER
        ? {
            phone: formattedPhone,
            vehicleType,
            vehiclePlateNumber,
            country,
            regionState,
            city,
            servicePostalCodes,
          }
        : undefined;

    this.auth.register(email, password, accountType, name, extra).subscribe({
      next: () => {
        this.loading.set(false);
        if (accountType === AccountTypes.DELIVERY_PARTNER) {
          this.toast.success('Delivery Partner account created! Please submit KYC documents for verification.');
          void this.router.navigateByUrl('/delivery-partner');
        } else {
          this.toast.success('Welcome to Nexus Market');
          void this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Unable to create account');
      },
    });
  }

  submitForgot() {
    markFormTouched(this.forgotForm);
    if (this.forgotForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    const email = this.forgotForm.controls.email.value;
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.resetEmail.set(email);
        this.resetForm.reset({ otp: '', password: '' });
        this.toast.success(res.message);
        this.setView('reset');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Unable to send verification code');
      },
    });
  }

  resendOtp() {
    const email = this.resetEmail();
    if (!email) {
      this.setView('forgot');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Unable to resend verification code');
      },
    });
  }

  submitReset() {
    markFormTouched(this.resetForm);
    if (this.resetForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    const { otp, password } = this.resetForm.getRawValue();
    this.auth.resetPassword(this.resetEmail(), otp, password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(res.message);
        this.signInForm.reset({ email: this.resetEmail(), password: '' });
        this.setView('signin');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Unable to reset password');
      },
    });
  }
}
