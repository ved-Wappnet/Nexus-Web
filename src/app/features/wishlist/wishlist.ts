import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ProductView } from '@core/models';
import { CatalogService } from '@core/services/catalog.service';
import { LucideTrash2 } from '@lucide/angular';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ProductCard } from '@shared/ui/product-card/product-card';

@Component({
  selector: 'app-wishlist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, ProductCard, LucideTrash2],
  template: `
    <h1 class="mb-6 text-2xl font-semibold tracking-tight">Wishlist</h1>
    @if (items().length === 0) {
      <app-empty-state title="Nothing saved yet" detail="Save items from the catalog." />
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        @for (product of items(); track product.id) {
          <app-product-card [product]="product">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition cursor-pointer select-none"
              (click)="remove($event, product.id)"
              title="Remove from wishlist"
            >
              <svg lucideTrash2 class="h-3.5 w-3.5"></svg>
              <span>Remove</span>
            </button>
          </app-product-card>
        }
      </div>
    }
  `,
})
export class Wishlist {
  private readonly catalog = inject(CatalogService);
  readonly items = signal<ProductView[]>([]);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.catalog.wishlist().subscribe((items) => this.items.set(items));
  }

  remove(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.catalog.toggleWishlist(id).subscribe((items) => this.items.set(items));
  }
}
