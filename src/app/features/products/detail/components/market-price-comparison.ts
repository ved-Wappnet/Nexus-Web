import { Component, input, signal, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ProductService, MarketPriceComparisonResponse } from '@core/services/product.service';
import { PriceAlertService } from '@core/services/price-alert.service';
import {
  LucideTrendingDown,
  LucideShieldCheck,
  LucideExternalLink,
  LucideSparkles,
  LucideCheckCircle2,
  LucideBell,
} from '@lucide/angular';

@Component({
  selector: 'app-market-price-comparison',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DecimalPipe,
    LucideTrendingDown,
    LucideShieldCheck,
    LucideExternalLink,
    LucideSparkles,
    LucideCheckCircle2,
    LucideBell,
  ],
  template: `
    @if (comparison(); as data) {
      <div class="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-950 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all">
        <!-- Ambient decorative glow -->
        <div class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/10 blur-3xl"></div>
        <div class="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-600/10 blur-3xl"></div>

        <!-- Header -->
        <div class="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-sm">
              <svg lucideTrendingDown class="h-5 w-5"></svg>
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold tracking-tight text-white">Live Market Price Match</h3>
                <span class="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Verified Live
                </span>
              </div>
              <p class="text-[11px] text-zinc-400 mt-0.5">Real-time benchmark comparison with Amazon and Flipkart</p>
            </div>
          </div>

          <!-- Actions & Savings -->
          <div class="flex flex-wrap items-center gap-2">
            @if (data.maxSavingsAmount > 0) {
              <div class="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 shadow-sm">
                <svg lucideSparkles class="h-4 w-4 text-emerald-400"></svg>
                <span class="text-xs font-extrabold text-emerald-300">Save up to {{ data.maxSavingsAmount | currency }} ({{ data.maxSavingsPercent }}%)</span>
              </div>
            }

            <button
              type="button"
              (click)="onTrackPriceClick()"
              class="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm"
              [class]="
                priceAlertService.hasAlert(data.productId)
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'border-indigo-500/40 bg-indigo-600/25 text-indigo-300 hover:bg-indigo-600/40 hover:text-white'
              "
              title="Track price drop for this product"
            >
              <svg lucideBell class="h-3.5 w-3.5" [class.text-emerald-400]="priceAlertService.hasAlert(data.productId)" [class.text-indigo-400]="!priceAlertService.hasAlert(data.productId)"></svg>
              <span>{{ priceAlertService.hasAlert(data.productId) ? 'Watch Active' : 'Set Alert' }}</span>
            </button>
          </div>
        </div>

        <!-- Comparison Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4 relative z-10">
          <!-- 1. Nexus Card (Highlighted Hero) -->
          <div class="rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/50 via-zinc-900 to-zinc-900 p-4 shadow-xl shadow-indigo-950/40 flex flex-col justify-between relative group hover:border-indigo-400 transition">
            <div class="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md">
              <svg lucideCheckCircle2 class="h-3 w-3"></svg>
              Lowest Price
            </div>

            <div>
              <div class="flex items-center justify-between text-xs mt-1 mb-2">
                <span class="font-extrabold tracking-wide text-indigo-300">NEXUS MARKET</span>
                <span class="text-[10px] text-indigo-300/80 font-mono">Wholesale Direct</span>
              </div>
              <div class="text-2xl font-black text-white font-mono tracking-tight">
                {{ data.nexusPrice | currency }}
              </div>
              <p class="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <svg lucideShieldCheck class="h-3.5 w-3.5"></svg>
                <span>72h Escrow Protected</span>
              </p>
            </div>

            <div class="mt-3.5 pt-2.5 border-t border-indigo-500/20 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Direct factory pricing</span>
              <span class="font-bold text-emerald-400">BEST DEAL</span>
            </div>
          </div>

          <!-- 2. Competitors (Amazon & Flipkart) -->
          @for (comp of data.competitors; track comp.platform) {
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <div class="flex items-center justify-between text-xs mb-2">
                  <div class="flex items-center gap-1.5">
                    @if (comp.platform === 'amazon') {
                      <span class="font-extrabold text-[#FF9900]">Amazon</span>
                    } @else {
                      <span class="font-extrabold text-[#2874F0]">Flipkart</span>
                    }
                  </div>
                  <span class="text-[10px] text-zinc-500">Retail price</span>
                </div>

                <div class="text-2xl font-bold text-zinc-300 font-mono tracking-tight">
                  {{ comp.price | currency }}
                </div>

                @if (comp.differenceAmount > 0) {
                  <p class="text-[11px] text-rose-400 font-medium mt-1">
                    +{{ comp.differenceAmount | currency }} ({{ comp.differencePercent }}% more expensive)
                  </p>
                } @else {
                  <p class="text-[11px] text-zinc-400 font-medium mt-1">Matched retail rate</p>
                }
              </div>

              <div class="mt-3.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span class="text-zinc-500">⭐ {{ comp.rating | number:'1.1-1' }} ({{ comp.reviewsCount }})</span>
                <a
                  [href]="comp.productUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition font-medium"
                  title="Verify on {{ comp.platformName }}"
                >
                  <span>Verify</span>
                  <svg lucideExternalLink class="h-3 w-3"></svg>
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Guarantee Footer Strip -->
        <div class="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
          <div class="flex items-center gap-2">
            <svg lucideShieldCheck class="h-4 w-4 text-indigo-400 shrink-0"></svg>
            <span>Nexus Price Match Guarantee: If you find an authorized lower price elsewhere, contact us for an instant adjustment.</span>
          </div>
          <span class="text-zinc-500 font-mono text-[10px]">Updated {{ data.lastUpdated | date:'shortTime' }}</span>
        </div>
      </div>
    }
  `,
})
export class MarketPriceComparisonComponent implements OnInit {
  private readonly productService = inject(ProductService);
  readonly priceAlertService = inject(PriceAlertService);

  readonly productId = input.required<string>();
  readonly product = input<any | null>(null);
  readonly comparison = signal<MarketPriceComparisonResponse | null>(null);
  readonly isLoading = signal<boolean>(false);

  ngOnInit() {
    this.fetchComparison();
  }

  onTrackPriceClick() {
    const p = this.product();
    if (p) {
      this.priceAlertService.openModal(p);
      return;
    }
    const comp = this.comparison();
    if (comp) {
      this.priceAlertService.openModal({
        id: comp.productId,
        title: comp.productTitle,
        price: comp.nexusPrice,
        images: [],
        slug: '',
        storeName: 'Nexus Direct',
        stockQuantity: 10,
      } as any);
    }
  }

  fetchComparison() {
    const id = this.productId();
    if (!id) return;

    this.isLoading.set(true);
    this.productService.getMarketComparison(id).subscribe({
      next: (res) => {
        this.comparison.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load market price comparison:', err);
        this.isLoading.set(false);
      },
    });
  }
}
