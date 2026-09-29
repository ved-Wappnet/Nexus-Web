import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly messages = signal<ToastMessage[]>([]);

  success(text: string) {
    this.push(text, 'success');
  }

  error(text: string) {
    this.push(text, 'error');
  }

  info(text: string) {
    this.push(text, 'info');
  }

  dismiss(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.messages.update((list) => list.filter((m) => m.id !== id));
  }

  private push(text: string, tone: ToastMessage['tone']) {
    const id = ++this.seq;
    this.messages.update((list) => [...list, { id, text, tone }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), 5000),
    );
  }
}
