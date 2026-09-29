import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
  template: `
    <div class="relative">
      <button
        #trigger
        type="button"
        class="flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-zinc-950 px-3 text-left text-sm outline-none transition focus-visible:border-indigo-500"
        [class.border-indigo-500]="open()"
        [class.border-zinc-800]="!open()"
        [class.text-zinc-100]="!!displayLabel()"
        [class.text-zinc-500]="!displayLabel()"
        [class.opacity-50]="disabled()"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggle()"
      >
        <span class="min-w-0 truncate">{{ displayLabel() || placeholder() }}</span>
        <svg
          class="h-4 w-4 shrink-0 text-zinc-500 transition"
          [class.rotate-180]="open()"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      @if (open()) {
        <ul
          role="listbox"
          [class]="placement() === 'absolute'
            ? 'absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-auto rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-black/50 w-full'
            : 'fixed z-[100000] max-h-56 overflow-auto rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-black/50'"
          [style.top.px]="placement() === 'absolute' ? null : menuTop()"
          [style.left.px]="placement() === 'absolute' ? null : menuLeft()"
          [style.width.px]="placement() === 'absolute' ? null : menuWidth()"
        >
          @for (opt of options(); track opt.value) {
            <li role="option" [attr.aria-selected]="opt.value === value()">
              <button
                type="button"
                class="flex w-full items-center px-3 py-2 text-left text-sm transition"
                [class.bg-indigo-600/20]="opt.value === value()"
                [class.text-indigo-300]="opt.value === value()"
                [class.text-zinc-300]="opt.value !== value()"
                [class.hover:bg-zinc-800]="opt.value !== value()"
                [class.hover:text-zinc-100]="opt.value !== value()"
                (click)="choose(opt.value)"
              >
                {{ opt.label }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class Select implements ControlValueAccessor {
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('Select…');
  readonly placement = input<'fixed' | 'absolute'>('fixed');
  readonly valueChange = output<string>();

  readonly value = signal('');
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly menuTop = signal(0);
  readonly menuLeft = signal(0);
  readonly menuWidth = signal(0);

  readonly displayLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      const target = event.target as HTMLElement;
      // Close when clicking outside trigger+menu
      if (!target.closest('[role="listbox"]')) {
        this.open.set(false);
      }
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange() {
    if (this.open() && this.placement() !== 'absolute') this.placeMenu();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle() {
    if (this.disabled()) return;
    const next = !this.open();
    if (next && this.placement() !== 'absolute') this.placeMenu();
    this.open.set(next);
    this.onTouched();
  }

  choose(value: string) {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
    this.valueChange.emit(value);
    this.open.set(false);
  }

  private placeMenu() {
    const triggerEl = this.trigger().nativeElement;
    const rect = triggerEl.getBoundingClientRect();
    const gap = 6;
    const menuMax = 224;

    // Check if any ancestor creates a new containing block (backdrop-filter, transform, filter)
    let parent = triggerEl.parentElement;
    let containingBlock: HTMLElement | null = null;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      if (
        style.transform !== 'none' ||
        style.perspective !== 'none' ||
        (style.backdropFilter && style.backdropFilter !== 'none') ||
        (style.filter && style.filter !== 'none')
      ) {
        containingBlock = parent;
        break;
      }
      parent = parent.parentElement;
    }

    if (containingBlock) {
      const containerRect = containingBlock.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;
      const relativeLeft = rect.left - containerRect.left;
      const spaceBelow = containerRect.height - (relativeTop + rect.height) - gap;
      const openUp = spaceBelow < 160 && relativeTop > spaceBelow;
      this.menuTop.set(
        openUp ? Math.max(8, relativeTop - gap - Math.min(menuMax, relativeTop - 8)) : relativeTop + rect.height + gap,
      );
      this.menuLeft.set(relativeLeft);
      this.menuWidth.set(rect.width);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUp = spaceBelow < 160 && rect.top > spaceBelow;
    this.menuTop.set(
      openUp ? Math.max(8, rect.top - gap - Math.min(menuMax, rect.top - 8)) : rect.bottom + gap,
    );
    this.menuLeft.set(rect.left);
    this.menuWidth.set(rect.width);
  }
}
