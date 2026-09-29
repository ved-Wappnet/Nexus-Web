import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { SocketService } from './socket.service';

const SOUND_STORAGE_KEY = 'nexus_notifications_sound_enabled';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly api = environment.apiUrl;
  private socket: Socket | null = null;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isOpen = signal<boolean>(false);
  readonly filter = signal<'all' | 'unread'>('all');
  readonly soundEnabled = signal<boolean>(
    typeof window !== 'undefined'
      ? localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
      : true,
  );
  readonly isLoading = signal<boolean>(false);

  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    if (this.filter() === 'unread') {
      return list.filter((n) => !n.isRead);
    }
    return list;
  });

  constructor() {
    // When user logs in or out, connect or reset
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.init();
      } else {
        this.reset();
      }
    });
  }

  init() {
    this.load();
    this.initSocket();
  }

  private initSocket() {
    if (!this.auth.currentUser()) return;

    this.socket = this.socketService.getSocket('/notifications');

    this.socket.off('newNotification');
    this.socket.off('unreadCountUpdated');

    this.socket.on('newNotification', (item: AppNotification) => {
      this.ngZone.run(() => {
        // Prepend to list avoiding duplicate id
        this.notifications.update((list) => [
          item,
          ...list.filter((n) => n.id !== item.id),
        ]);
        this.unreadCount.update((c) => c + 1);
        this.playChime();
      });
    });

    this.socket.on('unreadCountUpdated', (data: { count: number }) => {
      this.ngZone.run(() => {
        if (typeof data.count === 'number') {
          this.unreadCount.set(data.count);
        }
      });
    });
  }

  load() {
    if (!this.auth.accessToken()) return;

    this.isLoading.set(true);
    this.http
      .get<AppNotification[]>(`${this.api}/notifications`)
      .subscribe({
        next: (items) => {
          this.notifications.set(items || []);
          const unread = items ? items.filter((n) => !n.isRead).length : 0;
          this.unreadCount.set(unread);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  togglePanel() {
    this.isOpen.update((v) => !v);
  }

  closePanel() {
    this.isOpen.set(false);
  }

  setFilter(f: 'all' | 'unread') {
    this.filter.set(f);
  }

  toggleSound() {
    this.soundEnabled.update((val) => {
      const next = !val;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      }
      return next;
    });
  }

  markAsRead(id: string) {
    // Optimistic update
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    this.unreadCount.update((c) => Math.max(0, c - 1));

    this.http.patch(`${this.api}/notifications/${id}/read`, {}).subscribe({
      error: () => this.load(),
    });
  }

  markAllAsRead() {
    // Optimistic update
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.unreadCount.set(0);

    this.http.post(`${this.api}/notifications/read-all`, {}).subscribe({
      error: () => this.load(),
    });
  }

  clearAll() {
    this.notifications.set([]);
    this.unreadCount.set(0);

    this.http.delete(`${this.api}/notifications`).subscribe({
      error: () => this.load(),
    });
  }

  handleNotificationClick(item: AppNotification) {
    if (!item.isRead) {
      this.markAsRead(item.id);
    }
    this.closePanel();

    if (item.linkUrl) {
      void this.router.navigateByUrl(item.linkUrl);
    }
  }

  playChime() {
    if (!this.soundEnabled() || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // First note (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.09, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second note (A5 - 880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.08);
      gain2.gain.setValueAtTime(0.09, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch {
      // Ignored if audio context is blocked by browser autoplay policy
    }
  }

  private reset() {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.isOpen.set(false);
  }
}
