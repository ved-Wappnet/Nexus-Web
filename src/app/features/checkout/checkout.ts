import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderStatuses, OrderView } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { OrderService } from '@core/services/catalog.service';
import { PaymentService } from '@core/services/payment.service';
import { ToastService } from '@core/services/toast.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import { Select, SelectOption } from '@shared/ui/select/select';
import {
  SUPPORTED_COUNTRIES,
  CountryLocation,
  RegionLocation,
  CityLocation,
  applyPhoneMask,
} from '@core/constants/geo-locations.constant';
import { AddressMapPickerModalComponent, PickedLocation } from '@shared/ui/address-map-picker/address-map-picker-modal';
import {
  LucideAlertCircle,
  LucideArrowLeft,
  LucideBuilding,
  LucideCheck,
  LucideCheckCircle2,
  LucideCreditCard,
  LucideCrosshair,
  LucideExternalLink,
  LucideLock,
  LucideMapPin,
  LucidePackage,
  LucidePhone,
  LucideReceipt,
  LucideShield,
  LucideShieldCheck,
  LucideSparkles,
  LucideTruck,
  LucideUser,
} from '@lucide/angular';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NexusCurrencyPipe,
    Select,
    AddressMapPickerModalComponent,
    LucideShield,
    LucideShieldCheck,
    LucideCreditCard,
    LucideLock,
    LucideCheckCircle2,
    LucideSparkles,
    LucideArrowLeft,
    LucidePackage,
    LucideAlertCircle,
    LucideExternalLink,
    LucideMapPin,
    LucideUser,
    LucidePhone,
    LucideBuilding,
    LucideReceipt,
    LucideTruck,
    LucideCheck,
  ],
  templateUrl: './checkout.html',
})
export class CheckoutPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly supportedCountries = SUPPORTED_COUNTRIES;
  readonly selectedCountry = signal<CountryLocation>(SUPPORTED_COUNTRIES[0]);
  readonly availableRegions = computed(() => this.selectedCountry().regions);
  readonly selectedRegion = signal<RegionLocation>(SUPPORTED_COUNTRIES[0].regions[0]);
  readonly availableCities = computed(() => this.selectedRegion()?.cities || []);
  readonly selectedCity = signal<CityLocation>(SUPPORTED_COUNTRIES[0].regions[0].cities[0]);

  readonly phoneCountry = signal<CountryLocation>(SUPPORTED_COUNTRIES[0]);
  readonly currentMobileDigits = signal<string>('5552345678');
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

  readonly orderId = signal<string>('');
  readonly order = signal<OrderView | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly isProcessing = signal(false);
  readonly isPaid = signal(false);
  readonly isRedirectingStripe = signal(false);
  readonly paymentPlan = signal<'ESCROW' | 'FULL'>('ESCROW');

  // Map Location Picker Signals
  readonly showMapPicker = signal(false);
  readonly destinationLatitude = signal<number | null>(null);
  readonly destinationLongitude = signal<number | null>(null);

  // Shipping & Destination Details Form with Country Code & Phone Mask
  readonly shippingForm = this.fb.group({
    recipientName: this.fb.nonNullable.control('Global Enterprise Procurement', [Validators.required]),
    countryCode: this.fb.nonNullable.control(SUPPORTED_COUNTRIES[0].code),
    phoneDialCode: this.fb.nonNullable.control(SUPPORTED_COUNTRIES[0].dialCode),
    mobileNumber: this.fb.nonNullable.control('(555) 234-5678', [Validators.required]),
    destinationCountry: this.fb.nonNullable.control(SUPPORTED_COUNTRIES[0].name, [Validators.required]),
    destinationRegion: this.fb.nonNullable.control(SUPPORTED_COUNTRIES[0].regions[0].name, [Validators.required]),
    destinationCity: this.fb.nonNullable.control(SUPPORTED_COUNTRIES[0].regions[0].cities[0].name, [Validators.required]),
    destinationPostalCode: this.fb.nonNullable.control('94102', [Validators.required]),
    destinationAddress: this.fb.nonNullable.control('100 Nexus Distribution Way, Suite 400', [Validators.required]),
    destinationLatitude: this.fb.control<number | null>(null),
    destinationLongitude: this.fb.control<number | null>(null),
  });

  // Billing Details Form
  readonly billingSameAsShipping = signal(true);

  readonly billingForm = this.fb.group({
    billingName: this.fb.nonNullable.control('Global Enterprise Procurement'),
    billingTaxId: this.fb.nonNullable.control('US-EIN-948291038'),
    billingAddress: this.fb.nonNullable.control('100 Nexus Distribution Way, Suite 400'),
    billingCity: this.fb.nonNullable.control('San Francisco'),
    billingRegion: this.fb.nonNullable.control('California'),
    billingPostalCode: this.fb.nonNullable.control('94102'),
    billingCountry: this.fb.nonNullable.control('United States'),
  });

  // Card Details Form
  readonly cardForm = this.fb.group({
    cardholderName: this.fb.nonNullable.control('Global Enterprise Procurement', Validators.required),
    cardNumber: this.fb.nonNullable.control('4242 4242 4242 4242', [Validators.required, Validators.minLength(16)]),
    expiry: this.fb.nonNullable.control('12/28', Validators.required),
    cvc: this.fb.nonNullable.control('123', [Validators.required, Validators.minLength(3)]),
    zipCode: this.fb.nonNullable.control('94102', Validators.required),
  });

  readonly totalAmount = computed(() => Number(this.order()?.totalAmount || 0));
  readonly isWholesaleEligible = computed(() => this.totalAmount() >= 5000);
  readonly upfrontAmount = computed(() => Math.round(this.totalAmount() * 0.30 * 100) / 100);
  readonly inTransitAmount = computed(() => Math.round(this.totalAmount() * 0.40 * 100) / 100);
  readonly deliveryAmount = computed(
    () => Math.round((this.totalAmount() - this.upfrontAmount() - this.inTransitAmount()) * 100) / 100,
  );
  readonly chargeAmount = computed(() =>
    this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW'
      ? this.upfrontAmount()
      : this.totalAmount(),
  );
  readonly heldAmount = computed(() =>
    this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW'
      ? Math.round((this.totalAmount() - this.upfrontAmount()) * 100) / 100
      : 0,
  );

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('orderId');
      if (id) {
        this.orderId.set(id);
        this.loadOrder(id);
      } else {
        this.route.queryParamMap.subscribe((qp) => {
          const qId = qp.get('orderId');
          if (qId) {
            this.orderId.set(qId);
            this.loadOrder(qId);
          } else {
            this.isLoading.set(false);
            this.loadError.set('No order ID provided for checkout.');
          }
        });
      }
    });
  }

  loadOrder(id: string) {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.orderService.getOne(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);

        // Pre-fill location hierarchy if order has destination
        if (order.destinationCountry) {
          const c = this.supportedCountries.find((item) => item.name === order.destinationCountry || item.code === order.destinationCountry) || SUPPORTED_COUNTRIES[0];
          this.selectedCountry.set(c);
          this.phoneCountry.set(c);

          const r = c.regions.find((reg) => reg.name === order.destinationRegion) || c.regions[0];
          this.selectedRegion.set(r);

          const ct = r.cities.find((city) => city.name === order.destinationCity) || r.cities[0];
          this.selectedCity.set(ct);
          this.currentPostalCodes.set(ct.postalCodes);
        }

        // Parse phone if formatted
        let phoneDigits = '5552345678';
        if (order.recipientPhone) {
          const digits = order.recipientPhone.replace(/\D/g, '');
          if (digits.length >= 7) {
            phoneDigits = digits.slice(-this.phoneCountry().phoneDigitCount);
          }
        }
        this.currentMobileDigits.set(phoneDigits);
        const remasked = applyPhoneMask(phoneDigits, this.phoneCountry().phoneMask);

        if (order.destinationLatitude !== undefined && order.destinationLatitude !== null) {
          this.destinationLatitude.set(Number(order.destinationLatitude));
        }
        if (order.destinationLongitude !== undefined && order.destinationLongitude !== null) {
          this.destinationLongitude.set(Number(order.destinationLongitude));
        }

        this.shippingForm.patchValue({
          recipientName: order.recipientName || this.auth.currentUser()?.name || 'Global Enterprise Procurement',
          countryCode: this.phoneCountry().code,
          phoneDialCode: this.phoneCountry().dialCode,
          mobileNumber: remasked,
          destinationCountry: this.selectedCountry().name,
          destinationRegion: this.selectedRegion().name,
          destinationCity: this.selectedCity().name,
          destinationPostalCode: order.destinationPostalCode || this.postalCodeChips()[0] || '94102',
          destinationAddress: order.destinationAddress || '100 Nexus Distribution Way, Suite 400',
          destinationLatitude: this.destinationLatitude(),
          destinationLongitude: this.destinationLongitude(),
        });

        if (order.billingSameAsShipping !== undefined) {
          this.billingSameAsShipping.set(order.billingSameAsShipping);
        }

        if (order.billingName) {
          this.billingForm.patchValue({
            billingName: order.billingName,
            billingTaxId: order.billingTaxId || '',
            billingAddress: order.billingAddress || '',
            billingCity: order.billingCity || '',
            billingRegion: order.billingRegion || '',
            billingPostalCode: order.billingPostalCode || '',
            billingCountry: order.billingCountry || 'United States',
          });
        }

        // If order is already paid, redirect or notify
        if (order.status !== OrderStatuses.PENDING) {
          this.isPaid.set(true);
        }

        // Set default plan
        if (Number(order.totalAmount) >= 5000) {
          this.paymentPlan.set('ESCROW');
        } else {
          this.paymentPlan.set('FULL');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Order not found or access denied.';
        this.loadError.set(msg);
      },
    });
  }

  onPhoneCountryChange(countryCode: string) {
    const country = this.supportedCountries.find((c) => c.code === countryCode);
    if (country) {
      this.phoneCountry.set(country);
      const currentDigits = this.shippingForm.controls.mobileNumber.value.replace(/\D/g, '').slice(0, country.phoneDigitCount);
      const remasked = applyPhoneMask(currentDigits, country.phoneMask);
      this.currentMobileDigits.set(currentDigits);

      this.shippingForm.patchValue({
        countryCode: country.code,
        phoneDialCode: country.dialCode,
        mobileNumber: remasked,
      });
      this.shippingForm.controls.mobileNumber.updateValueAndValidity();
    }
  }

  onMobileNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const inputEvent = event as InputEvent;
    let digits = input.value.replace(/\D/g, '');
    const country = this.phoneCountry();

    if (inputEvent.inputType === 'deleteContentBackward') {
      const prevValue = this.shippingForm.controls.mobileNumber.value;
      const prevDigits = prevValue.replace(/\D/g, '');
      if (digits === prevDigits && digits.length > 0) {
        digits = digits.slice(0, -1);
      }
    }

    digits = digits.slice(0, country.phoneDigitCount);
    const masked = applyPhoneMask(digits, country.phoneMask);

    this.shippingForm.controls.mobileNumber.setValue(masked);
    this.currentMobileDigits.set(digits);
    input.value = masked;
    this.shippingForm.controls.mobileNumber.markAsDirty();
  }

  onCountryChange(countryName: string) {
    const country = this.supportedCountries.find((c) => c.name === countryName || c.code === countryName) ?? this.supportedCountries[0];
    this.selectedCountry.set(country);
    this.phoneCountry.set(country);

    const firstRegion = country.regions[0] ?? { name: '', cities: [] };
    this.selectedRegion.set(firstRegion);

    const firstCity = firstRegion.cities[0] ?? { name: '', postalCodes: '' };
    this.selectedCity.set(firstCity);

    const digits = this.shippingForm.controls.mobileNumber.value.replace(/\D/g, '').slice(0, country.phoneDigitCount);
    const maskedPhone = applyPhoneMask(digits, country.phoneMask);
    this.currentMobileDigits.set(digits);

    const firstPostal = firstCity.postalCodes.split(',')[0]?.trim() || '';

    this.shippingForm.patchValue({
      destinationCountry: country.name,
      countryCode: country.code,
      phoneDialCode: country.dialCode,
      mobileNumber: maskedPhone,
      destinationRegion: firstRegion.name,
      destinationCity: firstCity.name,
      destinationPostalCode: firstPostal,
    });
    this.currentPostalCodes.set(firstCity.postalCodes);
    this.shippingForm.controls.mobileNumber.updateValueAndValidity();
  }

  onRegionChange(regionName: string) {
    const country = this.selectedCountry();
    const region = country.regions.find((r) => r.name === regionName) ?? country.regions[0];
    if (region) {
      this.selectedRegion.set(region);
      const firstCity = region.cities[0] ?? { name: '', postalCodes: '' };
      this.selectedCity.set(firstCity);
      const firstPostal = firstCity.postalCodes.split(',')[0]?.trim() || '';

      this.shippingForm.patchValue({
        destinationRegion: region.name,
        destinationCity: firstCity.name,
        destinationPostalCode: firstPostal,
      });
      this.currentPostalCodes.set(firstCity.postalCodes);
    }
  }

  onCityChange(cityName: string) {
    const region = this.selectedRegion();
    const city = region?.cities.find((c) => c.name === cityName) ?? region?.cities[0];
    if (city) {
      this.selectedCity.set(city);
      const firstPostal = city.postalCodes.split(',')[0]?.trim() || '';
      this.shippingForm.patchValue({
        destinationCity: city.name,
        destinationPostalCode: firstPostal,
      });
      this.currentPostalCodes.set(city.postalCodes);
    }
  }

  selectPostalCodeChip(code: string) {
    this.shippingForm.patchValue({ destinationPostalCode: code });
  }

  openMapPicker() {
    this.showMapPicker.set(true);
  }

  onMapLocationPicked(loc: PickedLocation) {
    this.destinationLatitude.set(loc.latitude);
    this.destinationLongitude.set(loc.longitude);
    this.shippingForm.patchValue({
      destinationAddress: loc.street || loc.formattedAddress,
      destinationLatitude: loc.latitude,
      destinationLongitude: loc.longitude,
    });

    // Find matching country
    const matchedCountry = this.supportedCountries.find(
      (c) =>
        c.name.toLowerCase() === loc.country.toLowerCase() ||
        loc.country.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(loc.country.toLowerCase()),
    );

    if (matchedCountry) {
      this.selectedCountry.set(matchedCountry);
      this.phoneCountry.set(matchedCountry);
      this.shippingForm.controls.destinationCountry.setValue(matchedCountry.name);
      this.shippingForm.controls.countryCode.setValue(matchedCountry.code);
      this.shippingForm.controls.phoneDialCode.setValue(matchedCountry.dialCode);

      // Find matching region
      const matchedRegion = matchedCountry.regions.find(
        (r) =>
          r.name.toLowerCase() === loc.state.toLowerCase() ||
          loc.state.toLowerCase().includes(r.name.toLowerCase()) ||
          r.name.toLowerCase().includes(loc.state.toLowerCase()),
      );

      if (matchedRegion) {
        this.selectedRegion.set(matchedRegion);
        this.shippingForm.controls.destinationRegion.setValue(matchedRegion.name);

        // Find matching city
        const matchedCity = matchedRegion.cities.find(
          (ct) =>
            ct.name.toLowerCase() === loc.city.toLowerCase() ||
            loc.city.toLowerCase().includes(ct.name.toLowerCase()) ||
            ct.name.toLowerCase().includes(loc.city.toLowerCase()),
        );

        if (matchedCity) {
          this.selectedCity.set(matchedCity);
          this.shippingForm.controls.destinationCity.setValue(matchedCity.name);
          if (loc.postalCode) {
            this.shippingForm.controls.destinationPostalCode.setValue(loc.postalCode);
          } else {
            const pCode = matchedCity.postalCodes.split(',')[0].trim();
            this.shippingForm.controls.destinationPostalCode.setValue(pCode);
          }
        } else {
          this.shippingForm.controls.destinationCity.setValue(loc.city);
          if (loc.postalCode) {
            this.shippingForm.controls.destinationPostalCode.setValue(loc.postalCode);
          }
        }
      } else {
        this.shippingForm.controls.destinationRegion.setValue(loc.state);
        this.shippingForm.controls.destinationCity.setValue(loc.city);
        if (loc.postalCode) {
          this.shippingForm.controls.destinationPostalCode.setValue(loc.postalCode);
        }
      }
    } else {
      this.shippingForm.controls.destinationCountry.setValue(loc.country);
      this.shippingForm.controls.destinationRegion.setValue(loc.state);
      this.shippingForm.controls.destinationCity.setValue(loc.city);
      if (loc.postalCode) {
        this.shippingForm.controls.destinationPostalCode.setValue(loc.postalCode);
      }
    }

    this.showMapPicker.set(false);
    this.toast.success(`📍 Map Location Verified: ${loc.latitude.toFixed(4)}°, ${loc.longitude.toFixed(4)}°`);
  }

  fillShippingPreset(preset: 'SF' | 'NY' | 'AHM') {
    if (preset === 'SF') {
      const us = this.supportedCountries.find((c) => c.code === 'US') || SUPPORTED_COUNTRIES[0];
      const ca = us.regions.find((r) => r.name === 'California') || us.regions[0];
      const sf = ca.cities.find((c) => c.name === 'San Francisco') || ca.cities[0];

      this.selectedCountry.set(us);
      this.phoneCountry.set(us);
      this.selectedRegion.set(ca);
      this.selectedCity.set(sf);
      this.currentPostalCodes.set(sf.postalCodes);
      this.currentMobileDigits.set('4158901200');
      this.destinationLatitude.set(37.7749);
      this.destinationLongitude.set(-122.4194);

      this.shippingForm.patchValue({
        recipientName: this.auth.currentUser()?.name || 'Nexus SF Logistics Center',
        countryCode: 'US',
        phoneDialCode: '+1',
        mobileNumber: '(415) 890-1200',
        destinationAddress: '500 Howard Street, Suite 1200',
        destinationCity: 'San Francisco',
        destinationRegion: 'California',
        destinationPostalCode: '94105',
        destinationCountry: 'United States',
        destinationLatitude: 37.7749,
        destinationLongitude: -122.4194,
      });
      this.toast.info('Applied San Francisco, CA shipping destination');
    } else if (preset === 'NY') {
      const us = this.supportedCountries.find((c) => c.code === 'US') || SUPPORTED_COUNTRIES[0];
      const ny = us.regions.find((r) => r.name === 'New York') || us.regions[0];
      const nyc = ny.cities.find((c) => c.name === 'New York City') || ny.cities[0];

      this.selectedCountry.set(us);
      this.phoneCountry.set(us);
      this.selectedRegion.set(ny);
      this.selectedCity.set(nyc);
      this.currentPostalCodes.set(nyc.postalCodes);
      this.currentMobileDigits.set('2125550199');
      this.destinationLatitude.set(40.7128);
      this.destinationLongitude.set(-74.006);

      this.shippingForm.patchValue({
        recipientName: this.auth.currentUser()?.name || 'Empire Procurement Hub',
        countryCode: 'US',
        phoneDialCode: '+1',
        mobileNumber: '(212) 555-0199',
        destinationAddress: '350 5th Avenue, Dock 7',
        destinationCity: 'New York City',
        destinationRegion: 'New York',
        destinationPostalCode: '10001',
        destinationCountry: 'United States',
        destinationLatitude: 40.7128,
        destinationLongitude: -74.006,
      });
      this.toast.info('Applied New York, NY shipping destination');
    } else if (preset === 'AHM') {
      const ind = this.supportedCountries.find((c) => c.code === 'IN') || SUPPORTED_COUNTRIES[1];
      const gj = ind.regions.find((r) => r.name === 'Gujarat') || ind.regions[0];
      const ahm = gj.cities.find((c) => c.name === 'Ahmedabad') || gj.cities[0];

      this.selectedCountry.set(ind);
      this.phoneCountry.set(ind);
      this.selectedRegion.set(gj);
      this.selectedCity.set(ahm);
      this.currentPostalCodes.set(ahm.postalCodes);
      this.currentMobileDigits.set('9876543210');
      this.destinationLatitude.set(23.0225);
      this.destinationLongitude.set(72.5714);

      this.shippingForm.patchValue({
        recipientName: this.auth.currentUser()?.name || 'Aarav Patel',
        countryCode: 'IN',
        phoneDialCode: '+91',
        mobileNumber: '98765 43210',
        destinationAddress: 'Block C, SG Highway Tech Park',
        destinationCity: 'Ahmedabad',
        destinationRegion: 'Gujarat',
        destinationPostalCode: '380015',
        destinationCountry: 'India',
        destinationLatitude: 23.0225,
        destinationLongitude: 72.5714,
      });
      this.toast.info('Applied Ahmedabad, Gujarat shipping destination');
    }
  }

  fillTestCard() {
    this.cardForm.patchValue({
      cardholderName: this.shippingForm.value.recipientName || 'Enterprise Test Buyer',
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/28',
      cvc: '424',
      zipCode: this.shippingForm.value.destinationPostalCode || '94105',
    });
    this.toast.info('Autofilled Stripe Test Card (4242 4242...)');
  }

  private getAddressPayload() {
    const s = this.shippingForm.getRawValue();
    const same = this.billingSameAsShipping();
    const b = this.billingForm.getRawValue();

    const formattedPhone = s.mobileNumber.trim()
      ? `${s.phoneDialCode} ${s.mobileNumber.trim()}`
      : `${s.phoneDialCode} 555-0199`;

    return {
      recipientName: s.recipientName,
      recipientPhone: formattedPhone,
      destinationAddress: s.destinationAddress,
      destinationCity: s.destinationCity,
      destinationRegion: s.destinationRegion,
      destinationPostalCode: s.destinationPostalCode,
      destinationCountry: s.destinationCountry,
      destinationLatitude: this.destinationLatitude(),
      destinationLongitude: this.destinationLongitude(),
      billingSameAsShipping: same,
      billingName: same ? s.recipientName : (b.billingName || s.recipientName),
      billingTaxId: b.billingTaxId || null,
      billingAddress: same ? s.destinationAddress : (b.billingAddress || s.destinationAddress),
      billingCity: same ? s.destinationCity : (b.billingCity || s.destinationCity),
      billingRegion: same ? s.destinationRegion : (b.billingRegion || s.destinationRegion),
      billingPostalCode: same ? s.destinationPostalCode : (b.billingPostalCode || s.destinationPostalCode),
      billingCountry: same ? s.destinationCountry : (b.billingCountry || s.destinationCountry),
    };
  }

  authorizePayment() {
    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      this.toast.error('Please complete the Shipping & Destination address fields.');
      return;
    }

    if (!this.isMobileValid()) {
      this.shippingForm.controls.mobileNumber.markAsTouched();
      this.toast.error(`Please enter a valid ${this.phoneCountry().phoneDigitCount}-digit phone number.`);
      return;
    }

    if (!this.billingSameAsShipping() && this.billingForm.invalid) {
      this.billingForm.markAllAsTouched();
      this.toast.error('Please complete the Billing address fields.');
      return;
    }

    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      this.toast.error('Please enter valid payment details.');
      return;
    }

    const oId = this.orderId();
    if (!oId) return;

    this.isProcessing.set(true);
    const addressPayload = this.getAddressPayload();

    // 1. First persist shipping & billing address to order
    this.orderService.updateAddress(oId, addressPayload).subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.executeCardPayment(oId);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.toast.error(err?.error?.message || 'Failed to save delivery destination address.');
      },
    });
  }

  private executeCardPayment(oId: string) {
    const amountToCharge = this.chargeAmount();
    const isEscrow = this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW';

    this.paymentService
      .createPaymentIntent({
        orderId: oId,
        amount: amountToCharge,
      })
      .subscribe({
        next: (intentRes) => {
          this.paymentService
            .confirmPayment({
              orderId: oId,
              paymentIntentId: intentRes.intentId,
              paymentMethod: 'pm_card_visa',
              paymentMode: isEscrow ? 'MILESTONE_ESCROW' : 'FULL_UPFRONT',
            })
            .subscribe({
              next: (res) => {
                this.isProcessing.set(false);
                this.isPaid.set(true);

                if (isEscrow) {
                  this.toast.success(
                    `30% Upfront Deposit ($${amountToCharge.toFixed(2)}) authorized! 70% secured in Escrow Vault.`,
                  );
                } else {
                  this.toast.success(res.message || 'Payment authorized successfully via Stripe!');
                }

                setTimeout(() => {
                  void this.router.navigate(['/orders'], { queryParams: { trackOrderId: oId } });
                }, 2000);
              },
              error: (err) => {
                this.isProcessing.set(false);
                const msg = err?.error?.message || 'Payment authorization failed.';
                this.toast.error(msg);
              },
            });
        },
        error: (err) => {
          this.isProcessing.set(false);
          const msg = err?.error?.message || 'Unable to initialize payment intent.';
          this.toast.error(msg);
        },
      });
  }

  payViaStripeHosted() {
    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      this.toast.error('Please complete the Shipping & Destination address fields.');
      return;
    }

    if (!this.isMobileValid()) {
      this.shippingForm.controls.mobileNumber.markAsTouched();
      this.toast.error(`Please enter a valid ${this.phoneCountry().phoneDigitCount}-digit phone number.`);
      return;
    }

    const oId = this.orderId();
    if (!oId || this.isRedirectingStripe() || this.isProcessing()) return;

    this.isRedirectingStripe.set(true);
    const addressPayload = this.getAddressPayload();

    this.orderService.updateAddress(oId, addressPayload).subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.executeStripeHostedSession(oId);
      },
      error: (err) => {
        this.isRedirectingStripe.set(false);
        this.toast.error(err?.error?.message || 'Failed to save delivery destination address.');
      },
    });
  }

  private executeStripeHostedSession(oId: string) {
    const amountToCharge = this.chargeAmount();
    const isEscrow = this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW';
    const paymentMode = isEscrow ? 'MILESTONE_ESCROW' : 'FULL_UPFRONT';
    const baseTitle = this.order()?.items[0]?.productTitle || `Wholesale Order #${oId.substring(0, 8)}`;
    const itemTitle = isEscrow
      ? `${baseTitle} (30% Upfront Milestone)`
      : `${baseTitle} (Full Payment)`;

    this.paymentService
      .createCheckoutSession({
        orderId: oId,
        itemTitle,
        amount: amountToCharge,
        paymentMode,
        successUrl: `${window.location.origin}/payment/status?type=success&orderId=${oId}&paymentMode=${paymentMode}`,
        cancelUrl: `${window.location.origin}/checkout/${oId}`,
      })
      .subscribe({
        next: (payRes) => {
          if (payRes.url) {
            window.location.href = payRes.url;
          } else {
            this.isRedirectingStripe.set(false);
            this.toast.info('Stripe test mode: please complete payment using the in-app card form.');
          }
        },
        error: (err) => {
          this.isRedirectingStripe.set(false);
          const msg = err?.error?.message || 'Unable to initialize external Stripe checkout.';
          this.toast.error(msg);
        },
      });
  }
}
