import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CompareService } from '@core/services/compare.service';
import { LucideArrowRight, LucideColumns3, LucideTrash2, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-compare-dock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideColumns3, LucideX, LucideTrash2, LucideArrowRight],
  template: `
    @if (!compare.isEmpty()) {
      <div
        class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl rounded-2xl border border-indigo-500/30 bg-zinc-950/90 p-3.5 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Left: Header & Badges -->
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <svg lucideColumns3 class="h-4 w-4"></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-xs font-semibold text-zinc-200">Compare Products</p>
                <span class="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                  {{ compare.count() }}/4
                </span>
              </div>
              <p class="text-[11px] text-zinc-400 hidden sm:block">Select up to 4 items to compare side-by-side</p>
            </div>
          </div>

          <!-- Middle: Product Thumbnails -->
          <div class="flex items-center gap-2 overflow-x-auto py-1">
            @for (product of compare.items(); track product.id) {
              <div class="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 overflow-hidden shadow-inner">
                @if (product.images && product.images[0]?.url) {
                  <img [src]="product.images[0].url" [alt]="product.title" class="h-full w-full object-cover" />
                } @else {
                  <span class="text-[10px] text-zinc-500 font-bold">{{ product.title.slice(0, 2) }}</span>
                }
                <!-- Remove Overlay -->
                <button
                  type="button"
                  aria-label="Remove product from comparison"
                  class="absolute inset-0 flex items-center justify-center bg-black/75 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  (click)="compare.remove(product.id)"
                  title="Remove {{ product.title }}"
                >
                  <svg lucideX class="h-3.5 w-3.5"></svg>
                </button>
              </div>
            }
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-xl bg-zinc-800/80 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition"
              (click)="compare.clear()"
              title="Clear all"
            >
              <svg lucideTrash2 class="h-3.5 w-3.5"></svg>
              <span class="hidden sm:inline">Clear</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
              (click)="compare.openModal()"
            >
              <span>Compare Now</span>
              <svg lucideArrowRight class="h-3.5 w-3.5"></svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CompareDock {
  readonly compare = inject(CompareService);
}
