import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductView } from '@core/models';
import { CompareService } from '@core/services/compare.service';
import { formatLabel } from '@core/utils/format.utils';
import {
  LucideCheck,
  LucideColumns3,
  LucideExternalLink,
  LucideEye,
  LucideFilter,
  LucideSparkles,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';

interface SpecGroup {
  name: string;
  keys: string[];
}

const SPEC_GROUPS: SpecGroup[] = [
  {
    name: '⚡ Performance & Processing',
    keys: ['Processor', 'GPU', 'RAM', 'Storage', 'OS'],
  },
  {
    name: '📱 Display & Visuals',
    keys: ['Display Refresh Rate', 'Display Size & Type', 'Display'],
  },
  {
    name: '🔋 Battery & Power',
    keys: ['Battery Capacity', 'Battery Life', 'Power Output'],
  },
  {
    name: '📸 Camera & Multimedia',
    keys: ['Main Camera', 'Audio Driver', 'Noise Cancellation'],
  },
  {
    name: '🛡️ Build & Durability',
    keys: ['Weight & Build', 'Water Resistance', 'Waterproofing', 'Frame', 'Material', 'Weight'],
  },
  {
    name: '🌐 Network & Connectivity',
    keys: ['5G Network', 'Connectivity', 'Bluetooth', 'Ports', 'Sensors'],
  },
];

@Component({
  selector: 'app-compare-matrix-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    RouterLink,
    LucideColumns3,
    LucideX,
    LucideTrash2,
    LucideSparkles,
    LucideExternalLink,
    LucideCheck,
    LucideFilter,
    LucideEye,
  ],
  template: `
    @if (compare.isModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in">
        <div
          class="relative flex h-[92vh] w-full max-w-7xl flex-col rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black overflow-hidden"
        >
          <!-- Modal Header -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-6 py-4 bg-zinc-900/60">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <svg lucideColumns3 class="h-5 w-5"></svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-lg font-semibold tracking-tight text-zinc-100">Deep Specification Comparison</h2>
                  <span class="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                    {{ compare.count() }} Products
                  </span>
                </div>
                <p class="text-xs text-zinc-400">Detailed side-by-side technical breakdown (Processors, Hz, Battery, RAM, Build & More)</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <!-- Highlight Differences Toggle -->
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                [class]="
                  onlyDifferences()
                    ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                "
                (click)="toggleOnlyDifferences()"
                title="Toggle highlighting only specifications that differ between items"
              >
                @if (onlyDifferences()) {
                  <svg lucideEye class="h-3.5 w-3.5 text-indigo-400"></svg>
                  <span>Differences Only</span>
                } @else {
                  <svg lucideFilter class="h-3.5 w-3.5 text-zinc-400"></svg>
                  <span>Show All Specs</span>
                }
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                (click)="compare.clear()"
              >
                <svg lucideTrash2 class="h-3.5 w-3.5"></svg>
                <span>Clear</span>
              </button>

              <button
                type="button"
                aria-label="Close comparison matrix"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
                (click)="compare.closeModal()"
              >
                <svg lucideX class="h-4 w-4"></svg>
              </button>
            </div>
          </div>

          <!-- Modal Scrollable Content Table -->
          <div class="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
            <div class="min-w-[700px]">
              <table class="w-full border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-zinc-800">
                    <th class="w-52 pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">Specifications</th>
                    @for (product of compare.items(); track product.id) {
                      <th class="pb-4 px-3 align-top w-1/4">
                        <div class="relative rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-center group hover:border-indigo-500/40 transition shadow-lg">
                          <!-- Remove Item Button -->
                          <button
                            type="button"
                            aria-label="Remove item"
                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                            (click)="compare.remove(product.id)"
                            title="Remove product"
                          >
                            <svg lucideX class="h-3.5 w-3.5"></svg>
                          </button>

                          <!-- Product Image -->
                          <div class="mx-auto mb-3 h-28 w-28 overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner">
                            @if (product.images && product.images[0]?.url) {
                              <img [src]="product.images[0].url" [alt]="product.title" class="h-full w-full object-cover" />
                            } @else {
                              <span class="text-xs text-zinc-600">No Image</span>
                            }
                          </div>

                          <p class="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 truncate">{{ product.storeName }}</p>
                          <h3 class="font-bold text-zinc-100 truncate mt-0.5" [title]="product.title">{{ product.title }}</h3>

                          @if (product.id === lowestPriceProductId()) {
                            <div class="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                              <svg lucideSparkles class="h-3.5 w-3.5"></svg>
                              <span>Lowest Price</span>
                            </div>
                          }
                        </div>
                      </th>
                    }
                  </tr>
                </thead>

                <tbody class="divide-y divide-zinc-800/60">
                  <!-- Pricing & Core Details Section -->
                  <tr class="bg-zinc-900/40">
                    <td [attr.colspan]="compare.count() + 1" class="py-2.5 px-3 font-extrabold text-indigo-300 text-xs uppercase tracking-wider">
                      💰 Pricing & Stock Overview
                    </td>
                  </tr>

                  <tr>
                    <td class="py-3 px-3 font-semibold text-zinc-400 text-xs">Price</td>
                    @for (product of compare.items(); track product.id) {
                      <td class="py-3 px-3 text-center">
                        <span class="text-base font-extrabold" [class]="product.id === lowestPriceProductId() ? 'text-emerald-400' : 'text-zinc-100'">
                          {{ product.price | currency }}
                        </span>
                      </td>
                    }
                  </tr>

                  <tr>
                    <td class="py-3 px-3 font-semibold text-zinc-400 text-xs">Availability</td>
                    @for (product of compare.items(); track product.id) {
                      <td class="py-3 px-3 text-center">
                        @if (product.stockQuantity > 0) {
                          <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <svg lucideCheck class="h-3.5 w-3.5"></svg>
                            {{ product.stockQuantity }} in stock
                          </span>
                        } @else {
                          <span class="text-xs font-semibold text-rose-400">Out of Stock</span>
                        }
                      </td>
                    }
                  </tr>

                  <tr>
                    <td class="py-3 px-3 font-semibold text-zinc-400 text-xs">Category</td>
                    @for (product of compare.items(); track product.id) {
                      <td class="py-3 px-3 text-center text-zinc-300 text-xs font-medium">
                        {{ product.categoryName || 'General' }}
                      </td>
                    }
                  </tr>

                  <!-- Categorized Specification Groups -->
                  @for (group of groupedSpecifications(); track group.name) {
                    @if (group.rows.length > 0) {
                      <tr class="bg-zinc-900/40">
                        <td [attr.colspan]="compare.count() + 1" class="py-2.5 px-3 font-extrabold text-indigo-300 text-xs uppercase tracking-wider">
                          {{ group.name }}
                        </td>
                      </tr>

                      @for (row of group.rows; track row.key) {
                        <tr [class]="row.hasDiff ? 'bg-indigo-950/20' : ''">
                          <td class="py-3 px-3 font-semibold text-zinc-400 text-xs flex items-center gap-1.5">
                            <span>{{ formatKeyLabel(row.key) }}</span>
                            @if (row.hasDiff) {
                              <span class="h-1.5 w-1.5 rounded-full bg-indigo-400" title="Values differ across items"></span>
                            }
                          </td>
                          @for (product of compare.items(); track product.id) {
                            <td class="py-3 px-3 text-center text-xs font-medium" [class]="row.hasDiff ? 'text-zinc-100 font-semibold' : 'text-zinc-300'">
                              @if (getAttrValue(product, row.key); as val) {
                                <span
                                  class="inline-block rounded-lg px-2 py-1 max-w-[200px] break-words"
                                  [class]="isHighlightedVal(val) ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-bold' : ''"
                                >
                                  {{ val }}
                                </span>
                              } @else {
                                <span class="text-zinc-600 font-normal">—</span>
                              }
                            </td>
                          }
                        </tr>
                      }
                    }
                  }

                  <!-- Uncategorized Attributes Section -->
                  @if (otherAttributeRows().length > 0) {
                    <tr class="bg-zinc-900/40">
                      <td [attr.colspan]="compare.count() + 1" class="py-2.5 px-3 font-extrabold text-indigo-300 text-xs uppercase tracking-wider">
                        📋 Additional Features & Details
                      </td>
                    </tr>

                    @for (row of otherAttributeRows(); track row.key) {
                      <tr [class]="row.hasDiff ? 'bg-indigo-950/20' : ''">
                        <td class="py-3 px-3 font-semibold text-zinc-400 text-xs">
                          {{ formatKeyLabel(row.key) }}
                        </td>
                        @for (product of compare.items(); track product.id) {
                          <td class="py-3 px-3 text-center text-xs font-medium" [class]="row.hasDiff ? 'text-zinc-100 font-semibold' : 'text-zinc-300'">
                            @if (getAttrValue(product, row.key); as val) {
                              <span>{{ val }}</span>
                            } @else {
                              <span class="text-zinc-600 font-normal">—</span>
                            }
                          </td>
                        }
                      </tr>
                    }
                  }

                  <!-- Action Row -->
                  <tr>
                    <td class="py-5 px-3 font-semibold text-zinc-400 text-xs">Actions</td>
                    @for (product of compare.items(); track product.id) {
                      <td class="py-5 px-3 text-center">
                        <a
                          [routerLink]="['/products', product.slug]"
                          (click)="compare.closeModal()"
                          class="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition cursor-pointer"
                        >
                          <span>View Item</span>
                          <svg lucideExternalLink class="h-3.5 w-3.5"></svg>
                        </a>
                      </td>
                    }
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CompareMatrixModal {
  readonly compare = inject(CompareService);
  readonly onlyDifferences = signal<boolean>(false);

  toggleOnlyDifferences() {
    this.onlyDifferences.update((v) => !v);
  }

  formatKeyLabel(key: string): string {
    return formatLabel(key);
  }

  readonly lowestPriceProductId = computed(() => {
    const items = this.compare.items();
    if (items.length < 2) return null;
    let minPrice = Infinity;
    let minId = null;
    for (const item of items) {
      if (item.price < minPrice) {
        minPrice = item.price;
        minId = item.id;
      }
    }
    return minId;
  });

  readonly allAttributeKeys = computed(() => {
    const keysMap = new Map<string, string>(); // normalized lower -> original key
    for (const item of this.compare.items()) {
      if (item.attributes && typeof item.attributes === 'object') {
        Object.keys(item.attributes).forEach((k) => {
          const norm = formatLabel(k).toLowerCase();
          if (!keysMap.has(norm)) {
            keysMap.set(norm, k);
          }
        });
      }
    }
    return Array.from(keysMap.values());
  });

  readonly attributeDiffMap = computed(() => {
    const diffMap = new Map<string, boolean>();
    const items = this.compare.items();
    for (const key of this.allAttributeKeys()) {
      if (items.length < 2) {
        diffMap.set(key, false);
        continue;
      }
      const firstVal = this.getAttrValue(items[0], key);
      const isDifferent = items.some((item) => this.getAttrValue(item, key) !== firstVal);
      diffMap.set(key, isDifferent);
    }
    return diffMap;
  });

  readonly groupedSpecifications = computed(() => {
    const allKeys = new Map<string, string>(); // normLower -> raw key
    this.allAttributeKeys().forEach((k) => allKeys.set(formatLabel(k).toLowerCase(), k));

    const diffMap = this.attributeDiffMap();
    const onlyDiff = this.onlyDifferences();
    const result: { name: string; rows: { key: string; hasDiff: boolean }[] }[] = [];

    for (const group of SPEC_GROUPS) {
      const rows: { key: string; hasDiff: boolean }[] = [];
      for (const groupKey of group.keys) {
        const normGroupKey = formatLabel(groupKey).toLowerCase();
        if (allKeys.has(normGroupKey)) {
          const rawKey = allKeys.get(normGroupKey)!;
          const hasDiff = diffMap.get(rawKey) ?? false;
          if (!onlyDiff || hasDiff) {
            rows.push({ key: rawKey, hasDiff });
          }
          allKeys.delete(normGroupKey);
        }
      }
      if (rows.length > 0) {
        result.push({ name: group.name, rows });
      }
    }
    return result;
  });

  readonly otherAttributeRows = computed(() => {
    const allGroupedKeys = new Set<string>();
    SPEC_GROUPS.forEach((g) => g.keys.forEach((k) => allGroupedKeys.add(formatLabel(k).toLowerCase())));

    const diffMap = this.attributeDiffMap();
    const onlyDiff = this.onlyDifferences();
    const rows: { key: string; hasDiff: boolean }[] = [];

    for (const key of this.allAttributeKeys()) {
      const normKey = formatLabel(key).toLowerCase();
      if (!allGroupedKeys.has(normKey)) {
        const hasDiff = diffMap.get(key) ?? false;
        if (!onlyDiff || hasDiff) {
          rows.push({ key, hasDiff });
        }
      }
    }
    return rows;
  });

  getAttrValue(product: ProductView, key: string): string {
    if (!product.attributes || typeof product.attributes !== 'object') return '';
    if (product.attributes[key] !== undefined) return String(product.attributes[key]);

    // Try normalized matching if exact key isn't present
    const normTarget = formatLabel(key).toLowerCase();
    for (const [k, v] of Object.entries(product.attributes)) {
      if (formatLabel(k).toLowerCase() === normTarget) {
        return String(v);
      }
    }
    return '';
  }

  isHighlightedVal(val: string): boolean {
    const lower = val.toLowerCase();
    return (
      lower.includes('120hz') ||
      lower.includes('144hz') ||
      lower.includes('240hz') ||
      lower.includes('5g') ||
      lower.includes('snapdragon 8') ||
      lower.includes('m3 max') ||
      lower.includes('ip68')
    );
  }
}
