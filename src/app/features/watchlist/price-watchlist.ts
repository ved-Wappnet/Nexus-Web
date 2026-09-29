import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductStatuses, ProductView } from '@core/models';
import { PriceAlertItem, PriceAlertService } from '@core/services/price-alert.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import {
  LucideArrowRight,
  LucidePencil,
  LucideShoppingBag,
  LucideSparkles,
  LucideTag,
  LucideTrash2,
  LucideTrendingDown,
} from '@lucide/angular';

@Component({
  selector: 'app-price-watchlist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NexusCurrencyPipe,
    RouterLink,
    LucideTrendingDown,
    LucideTag,
    LucideSparkles,
    LucideTrash2,
    LucidePencil,
    LucideShoppingBag,
    LucideArrowRight,
  ],
  templateUrl: './price-watchlist.html',
})
export class PriceWatchlist {
  readonly priceAlert = inject(PriceAlertService);

  readonly items = computed(() => this.priceAlert.alerts());

  readonly totalTracked = computed(() => this.items().length);

  readonly triggeredCount = computed(() => this.items().filter((i) => i.currentPrice <= i.targetPrice).length);

  readonly totalPotentialSavings = computed(() => {
    return this.items().reduce((sum, item) => {
      const savings = Math.max(0, item.initialPrice - item.targetPrice);
      return sum + savings;
    }, 0);
  });

  openEditModal(item: PriceAlertItem) {
    const productView: ProductView = {
      id: item.productId,
      title: item.productTitle,
      slug: item.productSlug,
      description: '',
      price: item.currentPrice,
      stockQuantity: 10,
      status: ProductStatuses.APPROVED,
      categoryId: '',
      categoryName: 'Hardware',
      supplierId: '',
      storeName: item.storeName,
      images: item.productImage ? [{ url: item.productImage, alt: item.productTitle, isPrimary: true }] : [],
      attributes: {},
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
    };
    this.priceAlert.openModal(productView);
  }

  removeAlert(productId: string) {
    this.priceAlert.removeAlert(productId);
  }
}
