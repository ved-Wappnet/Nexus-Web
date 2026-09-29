import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ProductView } from '@core/models';
import { ToastService } from '@core/services/toast.service';

const COMPARE_STORAGE_KEY = 'nexus_compare_items';
const MAX_COMPARE_ITEMS = 4;

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly toast = inject(ToastService);

  readonly items = signal<ProductView[]>(this.readStorage());
  readonly isModalOpen = signal<boolean>(false);

  readonly count = computed(() => this.items().length);
  readonly isEmpty = computed(() => this.items().length === 0);
  readonly itemIds = computed(() => new Set(this.items().map((i) => i.id)));

  isInCompare(productId: string): boolean {
    return this.itemIds().has(productId);
  }

  toggle(product: ProductView) {
    if (this.isInCompare(product.id)) {
      this.remove(product.id);
    } else {
      this.add(product);
    }
  }

  add(product: ProductView) {
    if (this.isInCompare(product.id)) return;

    if (this.items().length >= MAX_COMPARE_ITEMS) {
      this.toast.error(`You can compare up to ${MAX_COMPARE_ITEMS} products at a time.`);
      return;
    }

    const updated = [...this.items(), product];
    this.items.set(updated);
    this.writeStorage(updated);
    this.toast.success(`Added "${product.title}" to comparison`);
  }

  remove(productId: string) {
    const updated = this.items().filter((i) => i.id !== productId);
    this.items.set(updated);
    this.writeStorage(updated);
    if (updated.length === 0) {
      this.isModalOpen.set(false);
    }
  }

  clear() {
    this.items.set([]);
    this.writeStorage([]);
    this.isModalOpen.set(false);
    this.toast.info('Cleared comparison list');
  }

  openModal() {
    if (this.isEmpty()) {
      this.toast.info('Select at least 1 product to compare.');
      return;
    }
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  private readStorage(): ProductView[] {
    if (!this.isBrowser) return [];
    try {
      const data = localStorage.getItem(COMPARE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private writeStorage(items: ProductView[]) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota storage error
    }
  }
}
