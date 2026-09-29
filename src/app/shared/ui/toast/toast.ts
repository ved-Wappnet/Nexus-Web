import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastMessage, ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(12px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .toast-enter {
      animation: toast-in 0.28s ease-out;
    }
  `,
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(100%-2rem,24rem)] flex-col gap-2.5">
      @for (msg of toast.messages(); track msg.id) {
        <div
          class="toast-enter pointer-events-auto flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-black/40 backdrop-blur-md"
          [attr.role]="msg.tone === 'error' ? 'alert' : 'status'"
        >
          <span
            class="w-1 shrink-0"
            [class.bg-emerald-500]="msg.tone === 'success'"
            [class.bg-rose-500]="msg.tone === 'error'"
            [class.bg-sky-500]="msg.tone === 'info'"
          ></span>

          <div class="flex min-w-0 flex-1 items-start gap-3 px-3 py-3">
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {{ iconWrapClass(msg.tone) }}">
              @switch (msg.tone) {
                @case ('success') {
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                }
                @case ('error') {
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12V16.5z" />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                  </svg>
                }
                @default {
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path stroke-linecap="round" d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                }
              }
            </span>

            <div class="min-w-0 flex-1 pt-0.5">
              <p class="text-xs font-semibold tracking-wide text-zinc-100">{{ label(msg.tone) }}</p>
              <p class="mt-0.5 text-sm leading-5 text-zinc-400">{{ msg.text }}</p>
            </div>

            <button
              type="button"
              class="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Dismiss notification"
              (click)="toast.dismiss(msg.id)"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class Toast {
  readonly toast = inject(ToastService);

  label(tone: ToastMessage['tone']): string {
    if (tone === 'success') return 'Success';
    if (tone === 'error') return 'Error';
    return 'Info';
  }

  iconWrapClass(tone: ToastMessage['tone']): string {
    if (tone === 'success') return 'bg-emerald-500/15 text-emerald-400';
    if (tone === 'error') return 'bg-rose-500/15 text-rose-400';
    return 'bg-sky-500/15 text-sky-400';
  }
}
