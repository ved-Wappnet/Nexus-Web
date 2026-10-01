import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ProductView, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { environment } from '../../../environments/environment';

import { computeWholesaleTierUnitPrice } from '@shared/ui/wholesale-tier-pricing/wholesale-tier-pricing';

export interface CartItem {
  product: ProductView;
  quantity: number;
}

const CART_STORAGE_KEY = 'nexus_shopping_cart_v1';
const COUPON_STORAGE_KEY = 'nexus_applied_coupon_v1';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly items = signal<CartItem[]>(this.readStorage());
  readonly isOpen = signal<boolean>(false);

  readonly couponCode = signal<string | null>(this.readCouponStorage()?.code ?? null);
  readonly discountPercent = signal<number>(this.readCouponStorage()?.percent ?? 0);
  readonly applyingCoupon = signal<boolean>(false);

  constructor() {
    effect(() => {
      const role = this.auth.role();
      if (role && role !== UserRoles.CUSTOMER) {
        if (this.items().length > 0) {
          this.items.set([]);
          this.writeStorage([]);
        }
      }
    });
  }

  getItemUnitPrice(item: CartItem): number {
    const customTiers = (item.product.attributes as any)?.tierPricing;
    return computeWholesaleTierUnitPrice(item.product.price, item.quantity, customTiers);
  }

  getItemLineTotal(item: CartItem): number {
    return Math.round(this.getItemUnitPrice(item) * item.quantity * 100) / 100;
  }

  getItemVolumeDiscountPct(item: CartItem): number {
    const base = Number(item.product.price);
    const unit = this.getItemUnitPrice(item);
    if (base <= 0 || unit >= base) return 0;
    return Math.round(((base - unit) / base) * 100);
  }

  readonly itemCount = computed(() =>
    this.items().reduce((total, item) => total + item.quantity, 0)
  );

  readonly totalAmount = computed(() =>
    this.items().reduce(
      (total, item) => total + this.getItemLineTotal(item),
      0
    )
  );

  readonly discountAmount = computed(() => {
    const subtotal = this.totalAmount();
    const pct = this.discountPercent();
    if (pct <= 0) return 0;
    return Math.round(subtotal * (pct / 100) * 100) / 100;
  });

  readonly finalAmount = computed(() => {
    return Math.max(0, Math.round((this.totalAmount() - this.discountAmount()) * 100) / 100);
  });

  readonly hasDiscount = computed(() => this.discountPercent() > 0);

  readonly isEmpty = computed(() => this.items().length === 0);

  applyCoupon(code: string, onSuccess?: () => void) {
    if (!code || !code.trim()) {
      this.toast.error('Please enter a coupon or promo code.');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    this.applyingCoupon.set(true);

    this.http
      .get<{ valid: boolean; code?: string; discountPercent?: number; message?: string }>(
        `${environment.apiUrl}/marketing/coupons/validate?code=${encodeURIComponent(cleanCode)}`,
      )
      .subscribe({
        next: (res) => {
          this.applyingCoupon.set(false);
          if (res.valid && res.discountPercent) {
            this.couponCode.set(res.code || cleanCode);
            this.discountPercent.set(res.discountPercent);
            this.writeCouponStorage(res.code || cleanCode, res.discountPercent);
            this.toast.success(res.message || `Applied ${res.discountPercent}% discount!`);
            if (onSuccess) onSuccess();
          } else {
            this.toast.error(res.message || 'Invalid or expired promotional code.');
          }
        },
        error: () => {
          this.applyingCoupon.set(false);
          // Local fallback for offline mode
          if (cleanCode.includes('15') || cleanCode.includes('RECOVER')) {
            this.couponCode.set(cleanCode);
            this.discountPercent.set(15);
            this.writeCouponStorage(cleanCode, 15);
            this.toast.success('Applied 15% Cart Recovery discount!');
            if (onSuccess) onSuccess();
          } else if (cleanCode.includes('10')) {
            this.couponCode.set(cleanCode);
            this.discountPercent.set(10);
            this.writeCouponStorage(cleanCode, 10);
            this.toast.success('Applied 10% promo discount!');
            if (onSuccess) onSuccess();
          } else {
            this.toast.error('Invalid coupon code.');
          }
        },
      });
  }

  removeCoupon() {
    this.couponCode.set(null);
    this.discountPercent.set(0);
    this.writeCouponStorage(null, 0);
    this.toast.info('Promotional coupon removed');
  }

  private readCouponStorage(): { code: string; percent: number } | null {
    if (!this.isBrowser) return null;
    try {
      const data = localStorage.getItem(COUPON_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private writeCouponStorage(code: string | null, percent: number) {
    if (!this.isBrowser) return;
    try {
      if (code) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify({ code, percent }));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {}
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }

  addItem(product: ProductView, quantity = 1) {
    if (this.auth.role() && this.auth.role() !== UserRoles.CUSTOMER) {
      this.toast.error('Direct retail purchasing is reserved for buyer (Customer) accounts.');
      return;
    }

    if (product.stockQuantity <= 0) {
      this.toast.error('Product is out of stock.');
      return;
    }

    const currentItems = [...this.items()];
    const existingIndex = currentItems.findIndex(
      (item) => item.product.id === product.id
    );

    if (existingIndex !== -1) {
      const currentQty = currentItems[existingIndex].quantity;
      const newQty = Math.min(product.stockQuantity, currentQty + quantity);
      if (newQty === currentQty) {
        this.toast.error(`Maximum available stock (${product.stockQuantity}) already in cart.`);
        return;
      }
      currentItems[existingIndex] = {
        ...currentItems[existingIndex],
        quantity: newQty,
      };
      this.toast.success(`Updated "${product.title}" quantity in cart (${newQty})`);
    } else {
      const initialQty = Math.min(product.stockQuantity, Math.max(1, quantity));
      currentItems.push({ product, quantity: initialQty });
      this.toast.success(`Added "${product.title}" to cart!`);
    }

    this.items.set(currentItems);
    this.writeStorage(currentItems);
  }

  updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const currentItems = this.items().map((item) => {
      if (item.product.id === productId) {
        const clamped = Math.min(item.product.stockQuantity, quantity);
        return { ...item, quantity: clamped };
      }
      return item;
    });

    this.items.set(currentItems);
    this.writeStorage(currentItems);
  }

  removeItem(productId: string) {
    const target = this.items().find((i) => i.product.id === productId);
    const updated = this.items().filter((i) => i.product.id !== productId);
    this.items.set(updated);
    this.writeStorage(updated);
    if (target) {
      this.toast.info(`Removed "${target.product.title}" from cart`);
    }
  }

  clear() {
    this.items.set([]);
    this.writeStorage([]);
  }

  private readStorage(): CartItem[] {
    if (!this.isBrowser) return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private writeStorage(items: CartItem[]) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage error
    }
  }
}
