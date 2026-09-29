import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '@core/services/currency.service';
import { RfqService } from '@core/services/rfq.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import {
  LucideBuilding2,
  LucideChevronDown,
  LucideCheck,
  LucideClock,
  LucideHelpCircle,
  LucidePlane,
  LucideSend,
  LucideSparkles,
  LucideTruck,
  LucideX,
} from '@lucide/angular';

interface TimelineOption {
  value: string;
  label: string;
  sub: string;
  icon: 'plane' | 'truck' | 'building';
  badge: string;
}

@Component({
  selector: 'app-rfq-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NexusCurrencyPipe,
    FormsModule,
    LucideX,
    LucideBuilding2,
    LucideSend,
    LucideSparkles,
    LucideChevronDown,
  ],
  template: `
    @if (activeProduct(); as p) {
      <!-- Fixed Global Portal Backdrop -->
      <div
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in overflow-y-auto"
        (click)="onBackdropClick($event)"
      >
        <!-- Modal Container Card -->
        <div
          class="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-indigo-950/50 my-8 transition-all"
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
              <svg lucideBuilding2 class="h-5 w-5"></svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white tracking-tight">Request Wholesale RFQ Quote</h3>
              <p class="text-xs text-zinc-400">Negotiate bulk discount pricing directly with {{ p.storeName }}</p>
            </div>
          </div>

          <!-- Product Details Banner -->
          <div class="mt-4 flex items-center gap-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
            @if (p.images && p.images.length > 0 && p.images[0].url) {
              <img [src]="p.images[0].url" [alt]="p.title" class="h-14 w-14 rounded-xl object-cover border border-zinc-800 shrink-0" />
            } @else {
              <div class="h-14 w-14 rounded-xl bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 shrink-0">No Img</div>
            }
            <div class="min-w-0 flex-1">
              <span class="text-[10px] uppercase font-bold tracking-wider text-indigo-400">{{ p.storeName }}</span>
              <h4 class="text-sm font-bold text-white truncate">{{ p.title }}</h4>
              <p class="text-xs text-zinc-400">
                MSRP Retail Price: <strong class="font-mono text-zinc-200">{{ p.price | nexusCurrency }}</strong>
              </p>
            </div>
          </div>

          <!-- Form Fields -->
          <div class="mt-5 space-y-4">
            <!-- Customer Company / Email -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-zinc-400 mb-1">Company / Organization</label>
                <input
                  type="text"
                  [(ngModel)]="customerName"
                  placeholder="Apex Solutions Corp"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-zinc-400 mb-1">Corporate Email</label>
                <input
                  type="email"
                  [(ngModel)]="customerEmail"
                  placeholder="procurement@enterprise.com"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Target Quantity & Unit Price -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-zinc-400 mb-1">Target Quantity</label>
                <input
                  type="number"
                  min="1"
                  [(ngModel)]="targetQuantity"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
                />
                <p class="mt-1 text-[10px] text-zinc-500">Min. order volume: 10</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-zinc-400 mb-1">Offered Unit Price ($ USD)</label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-xs text-zinc-500 font-mono">$</span>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    [(ngModel)]="requestedUnitPrice"
                    class="w-full rounded-xl border border-indigo-500/50 bg-zinc-900 pl-7 pr-3 py-2 text-xs font-mono font-bold text-indigo-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                @if (currencyService.currentCode() !== 'USD') {
                  <p class="mt-1 text-[10px] text-indigo-300 font-mono">
                    ≈ {{ requestedUnitPrice() | nexusCurrency }}/unit in {{ currencyService.currentCode() }}
                  </p>
                } @else {
                  <p class="mt-1 text-[10px] text-zinc-500">Your price per item</p>
                }
              </div>
            </div>

            <!-- Quick Discount Preset Chips -->
            <div>
              <span class="block text-[11px] font-semibold text-zinc-400 mb-1.5">Quick Discount Preset Chips:</span>
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="applyDiscountPreset(0.90)"
                  class="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:border-indigo-500/50 hover:text-white transition cursor-pointer"
                >
                  -10% Bulk
                </button>

                <button
                  type="button"
                  (click)="applyDiscountPreset(0.85)"
                  class="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-2.5 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                >
                  -15% Wholesale ⭐
                </button>

                <button
                  type="button"
                  (click)="applyDiscountPreset(0.80)"
                  class="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:border-indigo-500/50 hover:text-white transition cursor-pointer"
                >
                  -20% Enterprise
                </button>
              </div>
            </div>

            <!-- Delivery Specs -->
            <div class="relative">
              <label class="block text-xs font-semibold text-zinc-400 mb-1">Logistics / Freight Terms</label>
              <button
                type="button"
                (click)="toggleDropdown()"
                class="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <span>{{ deliveryTimeline() }}</span>
                <svg lucideChevronDown class="h-3.5 w-3.5 text-zinc-400"></svg>
              </button>

              @if (isDropdownOpen()) {
                <div class="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md shadow-2xl p-1 space-y-1">
                  @for (opt of timelineOptions; track opt.value) {
                    <button
                      type="button"
                      (click)="selectTimeline(opt.value)"
                      class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition hover:bg-zinc-800 cursor-pointer"
                      [class.bg-indigo-600/20]="deliveryTimeline() === opt.value"
                    >
                      <div>
                        <div class="font-bold text-white">{{ opt.label }}</div>
                        <div class="text-[10px] text-zinc-400">{{ opt.sub }}</div>
                      </div>
                      <span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">{{ opt.badge }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Additional Notes / Requirements -->
            <div>
              <label class="block text-xs font-semibold text-zinc-400 mb-1">Custom Specs / Notes (Optional)</label>
              <textarea
                rows="2"
                [(ngModel)]="notes"
                placeholder="Mention custom packaging, bulk palette freight, or branding specifications…"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <!-- Live Quote Cost Calculation Summary -->
            <div class="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-2">
              <div class="flex justify-between text-xs text-zinc-400">
                <span>Catalogue Standard Total ({{ targetQuantity() }} units):</span>
                <span class="font-mono text-zinc-300 line-through">{{ standardTotal() | nexusCurrency }}</span>
              </div>
              <div class="flex justify-between text-xs text-zinc-300 font-medium">
                <span>Requested Wholesale RFQ Total:</span>
                <span class="font-mono text-sm font-extrabold text-indigo-300">{{ rfqTotal() | nexusCurrency }}</span>
              </div>
              @if (totalSavings() > 0) {
                <div class="pt-2 border-t border-indigo-500/20 flex justify-between text-xs font-bold text-emerald-400">
                  <span class="flex items-center gap-1">
                    <svg lucideSparkles class="h-3.5 w-3.5"></svg>
                    Projected Wholesale Savings:
                  </span>
                  <span class="font-mono">{{ totalSavings() | nexusCurrency }} ({{ savingsPercent() }}% OFF)</span>
                </div>
              }
            </div>

            <!-- Submit CTA -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                (click)="closeModal()"
                class="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-400 hover:border-zinc-700 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="submitRFQ()"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <svg lucideSend class="h-4 w-4"></svg>
                <span>Submit Wholesale RFQ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class RfqModal {
  readonly rfqService = inject(RfqService);
  readonly currencyService = inject(CurrencyService);

  readonly activeProduct = computed(() => this.rfqService.activeModalProduct());

  readonly customerName = signal('Global Enterprise Buyers LLC');
  readonly customerEmail = signal('procurement@enterprise.com');
  readonly targetQuantity = signal(25);
  readonly requestedUnitPrice = signal(0);
  readonly deliveryTimeline = signal('Air Freight Express - 3 to 5 Days');
  readonly notes = signal('');

  readonly isDropdownOpen = signal(false);

  readonly timelineOptions: TimelineOption[] = [
    {
      value: 'Air Freight Express - 3 to 5 Days',
      label: '✈️ Air Freight Express',
      sub: 'Estimated 3–5 business days transit (Priority air cargo)',
      icon: 'plane',
      badge: 'Fastest ⚡',
    },
    {
      value: 'Standard Regional Hub - 7 Days',
      label: '🚚 Standard Regional Hub',
      sub: 'Estimated 7 business days transit (Ground logistics truck)',
      icon: 'truck',
      badge: 'Balanced',
    },
    {
      value: 'Ocean Logistics Hub - 14 Days',
      label: '🚢 Ocean Cargo Container',
      sub: 'Estimated 14 business days (Lowest shipping cost for high volume)',
      icon: 'truck',
      badge: 'Lowest Freight Cost 💰',
    },
    {
      value: 'Direct Factory Pickup - Shenzhen Hub',
      label: '🏬 Direct Factory Warehouse Pickup',
      sub: 'Pick up directly from supplier Shenzhen distribution depot',
      icon: 'building',
      badge: 'Zero Freight',
    },
  ];

  readonly selectedTimelineLabel = computed(() => {
    const val = this.deliveryTimeline();
    const opt = this.timelineOptions.find((o) => o.value === val);
    return opt ? `${opt.label} (${opt.badge})` : val;
  });

  constructor() {
    effect(() => {
      const p = this.activeProduct();
      if (p) {
        this.requestedUnitPrice.set(Math.round(p.price * 0.85));
      }
    });
  }

  applyDiscountPreset(multiplier: number) {
    const p = this.activeProduct();
    if (!p) return;
    this.requestedUnitPrice.set(Math.round(p.price * multiplier));
  }

  toggleDropdown() {
    this.isDropdownOpen.update((v) => !v);
  }

  selectTimeline(val: string) {
    this.deliveryTimeline.set(val);
    this.isDropdownOpen.set(false);
  }

  readonly standardTotal = computed(() => {
    const p = this.activeProduct();
    return p ? p.price * this.targetQuantity() : 0;
  });

  readonly rfqTotal = computed(() => {
    return this.requestedUnitPrice() * this.targetQuantity();
  });

  readonly totalSavings = computed(() => {
    return Math.max(0, this.standardTotal() - this.rfqTotal());
  });

  readonly savingsPercent = computed(() => {
    if (this.standardTotal() === 0) return 0;
    return Math.round((this.totalSavings() / this.standardTotal()) * 100);
  });

  closeModal() {
    this.isDropdownOpen.set(false);
    this.rfqService.closeModal();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  submitRFQ() {
    const p = this.activeProduct();
    if (!p) return;

    this.rfqService.createRFQ({
      product: p,
      targetQuantity: this.targetQuantity(),
      requestedUnitPrice: this.requestedUnitPrice(),
      deliveryTimeline: this.deliveryTimeline(),
      notes: this.notes(),
      customerName: this.customerName(),
      customerEmail: this.customerEmail(),
    });
  }
}
