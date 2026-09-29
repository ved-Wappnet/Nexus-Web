import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (variant() === 'dashboard') {
      <div class="animate-pulse space-y-8">
        <!-- Header Shimmer -->
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="space-y-2">
            <div class="h-3 w-28 rounded bg-zinc-800/80"></div>
            <div class="h-7 w-40 rounded-lg bg-zinc-800"></div>
          </div>
          <div class="h-4 w-36 rounded bg-zinc-800/60"></div>
        </div>

        <!-- Stat Cards Shimmer -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 space-y-3">
              <div class="h-3 w-24 rounded bg-zinc-800/80"></div>
              <div class="h-8 w-28 rounded-lg bg-zinc-800"></div>
              <div class="h-3 w-36 rounded bg-zinc-800/60"></div>
            </div>
          }
        </div>

        <!-- Section Grid Shimmer -->
        <div class="grid gap-6 xl:grid-cols-2">
          <div class="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 space-y-4">
            <div class="h-4 w-32 rounded bg-zinc-800"></div>
            <div class="space-y-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="h-4 w-20 rounded bg-zinc-800/80"></div>
                    <div class="h-5 w-16 rounded-full bg-zinc-800/60"></div>
                  </div>
                  <div class="h-3 w-40 rounded bg-zinc-800/60"></div>
                  <div class="h-1.5 w-full rounded-full bg-zinc-800/40"></div>
                </div>
              }
            </div>
          </div>

          <div class="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="h-4 w-36 rounded bg-zinc-800"></div>
              <div class="h-3 w-16 rounded bg-zinc-800/60"></div>
            </div>
            <div class="space-y-3">
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="flex items-center justify-between pt-2">
                  <div class="h-4 w-48 rounded bg-zinc-800/80"></div>
                  <div class="h-4 w-20 rounded bg-zinc-800/60"></div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Product Cards Grid Shimmer -->
        <div class="space-y-4">
          <div class="h-4 w-28 rounded bg-zinc-800"></div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4 space-y-3">
                <div class="h-36 w-full rounded-xl bg-zinc-800/60"></div>
                <div class="h-3 w-1/3 rounded bg-zinc-800/80"></div>
                <div class="h-4 w-3/4 rounded bg-zinc-800"></div>
                <div class="flex items-center justify-between pt-2">
                  <div class="h-4 w-16 rounded bg-zinc-800/80"></div>
                  <div class="h-3 w-10 rounded bg-zinc-800/60"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    } @else if (variant() === 'grid') {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="animate-pulse overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div class="h-44 w-full rounded-xl bg-zinc-800/60"></div>
            <div class="mt-4 h-3 w-1/3 rounded bg-zinc-800/80"></div>
            <div class="mt-2 h-4 w-2/3 rounded bg-zinc-800"></div>
            <div class="mt-4 flex items-center justify-between">
              <div class="h-4 w-1/4 rounded bg-zinc-800"></div>
              <div class="h-4 w-1/6 rounded bg-zinc-800/60"></div>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center p-12 text-center" [class]="containerClass()">
        <div class="relative flex items-center justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500"></div>
          <div class="absolute h-6 w-6 animate-ping rounded-full bg-indigo-500/20"></div>
        </div>
        @if (label()) {
          <p class="mt-4 text-xs font-medium tracking-wide text-zinc-400 animate-pulse">{{ label() }}</p>
        }
      </div>
    }
  `,
})
export class Loader {
  readonly label = input<string>('Loading…');
  readonly variant = input<'spinner' | 'grid' | 'dashboard'>('spinner');
  readonly containerClass = input<string>('');
}
