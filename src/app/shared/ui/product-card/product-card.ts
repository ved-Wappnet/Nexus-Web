import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductView, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CartService } from '@core/services/cart.service';
import { CompareService } from '@core/services/compare.service';
import { PriceAlertService } from '@core/services/price-alert.service';
import { RfqService } from '@core/services/rfq.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import {
  LucideBuilding2,
  LucideCheck,
  LucideColumns3,
  LucideEye,
  LucideFileText,
  LucideShoppingBag,
  LucideTrendingDown,
} from '@lucide/angular';
import { LiveStockBadge } from '@shared/ui/live-stock-badge/live-stock-badge';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NexusCurrencyPipe,
    RouterLink,
    LucideColumns3,
    LucideCheck,
    LucideTrendingDown,
    LucideShoppingBag,
    LucideFileText,
    LucideEye,
    LucideBuilding2,
    LiveStockBadge,
  ],
  template: `
    <div
      class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/50"
    >
      <!-- Quick Price Alert Button (Top Left) -->
      @if (!auth.role() || auth.role() === UserRoles.CUSTOMER) {
        <button
          type="button"
          class="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition backdrop-blur-md shadow-md cursor-pointer select-none"
          [class]="
            priceAlertService.hasAlert(product().id)
              ? 'border-indigo-500/60 bg-indigo-600 text-white shadow-indigo-950/40'
              : 'border-zinc-700/80 bg-zinc-950/85 text-zinc-200 hover:border-indigo-500/50 hover:text-white hover:bg-zinc-900'
          "
          (click)="openPriceAlertModal($event)"
          title="Watch Price Alert"
        >
          <svg lucideTrendingDown class="h-3.5 w-3.5 text-indigo-400"></svg>
          <span>{{ priceAlertService.hasAlert(product().id) ? 'Watching' : 'Watch' }}</span>
        </button>
      }

      <!-- Quick Compare Button Header Overlay (Top Right) -->
      <button
        type="button"
        class="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition backdrop-blur-md shadow-md cursor-pointer select-none"
        [class]="
          compare.isInCompare(product().id)
            ? 'border-indigo-500/60 bg-indigo-600 text-white shadow-indigo-950/40'
            : 'border-zinc-700/80 bg-zinc-950/85 text-zinc-200 hover:border-indigo-500/50 hover:text-white hover:bg-zinc-900'
        "
        (click)="toggleCompare($event)"
        title="Compare product"
      >
        @if (compare.isInCompare(product().id)) {
          <svg lucideCheck class="h-3.5 w-3.5 text-white"></svg>
          <span>Added</span>
        } @else {
          <svg lucideColumns3 class="h-3.5 w-3.5 text-indigo-400"></svg>
          <span>Compare</span>
        }
      </button>

      <!-- Clickable Product Image & Details Link -->
      <a [routerLink]="['/products', product().slug]" class="block">
        <div class="relative overflow-hidden aspect-4/3 bg-zinc-950">
          @if (product().images && product().images.length > 0 && product().images[0].url) {
            <img
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              [src]="product().images[0].url"
              [alt]="product().title"
              loading="lazy"
            />
          } @else {
            <div class="h-full w-full flex items-center justify-center text-xs text-zinc-500 font-medium">No Image</div>
          }
        </div>

        <div class="p-4 pb-2.5 space-y-1.5">
          <p class="text-xs uppercase tracking-wider text-indigo-400 font-bold truncate">{{ product().storeName }}</p>
          <h2 class="font-bold text-zinc-100 group-hover:text-indigo-300 transition line-clamp-1 text-base leading-snug">{{ product().title }}</h2>

          <!-- Real-Time Factory Stock Indicator -->
          <div class="pt-1">
            <app-live-stock-badge
              [stockQuantity]="product().stockQuantity"
              [categoryName]="product().categoryName"
              [compact]="true"
            />
          </div>
        </div>
      </a>

      <!-- Card Footer Actions (Separated from product detail link) -->
      <div class="p-4 pt-3 border-t border-zinc-800/60 mt-auto space-y-3">
        <!-- Row 1: Price and Secondary Action -->
        <div class="flex items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-1.5 min-w-0">
            <span class="text-lg sm:text-xl font-extrabold text-zinc-100 font-mono tracking-tight truncate">
              {{ product().price | nexusCurrency }}
            </span>
            <span class="text-xs text-zinc-400 font-medium shrink-0">/ unit</span>
          </div>

          <div class="shrink-0 flex items-center">
            <ng-content />
          </div>
        </div>

        <!-- Row 2: Full-width Dual Primary Action Buttons (Role-aware) -->
        @if (!auth.role() || auth.role() === UserRoles.CUSTOMER) {
          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              (click)="openRfqModal($event)"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer whitespace-nowrap select-none"
              title="Request Wholesale Bulk Quote"
            >
              <svg lucideFileText class="h-4 w-4"></svg>
              <span>Bulk RFQ</span>
            </button>
            <button
              type="button"
              (click)="addToCart($event)"
              class="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-950/40 transition cursor-pointer whitespace-nowrap select-none"
              title="Add to Cart"
            >
              <svg lucideShoppingBag class="h-4 w-4"></svg>
              <span>Add to Cart</span>
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-2 gap-2.5">
            <a
              [routerLink]="['/products', product().slug]"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition cursor-pointer whitespace-nowrap select-none text-center"
              title="View Product Specifications"
            >
              <svg lucideEye class="h-4 w-4 text-indigo-400"></svg>
              <span>View Specs</span>
            </a>
            <a
              routerLink="/products/manage"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-indigo-200 hover:text-white shadow-md shadow-indigo-950/40 transition cursor-pointer whitespace-nowrap select-none text-center"
              title="Manage in Catalog"
            >
              <svg lucideBuilding2 class="h-4 w-4 text-indigo-300"></svg>
              <span>Manage</span>
            </a>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProductCard {
  readonly product = input.required<ProductView>();
  readonly compare = inject(CompareService);
  readonly cart = inject(CartService);
  readonly priceAlertService = inject(PriceAlertService);
  readonly rfqService = inject(RfqService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;

  toggleCompare(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.compare.toggle(this.product());
  }

  addToCart(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.auth.role() && this.auth.role() !== UserRoles.CUSTOMER) {
      return;
    }
    this.cart.addItem(this.product(), 1);
  }

  openPriceAlertModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.priceAlertService.openModal(this.product());
  }

  openRfqModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.rfqService.openModal(this.product());
  }
}

