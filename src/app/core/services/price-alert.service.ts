import { computed, inject, Injectable, signal } from '@angular/core';
import { ProductView } from '@core/models';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import {
  CreatePriceAlertPayload,
  PriceAlertType,
  ProductService,
  UserPriceAlertItem,
} from './product.service';

export interface PriceAlertItem {
  id?: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productImage?: string;
  storeName: string;
  initialPrice: number;
  targetPrice: number;
  currentPrice: number;
  alertType?: PriceAlertType;
  competitorMarginPercent?: number;
  createdAt: string;
  isTriggered: boolean;
  email?: string;
}

const LOCAL_STORAGE_KEY = 'nexus_price_alerts_v1';

@Injectable({ providedIn: 'root' })
export class PriceAlertService {
  private readonly toast = inject(ToastService);
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);

  readonly activeModalProduct = signal<ProductView | null>(null);
  readonly alerts = signal<PriceAlertItem[]>(this.loadStorage());
  readonly isSaving = signal<boolean>(false);

  readonly activeCount = computed(() => this.alerts().length);
  readonly triggeredCount = computed(
    () =>
      this.alerts().filter(
        (a) => a.targetPrice !== null && a.currentPrice <= a.targetPrice,
      ).length,
  );

  constructor() {
    // If user is authenticated, attempt to fetch backend alerts
    if (this.auth.isAuthenticated()) {
      this.fetchUserAlerts();
    }
  }

  fetchUserAlerts() {
    this.productService.getMyPriceAlerts().subscribe({
      next: (serverAlerts) => {
        if (serverAlerts && serverAlerts.length > 0) {
          const mapped: PriceAlertItem[] = serverAlerts.map((sa) => ({
            id: sa.id,
            productId: sa.productId,
            productTitle: sa.productTitle,
            productSlug: sa.productSlug,
            productImage: sa.productImage || undefined,
            storeName: 'Nexus Direct',
            initialPrice: sa.initialPrice,
            targetPrice: sa.targetPrice ?? sa.initialPrice,
            currentPrice: sa.currentPrice,
            alertType: sa.alertType,
            competitorMarginPercent: sa.competitorMarginPercent,
            createdAt: sa.createdAt,
            isTriggered: sa.targetPrice !== null && sa.currentPrice <= sa.targetPrice,
          }));
          this.saveStorage(mapped);
        }
      },
      error: () => {
        // Fallback silently to localStorage
      },
    });
  }

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

  setAlert(
    product: ProductView,
    payload: {
      email: string;
      alertType: PriceAlertType;
      targetPrice?: number;
      competitorMarginPercent?: number;
    },
    onSuccess?: () => void,
  ) {
    this.isSaving.set(true);

    const primaryImg =
      product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url;

    // Send to backend API
    this.productService
      .createPriceAlert(product.id, {
        email: payload.email,
        alertType: payload.alertType,
        targetPrice: payload.targetPrice,
        competitorMarginPercent: payload.competitorMarginPercent,
      })
      .subscribe({
        next: (savedServer) => {
          this.isSaving.set(false);

          const newItem: PriceAlertItem = {
            id: savedServer.id,
            productId: product.id,
            productTitle: product.title,
            productSlug: product.slug,
            productImage: primaryImg,
            storeName: product.storeName || 'Nexus Direct',
            initialPrice: product.price,
            targetPrice: payload.targetPrice ?? product.price,
            currentPrice: product.price,
            alertType: payload.alertType,
            competitorMarginPercent: payload.competitorMarginPercent ?? 10,
            email: payload.email,
            createdAt: new Date().toISOString(),
            isTriggered: payload.targetPrice ? product.price <= payload.targetPrice : false,
          };

          const existing = this.alerts();
          const updated = existing.filter((a) => a.productId !== product.id);
          updated.push(newItem);
          this.saveStorage(updated);

          const alertTypeDesc =
            payload.alertType === 'BELOW_TARGET'
              ? `below $${payload.targetPrice}`
              : payload.alertType === 'COMPETITOR_BEAT'
              ? `when beating Amazon/Flipkart by ${payload.competitorMarginPercent}%`
              : 'on any price drop';

          this.toast.success(
            `Price watch active for "${product.title}" (${alertTypeDesc})! Notification will be sent to ${payload.email}.`,
          );

          if (onSuccess) onSuccess();
        },
        error: (err) => {
          this.isSaving.set(false);
          // Fallback to local storage if offline
          const newItem: PriceAlertItem = {
            productId: product.id,
            productTitle: product.title,
            productSlug: product.slug,
            productImage: primaryImg,
            storeName: product.storeName || 'Nexus Direct',
            initialPrice: product.price,
            targetPrice: payload.targetPrice ?? product.price,
            currentPrice: product.price,
            alertType: payload.alertType,
            competitorMarginPercent: payload.competitorMarginPercent ?? 10,
            email: payload.email,
            createdAt: new Date().toISOString(),
            isTriggered: payload.targetPrice ? product.price <= payload.targetPrice : false,
          };

          const existing = this.alerts();
          const updated = existing.filter((a) => a.productId !== product.id);
          updated.push(newItem);
          this.saveStorage(updated);

          this.toast.success(`Price watch alert saved locally for ${product.title}!`);
          if (onSuccess) onSuccess();
        },
      });
  }

  removeAlert(productId: string) {
    const existing = this.getAlert(productId);
    const alertId = existing?.id;
    const email = existing?.email || this.auth.currentUser()?.email;

    if (alertId) {
      this.productService.cancelPriceAlert(alertId, email).subscribe({
        next: () => {},
        error: () => {},
      });
    }

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
        const isTriggered = item.targetPrice !== null && p.price <= item.targetPrice;
        const updatedItem = {
          ...item,
          currentPrice: p.price,
          isTriggered,
        };
        currentAlerts[idx] = updatedItem;

        if (isTriggered && !item.isTriggered) {
          triggeredAny = true;
          this.toast.success(
            `🔥 PRICE DROP ALERT! ${p.title} is now $${p.price} (Target: $${item.targetPrice})!`,
          );
        }
      }
    }

    if (triggeredAny) {
      this.saveStorage(currentAlerts);
    }
  }
}
