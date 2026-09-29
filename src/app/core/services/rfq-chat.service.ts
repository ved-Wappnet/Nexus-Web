import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RfqChatAttachment, RfqChatMessage, RfqNotification, RFQQuote } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';

export interface RfqTypingUser {
  rfqId: string;
  userId: string;
  email: string;
  role: string;
  isTyping: boolean;
}

@Injectable({ providedIn: 'root' })
export class RfqChatService {
  private readonly socketService = inject(SocketService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly notificationService = inject(NotificationService);

  private socket: Socket | null = null;
  private typingTimeout: any = null;
  private toastTimeout: any = null;

  readonly isConnected = this.socketService.isConnected;
  readonly activeQuote = signal<RFQQuote | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly messages = signal<RfqChatMessage[]>([]);
  readonly typingUser = signal<RfqTypingUser | null>(null);
  readonly isSending = signal<boolean>(false);

  // Real-time toast notification & unread message badges
  readonly activeToastNotification = signal<RfqNotification | null>(null);
  readonly unreadCounts = signal<Record<string, number>>({});

  private readonly apiBase = `${environment.apiUrl}/quotes`;

  constructor() {
    effect(() => {
      if (this.auth.currentUser()) {
        this.initSocket();
      } else {
        this.disconnectSocket();
      }
    });
  }

  private initSocket() {
    if (this.socket && this.socket.connected) return;

    this.socket = this.socketService.getSocket('/rfq-chat');

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        const quote = this.activeQuote();
        if (quote) {
          this.socket?.emit('joinRfqRoom', { rfqId: quote.id });
        }
      });
    });

    this.socket.on('newRfqMessage', (msg: RfqChatMessage) => {
      this.ngZone.run(() => {
        const current = this.activeQuote();
        if (current && msg.rfqId === current.id) {
          this.messages.update((list) => {
            if (list.some((m) => m.id === msg.id)) return list;
            return [...list, msg];
          });

          // If message is from another user, mark as read
          if (msg.senderId !== this.auth.currentUser()?.id) {
            this.markAsRead(msg.rfqId);
          }
        }
      });
    });

    this.socket.on(
      'rfqMessageDeleted',
      (data: { rfqId: string; messageId: string; deletedMessage?: RfqChatMessage }) => {
        this.ngZone.run(() => {
          const current = this.activeQuote();
          if (current && data.rfqId === current.id) {
            this.messages.update((list) =>
              list.map((m) =>
                m.id === data.messageId
                  ? {
                      ...m,
                      isDeleted: true,
                      message: '[This message was deleted]',
                      attachments: [],
                    }
                  : m,
              ),
            );
          }
        });
      },
    );

    this.socket.on('rfqUserTyping', (data: RfqTypingUser) => {
      this.ngZone.run(() => {
        const current = this.activeQuote();
        if (current && data.rfqId === current.id && data.userId !== this.auth.currentUser()?.id) {
          if (data.isTyping) {
            this.typingUser.set(data);
            if (this.typingTimeout) clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
              this.ngZone.run(() => this.typingUser.set(null));
            }, 3000);
          } else {
            this.typingUser.set(null);
          }
        }
      });
    });

    this.socket.on(
      'rfqMessagesRead',
      (data: { rfqId: string; readerId: string; readAt: string }) => {
        this.ngZone.run(() => {
          const current = this.activeQuote();
          if (current && data.rfqId === current.id) {
            this.messages.update((list) =>
              list.map((m) => {
                const readBy = m.readBy || [];
                if (!readBy.includes(data.readerId)) {
                  return { ...m, readBy: [...readBy, data.readerId] };
                }
                return m;
              }),
            );
          }
        });
      },
    );

    this.socket.on('rfqNotification', (notif: RfqNotification) => {
      this.ngZone.run(() => {
        const current = this.activeQuote();
        const isChatOpenForThis = this.isDrawerOpen() && current?.id === notif.rfqId;

        // If user already has this specific chat drawer open, don't show toast/chime
        if (isChatOpenForThis || notif.senderId === this.auth.currentUser()?.id) {
          return;
        }

        // 1. Play audio notification chime
        this.notificationService.playChime();

        // 2. Increment unread counter for this RFQ quote
        this.unreadCounts.update((counts) => ({
          ...counts,
          [notif.rfqId]: (counts[notif.rfqId] || 0) + 1,
        }));

        // 3. Display floating real-time toast banner
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.activeToastNotification.set(notif);
        this.toastTimeout = setTimeout(() => {
          this.ngZone.run(() => this.activeToastNotification.set(null));
        }, 8000);
      });
    });
  }

  openChat(quote: RFQQuote) {
    this.initSocket();
    this.activeQuote.set(quote);
    this.isDrawerOpen.set(true);
    this.messages.set([]);
    this.typingUser.set(null);

    // Dismiss active toast notification if it corresponds to this quote
    if (this.activeToastNotification()?.rfqId === quote.id) {
      this.dismissToast();
    }

    // Clear unread badge for this quote
    this.clearUnread(quote.id);

    // Join WebSocket room
    if (this.socket && this.socket.connected) {
      this.socket.emit('joinRfqRoom', { rfqId: quote.id });
    }

    // Load message history via REST API
    this.http.get<RfqChatMessage[]>(`${this.apiBase}/${quote.id}/messages`).subscribe({
      next: (history) => {
        this.messages.set(history || []);
        this.markAsRead(quote.id);
      },
      error: () => {
        this.messages.set([]);
      },
    });
  }

  closeChat() {
    const current = this.activeQuote();
    if (current && this.socket) {
      try {
        this.socket.emit('leaveRfqRoom', { rfqId: current.id });
      } catch {}
    }
    this.isDrawerOpen.set(false);
    this.activeQuote.set(null);
    this.messages.set([]);
    this.typingUser.set(null);

    // Clear quoteId query parameter if present so URL does not re-open drawer
    try {
      void this.router.navigate([], {
        queryParams: { quoteId: null },
        queryParamsHandling: 'merge',
      });
    } catch {}
  }

  sendMessage(messageText: string, attachments: RfqChatAttachment[] = []) {
    const current = this.activeQuote();
    if (!current || (!messageText.trim() && attachments.length === 0)) return;

    this.isSending.set(true);

    const payload = {
      rfqId: current.id,
      message: messageText.trim(),
      attachments,
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('sendRfqMessage', payload, (res: any) => {
        this.ngZone.run(() => {
          this.isSending.set(false);
          if (res?.status === 'ok' && res.data) {
            this.messages.update((list) => {
              if (list.some((m) => m.id === res.data.id)) return list;
              return [...list, res.data];
            });
          }
        });
      });
    } else {
      // Fallback to HTTP REST
      this.http
        .post<RfqChatMessage>(`${this.apiBase}/${current.id}/messages`, {
          message: payload.message,
          attachments: payload.attachments,
        })
        .subscribe({
          next: (msg) => {
            this.isSending.set(false);
            this.messages.update((list) => {
              if (list.some((m) => m.id === msg.id)) return list;
              return [...list, msg];
            });
          },
          error: () => {
            this.isSending.set(false);
          },
        });
    }
  }

  deleteMessage(messageId: string) {
    const current = this.activeQuote();
    if (!current) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('deleteRfqMessage', { rfqId: current.id, messageId }, (res: any) => {
        this.ngZone.run(() => {
          if (res?.status === 'ok') {
            this.messages.update((list) =>
              list.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      isDeleted: true,
                      message: '[This message was deleted]',
                      attachments: [],
                    }
                  : m,
              ),
            );
          }
        });
      });
    } else {
      this.http.delete(`${this.apiBase}/${current.id}/messages/${messageId}`).subscribe({
        next: () => {
          this.messages.update((list) =>
            list.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isDeleted: true,
                    message: '[This message was deleted]',
                    attachments: [],
                  }
                : m,
            ),
          );
        },
      });
    }
  }

  sendTyping(isTyping: boolean) {
    const current = this.activeQuote();
    if (!current || !this.socket || !this.socket.connected) return;
    this.socket.emit('typing', { rfqId: current.id, isTyping });
  }

  markAsRead(rfqId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('markRfqRead', { rfqId });
    } else {
      this.http.post(`${this.apiBase}/${rfqId}/messages/read`, {}).subscribe();
    }
  }

  dismissToast() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.activeToastNotification.set(null);
  }

  getUnreadCount(rfqId: string): number {
    return this.unreadCounts()[rfqId] || 0;
  }

  clearUnread(rfqId: string) {
    this.unreadCounts.update((counts) => {
      if (!counts[rfqId]) return counts;
      const updated = { ...counts };
      delete updated[rfqId];
      return updated;
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.dismissToast();
    this.unreadCounts.set({});
  }
}
