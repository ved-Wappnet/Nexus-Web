import { inject, Injectable, InjectionToken, NgZone, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface SocketConfig {
  url?: string;
  autoConnect?: boolean;
}

export const SOCKET_CONFIG = new InjectionToken<SocketConfig>('SOCKET_CONFIG');

export function provideSocket(config: SocketConfig = {}) {
  return [
    {
      provide: SOCKET_CONFIG,
      useValue: config,
    },
    SocketService,
  ];
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly customConfig = inject(SOCKET_CONFIG, { optional: true });

  private readonly sockets = new Map<string, Socket>();
  readonly isConnected = signal(false);

  /**
   * Returns or initializes a socket connection for a specific namespace (e.g. '/tickets')
   */
  getSocket(namespace = ''): Socket {
    const cleanNs = namespace.startsWith('/') ? namespace : `/${namespace}`;
    const key = cleanNs === '/' ? '' : cleanNs;

    const existing = this.sockets.get(key);
    if (existing) {
      return existing;
    }

    const token = this.auth.accessToken();
    const rawUrl = this.customConfig?.url ?? environment.apiUrl;
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const socketUrl = `${baseUrl}${key}`;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      this.ngZone.run(() => {
        this.isConnected.set(true);
      });
    });

    socket.on('disconnect', () => {
      this.ngZone.run(() => {
        const anyConnected = Array.from(this.sockets.values()).some((s) => s.connected);
        this.isConnected.set(anyConnected);
      });
    });

    this.sockets.set(key, socket);
    return socket;
  }

  /**
   * Emit an event to a specific namespace
   */
  emit(event: string, data: unknown, namespace = ''): void {
    const socket = this.getSocket(namespace);
    socket.emit(event, data);
  }

  /**
   * Listen to an event as an RxJS Observable
   */
  fromEvent<T>(event: string, namespace = ''): Observable<T> {
    const socket = this.getSocket(namespace);
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => {
        this.ngZone.run(() => subscriber.next(data));
      };
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    });
  }

  /**
   * Disconnect a single namespace or all active sockets
   */
  disconnect(namespace?: string): void {
    if (namespace !== undefined) {
      const cleanNs = namespace.startsWith('/') ? namespace : `/${namespace}`;
      const key = cleanNs === '/' ? '' : cleanNs;
      const socket = this.sockets.get(key);
      if (socket) {
        socket.disconnect();
        this.sockets.delete(key);
      }
    } else {
      this.sockets.forEach((s) => s.disconnect());
      this.sockets.clear();
      this.isConnected.set(false);
    }
  }
}
