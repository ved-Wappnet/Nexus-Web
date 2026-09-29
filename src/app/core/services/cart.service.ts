import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ProductView, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

export interface CartItem {
  product: ProductView;
  quantity: number;
}

const CART_STORAGE_KEY = 'nexus_shopping_cart_v1';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly items = signal<CartItem[]>(this.readStorage());
  readonly isOpen = signal<boolean>(false);

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

  readonly itemCount = computed(() =>
    this.items().reduce((total, item) => total + item.quantity, 0)
  );

  readonly totalAmount = computed(() =>
    this.items().reduce(
      (total, item) => total + Number(item.product.price) * item.quantity,
      0
    )
  );

  readonly isEmpty = computed(() => this.items().length === 0);

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
