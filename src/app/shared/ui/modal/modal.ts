import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <button
          type="button"
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          aria-label="Close dialog"
          (click)="closed.emit()"
        ></button>
        <div
          class="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50"
          [class]="size() === 'lg' ? 'max-w-2xl' : 'max-w-lg'"
        >
          <div class="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 class="text-lg font-semibold text-zinc-100">{{ title() }}</h2>
            <button
              type="button"
              class="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              (click)="closed.emit()"
            >
              ✕
            </button>
          </div>
          <div class="p-6">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
})
export class Modal {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly size = input<'md' | 'lg'>('md');
  readonly closed = output<void>();
}
