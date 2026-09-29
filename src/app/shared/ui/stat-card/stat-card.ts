import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl shadow-black/30 backdrop-blur-md">
      <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">{{ label() }}</p>
      <p class="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs text-zinc-500">{{ hint() }}</p>
      }
    </article>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>();
}
