import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import { LucideBuilding2, LucideCheck, LucideSparkles, LucideTrendingDown } from '@lucide/angular';

export interface WholesaleTier {
  tierNumber: number;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
  label: string;
}

export function computeWholesaleTierUnitPrice(
  basePrice: number,
  quantity: number,
  customTiers?: any[],
): number {
  if (Array.isArray(customTiers) && customTiers.length > 0) {
    const sorted = [...customTiers].sort(
      (a, b) => (b.minQuantity || 0) - (a.minQuantity || 0),
    );
    const matched = sorted.find((t) => quantity >= (t.minQuantity || 0));
    if (matched) {
      if (matched.unitPrice !== undefined) return Number(matched.unitPrice);
      if (matched.discountPercent !== undefined) {
        return Math.round(basePrice * (1 - matched.discountPercent / 100) * 100) / 100;
      }
    }
  }

  // Standard Nexus Wholesale Tiers
  if (quantity >= 100) return Math.round(basePrice * 0.72 * 100) / 100; // 28% off
  if (quantity >= 50) return Math.round(basePrice * 0.8 * 100) / 100; // 20% off
  if (quantity >= 10) return Math.round(basePrice * 0.88 * 100) / 100; // 12% off
  return basePrice;
}

@Component({
  selector: 'app-wholesale-tier-pricing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NexusCurrencyPipe, LucideSparkles, LucideCheck, LucideTrendingDown, LucideBuilding2],
  template: `
    <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
      <!-- Section Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <svg lucideTrendingDown class="h-3.5 w-3.5"></svg>
          </span>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200">Wholesale Volume Pricing</h3>
            <p class="text-[11px] text-zinc-400">Automatic discounts applied as order quantity scales</p>
          </div>
        </div>

        @if (activeDiscountPercent() > 0) {
          <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
            <svg lucideSparkles class="h-3.5 w-3.5"></svg>
            {{ activeDiscountPercent() }}% OFF Unlocked
          </span>
        }
      </div>

      <!-- 4 Tier Pricing Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        @for (tier of tiers(); track tier.tierNumber) {
          <button
            type="button"
            (click)="selectTier(tier.minQuantity)"
            class="group relative flex flex-col justify-between rounded-xl border p-3 text-left transition cursor-pointer"
            [ngClass]="activeTier()?.tierNumber === tier.tierNumber
              ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-950/40'
              : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/50'"
          >
            <!-- Active check badge -->
            @if (activeTier()?.tierNumber === tier.tierNumber) {
              <span class="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                <svg lucideCheck class="h-2.5 w-2.5 stroke-[3]"></svg>
              </span>
            }

            <div>
              <p class="text-[11px] font-bold text-zinc-400">
                {{ tier.maxQuantity ? tier.minQuantity + ' - ' + tier.maxQuantity : tier.minQuantity + '+' }} units
              </p>
              <p class="mt-1 text-base font-black text-zinc-100 font-mono">
                {{ tierPrice(tier.minQuantity) | nexusCurrency }}
              </p>
              <span class="text-[10px] text-zinc-500">per unit</span>
            </div>

            <!-- Savings pill -->
            <div class="mt-2.5 pt-2 border-t border-zinc-800/80">
              @if (tier.discountPercent > 0) {
                <span class="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  Save {{ tier.discountPercent }}%
                </span>
              } @else {
                <span class="text-[10px] text-zinc-500 font-medium">Standard MOQ</span>
              }
            </div>
          </button>
        }
      </div>

      <!-- Real-Time Volume Discount Feedback -->
      @if (activeDiscountPercent() > 0) {
        <div class="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-2.5 text-xs text-emerald-300">
          <div class="flex items-center gap-2">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
              ✓
            </span>
            <span>
              <b>Wholesale Tier Active</b>: Saving <b>{{ totalSavings() | nexusCurrency }}</b> ({{ activeDiscountPercent() }}% discount on {{ quantity() }} units)
            </span>
          </div>

          <span class="font-bold text-emerald-400 font-mono">
            {{ effectiveUnitPrice() | nexusCurrency }}/ea
          </span>
        </div>
      }

      <!-- Custom Bulk RFQ Link -->
      <div class="flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
        <span>Need 500+ units or custom contract terms?</span>
        <button
          type="button"
          (click)="bulkRfqRequested.emit()"
          class="inline-flex items-center gap-1.5 font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
        >
          <svg lucideBuilding2 class="h-3.5 w-3.5"></svg>
          <span>Request Custom Bulk RFQ</span>
        </button>
      </div>
    </div>
  `,
})
export class WholesaleTierPricingComponent {
  readonly price = input.required<number>();
  readonly stockQuantity = input<number>(100);
  readonly customTiers = input<any[] | null>(null);

  readonly quantity = model<number>(1);
  readonly bulkRfqRequested = output<void>();

  readonly tiers = computed<WholesaleTier[]>(() => {
    return [
      {
        tierNumber: 1,
        minQuantity: 1,
        maxQuantity: 9,
        discountPercent: 0,
        label: 'Base MOQ',
      },
      {
        tierNumber: 2,
        minQuantity: 10,
        maxQuantity: 49,
        discountPercent: 12,
        label: 'Starter Wholesale',
      },
      {
        tierNumber: 3,
        minQuantity: 50,
        maxQuantity: 99,
        discountPercent: 20,
        label: 'Volume Distributor',
      },
      {
        tierNumber: 4,
        minQuantity: 100,
        maxQuantity: null,
        discountPercent: 28,
        label: 'Enterprise Wholesale',
      },
    ];
  });

  readonly activeTier = computed(() => {
    const q = this.quantity();
    const sorted = [...this.tiers()].sort((a, b) => b.minQuantity - a.minQuantity);
    return sorted.find((t) => q >= t.minQuantity) || this.tiers()[0];
  });

  readonly activeDiscountPercent = computed(() => {
    return this.activeTier()?.discountPercent || 0;
  });

  readonly effectiveUnitPrice = computed(() => {
    return computeWholesaleTierUnitPrice(
      this.price(),
      this.quantity(),
      this.customTiers() || undefined,
    );
  });

  readonly totalSavings = computed(() => {
    const baseTotal = this.price() * this.quantity();
    const discountedTotal = this.effectiveUnitPrice() * this.quantity();
    return Math.max(0, Math.round((baseTotal - discountedTotal) * 100) / 100);
  });

  tierPrice(qty: number): number {
    return computeWholesaleTierUnitPrice(this.price(), qty, this.customTiers() || undefined);
  }

  selectTier(minQty: number) {
    const stock = this.stockQuantity();
    const target = Math.min(stock > 0 ? stock : minQty, minQty);
    this.quantity.set(target);
  }
}