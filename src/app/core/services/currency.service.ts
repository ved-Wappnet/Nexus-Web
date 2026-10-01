import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rate: number; // 1 USD = rate
  decimals: number;
}

export interface CurrencyVolatility {
  changePct: number;
  trend: 'up' | 'down' | 'flat';
  prev24h: number;
  risk: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface RateLockData {
  currencyCode: string;
  lockedRate: number;
  lockedAt: number;
  expiresAt: number; // 24h later
  quoteId?: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    rate: 1.0,
    decimals: 2,
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    rate: 0.92,
    decimals: 2,
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    rate: 0.79,
    decimals: 2,
  },
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    rate: 83.5,
    decimals: 2,
  },
  {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    flag: '🇦🇪',
    rate: 3.67,
    decimals: 2,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    flag: '🇨🇦',
    rate: 1.36,
    decimals: 2,
  },
  {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    flag: '🇯🇵',
    rate: 155.2,
    decimals: 0,
  },
  {
    code: 'AUD',
    symbol: 'AU$',
    name: 'Australian Dollar',
    flag: '🇦🇺',
    rate: 1.52,
    decimals: 2,
  },
];

const STORAGE_KEY = 'nexus_preferred_currency';
const LIVE_RATES_CACHE_KEY = 'nexus_live_forex_rates';
const LIVE_RATES_TIMESTAMP_KEY = 'nexus_live_forex_timestamp';
// Backend cron updates every 1 hour; frontend checks cache every 15 minutes
const CACHE_TTL_MS = 15 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly currencies = signal<CurrencyConfig[]>(this.loadInitialCurrencies());

  get supported(): CurrencyConfig[] {
    return this.currencies();
  }

  readonly current = signal<CurrencyConfig>(this.initCurrency());

  readonly currentCode = computed(() => this.current().code);
  readonly currentSymbol = computed(() => this.current().symbol);
  readonly currentRate = computed(() => this.current().rate);

  // Real-time Forex Volatility
  readonly volatility = signal<Record<string, CurrencyVolatility>>(this.loadInitialVolatility());

  readonly currentVolatility = computed<CurrencyVolatility>(() => {
    const code = this.currentCode();
    return (
      this.volatility()[code] || {
        changePct: 0,
        trend: 'flat',
        prev24h: this.currentRate(),
        risk: 'LOW',
      }
    );
  });

  // 24-hour Rate Lock Guarantee Store
  private readonly rateLocks = signal<Record<string, RateLockData>>(this.loadInitialRateLocks());

  isRateLocked(key = 'global'): boolean {
    const lock = this.rateLocks()[key];
    if (!lock) return false;
    if (Date.now() > lock.expiresAt) {
      this.unlockRate(key);
      return false;
    }
    return true;
  }

  getRateLock(key = 'global'): RateLockData | null {
    const lock = this.rateLocks()[key];
    if (!lock) return null;
    if (Date.now() > lock.expiresAt) {
      this.unlockRate(key);
      return null;
    }
    return lock;
  }

  lockRate(key = 'global', quoteId?: string): RateLockData {
    const current = this.current();
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24-hour guarantee

    const lockData: RateLockData = {
      currencyCode: current.code,
      lockedRate: current.rate,
      lockedAt: now,
      expiresAt,
      quoteId,
    };

    this.rateLocks.update((all) => {
      const updated = { ...all, [key]: lockData };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_rate_locks', JSON.stringify(updated));
      }
      return updated;
    });

    return lockData;
  }

  unlockRate(key = 'global') {
    this.rateLocks.update((all) => {
      const updated = { ...all };
      delete updated[key];
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_rate_locks', JSON.stringify(updated));
      }
      return updated;
    });
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Fetch live market forex rates from backend hourly cron cache
      this.fetchLiveRates();

      // Non-blocking background IP detection if user hasn't explicitly set preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        this.detectFromIp();
      }
    }
  }

  setCurrency(code: string) {
    const found = this.currencies().find(
      (c) => c.code.toUpperCase() === code.toUpperCase(),
    );
    if (found) {
      this.current.set(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, found.code);
      }
    }
  }

  convert(amountInUSD: number | null | undefined): number {
    if (amountInUSD == null || isNaN(amountInUSD)) return 0;
    const rate = this.currentRate();
    const converted = amountInUSD * rate;
    const decimals = this.current().decimals;
    return Number(converted.toFixed(decimals));
  }

  format(amountInUSD: number | null | undefined): string {
    if (amountInUSD == null || isNaN(amountInUSD)) {
      return `${this.current().symbol}0.00`;
    }
    const curr = this.current();
    const converted = amountInUSD * curr.rate;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr.code,
      currencyDisplay: 'symbol',
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals,
    }).format(converted);
  }

  /**
   * Fetches real-time market exchange rates from Nexus backend hourly cron cache.
   * Caches results in localStorage so it never slows down page loads.
   */
  public fetchLiveRates() {
    try {
      const lastFetch = Number(localStorage.getItem(LIVE_RATES_TIMESTAMP_KEY) || 0);
      const isExpired = Date.now() - lastFetch > CACHE_TTL_MS;

      // If cache is still valid, rates were already loaded in loadInitialCurrencies
      if (!isExpired && localStorage.getItem(LIVE_RATES_CACHE_KEY)) {
        return;
      }

      // Fetch live market forex rates from Nexus backend cron-cached endpoint
      fetch(`${environment.apiUrl}/currency/rates`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          if (data) {
            if (data.rates) {
              this.applyLiveRates(data.rates);
              localStorage.setItem(LIVE_RATES_CACHE_KEY, JSON.stringify(data.rates));
              localStorage.setItem(LIVE_RATES_TIMESTAMP_KEY, Date.now().toString());
            }
            if (data.volatility) {
              this.volatility.set(data.volatility);
              localStorage.setItem('nexus_forex_volatility', JSON.stringify(data.volatility));
            }
          }
        })
        .catch(() => {
          // Graceful fallback: Keep cached or baseline rates
        });
    } catch {}
  }

  private loadInitialVolatility(): Record<string, CurrencyVolatility> {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem('nexus_forex_volatility');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  }

  private loadInitialRateLocks(): Record<string, RateLockData> {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem('nexus_rate_locks');
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        const valid: Record<string, RateLockData> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, RateLockData>)) {
          if (v && v.expiresAt > now) {
            valid[k] = v;
          }
        }
        return valid;
      }
    } catch {}
    return {};
  }

  private applyLiveRates(rates: Record<string, number>) {
    this.currencies.update((list) =>
      list.map((c) => {
        const liveRate = rates[c.code];
        if (liveRate && typeof liveRate === 'number' && liveRate > 0) {
          return { ...c, rate: Number(liveRate.toFixed(2)) };
        }
        return c;
      }),
    );

    // Re-sync current active currency with its updated live market rate
    const currentCode = this.current().code;
    const updatedCurrent = this.currencies().find((c) => c.code === currentCode);
    if (updatedCurrent) {
      this.current.set(updatedCurrent);
    }
  }

  private loadInitialCurrencies(): CurrencyConfig[] {
    if (typeof window === 'undefined') {
      return SUPPORTED_CURRENCIES;
    }

    try {
      const cached = localStorage.getItem(LIVE_RATES_CACHE_KEY);
      if (cached) {
        const rates = JSON.parse(cached);
        return SUPPORTED_CURRENCIES.map((c) => {
          const liveRate = rates[c.code];
          if (liveRate && typeof liveRate === 'number' && liveRate > 0) {
            return { ...c, rate: Number(liveRate.toFixed(2)) };
          }
          return c;
        });
      }
    } catch {}

    return SUPPORTED_CURRENCIES;
  }

  private initCurrency(): CurrencyConfig {
    const list = this.currencies();

    if (typeof window === 'undefined') {
      return list[0];
    }

    // 1. Check user manual preference in localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const match = list.find((c) => c.code === saved);
      if (match) return match;
    }

    // 2. Auto-detect via Browser Timezone & Locale
    const detectedCode = this.detectFromBrowser();
    const match = list.find((c) => c.code === detectedCode);
    return match || list[0];
  }

  private detectFromBrowser(): string {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const lang = (navigator.language || '').toUpperCase();

      if (tz.includes('Calcutta') || tz.includes('Kolkata') || lang.endsWith('IN')) {
        return 'INR';
      }
      if (tz.includes('London') || lang.endsWith('GB') || lang.endsWith('UK')) {
        return 'GBP';
      }
      if (
        tz.includes('Berlin') ||
        tz.includes('Paris') ||
        tz.includes('Rome') ||
        tz.includes('Madrid') ||
        tz.includes('Amsterdam') ||
        lang.endsWith('DE') ||
        lang.endsWith('FR') ||
        lang.endsWith('ES') ||
        lang.endsWith('IT')
      ) {
        return 'EUR';
      }
      if (tz.includes('Dubai') || lang.endsWith('AE')) {
        return 'AED';
      }
      if (tz.includes('Tokyo') || lang.endsWith('JP')) {
        return 'JPY';
      }
      if (
        tz.includes('Toronto') ||
        tz.includes('Vancouver') ||
        tz.includes('Montreal') ||
        lang.endsWith('CA')
      ) {
        return 'CAD';
      }
      if (
        tz.includes('Sydney') ||
        tz.includes('Melbourne') ||
        tz.includes('Brisbane') ||
        lang.endsWith('AU')
      ) {
        return 'AUD';
      }
    } catch {}

    return 'USD';
  }

  private detectFromIp() {
    try {
      fetch('https://freeipapi.com/api/json')
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          if (localStorage.getItem(STORAGE_KEY)) return; // User already set preference

          const countryCode = data?.countryCode?.toUpperCase();
          const currencyMap: Record<string, string> = {
            IN: 'INR',
            GB: 'GBP',
            UK: 'GBP',
            FR: 'EUR',
            DE: 'EUR',
            ES: 'EUR',
            IT: 'EUR',
            NL: 'EUR',
            AE: 'AED',
            CA: 'CAD',
            JPY: 'JPY',
            JP: 'JPY',
            AU: 'AUD',
            US: 'USD',
          };

          const matchedCode = currencyMap[countryCode];
          if (matchedCode) {
            this.setCurrency(matchedCode);
          }
        })
        .catch(() => {
          // Silently fall back to browser detection
        });
    } catch {}
  }
}
