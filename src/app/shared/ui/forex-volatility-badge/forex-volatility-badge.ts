import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CurrencyService, CurrencyVolatility } from '@core/services/currency.service';
import { ToastService } from '@core/services/toast.service';
import { DecimalPipe } from '@angular/common';
import {
  LucideInfo,
  LucideLock,
  LucideShieldCheck,
  LucideTrendingDown,
  LucideTrendingUp,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-forex-volatility-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    LucideTrendingUp,
    LucideTrendingDown,
    LucideLock,
    LucideShieldCheck,
    LucideInfo,
    LucideX,
  ],
  template: `
    <div class="relative inline-flex items-center gap-2">
      <!-- Live Volatility Pill (Click to open) -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all select-none shadow-sm cursor-pointer hover:shadow-md active:scale-95 focus:outline-none"
        [class]="pillClasses()"
        (click)="togglePopover($event)"
        [attr.aria-expanded]="showPopover()"
        title="Click to view 24h Forex Telemetry"
      >
        <!-- Pulsing Live Dot -->
        <span class="relative flex h-2 w-2">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            [class]="pingDotClass()"
          ></span>
          <span
            class="relative inline-flex h-2 w-2 rounded-full"
            [class]="solidDotClass()"
          ></span>
        </span>

        <!-- Currency Pair & Rate -->
        <span class="font-mono text-zinc-300">
          {{ currentCode() }}/USD {{ currentRate() | number: '1.2-2' }}
        </span>

        <!-- Percentage Delta Badge -->
        <span class="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold" [class]="trendTextClass()">
          @if (volatility().trend === 'up') {
            <svg lucideTrendingUp class="h-3 w-3"></svg>
            +{{ volatility().changePct }}%
          } @else if (volatility().trend === 'down') {
            <svg lucideTrendingDown class="h-3 w-3"></svg>
            {{ volatility().changePct }}%
          } @else {
            0.00%
          }
        </span>
      </button>

      <!-- 24h Rate Lock Action (if enabled) -->
      @if (showLockToggle()) {
        @if (isLocked()) {
          <!-- Rate Locked Badge -->
          <div
            class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-500/10 backdrop-blur-md animate-in fade-in"
          >
            <svg lucideShieldCheck class="h-3.5 w-3.5 text-emerald-400 shrink-0"></svg>
            <span class="font-medium">24h Rate Locked</span>
            <span class="text-[10px] text-emerald-400/80 font-mono">({{ remainingHours() }}h left)</span>

            <button
              type="button"
              (click)="unlockRate()"
              class="ml-1 rounded-full p-0.5 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200 transition cursor-pointer"
              title="Unlock exchange rate"
            >
              <svg lucideX class="h-3 w-3"></svg>
            </button>
          </div>
        } @else {
          <!-- Lock Rate Guarantee Button -->
          <button
            type="button"
            (click)="lockRate()"
            class="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:border-indigo-500/60 hover:bg-indigo-900/50 hover:text-indigo-200 active:scale-95 transition cursor-pointer shadow-sm shadow-indigo-500/10"
            title="Lock live exchange rate for 24 hours to protect against market fluctuations"
          >
            <svg lucideLock class="h-3 w-3 text-indigo-400 shrink-0"></svg>
            <span>Lock Rate (24h)</span>
          </button>
        }
      }

      <!-- Interactive Volatility Inspector Popover -->
      @if (showPopover()) {
        <div
          class="absolute right-0 top-full z-50 mt-2 w-[320px] origin-top-right rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/5"
        >
          <div class="flex items-center justify-between pb-3 mb-2.5 border-b border-zinc-800/80">
            <div class="flex items-center gap-2.5">
              <span class="text-xl leading-none">{{ currentFlag() }}</span>
              <div>
                <p class="text-xs font-bold text-zinc-100">{{ currentName() }} ({{ currentCode() }})</p>
                <p class="text-[10px] text-zinc-400 font-medium">Forex Volatility Telemetry</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <span
                class="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                [class]="riskBadgeClass()"
              >
                {{ volatility().risk }} Risk
              </span>
              <button
                type="button"
                (click)="showPopover.set(false)"
                class="rounded-md p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <svg lucideX class="h-3.5 w-3.5"></svg>
              </button>
            </div>
          </div>

          <div class="space-y-2.5 text-xs py-1">
            <div class="flex items-center justify-between gap-3 text-zinc-400">
              <span class="text-zinc-400 shrink-0 font-medium">Live Market Rate:</span>
              <span class="font-mono font-bold text-zinc-100 text-right whitespace-nowrap">
                1 USD = {{ currentRate() | number: '1.2-2' }} {{ currentCode() }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 text-zinc-400">
              <span class="text-zinc-400 shrink-0 font-medium">24h Benchmark:</span>
              <span class="font-mono text-zinc-300 text-right whitespace-nowrap">
                1 USD = {{ volatility().prev24h | number: '1.2-2' }} {{ currentCode() }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 text-zinc-400">
              <span class="text-zinc-400 shrink-0 font-medium">24h Movement:</span>
              <span class="font-mono font-bold text-right whitespace-nowrap inline-flex items-center gap-1" [class]="trendTextClass()">
                @if (volatility().trend === 'up') {
                  <svg lucideTrendingUp class="h-3.5 w-3.5"></svg>+{{ volatility().changePct }}%
                } @else if (volatility().trend === 'down') {
                  <svg lucideTrendingDown class="h-3.5 w-3.5"></svg>{{ volatility().changePct }}%
                } @else {
                  0.00%
                }
              </span>
            </div>
          </div>

          <div class="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-2.5 text-[11px] text-indigo-200 leading-relaxed">
            <div class="flex items-start gap-1.5">
              <svg lucideInfo class="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0"></svg>
              <span>
                Nexus Forex Protection guarantees your agreed quote price against currency swings for up to 24 hours.
              </span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ForexVolatilityBadge {
  readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);
  private readonly elementRef = inject(ElementRef);

  // Inputs
  readonly compact = input<boolean>(false);
  readonly quoteId = input<string | undefined>(undefined);
  readonly showLockToggle = input<boolean>(true);

  // State
  readonly showPopover = signal(false);

  // Computed signals
  readonly currentCode = computed(() => this.currencyService.currentCode());
  readonly currentRate = computed(() => this.currencyService.currentRate());
  readonly currentFlag = computed(() => this.currencyService.current().flag);
  readonly currentName = computed(() => this.currencyService.current().name);
  readonly volatility = computed<CurrencyVolatility>(() => this.currencyService.currentVolatility());

  readonly lockKey = computed(() => this.quoteId() || 'global');

  readonly isLocked = computed(() => this.currencyService.isRateLocked(this.lockKey()));

  readonly lockedData = computed(() => this.currencyService.getRateLock(this.lockKey()));

  readonly remainingHours = computed(() => {
    const data = this.lockedData();
    if (!data) return 0;
    const diffMs = Math.max(0, data.expiresAt - Date.now());
    return Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
  });

  pillClasses(): string {
    const v = this.volatility();
    if (v.trend === 'up') {
      return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:border-emerald-500/50';
    } else if (v.trend === 'down') {
      return 'border-rose-500/30 bg-rose-950/40 text-rose-300 hover:border-rose-500/50';
    }
    return 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700';
  }

  pingDotClass(): string {
    const v = this.volatility();
    if (v.trend === 'up') return 'bg-emerald-400';
    if (v.trend === 'down') return 'bg-rose-400';
    return 'bg-zinc-400';
  }

  solidDotClass(): string {
    const v = this.volatility();
    if (v.trend === 'up') return 'bg-emerald-400';
    if (v.trend === 'down') return 'bg-rose-400';
    return 'bg-zinc-400';
  }

  trendTextClass(): string {
    const v = this.volatility();
    if (v.trend === 'up') return 'text-emerald-400';
    if (v.trend === 'down') return 'text-rose-400';
    return 'text-zinc-400';
  }

  riskBadgeClass(): string {
    const r = this.volatility().risk;
    if (r === 'HIGH') return 'bg-rose-950 text-rose-400 border border-rose-500/30';
    if (r === 'MODERATE') return 'bg-amber-950 text-amber-400 border border-amber-500/30';
    return 'bg-emerald-950 text-emerald-400 border border-emerald-500/30';
  }

  togglePopover(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showPopover.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showPopover.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showPopover.set(false);
  }

  lockRate() {
    const key = this.lockKey();
    const lock = this.currencyService.lockRate(key, this.quoteId());
    this.toast.success(
      `Exchange rate locked at 1 USD = ${lock.lockedRate.toFixed(2)} ${lock.currencyCode} for 24 hours!`,
    );
  }

  unlockRate() {
    const key = this.lockKey();
    this.currencyService.unlockRate(key);
    this.toast.info('24h Exchange rate lock released.');
  }
}
