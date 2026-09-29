import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
      <p class="text-sm font-medium text-zinc-300">{{ title() }}</p>
      @if (detail()) {
        <p class="mt-1 text-sm text-zinc-500">{{ detail() }}</p>
      }
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly detail = input<string>();
}
