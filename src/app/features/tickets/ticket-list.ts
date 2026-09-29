import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { useDebounce } from '@core/hooks/use-debounce';
import { OrderView, Ticket, TicketStatus, TicketStatuses, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { OrderService } from '@core/services/catalog.service';
import { TicketChatService } from '@core/services/ticket-chat.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideClock,
  LucideFileText,
  LucideMessageSquare,
  LucidePlus,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { Badge, statusTone } from '@shared/ui/badge/badge';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Modal } from '@shared/ui/modal/modal';
import { Select, SelectOption } from '@shared/ui/select/select';
import { TicketDetailModal } from './ticket-detail-modal';

@Component({
  selector: 'app-ticket-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CurrencyPipe,
    ReactiveFormsModule,
    Badge,
    EmptyState,
    Modal,
    Select,
    TicketDetailModal,
    LabelFormatPipe,
    LucideSearch,
    LucideX,
    LucidePlus,
    LucideFileText,
    LucideClock,
    LucideMessageSquare,
  ],
  templateUrl: './ticket-list.html',
})
export class TicketList {
  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly ticketChat = inject(TicketChatService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;
  readonly TicketStatuses = TicketStatuses;
  readonly statusTone = statusTone;

  readonly statusFilters: ('ALL' | TicketStatus)[] = [
    'ALL',
    TicketStatuses.OPEN,
    TicketStatuses.IN_REVIEW,
    TicketStatuses.RESOLVED,
    TicketStatuses.CLOSED,
  ];

  readonly allTickets = signal<Ticket[]>([]);

  readonly userOrders = signal<OrderView[]>([]);
  readonly filterStatus = signal<'ALL' | TicketStatus>('ALL');
  readonly searchQuery = signal('');
  readonly debouncedSearch = useDebounce(this.searchQuery, 350);

  readonly loading = signal(false);
  readonly modalOpen = signal(false);
  readonly isSubmitting = signal(false);

  readonly selectedTicket = signal<Ticket | null>(null);
  readonly detailModalOpen = signal(false);

  readonly ticketDetailOrder = computed(() => {
    const t = this.selectedTicket();
    if (!t?.orderId) return null;
    return this.userOrders().find((o) => o.id === t.orderId) ?? null;
  });

  readonly ticketForm = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    body: ['', [Validators.required, Validators.minLength(5)]],
    orderId: [''],
  });

  readonly selectedOrderId = toSignal(this.ticketForm.controls.orderId.valueChanges, {
    initialValue: this.ticketForm.controls.orderId.value,
  });

  readonly selectedOrder = computed(() => {
    const id = this.selectedOrderId();
    if (!id) return null;
    return this.userOrders().find((o) => o.id === id) ?? null;
  });

  readonly orderOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'None (General Inquiry / Question)' },
    ...this.userOrders().map((ord) => {
      const shortId = ord.id.substring(0, 8);
      const dateStr = new Date(ord.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTotal = Number(ord.totalAmount).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      return {
        value: ord.id,
        label: `Order #${shortId} · ${dateStr} · ${formattedTotal} (${ord.status})`,
      };
    }),
  ]);

  readonly filteredTickets = this.allTickets.asReadonly();

  constructor() {
    effect(() => {
      const q = this.debouncedSearch();
      const status = this.filterStatus();
      this.loadTickets(q, status);
    });

    // Auto open ticket requested via global toast notification
    effect(() => {
      const reqId = this.ticketChat.openTicketRequested();
      if (reqId) {
        const found = this.allTickets().find((t) => t.id === reqId);
        if (found) {
          this.openTicketDetail(found);
          this.ticketChat.openTicketRequested.set(null);
        }
      }
    });

    // Dynamically update ticket card when real-time message notification occurs
    effect(() => {
      const notif = this.ticketChat.onNotificationReceived();
      if (notif) {
        this.allTickets.update((list) =>
          list.map((t) => {
            if (t.id === notif.ticketId) {
              return {
                ...t,
                unreadCount: (t.unreadCount || 0) + 1,
                totalMessages: (t.totalMessages || 0) + 1,
                lastMessage: {
                  id: notif.messageId,
                  senderId: notif.senderId,
                  senderName: notif.senderName,
                  senderRole: notif.senderRole,
                  message: notif.message,
                  attachmentsCount: notif.attachmentsCount,
                  createdAt: notif.createdAt,
                },
              };
            }
            return t;
          }),
        );
      }
    });

    this.loadUserOrders();

    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['orderId']) {
      this.ticketForm.patchValue({
        orderId: queryParams['orderId'],
        subject: `Assistance regarding Order #${queryParams['orderId'].substring(0, 8)}`,
      });
      this.modalOpen.set(true);
    }
  }

  loadTickets(q?: string, status?: string) {
    this.loading.set(true);
    this.orderService.tickets(q, status).subscribe({
      next: (list) => {
        this.allTickets.set(list);
        this.loading.set(false);

        // Synchronize total unread count with shell navigation
        const totalUnread = list.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
        this.ticketChat.setTotalUnreadCount(totalUnread);

        const ticketParam = this.route.snapshot.queryParams['ticketId'];
        if (ticketParam) {
          const target = list.find((t) => t.id === ticketParam);
          if (target) {
            this.openTicketDetail(target);
          }
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Unable to fetch tickets');
      },
    });
  }


  loadUserOrders() {
    this.orderService.list().subscribe({
      next: (res) => this.userOrders.set(res.data),
      error: () => {},
    });
  }


  openCreateModal() {
    this.ticketForm.reset({
      subject: '',
      body: '',
      orderId: '',
    });
    this.modalOpen.set(true);
  }

  submitTicket() {
    if (this.ticketForm.invalid || this.isSubmitting()) {
      this.ticketForm.markAllAsTouched();
      this.toast.error('Please enter a valid subject and description.');
      return;
    }

    this.isSubmitting.set(true);
    const val = this.ticketForm.getRawValue();

    this.orderService
      .createTicket({
        subject: val.subject.trim(),
        body: val.body.trim(),
        orderId: val.orderId.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalOpen.set(false);
          this.loadTickets(this.debouncedSearch(), this.filterStatus());
          this.toast.success('Support ticket submitted successfully!');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg = err?.error?.message;
          this.toast.error(typeof msg === 'string' ? msg : 'Unable to create ticket');
        },
      });
  }

  updateTicketStatus(ticketId: string, status: TicketStatus) {
    this.orderService.updateTicket(ticketId, status).subscribe({
      next: (updated) => {
        this.allTickets.update((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t))
        );
        this.toast.success(`Ticket marked as ${status}`);
      },
      error: () => this.toast.error('Failed to update ticket status'),
    });
  }

  canManageTickets(): boolean {
    const role = this.auth.role();
    return (
      role === UserRoles.ADMIN ||
      role === UserRoles.SUBADMIN ||
      role === UserRoles.SUPPLIER
    );
  }

  openTicketDetail(ticket: Ticket) {
    if (ticket.unreadCount && ticket.unreadCount > 0) {
      this.ticketChat.decrementUnreadCount(ticket.unreadCount);
      this.allTickets.update((list) =>
        list.map((t) => (t.id === ticket.id ? { ...t, unreadCount: 0 } : t)),
      );
    }
    this.selectedTicket.set({ ...ticket, unreadCount: 0 });
    this.detailModalOpen.set(true);
    this.orderService.markTicketAsRead(ticket.id).subscribe({ error: () => {} });
  }


  closeTicketDetail() {
    this.detailModalOpen.set(false);
    this.selectedTicket.set(null);
  }

  onDetailStatusUpdated(payload: { id: string; status: TicketStatus }) {
    this.updateTicketStatus(payload.id, payload.status);
    this.selectedTicket.update((t) => (t ? { ...t, status: payload.status } : null));
  }
}
