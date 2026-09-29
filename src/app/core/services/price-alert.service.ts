import { computed, inject, Injectable, signal } from '@angular/core';
import { ProductView } from '@core/models';
import { ToastService } from './toast.service';

export interface PriceAlertItem {
  productId: string;
  productTitle: string;
  productSlug: string;
  productImage?: string;
  storeName: string;
  initialPrice: number;
  targetPrice: number;
  currentPrice: number;
  createdAt: string;
  isTriggered: boolean;
}

const LOCAL_STORAGE_KEY = 'nexus_price_alerts_v1';

@Injectable({ providedIn: 'root' })
export class PriceAlertService {
  private readonly toast = inject(ToastService);
  readonly activeModalProduct = signal<ProductView | null>(null);
  readonly alerts = signal<PriceAlertItem[]>(this.loadStorage());

  readonly activeCount = computed(() => this.alerts().length);
  readonly triggeredCount = computed(() => this.alerts().filter((a) => a.currentPrice <= a.targetPrice).length);

  openModal(product: ProductView) {
    this.activeModalProduct.set(product);
  }

  closeModal() {
    this.activeModalProduct.set(null);
  }

  private loadStorage(): PriceAlertItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStorage(items: PriceAlertItem[]) {
    this.alerts.set(items);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  }

  setAlert(product: ProductView, targetPrice: number): PriceAlertItem {
    const existing = this.alerts();
    const primaryImg = product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url;

    const newItem: PriceAlertItem = {
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      productImage: primaryImg,
      storeName: product.storeName,
      initialPrice: product.price,
      targetPrice: Math.round(targetPrice * 100) / 100,
      currentPrice: product.price,
      createdAt: new Date().toISOString(),
      isTriggered: product.price <= targetPrice,
    };

    const updated = existing.filter((a) => a.productId !== product.id);
    updated.push(newItem);
    this.saveStorage(updated);

    this.toast.success(
      `Price drop alert set for ${product.title} at $${newItem.targetPrice.toLocaleString()}!`
    );
    return newItem;
  }

  removeAlert(productId: string) {
    const updated = this.alerts().filter((a) => a.productId !== productId);
    this.saveStorage(updated);
    this.toast.success('Price alert removed from watchlist');
  }

  getAlert(productId: string): PriceAlertItem | undefined {
    return this.alerts().find((a) => a.productId === productId);
  }

  hasAlert(productId: string): boolean {
    return this.alerts().some((a) => a.productId === productId);
  }

  checkPriceDrops(products: ProductView[]) {
    let triggeredAny = false;
    const currentAlerts = [...this.alerts()];

    for (const p of products) {
      const idx = currentAlerts.findIndex((a) => a.productId === p.id);
      if (idx !== -1) {
        const item = currentAlerts[idx];
        const updatedItem = {
          ...item,
          currentPrice: p.price,
          isTriggered: p.price <= item.targetPrice,
        };
        currentAlerts[idx] = updatedItem;

        if (p.price <= item.targetPrice && !item.isTriggered) {
          triggeredAny = true;
          this.toast.success(
            `🔥 PRICE DROP ALERT! ${p.title} is now $${p.price} (Target: $${item.targetPrice})!`
          );
        }
      }
    }

    if (triggeredAny) {
      this.saveStorage(currentAlerts);
    }
  }
}
