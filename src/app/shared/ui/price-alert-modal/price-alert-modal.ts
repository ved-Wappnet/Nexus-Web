import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ProductView } from '@core/models';
import { PriceAlertService } from '@core/services/price-alert.service';
import { LucideBellOff, LucideSparkles, LucideTrendingDown, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-price-alert-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, LucideTrendingDown, LucideBellOff, LucideSparkles, LucideX],
  template: `
    @if (modalVisible()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in"
        (click)="onBackdropClick($event)"
      >
        <!-- Modal Card -->
        <div
          class="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-indigo-950/50 transition-all"
        >
          <!-- Close Button -->
          <button
            type="button"
            (click)="closeModal()"
            class="absolute top-4 right-4 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:border-zinc-700 hover:text-white transition cursor-pointer"
          >
            <svg lucideX class="h-4 w-4"></svg>
          </button>

          <!-- Header -->
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
              <svg lucideTrendingDown class="h-5 w-5"></svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white tracking-tight">Set Price Drop Watchlist Alert</h3>
              <p class="text-xs text-zinc-400">Instant notification when vendor lowers price</p>
            </div>
          </div>

          <!-- Product Details Summary -->
          @if (activeProduct(); as p) {
            <div class="mt-5 flex items-center gap-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              @if (p.images && p.images.length > 0 && p.images[0].url) {
                <img [src]="p.images[0].url" [alt]="p.title" class="h-14 w-14 rounded-xl object-cover border border-zinc-800" />
              } @else {
                <div class="h-14 w-14 rounded-xl bg-zinc-800 flex items-center justify-center text-xs text-zinc-600">No Image</div>
              }
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 truncate">{{ p.storeName }}</p>
                <h4 class="text-sm font-semibold text-zinc-100 truncate">{{ p.title }}</h4>
                <p class="mt-0.5 text-xs font-bold text-emerald-400">Current Price: {{ p.price | currency }}</p>
              </div>
            </div>

            <!-- Discount Presets -->
            <div class="mt-5">
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Quick Discount Target Presets
              </label>
              <div class="grid grid-cols-4 gap-2">
                @for (preset of presets; track preset.pct) {
                  <button
                    type="button"
                    (click)="applyPreset(preset.pct)"
                    class="rounded-xl border py-2 text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    [class]="
                      selectedPresetPct() === preset.pct
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                    "
                  >
                    <span>-{{ preset.pct }}%</span>
                    <span class="text-[10px] opacity-80 font-mono">{{ calculatePresetPrice(preset.pct) | currency }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Target Price Slider & Numerical Input -->
            <div class="mt-5 space-y-3">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-zinc-300">Target Trigger Price</span>
                <span class="font-mono text-indigo-400 text-sm font-black">{{ targetPrice() | currency }}</span>
              </div>

              <input
                type="range"
                [min]="minPrice()"
                [max]="p.price"
                step="5"
                [value]="targetPrice()"
                (input)="onSliderChange($any($event.target).value)"
                class="w-full h-2 rounded-lg bg-zinc-800 accent-indigo-500 cursor-pointer"
              />

              <div class="flex items-center gap-2">
                <span class="text-xs text-zinc-500 font-mono font-medium">Custom Target: $</span>
                <input
                  type="number"
                  [min]="1"
                  [max]="p.price"
                  [value]="targetPrice()"
                  (input)="onNumberChange($any($event.target).value)"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-mono font-bold text-zinc-100 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <!-- Savings Banner -->
            <div class="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3.5 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg lucideSparkles class="h-4 w-4 text-emerald-400"></svg>
                <span class="text-xs text-zinc-300 font-medium">Expected Savings:</span>
              </div>
              <span class="font-mono text-sm font-extrabold text-emerald-400">
                {{ savingsAmount() | currency }} ({{ savingsPercent() }}% OFF)
              </span>
            </div>

            <!-- Modal Action Buttons -->
            <div class="mt-6 flex items-center gap-3">
              @if (hasActiveAlert()) {
                <button
                  type="button"
                  (click)="removeAlert()"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-900/50 cursor-pointer"
                >
                  <svg lucideBellOff class="h-4 w-4"></svg>
                  <span>Remove Alert</span>
                </button>
              }

              <button
                type="button"
                (click)="saveAlert()"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <svg lucideTrendingDown class="h-4 w-4"></svg>
                <span>{{ hasActiveAlert() ? 'Update Target Alert' : 'Activate Price Watchlist' }}</span>
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class PriceAlertModal {
  readonly product = input<ProductView | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly close = output<void>();

  private readonly priceAlertService = inject(PriceAlertService);

  readonly activeProduct = computed(() => this.product() || this.priceAlertService.activeModalProduct());
  readonly modalVisible = computed(() => this.isOpen() || !!this.priceAlertService.activeModalProduct());

  readonly targetPrice = signal<number>(0);
  readonly selectedPresetPct = signal<number | null>(15);

  readonly presets = [
    { pct: 10 },
    { pct: 15 },
    { pct: 20 },
    { pct: 25 },
  ];

  constructor() {
    effect(() => {
      const p = this.activeProduct();
      if (p && this.modalVisible()) {
        const existing = this.priceAlertService.getAlert(p.id);
        if (existing) {
          this.targetPrice.set(existing.targetPrice);
          this.selectedPresetPct.set(null);
        } else {
          this.applyPreset(15);
        }
      }
    });
  }

  readonly minPrice = computed(() => {
    const p = this.activeProduct();
    return p ? Math.max(1, Math.round(p.price * 0.4)) : 1;
  });

  readonly hasActiveAlert = computed(() => {
    const p = this.activeProduct();
    return p ? this.priceAlertService.hasAlert(p.id) : false;
  });

  readonly savingsAmount = computed(() => {
    const p = this.activeProduct();
    if (!p) return 0;
    return Math.max(0, p.price - this.targetPrice());
  });

  readonly savingsPercent = computed(() => {
    const p = this.activeProduct();
    if (!p || p.price === 0) return 0;
    return Math.round(((p.price - this.targetPrice()) / p.price) * 100);
  });

  calculatePresetPrice(pct: number): number {
    const p = this.activeProduct();
    if (!p) return 0;
    return Math.round(p.price * (1 - pct / 100));
  }

  applyPreset(pct: number) {
    this.selectedPresetPct.set(pct);
    const calculated = this.calculatePresetPrice(pct);
    this.targetPrice.set(calculated);
  }

  onSliderChange(val: string) {
    const parsed = Number(val);
    if (!isNaN(parsed)) {
      this.targetPrice.set(parsed);
      this.selectedPresetPct.set(null);
    }
  }

  onNumberChange(val: string) {
    const parsed = Number(val);
    const p = this.activeProduct();
    if (!isNaN(parsed) && p) {
      const clamped = Math.max(1, Math.min(p.price, parsed));
      this.targetPrice.set(clamped);
      this.selectedPresetPct.set(null);
    }
  }

  saveAlert() {
    const p = this.activeProduct();
    if (p) {
      this.priceAlertService.setAlert(p, this.targetPrice());
      this.closeModal();
    }
  }

  removeAlert() {
    const p = this.activeProduct();
    if (p) {
      this.priceAlertService.removeAlert(p.id);
      this.closeModal();
    }
  }

  closeModal() {
    this.priceAlertService.closeModal();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.closeModal();
    }
  }
}
