import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LandedCostService } from '@core/services/landed-cost.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import {
  LucideBuilding2,
  LucideCheck,
  LucideGlobe,
  LucideMinus,
  LucidePackage,
  LucidePlane,
  LucidePlus,
  LucideReceipt,
  LucideShieldCheck,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-landed-cost-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NexusCurrencyPipe,
    LucideX,
    LucideGlobe,
    LucideShieldCheck,
    LucidePlane,
    LucidePackage,
    LucideReceipt,
    LucidePlus,
    LucideMinus,
    LucideCheck,
    LucideBuilding2,
  ],
  template: `
    @if (service.isOpen()) {
      <div class="fixed inset-0 z-50 overflow-hidden">
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          (click)="service.closeDrawer()"
        ></div>

        <!-- Slide-over Drawer Panel -->
        <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <aside
            class="w-screen max-w-md border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl p-6 text-zinc-100 flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            <!-- Top Header -->
            <div class="space-y-4">
              <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                    <svg lucideGlobe class="h-5 w-5"></svg>
                  </div>
                  <div>
                    <h2 class="text-sm font-black uppercase tracking-wider text-white">
                      Landed Cost & Duty Calculator
                    </h2>
                    <p class="text-[11px] text-zinc-400">
                      Cross-border tariffs, freight & import taxes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="service.closeDrawer()"
                  class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                >
                  <svg lucideX class="h-5 w-5"></svg>
                </button>
              </div>

              <!-- Product Snapshot Pill -->
              @if (service.currentProduct(); as prod) {
                <div class="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
                  <div class="h-10 w-10 shrink-0 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                    @if (prod.images && prod.images.length > 0) {
                      <img [src]="prod.images[0].url" [alt]="prod.title" class="h-full w-full object-cover" />
                    } @else {
                      <svg lucidePackage class="h-5 w-5 text-zinc-500"></svg>
                    }
                  </div>
                  <div class="min-w-0 flex-1">
                    <h4 class="text-xs font-bold text-zinc-100 truncate">{{ prod.title }}</h4>
                    <p class="text-[11px] text-zinc-400">
                      Base MOQ Price: <span class="font-mono text-zinc-200">{{ prod.price | nexusCurrency }}</span>
                    </p>
                  </div>
                </div>
              }

              <!-- Destination Country Selector -->
              <div class="space-y-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Select Destination Country
                </label>
                <div class="grid grid-cols-4 gap-2">
                  @for (c of service.countries(); track c.code) {
                    <button
                      type="button"
                      (click)="service.setCountry(c.code)"
                      class="flex flex-col items-center justify-center rounded-xl border p-2 text-center transition cursor-pointer"
                      [class.border-indigo-500]="service.selectedCountry() === c.code"
                      [class.bg-indigo-950-40]="service.selectedCountry() === c.code"
                      [class.ring-1]="service.selectedCountry() === c.code"
                      [class.ring-indigo-500-50]="service.selectedCountry() === c.code"
                      [class.border-zinc-800]="service.selectedCountry() !== c.code"
                      [class.bg-zinc-900-50]="service.selectedCountry() !== c.code"
                      [class.hover:border-zinc-700]="service.selectedCountry() !== c.code"
                    >
                      <span class="text-lg">{{ c.flag }}</span>
                      <span class="mt-1 text-[10px] font-bold text-zinc-200 truncate w-full">
                        {{ c.code }}
                      </span>
                    </button>
                  }
                </div>
              </div>

              <!-- Quantity Selector with Wholesale Tiers -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Import Quantity
                  </label>
                  @if (service.calculation()?.volumeDiscountPercent; as pct) {
                    @if (pct > 0) {
                      <span class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {{ pct }}% Wholesale Discount Applied
                      </span>
                    }
                  }
                </div>

                <div class="flex items-center gap-2">
                  <div class="flex items-center rounded-xl border border-zinc-800 bg-zinc-900">
                    <button
                      type="button"
                      (click)="service.setQuantity(service.currentQuantity() - 5)"
                      [disabled]="service.currentQuantity() <= 1"
                      class="px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <svg lucideMinus class="h-3.5 w-3.5"></svg>
                    </button>
                    <input
                      type="number"
                      [ngModel]="service.currentQuantity()"
                      (ngModelChange)="service.setQuantity($event)"
                      min="1"
                      class="w-16 bg-transparent text-center text-xs font-mono font-bold text-zinc-100 outline-none"
                    />
                    <button
                      type="button"
                      (click)="service.setQuantity(service.currentQuantity() + 5)"
                      class="px-3 py-2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <svg lucidePlus class="h-3.5 w-3.5"></svg>
                    </button>
                  </div>

                  <!-- Quick Preset Pills -->
                  <div class="flex items-center gap-1.5 flex-1 overflow-x-auto">
                    @for (preset of [10, 25, 50, 100]; track preset) {
                      <button
                        type="button"
                        (click)="service.setQuantity(preset)"
                        class="rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition cursor-pointer"
                        [class.border-indigo-500]="service.currentQuantity() === preset"
                        [class.bg-indigo-600]="service.currentQuantity() === preset"
                        [class.text-white]="service.currentQuantity() === preset"
                        [class.border-zinc-800]="service.currentQuantity() !== preset"
                        [class.bg-zinc-900]="service.currentQuantity() !== preset"
                        [class.text-zinc-400]="service.currentQuantity() !== preset"
                      >
                        {{ preset }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Cost Waterfall Breakdown -->
              @if (service.calculation(); as c) {
                <div class="space-y-2.5 pt-2">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Landed Cost Breakdown ({{ c.destinationCountryName }})
                  </h3>

                  <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 divide-y divide-zinc-800/60 text-xs">
                    <!-- 1. Merchandise -->
                    <div class="flex items-center justify-between p-2.5">
                      <div class="flex items-center gap-2">
                        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 text-zinc-300">
                          <svg lucidePackage class="h-3 w-3"></svg>
                        </span>
                        <div>
                          <p class="font-semibold text-zinc-200">Wholesale Merchandise (FOB)</p>
                          <p class="text-[10px] text-zinc-500">
                            {{ c.quantity }} units @ {{ c.tieredUnitPriceUsd | nexusCurrency }}/ea
                          </p>
                        </div>
                      </div>
                      <span class="font-mono font-bold text-zinc-200">
                        {{ c.merchandiseSubtotalUsd | nexusCurrency }}
                      </span>
                    </div>

                    <!-- 2. Freight & Cargo Insurance -->
                    <div class="flex items-center justify-between p-2.5">
                      <div class="flex items-center gap-2">
                        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-400">
                          <svg lucidePlane class="h-3 w-3"></svg>
                        </span>
                        <div>
                          <p class="font-semibold text-zinc-200">International Logistics Freight</p>
                          <p class="text-[10px] text-zinc-500">
                            Air express + Marine cargo insurance (0.35%)
                          </p>
                        </div>
                      </div>
                      <span class="font-mono font-bold" [class.text-emerald-400]="c.internationalFreightUsd === 0" [class.text-zinc-200]="c.internationalFreightUsd > 0">
                        {{ c.internationalFreightUsd === 0 ? 'FREE (Wholesale)' : (c.internationalFreightUsd + c.marineInsuranceUsd | nexusCurrency) }}
                      </span>
                    </div>

                    <!-- 3. Customs Duty -->
                    <div class="flex items-center justify-between p-2.5">
                      <div class="flex items-center gap-2">
                        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                          <svg lucideBuilding2 class="h-3 w-3"></svg>
                        </span>
                        <div>
                          <p class="font-semibold text-zinc-200">
                            Customs Import Tariff ({{ c.dutyRatePercent }}%)
                          </p>
                          <p class="text-[10px] text-zinc-500">HS Code: {{ c.hsCode }}</p>
                        </div>
                      </div>
                      <span class="font-mono font-bold text-zinc-200">
                        {{ c.dutyAmountUsd === 0 ? '$0.00 (Duty Free)' : (c.dutyAmountUsd | nexusCurrency) }}
                      </span>
                    </div>

                    <!-- 4. Import Tax / VAT / GST -->
                    <div class="flex items-center justify-between p-2.5">
                      <div class="flex items-center gap-2">
                        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                          <svg lucideReceipt class="h-3 w-3"></svg>
                        </span>
                        <div>
                          <p class="font-semibold text-zinc-200">{{ c.taxName }} ({{ c.taxRatePercent }}%)</p>
                          <p class="text-[10px] text-zinc-500">Assessed on CIF + Duty</p>
                        </div>
                      </div>
                      <span class="font-mono font-bold text-zinc-200">
                        {{ c.taxAmountUsd | nexusCurrency }}
                      </span>
                    </div>

                    <!-- 5. Brokerage & Port Clearance -->
                    <div class="flex items-center justify-between p-2.5 bg-emerald-950/20">
                      <div class="flex items-center gap-2">
                        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
                          <svg lucideCheck class="h-3 w-3 stroke-[3]"></svg>
                        </span>
                        <div>
                          <p class="font-semibold text-emerald-300">Nexus Customs Brokerage</p>
                          <p class="text-[10px] text-emerald-500/80">Bonded carrier clearance & EDI filing</p>
                        </div>
                      </div>
                      <span class="font-mono font-bold text-emerald-400">
                        WAIVED ($0.00)
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Grand Total Landed Cost Card -->
                <div class="mt-3 rounded-2xl border border-indigo-500/40 bg-indigo-950/40 p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        Total Landed Cost (Door-to-Door)
                      </span>
                      <p class="text-2xl font-black text-white font-mono">
                        {{ c.totalLandedCostUsd | nexusCurrency }}
                      </p>
                      @if (c.currency !== 'USD') {
                        <p class="text-xs font-semibold text-amber-300 font-mono">
                          Approx. {{ c.currencySymbol }} {{ c.totalLandedCostTarget | number:'1.2-2' }} {{ c.currency }}
                        </p>
                      }
                    </div>

                    <div class="text-right">
                      <span class="text-[10px] text-zinc-400">Unit Landed Price</span>
                      <p class="text-base font-bold text-emerald-400 font-mono">
                        {{ c.unitLandedCostUsd | nexusCurrency }}/ea
                      </p>
                      <span class="text-[10px] text-zinc-500">Fully landed</span>
                    </div>
                  </div>

                  <!-- DDP Guarantee Pill -->
                  <div class="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                    <svg lucideShieldCheck class="h-4 w-4 shrink-0 text-emerald-400"></svg>
                    <div class="text-[11px] leading-tight">
                      <strong class="font-bold text-white">Delivered Duty Paid (DDP) Guaranteed</strong>
                      <p class="text-emerald-400/80">Nexus guarantees zero unexpected border duties or carrier tariffs at delivery.</p>
                    </div>
                  </div>

                  <!-- Authority & SLA info -->
                  <div class="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-indigo-900/60">
                    <span>Authority: {{ c.customsAuthority }}</span>
                    <span>SLA: {{ c.clearanceSpeedDays }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Footer Action Button -->
            <div class="pt-4 border-t border-zinc-800">
              <button
                type="button"
                (click)="service.closeDrawer()"
                class="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <svg lucideCheck class="h-4 w-4"></svg>
                <span>Close & Continue Sourcing</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    }
  `,
})
export class LandedCostDrawerComponent {
  readonly service = inject(LandedCostService);
}
