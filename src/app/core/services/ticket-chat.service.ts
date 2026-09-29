import { inject, Injectable, NgZone, signal } from '@angular/core';
import { TicketAttachment, TicketMessage, TicketNotification, TicketReplyTo } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { Socket } from 'socket.io-client';
import { OrderService } from './catalog.service';
import { SocketService } from './socket.service';

export interface TypingUser {
  ticketId: string;
  userId: string;
  email: string;
  role: string;
  isTyping: boolean;
}

@Injectable({ providedIn: 'root' })
export class TicketChatService {
  private readonly socketService = inject(SocketService);
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly ngZone = inject(NgZone);

  private socket: Socket | null = null;
  private currentTicketId: string | null = null;
  private toastTimeout: any = null;

  readonly isConnected = this.socketService.isConnected;
  readonly messages = signal<TicketMessage[]>([]);
  readonly isTypingUser = signal<TypingUser | null>(null);
  readonly isSending = signal(false);

  // Unread Tracking & Global Notifications
  readonly totalUnreadCount = signal<number>(0);
  readonly activeToastNotification = signal<TicketNotification | null>(null);
  readonly onNotificationReceived = signal<TicketNotification | null>(null);
  readonly openTicketRequested = signal<string | null>(null);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.connect();
    }
  }

  connect() {
    if (this.socket && this.socket.connected) return;

    this.socket = this.socketService.getSocket('/tickets');

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        if (this.currentTicketId) {
          this.socket?.emit('joinTicket', { ticketId: this.currentTicketId });
        }
      });
    });

    this.socket.on('newTicketMessage', (msg: TicketMessage) => {
      this.ngZone.run(() => {
        if (msg.ticketId === this.currentTicketId) {
          this.messages.update((list) => {
            if (list.some((m) => m.id === msg.id)) return list;
            return [...list, msg];
          });
          // If message is from another user and we have this ticket open, notify server it is read
          if (msg.senderId !== this.auth.currentUser()?.id) {
            this.markRead(msg.ticketId);
          }
        }
      });
    });

    this.socket.on('messagesRead', (data: { ticketId: string; readerId: string; readAt: string }) => {
      this.ngZone.run(() => {
        if (data.ticketId === this.currentTicketId) {
          this.messages.update((list) =>
            list.map((m) => (m.senderId !== data.readerId ? { ...m, isRead: true } : m)),
          );
        }
      });
    });

    this.socket.on('messageReactionUpdated', (data: { ticketId: string; messageId: string; reactions: Record<string, string[]> }) => {
      this.ngZone.run(() => {
        if (data.ticketId === this.currentTicketId) {
          this.messages.update((list) =>
            list.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)),
          );
        }
      });
    });

    this.socket.on('ticketMessageDeleted', (data: { ticketId: string; messageId: string; deletedMessage?: TicketMessage }) => {
      this.ngZone.run(() => {
        if (data.ticketId === this.currentTicketId) {
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
    });

    this.socket.on('ticketNotification', (notif: TicketNotification) => {
      this.ngZone.run(() => {
        // If user already has this specific chat modal open, do not display toast
        if (this.currentTicketId === notif.ticketId) {
          return;
        }

        // Increment total unread messages
        this.totalUnreadCount.update((c) => c + 1);
        this.onNotificationReceived.set(notif);

        // Display floating toast notification
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.activeToastNotification.set(notif);

        this.toastTimeout = setTimeout(() => {
          this.activeToastNotification.set(null);
        }, 8000);
      });
    });

    this.socket.on('userTyping', (data: TypingUser) => {
      this.ngZone.run(() => {
        if (data.ticketId === this.currentTicketId && data.userId !== this.auth.currentUser()?.id) {
          this.isTypingUser.set(data.isTyping ? data : null);
        }
      });
    });
  }

  joinTicket(ticketId: string) {
    this.currentTicketId = ticketId;
    this.messages.set([]);
    this.isTypingUser.set(null);

    // Dismiss any active toast for this ticket
    if (this.activeToastNotification()?.ticketId === ticketId) {
      this.dismissToast();
    }

    // 1. Fetch full message history from REST API
    this.orderService.ticketMessages(ticketId).subscribe({
      next: (history) => {
        this.messages.set(history);
      },
      error: () => {},
    });

    // 2. Mark ticket as read on server & socket
    this.orderService.markTicketAsRead(ticketId).subscribe({
      error: () => {},
    });
    this.markRead(ticketId);

    // 3. Connect socket via provider and join room
    this.connect();
    if (this.socket?.connected) {
      this.socket.emit('joinTicket', { ticketId });
    }
  }

  leaveTicket() {
    if (this.currentTicketId && this.socket?.connected) {
      this.socket.emit('leaveTicket', { ticketId: this.currentTicketId });
    }
    this.currentTicketId = null;
    this.messages.set([]);
    this.isTypingUser.set(null);
  }

  markRead(ticketId: string) {
    if (this.socket?.connected) {
      this.socket.emit('markTicketRead', { ticketId });
    }
  }

  toggleReaction(messageId: string, emoji: string) {
    if (this.currentTicketId && this.socket?.connected) {
      this.socket.emit('toggleReaction', {
        ticketId: this.currentTicketId,
        messageId,
        emoji,
      });
    }
  }

  sendMessage(
    message: string,
    attachments?: TicketAttachment[],
    replyTo?: TicketReplyTo | null,
  ) {
    if (!this.currentTicketId) return;
    const trimmed = (message || '').trim();
    if (!trimmed && (!attachments || attachments.length === 0)) return;

    const ticketId = this.currentTicketId;
    this.isSending.set(true);

    if (this.socket?.connected) {
      this.socket.emit(
        'sendTicketMessage',
        { ticketId, message: trimmed, attachments, replyTo },
        (_res: any) => {
          this.ngZone.run(() => {
            this.isSending.set(false);
            this.sendTyping(false);
          });
        },
      );
    } else {
      // Fallback to REST API if socket is offline
      this.orderService.postTicketMessage(ticketId, trimmed, attachments, replyTo).subscribe({
        next: (newMsg) => {
          this.messages.update((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          this.isSending.set(false);
          this.sendTyping(false);
        },
        error: () => {
          this.isSending.set(false);
        },
      });
    }
  }

  sendTyping(isTyping: boolean) {
    if (this.currentTicketId && this.socket?.connected) {
      this.socket.emit('typing', { ticketId: this.currentTicketId, isTyping });
    }
  }

  dismissToast() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.activeToastNotification.set(null);
  }

  viewTicketFromToast(ticketId: string) {
    this.dismissToast();
    this.openTicketRequested.set(ticketId);
  }

  setTotalUnreadCount(count: number) {
    this.totalUnreadCount.set(Math.max(0, count));
  }

  decrementUnreadCount(amount: number = 1) {
    this.totalUnreadCount.update((c) => Math.max(0, c - amount));
  }

  deleteMessage(ticketId: string, messageId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('deleteTicketMessage', { ticketId, messageId }, (res: any) => {
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
      this.orderService.deleteTicketMessage(ticketId, messageId).subscribe({
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

  disconnect() {
    if (this.socket) {
      this.socketService.disconnect('/tickets');
      this.socket = null;
    }
    this.currentTicketId = null;
    this.messages.set([]);
  }
}
