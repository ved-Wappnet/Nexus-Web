import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CurrencyConfig, CurrencyService } from '@core/services/currency.service';
import { LucideCheck, LucideChevronDown } from '@lucide/angular';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, LucideChevronDown, LucideCheck],
  template: `
    <div class="relative" #container>
      <!-- Trigger Button -->
      <button
        type="button"
        (click)="toggle()"
        class="flex h-9 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-semibold text-zinc-300 transition-all hover:border-indigo-500/50 hover:bg-zinc-800/80 hover:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        [class.border-indigo-500]="isOpen()"
        [class.bg-zinc-800]="isOpen()"
        title="Select Platform Currency"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen()"
      >
        <span class="text-sm leading-none">{{ currencyService.current().flag }}</span>
        <span class="tracking-wide text-zinc-100 font-bold">{{ currencyService.current().code }}</span>
        <span class="text-zinc-400 text-[11px] font-medium hidden sm:inline">({{ currencyService.current().symbol }})</span>
        <svg
          lucideChevronDown
          class="h-3.5 w-3.5 text-zinc-400 transition-transform duration-200"
          [class.rotate-180]="isOpen()"
        ></svg>
      </button>

      <!-- Dropdown Menu -->
      @if (isOpen()) {
        <div
          class="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/40 z-[100] animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
        >
          <!-- Header info -->
          <div class="px-3 py-2 border-b border-zinc-800/60 mb-1">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Display Currency</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                Auto-converted
              </span>
            </div>
            <p class="text-[11px] text-zinc-400 mt-0.5">Base prices converted in real-time</p>
          </div>

          <!-- Currency List -->
          <div class="space-y-0.5 max-h-72 overflow-y-auto pr-0.5">
            @for (c of currencyService.supported; track c.code) {
              <button
                type="button"
                (click)="select(c.code)"
                role="option"
                [attr.aria-selected]="c.code === currencyService.current().code"
                class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition cursor-pointer group"
                [class.bg-indigo-600/15]="c.code === currencyService.current().code"
                [class.text-indigo-200]="c.code === currencyService.current().code"
                [class.hover:bg-zinc-800/70]="c.code !== currencyService.current().code"
                [class.text-zinc-300]="c.code !== currencyService.current().code"
                [class.hover:text-white]="c.code !== currencyService.current().code"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-base leading-none">{{ c.flag }}</span>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-zinc-100 group-hover:text-indigo-300 transition">{{ c.code }}</span>
                      <span class="text-zinc-400 text-[11px]">({{ c.symbol }})</span>
                    </div>
                    <p class="text-[10px] text-zinc-400 truncate">{{ c.name }}</p>
                  </div>
                </div>

                @if (c.code === currencyService.current().code) {
                  <svg lucideCheck class="h-4 w-4 text-indigo-400 shrink-0"></svg>
                } @else {
                  <span class="text-[10px] text-zinc-400 group-hover:text-zinc-400 transition font-mono">
                    {{ c.rate | number: '1.2-2' }}x
                  </span>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CurrencySelectorComponent {
  readonly currencyService = inject(CurrencyService);
  private readonly elementRef = inject(ElementRef);

  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  select(code: string): void {
    this.currencyService.setCurrency(code);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
