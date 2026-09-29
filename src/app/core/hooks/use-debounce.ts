import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

/**
 * Custom Angular Signal hook to create a debounced version of a signal.
 *
 * @param source The source Signal to debounce
 * @param delay Time in milliseconds to wait before updating (default 300ms)
 * @returns A read-only Signal with the debounced value
 */
export function useDebounce<T>(source: Signal<T>, delay = 300): Signal<T> {
  return toSignal(toObservable(source).pipe(debounceTime(delay)), {
    initialValue: source(),
  });
}

/**
 * Custom hook to wrap a function with a debounce timer.
 *
 * @param fn Function to execute after debounce delay
 * @param delay Time in milliseconds (default 300ms)
 * @returns Debounced function wrapper
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
