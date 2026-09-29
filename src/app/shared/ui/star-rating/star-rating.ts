import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="inline-flex items-center gap-1 select-none" [class.cursor-pointer]="interactive()">
      <div class="flex items-center gap-0.5">
        @for (star of stars; track star) {
          <div
            class="relative inline-flex items-center justify-center transition-transform"
            [class.hover:scale-115]="interactive()"
            [class.cursor-pointer]="interactive()"
            (mouseenter)="onStarHover(star)"
            (mouseleave)="onStarLeave()"
            (click)="onStarClick(star)"
          >
            <!-- Background Empty Star -->
            <svg
              [class]="starSizeClass()"
              class="text-zinc-700 fill-zinc-800/80 transition-colors"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>

            <!-- Foreground Filled Gold Star (Supports fractional fill or interactive hover) -->
            <div
              class="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-100"
              [style.width.%]="getStarFill(star)"
            >
              <svg
                [class]="starSizeClass()"
                class="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
        }
      </div>

      @if (showValue() && rating() > 0) {
        <span class="ml-1 font-bold text-zinc-100 font-mono" [class]="labelSizeClass()">
          {{ rating() | number: '1.1-1' }}
        </span>
      }
    </div>
  `,
})
export class StarRating {
  readonly rating = input<number>(0);
  readonly max = input<number>(5);
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('sm');
  readonly interactive = input<boolean>(false);
  readonly showValue = input<boolean>(false);

  readonly ratingChange = output<number>();

  readonly hoverRating = signal<number | null>(null);

  readonly stars = [1, 2, 3, 4, 5];

  readonly starSizeClass = computed(() => {
    switch (this.size()) {
      case 'xs':
        return 'h-3.5 w-3.5';
      case 'sm':
        return 'h-4 w-4';
      case 'md':
        return 'h-5 w-5';
      case 'lg':
        return 'h-6 w-6 sm:h-7 sm:w-7';
      default:
        return 'h-4 w-4';
    }
  });

  readonly labelSizeClass = computed(() => {
    switch (this.size()) {
      case 'xs':
        return 'text-[11px]';
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base sm:text-lg';
      default:
        return 'text-xs';
    }
  });

  getStarFill(star: number): number {
    if (this.interactive()) {
      const active = this.hoverRating() !== null ? this.hoverRating()! : this.rating();
      return star <= active ? 100 : 0;
    }

    const r = this.rating();
    if (star <= Math.floor(r)) return 100;
    if (star === Math.ceil(r)) {
      const frac = r - Math.floor(r);
      return Math.round(frac * 100);
    }
    return 0;
  }

  onStarHover(star: number) {
    if (this.interactive()) {
      this.hoverRating.set(star);
    }
  }

  onStarLeave() {
    if (this.interactive()) {
      this.hoverRating.set(null);
    }
  }

  onStarClick(star: number) {
    if (this.interactive()) {
      this.ratingChange.emit(star);
    }
  }
}
