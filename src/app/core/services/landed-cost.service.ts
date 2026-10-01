import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductView } from '../models';
import { CurrencyService } from './currency.service';

export interface CountryTradeProfile {
  code: string;
  name: string;
  flag: string;
  currency: string;
  standardDutyPercent: number;
  taxRatePercent: number;
  taxType: 'VAT' | 'GST' | 'SALES_TAX';
  taxName: string;
  clearanceSpeedDays: string;
  customsAuthority: string;
}

export interface LandedCostBreakdown {
  destinationCountry: string;
  destinationCountryName: string;
  flagEmoji: string;
  hsCode: string;
  category: string;
  quantity: number;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  baseUnitPriceUsd: number;
  tieredUnitPriceUsd: number;
  volumeDiscountPercent: number;
  merchandiseSubtotalUsd: number;
  internationalFreightUsd: number;
  marineInsuranceUsd: number;
  cifValueUsd: number;
  dutyRatePercent: number;
  dutyAmountUsd: number;
  taxType: 'VAT' | 'GST' | 'SALES_TAX';
  taxName: string;
  taxRatePercent: number;
  taxAmountUsd: number;
  brokerageFeeUsd: number;
  brokerageWaived: boolean;
  totalLandedCostUsd: number;
  unitLandedCostUsd: number;
  totalLandedCostTarget: number;
  unitLandedCostTarget: number;
  merchandiseSubtotalTarget: number;
  dutyAmountTarget: number;
  taxAmountTarget: number;
  freightTarget: number;
  incoterms: 'DDP' | 'CIF';
  ddpGuaranteed: boolean;
  clearanceSpeedDays: string;
  customsAuthority: string;
}

export interface CalculateLandedCostPayload {
  productId?: string;
  productTitle?: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  destinationCountry: string;
  currency?: string;
  exchangeRate?: number;
}

@Injectable({
  providedIn: 'root',
})
export class LandedCostService {
  private readonly http = inject(HttpClient);
  private readonly currencyService = inject(CurrencyService);

  readonly isOpen = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly selectedCountry = signal<string>('DE');
  readonly currentProduct = signal<ProductView | null>(null);
  readonly currentQuantity = signal<number>(25);
  readonly calculation = signal<LandedCostBreakdown | null>(null);
  readonly countries = signal<CountryTradeProfile[]>([]);

  constructor() {
    this.fetchCountries();
  }

  fetchCountries() {
    this.http
      .get<CountryTradeProfile[]>(`${environment.apiUrl}/landed-cost/countries`)
      .subscribe({
        next: (list) => {
          this.countries.set(list);
        },
        error: () => {
          // Fallback static list
          this.countries.set([
            { code: 'DE', name: 'Germany (EU)', flag: '🇩🇪', currency: 'EUR', standardDutyPercent: 2.5, taxRatePercent: 19, taxType: 'VAT', taxName: 'EU Import VAT', clearanceSpeedDays: '2-3 Days', customsAuthority: 'Zollamt' },
            { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', standardDutyPercent: 3.0, taxRatePercent: 20, taxType: 'VAT', taxName: 'UK Import VAT', clearanceSpeedDays: '2-3 Days', customsAuthority: 'HMRC' },
            { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', standardDutyPercent: 7.5, taxRatePercent: 18, taxType: 'GST', taxName: 'IGST', clearanceSpeedDays: '3-4 Days', customsAuthority: 'CBIC' },
            { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', standardDutyPercent: 5.0, taxRatePercent: 5, taxType: 'VAT', taxName: 'GCC VAT', clearanceSpeedDays: '1-2 Days', customsAuthority: 'FCA' },
            { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', standardDutyPercent: 1.5, taxRatePercent: 6.5, taxType: 'SALES_TAX', taxName: 'State Sales Tax', clearanceSpeedDays: '1-2 Days', customsAuthority: 'CBP' },
            { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', standardDutyPercent: 2.0, taxRatePercent: 5, taxType: 'GST', taxName: 'GST/HST', clearanceSpeedDays: '2-3 Days', customsAuthority: 'CBSA' },
            { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', standardDutyPercent: 5.0, taxRatePercent: 10, taxType: 'GST', taxName: 'GST', clearanceSpeedDays: '2-3 Days', customsAuthority: 'ABF' },
            { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', standardDutyPercent: 3.0, taxRatePercent: 10, taxType: 'VAT', taxName: 'JCT', clearanceSpeedDays: '2-3 Days', customsAuthority: 'Japan Customs' },
          ]);
        },
      });
  }

  calculate(payload: CalculateLandedCostPayload): Observable<LandedCostBreakdown> {
    this.loading.set(true);
    const curr = this.currencyService.current();
    const body = {
      ...payload,
      currency: payload.currency || curr.code,
      exchangeRate: payload.exchangeRate || curr.rate,
    };

    return this.http
      .post<LandedCostBreakdown>(`${environment.apiUrl}/landed-cost/calculate`, body)
      .pipe(
        tap({
          next: (res) => {
            this.calculation.set(res);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        }),
      );
  }

  openDrawer(product: ProductView, quantity = 25, defaultCountry = 'DE') {
    this.currentProduct.set(product);
    this.currentQuantity.set(quantity);
    this.selectedCountry.set(defaultCountry);
    this.isOpen.set(true);
    this.recalculate();
  }

  closeDrawer() {
    this.isOpen.set(false);
  }

  recalculate() {
    const prod = this.currentProduct();
    if (!prod) return;

    this.calculate({
      productId: prod.id,
      productTitle: prod.title,
      category: prod.categoryName || (prod as any).category?.name || 'electronics',
      unitPrice: Number(prod.price),
      quantity: this.currentQuantity(),
      destinationCountry: this.selectedCountry(),
      currency: this.currencyService.current().code,
      exchangeRate: this.currencyService.current().rate,
    }).subscribe();
  }

  setCountry(code: string) {
    this.selectedCountry.set(code);
    this.recalculate();
  }

  setQuantity(qty: number) {
    this.currentQuantity.set(Math.max(1, qty));
    this.recalculate();
  }
}
