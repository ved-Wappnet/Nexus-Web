import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-live-stock-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm transition max-w-full overflow-hidden shrink-0"
      [class]="badgeStyles()"
    >
      <!-- Pulsing Live Indicator Dot -->
      <span class="relative flex h-2 w-2 shrink-0">
        @if (status() === 'low') {
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        } @else if (status() === 'healthy') {
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        } @else {
          <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        }
      </span>

      <!-- Stock Info Text -->
      <div class="flex items-center gap-1.5 min-w-0 truncate text-[11px]">
        @if (status() === 'low') {
          <span class="text-amber-300 font-bold whitespace-nowrap">Only {{ stockQuantity() }} Left!</span>
        } @else if (status() === 'healthy') {
          <span class="text-emerald-300 font-medium whitespace-nowrap">
            {{ compact() ? (stockQuantity() + ' in stock') : ('In Stock (' + stockQuantity() + ' units)') }}
          </span>
        } @else {
          <span class="text-rose-400 font-medium whitespace-nowrap">Out of Stock</span>
        }

        @if (showWarehouseLocation() && !compact() && status() !== 'out') {
          <span class="text-zinc-500">·</span>
          <span class="text-zinc-400 font-normal truncate">{{ warehouseLocation() }}</span>
        }
      </div>

      <!-- Shipping Tag badge if compact is false -->
      @if (!compact() && status() !== 'out') {
        <span class="rounded bg-zinc-800/90 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-indigo-300 border border-indigo-500/20 shrink-0">
          {{ shippingLeadTime() }}
        </span>
      }
    </div>
  `,
})
export class LiveStockBadge {
  readonly stockQuantity = input.required<number>();
  readonly categoryName = input<string>('');
  readonly showWarehouseLocation = input<boolean>(true);
  readonly compact = input<boolean>(false);

  readonly status = computed<'low' | 'healthy' | 'out'>(() => {
    const qty = this.stockQuantity();
    if (qty <= 0) return 'out';
    if (qty <= 5) return 'low';
    return 'healthy';
  });

  readonly badgeStyles = computed(() => {
    switch (this.status()) {
      case 'low':
        return 'border-amber-500/30 bg-amber-950/40 text-amber-200';
      case 'healthy':
        return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200';
      case 'out':
        return 'border-rose-500/30 bg-rose-950/40 text-rose-300';
    }
  });

  readonly warehouseLocation = computed(() => {
    const cat = (this.categoryName() || '').toLowerCase();
    if (cat.includes('phone') || cat.includes('mobile')) return 'Shenzhen Logistics Hub';
    if (cat.includes('computer') || cat.includes('laptop')) return 'California Tech Depot';
    if (cat.includes('audio') || cat.includes('sound')) return 'Frankfurt Hardware Hub';
    if (cat.includes('watch') || cat.includes('wearable')) return 'Tokyo Precision Hub';
    return 'Direct Factory Warehouse';
  });

  readonly shippingLeadTime = computed(() => {
    return this.status() === 'low' ? 'Ships in 12h' : 'Express Air Freight';
  });
}
