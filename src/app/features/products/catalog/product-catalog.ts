import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { useDebounce } from '@core/hooks/use-debounce';
import { Category, Paginated, ProductView, Supplier, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ProductService } from '@core/services/product.service';
import { PriceAlertService } from '@core/services/price-alert.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCheck,
  LucideDollarSign,
  LucideHeart,
  LucideLayers,
  LucideRotateCcw,
  LucideSearch,
  LucideSlidersHorizontal,
  LucideStore,
  LucideX,
} from '@lucide/angular';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Loader } from '@shared/ui/loader/loader';
import { ProductCard } from '@shared/ui/product-card/product-card';
import { Select, SelectOption } from '@shared/ui/select/select';

import { ForexVolatilityBadge } from '@shared/ui/forex-volatility-badge/forex-volatility-badge';

@Component({
  selector: 'app-product-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForexVolatilityBadge,
    CurrencyPipe,
    FormsModule,
    EmptyState,
    Select,
    ProductCard,
    Loader,
    LucideSearch,
    LucideSlidersHorizontal,
    LucideRotateCcw,
    LucideX,
    LucideLayers,
    LucideDollarSign,
    LucideStore,
    LucideCheck,
    LucideHeart,
  ],
  templateUrl: './product-catalog.html',
})
export class ProductCatalog {
  private readonly productsApi = inject(ProductService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly priceAlert = inject(PriceAlertService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;

  readonly q = signal('');
  readonly categoryId = signal('');
  readonly supplierId = signal('');
  readonly maxPrice = signal(2500);
  readonly page = signal(1);

  // Dynamic price range bounds based on system product inventory
  readonly systemMinPrice = signal(0);
  readonly systemMaxPrice = signal(1000);

  // Debounced search query and max price signals created with custom hook
  readonly debouncedQ = useDebounce(this.q, 350);
  readonly debouncedMaxPrice = useDebounce(this.maxPrice, 350);

  readonly categories = signal<Category[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly result = signal<Paginated<ProductView> | null>(null);
  readonly wishIds = signal<Set<string>>(new Set());
  readonly loading = signal(true);

  readonly roots = computed(() => this.categories().filter((c) => !c.parentId));

  readonly vendorOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All vendors' },
    ...this.suppliers().map((s) => ({ value: s.id, label: s.storeName })),
  ]);

  readonly hasActiveFilters = computed(() => {
    return (
      !!this.q().trim() ||
      !!this.categoryId() ||
      !!this.supplierId() ||
      this.maxPrice() < this.systemMaxPrice()
    );
  });

  readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.q().trim()) count++;
    if (this.categoryId()) count++;
    if (this.supplierId()) count++;
    if (this.maxPrice() < this.systemMaxPrice()) count++;
    return count;
  });

  readonly activeCategoryName = computed(() => {
    const id = this.categoryId();
    if (!id) return null;
    return this.categories().find((c) => c.id === id)?.name ?? null;
  });

  readonly activeSupplierName = computed(() => {
    const id = this.supplierId();
    if (!id) return null;
    return this.suppliers().find((s) => s.id === id)?.storeName ?? null;
  });

  readonly quickPriceChips = computed(() => {
    const min = this.systemMinPrice();
    const max = this.systemMaxPrice();
    if (max <= min || max === 0) return [];
    const p25 = Math.round(min + (max - min) * 0.25);
    const p50 = Math.round(min + (max - min) * 0.5);
    const p75 = Math.round(min + (max - min) * 0.75);
    return [
      { label: `$${p25}`, value: p25 },
      { label: `$${p50}`, value: p50 },
      { label: `$${p75}`, value: p75 },
      { label: 'Max', value: max },
    ];
  });

  constructor() {
    this.catalog.categories().subscribe((c) => this.categories.set(c));
    this.catalog.suppliers().subscribe((s) => this.suppliers.set(s));
    if (this.auth.role() === UserRoles.CUSTOMER) {
      this.catalog.wishlist().subscribe((items) => this.wishIds.set(new Set(items.map((i) => i.id))));
    }

    this.productsApi.priceBounds().subscribe((bounds) => {
      this.systemMinPrice.set(bounds.minPrice);
      this.systemMaxPrice.set(bounds.maxPrice);
      // Initialize max price filter to the highest product price in system
      this.maxPrice.set(bounds.maxPrice);
    });

    // Effect triggers API requests when debounced signals or filters update
    effect(() => {
      const query = this.debouncedQ();
      const category = this.categoryId();
      const supplier = this.supplierId();
      const price = this.debouncedMaxPrice();
      const pg = this.page();

      this.load(query, category, supplier, price, pg);
    });
  }

  children(id: string) {
    return this.categories().filter((c) => c.parentId === id);
  }

  private load(
    qVal = this.debouncedQ(),
    catId = this.categoryId(),
    suppId = this.supplierId(),
    price = this.debouncedMaxPrice(),
    pg = this.page(),
  ) {
    this.loading.set(true);
    this.productsApi
      .list({
        q: qVal || undefined,
        categoryId: catId || undefined,
        supplierId: suppId || undefined,
        maxPrice: price,
        page: pg,
        pageSize: 9,
      })
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.loading.set(false);
          if (res.items && res.items.length) {
            this.priceAlert.checkPriceDrops(res.items);
          }
        },
        error: () => this.loading.set(false),
      });
  }

  onSearchInput(val: string) {
    this.q.set(val);
    this.page.set(1);
  }

  clearSearch() {
    this.q.set('');
    this.page.set(1);
  }

  onPriceChange(val: number) {
    this.maxPrice.set(val);
    this.page.set(1);
  }

  setQuickPrice(val: number) {
    this.maxPrice.set(val);
    this.page.set(1);
  }

  resetFilters() {
    this.q.set('');
    this.categoryId.set('');
    this.supplierId.set('');
    this.maxPrice.set(this.systemMaxPrice());
    this.page.set(1);
  }

  selectCategory(id: string) {
    this.categoryId.set(this.categoryId() === id ? '' : id);
    this.page.set(1);
  }

  setVendor(id: string) {
    this.supplierId.set(id);
    this.page.set(1);
  }

  pages(): number[] {
    const total = this.result()?.total ?? 0;
    const size = this.result()?.pageSize ?? 9;
    return Array.from({ length: Math.max(1, Math.ceil(total / size)) }, (_, i) => i + 1);
  }

  go(page: number) {
    this.page.set(page);
  }

  saved(id: string) {
    return this.wishIds().has(id);
  }

  toggleWish(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.catalog.toggleWishlist(id).subscribe((items) => {
      this.wishIds.set(new Set(items.map((i) => i.id)));
      this.toast.info('Wishlist updated');
    });
  }
}
