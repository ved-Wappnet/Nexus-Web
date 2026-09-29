import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PriceAlertService } from '@core/services/price-alert.service';
import { LucideBell, LucideExternalLink, LucideSparkles, LucideTrash2, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-price-alert-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, LucideBell, LucideTrash2, LucideX, LucideExternalLink, LucideSparkles],
  template: `
    <!-- Header Bell Trigger Button -->
    <button
      type="button"
      (click)="isOpen.set(true)"
      class="relative flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-indigo-500/50 hover:text-white transition cursor-pointer"
      title="Price Drop Watchlist"
    >
      <svg lucideBell class="h-4 w-4 text-indigo-400"></svg>
      @if (priceAlert.activeCount() > 0) {
        <span
          class="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shadow-md shadow-indigo-600/40 animate-pulse"
        >
          {{ priceAlert.activeCount() }}
        </span>
      }
    </button>

    <!-- Slide-over Drawer Overlay -->
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 overflow-hidden">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          (click)="isOpen.set(false)"
        ></div>

        <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div class="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col">
            <!-- Header -->
            <div class="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div class="flex items-center gap-3">
                <div class="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <svg lucideBell class="h-4 w-4"></svg>
                </div>
                <div>
                  <h3 class="text-base font-bold text-white tracking-tight">Price Drop Watchlist</h3>
                  <p class="text-xs text-zinc-400">{{ priceAlert.activeCount() }} Active Price Monitors</p>
                </div>
              </div>

              <button
                type="button"
                (click)="isOpen.set(false)"
                class="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white transition"
              >
                <svg lucideX class="h-4 w-4"></svg>
              </button>
            </div>

            <!-- Drawer Content List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3">
              @if (priceAlert.alerts().length === 0) {
                <div class="text-center py-16 px-4">
                  <div class="mx-auto h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                    <svg lucideBell class="h-6 w-6"></svg>
                  </div>
                  <h4 class="text-sm font-bold text-zinc-300">No Price Alerts Set</h4>
                  <p class="mt-1 text-xs text-zinc-500 max-w-xs mx-auto">
                    Click the bell icon on any product to set your target trigger price and track discounts.
                  </p>
                </div>
              } @else {
                @for (item of priceAlert.alerts(); track item.productId) {
                  <div class="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-3 hover:border-zinc-700 transition">
                    <div class="flex items-center gap-3">
                      @if (item.productImage) {
                        <img [src]="item.productImage" [alt]="item.productTitle" class="h-14 w-14 rounded-xl object-cover border border-zinc-800" />
                      } @else {
                        <div class="h-14 w-14 rounded-xl bg-zinc-800 flex items-center justify-center text-xs text-zinc-600">No Img</div>
                      }

                      <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 truncate">{{ item.storeName }}</p>
                        <h4 class="text-xs font-bold text-zinc-100 truncate">{{ item.productTitle }}</h4>
                        <div class="mt-1 flex items-center gap-2 text-xs">
                          <span class="text-zinc-400">Target: <strong class="font-mono text-indigo-300">{{ item.targetPrice | currency }}</strong></span>
                          <span class="text-zinc-600">·</span>
                          <span class="text-zinc-400">Current: <strong class="font-mono text-emerald-400">{{ item.currentPrice | currency }}</strong></span>
                        </div>
                      </div>
                    </div>

                    <!-- Trigger Status Banner -->
                    @if (item.currentPrice <= item.targetPrice) {
                      <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-2 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 animate-pulse">
                        <svg lucideSparkles class="h-3.5 w-3.5"></svg>
                        <span>TARGET PRICE REACHED! DISCOUNT ACTIVE</span>
                      </div>
                    }

                    <!-- Actions -->
                    <div class="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                      <a
                        [routerLink]="['/products', item.productSlug]"
                        (click)="isOpen.set(false)"
                        class="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <span>View Product</span>
                        <svg lucideExternalLink class="h-3 w-3"></svg>
                      </a>

                      <button
                        type="button"
                        (click)="priceAlert.removeAlert(item.productId)"
                        class="inline-flex items-center gap-1 font-medium text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <svg lucideTrash2 class="h-3 w-3"></svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class PriceAlertDrawer {
  readonly priceAlert = inject(PriceAlertService);
  readonly isOpen = signal(false);
}
