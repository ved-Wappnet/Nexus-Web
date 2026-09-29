import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserRoles } from '@core/constants/user.constant';
import { useDebounce } from '@core/hooks/use-debounce';
import { OrderItem, OrderStatus, OrderStatuses, OrderView, PaymentStatuses } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { OrderService } from '@core/services/catalog.service';
import { OrderSocketService } from '@core/services/order-socket.service';
import { PaymentService } from '@core/services/payment.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCheckCircle2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideHelpCircle,
  LucideNavigation,
  LucidePackage,
  LucideScanLine,
  LucideSearch,
  LucideTruck,
  LucideX,
} from '@lucide/angular';
import { Badge, statusTone } from '@shared/ui/badge/badge';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { OrderTracker } from '@shared/ui/order-tracker/order-tracker';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { InvoiceData, InvoiceModal } from '@shared/ui/invoice-modal/invoice-modal';
import { FulfillmentModal, FulfillmentPayload } from '@shared/ui/fulfillment-modal/fulfillment-modal';
import { DeliveryQrScannerModalComponent } from '@shared/ui/delivery-qr-scanner/delivery-qr-scanner-modal';

@Component({
  selector: 'app-order-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    RouterLink,
    Badge,
    EmptyState,
    OrderTracker,
    LabelFormatPipe,
    InvoiceModal,
    FulfillmentModal,
    DeliveryQrScannerModalComponent,
    LucidePackage,
    LucideTruck,
    LucideNavigation,
    LucideCheckCircle2,
    LucideSearch,
    LucideX,
    LucideHelpCircle,
    LucideScanLine,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  template: `
    <div class="pb-28">
      <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Order Tracking & History</h1>
        <p class="text-base text-zinc-300 mt-1">Track shipments, view order progress, and search your orders.</p>
      </div>

      <!-- Actions: Search & Scanner -->
      <div class="flex items-center gap-2.5 w-full sm:w-auto">
        <!-- Real-Time Debounced Search Bar -->
        <div class="relative w-full sm:w-80">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
            <svg lucideSearch class="h-4 w-4"></svg>
          </div>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Search product, email, order ID..."
            class="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-2.5 pl-10 pr-9 text-sm text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
          />
          @if (searchQuery()) {
            <button
              type="button"
              (click)="searchQuery.set('')"
              class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title="Clear search"
            >
              <svg lucideX class="h-3.5 w-3.5"></svg>
            </button>
          }
        </div>

        <button
          type="button"
          (click)="deliveryScannerOpen.set(true)"
          class="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-600/20 px-3.5 py-2.5 text-sm font-bold text-cyan-300 hover:bg-cyan-600/30 hover:text-white active:scale-95 transition cursor-pointer shrink-0 shadow-md shadow-cyan-600/10"
          title="Scan Warehouse Delivery QR Code"
        >
          <svg lucideScanLine class="h-4 w-4 text-cyan-400"></svg>
          <span class="hidden sm:inline">Scan Delivery QR</span>
          <span class="sm:hidden">Scan QR</span>
        </button>
      </div>
    </div>

    <!-- Quick Status Filter Pills -->
    <div class="mb-6 flex flex-wrap items-center gap-2.5 border-b border-zinc-800/80 pb-3.5">
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set('ALL')"
      >
        All Orders
      </button>

      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === OrderStatuses.PENDING ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set(OrderStatuses.PENDING)"
      >
        Pending
      </button>

      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === OrderStatuses.PROCESSING ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set(OrderStatuses.PROCESSING)"
      >
        Processing
      </button>

      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === OrderStatuses.SHIPPED ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set(OrderStatuses.SHIPPED)"
      >
        Shipped
      </button>

      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === OrderStatuses.OUT_FOR_DELIVERY ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set(OrderStatuses.OUT_FOR_DELIVERY)"
      >
        Out for Delivery
      </button>

      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === OrderStatuses.DELIVERED ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set(OrderStatuses.DELIVERED)"
      >
        Delivered
      </button>

      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer"
        [class]="selectedStatus() === OrderStatuses.CANCELLED ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'"
        (click)="selectedStatus.set(OrderStatuses.CANCELLED)"
      >
        Cancelled
      </button>
    </div>

    @if (orders().length === 0) {
      <app-empty-state title="No orders found" detail="No matching orders found from the server. Try adjusting your search query." />
    } @else {
      <div class="space-y-6">
        @for (order of orders(); track order.id) {
          <div class="space-y-3">
            <app-order-tracker
              [order]="order"
              [canFulfill]="canFulfill()"
              (fulfillClicked)="openOrderFulfillment(order)"
              [canPay]="auth.role() === UserRoles.CUSTOMER"
              [isPaying]="payingOrderId() === order.id"
              (payClicked)="payOrder(order)"
              [canCancel]="auth.role() === UserRoles.CUSTOMER || auth.role() === UserRoles.ADMIN"
              [isCancelling]="cancellingOrderId() === order.id"
              (cancelClicked)="cancelCustomerOrder(order.id)"
              (invoiceClicked)="openOrderInvoice(order)"
              [isDownloadingWaybill]="downloadingWaybillOrderId() === order.id"
              (waybillClicked)="downloadOrderWaybill(order)"
              (orderUpdated)="onOrderUpdated($event)"
            />

            <!-- Order Items Breakdown -->
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
              <div class="mb-3.5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-bold uppercase tracking-wider text-zinc-300">
                    Order Items ({{ order.items.length }})
                  </p>
                  @if (order.totalAmount >= 5000 || order.paymentMode === 'MILESTONE_ESCROW') {
                    <span class="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                      <span>🛡️ Escrow Protected</span>
                    </span>
                  }
                </div>
                <a
                  [routerLink]="['/tickets']"
                  [queryParams]="{ orderId: order.id }"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-indigo-500/40 hover:text-indigo-300 transition"
                  title="Need help with this order?"
                >
                  <svg lucideHelpCircle class="h-3.5 w-3.5 text-indigo-400"></svg>
                  <span>Report Issue</span>
                </a>
              </div>
              <ul class="space-y-3">
                @for (item of order.items; track item.id) {
                  <li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 text-sm">
                    <div class="min-w-0 flex-1">
                      <p class="font-bold text-zinc-100 text-base">{{ item.productTitle }}</p>
                      <p class="text-sm text-zinc-400 mt-1">
                        Qty: <strong class="text-white font-mono">{{ item.quantity }}</strong> · <span class="font-mono">{{ item.unitPrice | currency }}</span> each
                        <span class="ml-2 font-bold text-indigo-300 font-mono">Total: {{ (item.quantity * item.unitPrice) | currency }}</span>
                      </p>
                      @if (item.carrier || item.trackingNumber) {
                        <p class="text-xs text-zinc-400 mt-1.5 flex items-center gap-2">
                          <span class="text-zinc-300 font-semibold">{{ item.carrier || 'Standard Courier' }}</span>
                          @if (item.trackingNumber) {
                            <span class="font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                              {{ item.trackingNumber }}
                            </span>
                          }
                        </p>
                      }
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5">
                      <app-badge [tone]="statusTone(item.status)">{{ item.status | labelFormat }}</app-badge>

                      @if (canFulfill()) {
                        <!-- Quick Step Transitions -->
                        @if (item.status === OrderStatuses.PENDING) {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/20 px-3.5 py-2 text-sm font-semibold text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition cursor-pointer"
                            (click)="accept(item)"
                          >
                            <svg lucidePackage class="h-4 w-4"></svg>
                            <span>Accept</span>
                          </button>
                        } @else if (item.status === OrderStatuses.PROCESSING) {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/20 px-3.5 py-2 text-sm font-semibold text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition cursor-pointer"
                            (click)="ship(item)"
                          >
                            <svg lucideTruck class="h-4 w-4"></svg>
                            <span>Mark Shipped</span>
                          </button>
                        } @else if (item.status === OrderStatuses.SHIPPED) {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/20 px-3.5 py-2 text-sm font-semibold text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition cursor-pointer"
                            (click)="outForDelivery(item)"
                          >
                            <svg lucideNavigation class="h-4 w-4"></svg>
                            <span>Out for Delivery</span>
                          </button>
                        } @else if (item.status === OrderStatuses.OUT_FOR_DELIVERY) {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/20 px-3.5 py-2 text-sm font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition cursor-pointer"
                            (click)="deliver(item)"
                          >
                            <svg lucideCheckCircle2 class="h-4 w-4"></svg>
                            <span>Mark Delivered</span>
                          </button>
                        }

                        <!-- Detailed Logistics / Fulfillment Modal Button -->
                        <button
                          type="button"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 transition cursor-pointer"
                          (click)="openItemFulfillment(order, item)"
                          title="Assign carrier, tracking # and checkpoints"
                        >
                          <svg lucideTruck class="h-4 w-4 text-indigo-400"></svg>
                          <span>Fulfill</span>
                        </button>
                      }
                    </div>
                  </li>
                }
              </ul>
            </div>
          </div>
        }
      </div>

      <!-- 📄 Pagination Controls -->
      @if (totalOrders() > 0) {
        <div class="mt-8 mb-16 sm:mb-20 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:pr-28 text-xs text-zinc-400 shadow-xl backdrop-blur-sm">
          <div class="flex items-center gap-3">
            <span>
              Showing page <strong class="text-white">{{ currentPage() }}</strong> of
              <strong class="text-white">{{ totalPages() }}</strong>
              <span class="text-zinc-500"> ({{ totalOrders() }} total orders)</span>
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              [disabled]="currentPage() <= 1"
              (click)="goToPage(currentPage() - 1)"
              class="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition active:scale-95 shadow-sm"
            >
              <svg lucideChevronLeft class="h-3.5 w-3.5"></svg>
              <span>Previous</span>
            </button>

            <!-- Page Numbers -->
            <div class="hidden sm:flex items-center gap-1">
              @for (p of getVisiblePages(); track p) {
                <button
                  type="button"
                  (click)="goToPage(p)"
                  class="h-8 w-8 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center"
                  [class]="p === currentPage() ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700'"
                >
                  {{ p }}
                </button>
              }
            </div>

            <button
              type="button"
              [disabled]="currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)"
              class="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition active:scale-95 shadow-sm"
            >
              <span>Next</span>
              <svg lucideChevronRight class="h-3.5 w-3.5"></svg>
            </button>
          </div>
        </div>
      }
    }
  </div>


    <app-invoice-modal
      [open]="invoiceModalOpen()"
      [invoice]="selectedInvoice()"
      (closed)="invoiceModalOpen.set(false)"
    />

    <app-fulfillment-modal
      [open]="fulfillmentModalOpen()"
      [orderId]="activeFulfillmentTarget()?.orderId ?? null"
      [orderItemId]="activeFulfillmentTarget()?.orderItemId ?? null"
      [initialStatus]="activeFulfillmentTarget()?.status ?? OrderStatuses.PROCESSING"
      [initialCarrier]="activeFulfillmentTarget()?.carrier"
      [initialTrackingNumber]="activeFulfillmentTarget()?.trackingNumber"
      [initialEstimatedDelivery]="activeFulfillmentTarget()?.estimatedDelivery"
      [targetTitle]="activeFulfillmentTarget()?.title ?? ''"
      (closed)="fulfillmentModalOpen.set(false)"
      (submitted)="onFulfillmentSubmitted($event)"
    />

    @if (deliveryScannerOpen()) {
      <app-delivery-qr-scanner-modal
        [activeOrders]="orders()"
        (close)="deliveryScannerOpen.set(false)"
        (deliveryVerified)="onDeliveryVerified($event)"
      />
    }
  `,
})
export class OrderList {
  private readonly api = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly orderSocket = inject(OrderSocketService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;
  readonly OrderStatuses = OrderStatuses;
  readonly PaymentStatuses = PaymentStatuses;

  readonly deliveryScannerOpen = signal(false);

  onDeliveryVerified(updatedOrder: OrderView) {
    this.deliveryScannerOpen.set(false);
    this.load(this.debouncedSearchQuery(), this.selectedStatus());
  }

  onOrderUpdated(updatedOrder: OrderView) {
    this.load(this.debouncedSearchQuery(), this.selectedStatus());
  }

  readonly orders = signal<OrderView[]>([]);
  readonly currentPage = signal(1);
  readonly pageSize = signal(5);
  readonly totalOrders = signal(0);
  readonly totalPages = signal(1);

  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = useDebounce(this.searchQuery, 350);
  readonly selectedStatus = signal<'ALL' | OrderStatuses>('ALL');
  readonly statusTone = statusTone;

  readonly payingOrderId = signal<string | null>(null);
  readonly cancellingOrderId = signal<string | null>(null);
  readonly invoiceModalOpen = signal(false);
  readonly selectedInvoice = signal<InvoiceData | null>(null);
  readonly downloadingWaybillOrderId = signal<string | null>(null);

  readonly fulfillmentModalOpen = signal(false);
  readonly activeFulfillmentTarget = signal<{
    orderId?: string;
    orderItemId?: string;
    status: OrderStatus;
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDelivery?: string | null;
    title: string;
  } | null>(null);

  constructor() {
    effect(() => {
      const q = this.debouncedSearchQuery();
      const status = this.selectedStatus();
      this.currentPage.set(1);
      this.load(q, status, 1, this.pageSize());
    });

    // Real-time: New Order Created
    effect(() => {
      const created = this.orderSocket.latestOrderCreated();
      if (!created) return;

      const shortId = created.orderId.slice(0, 8).toUpperCase();
      this.toast.info(`New Order #NX-${shortId} placed ($${created.totalAmount.toFixed(2)})!`);
      this.load(this.debouncedSearchQuery(), this.selectedStatus());
    });

    // Real-time: Order Status Updated
    effect(() => {
      const updated = this.orderSocket.latestStatusUpdated();
      if (!updated) return;

      const shortId = updated.orderId.slice(0, 8).toUpperCase();
      this.toast.success(`Order #NX-${shortId} status updated to ${updated.newStatus}`);

      this.orders.update((list) =>
        list.map((order) => {
          if (order.id !== updated.orderId) return order;

          const newEvent = {
            id: 'evt-' + Date.now(),
            status: updated.newStatus as OrderStatus,
            carrier: updated.carrier !== undefined ? updated.carrier : order.carrier,
            trackingNumber: updated.trackingNumber !== undefined ? updated.trackingNumber : order.trackingNumber,
            trackingUrl: updated.trackingUrl !== undefined ? updated.trackingUrl : order.trackingUrl,
            location: updated.checkpointLocation || null,
            description: updated.checkpointNote || null,
            timestamp: updated.updatedAt,
          };

          return {
            ...order,
            status: updated.newStatus as OrderStatus,
            carrier: updated.carrier !== undefined ? updated.carrier : order.carrier,
            trackingNumber: updated.trackingNumber !== undefined ? updated.trackingNumber : order.trackingNumber,
            trackingUrl: updated.trackingUrl !== undefined ? updated.trackingUrl : order.trackingUrl,
            estimatedDelivery: updated.estimatedDelivery !== undefined ? updated.estimatedDelivery : order.estimatedDelivery,
            trackingEvents: [...(order.trackingEvents || []), newEvent]
          };
        }),
      );
    });

    // Real-time: Order Item Updated
    effect(() => {
      const itemUpd = this.orderSocket.latestItemUpdated();
      if (!itemUpd) return;

      this.orders.update((list) =>
        list.map((order) => {
          if (order.id !== itemUpd.orderId) return order;
          const updatedItems = order.items.map((it) =>
            it.id === itemUpd.itemId
              ? {
                  ...it,
                  status: itemUpd.status as OrderStatus,
                  carrier: itemUpd.carrier !== undefined ? itemUpd.carrier : it.carrier,
                  trackingNumber: itemUpd.trackingNumber !== undefined ? itemUpd.trackingNumber : it.trackingNumber,
                  trackingUrl: itemUpd.trackingUrl !== undefined ? itemUpd.trackingUrl : it.trackingUrl,
                  estimatedDelivery: itemUpd.estimatedDelivery !== undefined ? itemUpd.estimatedDelivery : it.estimatedDelivery,
                }
              : it,
          );
          return {
            ...order,
            items: updatedItems,
          };
        }),
      );
    });

    // Real-time: Order Payment Confirmed
    effect(() => {
      const paid = this.orderSocket.latestOrderPaid();
      if (!paid) return;

      const shortId = paid.orderId.slice(0, 8).toUpperCase();
      this.toast.success(`Payment confirmed for Order #NX-${shortId}!`);

      this.orders.update((list) =>
        list.map((order) => {
          if (order.id !== paid.orderId) return order;
          return {
            ...order,
            status: OrderStatuses.PROCESSING,
          };
        }),
      );
    });

    // Real-time: Proof of Delivery
    effect(() => {
      const pod = this.orderSocket.latestProofOfDelivery();
      if (!pod) return;

      this.orders.update((list) =>
        list.map((order) => {
          if (order.id !== pod.orderId) return order;
          return {
            ...order,
            deliveredAt: pod.deliveredAt || pod.completedAt,
            inspectionStartedAt: pod.deliveredAt || pod.completedAt,
            inspectionExpiresAt: pod.inspectionExpiresAt,
            inspectionStatus: 'ACTIVE',
            recipientName: pod.recipientName,
          };
        }),
      );
    });

    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams['payment_success'] === 'true' && queryParams['orderId']) {
        this.toast.success('Order payment confirmed via Stripe!');
      }
      if (queryParams['qrOrder']) {
        this.deliveryScannerOpen.set(true);
        this.searchQuery.set(queryParams['qrOrder'].slice(0, 8));
      }
    });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  load(q?: string, status?: string, page = this.currentPage(), limit = 5) {
    this.api.list(q, status, page, 5).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.totalOrders.set(res.total);
        this.totalPages.set(res.totalPages);
        this.currentPage.set(res.page);
      },
      error: () => {},
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.load(this.debouncedSearchQuery(), this.selectedStatus(), page, 5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getVisiblePages(): number[] {
    const total = this.totalPages();
    const curr = this.currentPage();
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(curr - 2, total - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }

  openOrderFulfillment(order: OrderView) {
    this.activeFulfillmentTarget.set({
      orderId: order.id,
      status: order.status,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      title: `Order #NX-${order.id.slice(0, 8).toUpperCase()}`,
    });
    this.fulfillmentModalOpen.set(true);
  }

  openItemFulfillment(order: OrderView, item: OrderView['items'][number]) {
    this.activeFulfillmentTarget.set({
      orderId: order.id,
      orderItemId: item.id,
      status: item.status,
      carrier: item.carrier || order.carrier,
      trackingNumber: item.trackingNumber || order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      title: `${item.productTitle} (Order #NX-${order.id.slice(0, 8).toUpperCase()})`,
    });
    this.fulfillmentModalOpen.set(true);
  }

  onFulfillmentSubmitted(payload: FulfillmentPayload) {
    if (payload.orderItemId) {
      this.api
        .setItemStatus(payload.orderItemId, {
          status: payload.status,
          carrier: payload.carrier,
          trackingNumber: payload.trackingNumber,
          trackingUrl: payload.trackingUrl,
          checkpointLocation: payload.checkpointLocation,
          checkpointNote: payload.checkpointNote,
          estimatedDelivery: payload.estimatedDelivery,
          deliveryPartnerId: payload.deliveryPartnerId,
        })
        .subscribe({
          next: () => {
            this.fulfillmentModalOpen.set(false);
            this.toast.success('Item fulfillment updated & customer notified!');
            this.load(this.debouncedSearchQuery(), this.selectedStatus());
          },
          error: (err) => {
            const msg = err?.error?.message;
            this.toast.error(typeof msg === 'string' ? msg : 'Failed to update item fulfillment');
          },
        });
    } else if (payload.orderId) {
      this.api
        .fulfillOrder(payload.orderId, {
          status: payload.status,
          carrier: payload.carrier,
          trackingNumber: payload.trackingNumber,
          trackingUrl: payload.trackingUrl,
          checkpointLocation: payload.checkpointLocation,
          checkpointNote: payload.checkpointNote,
          estimatedDelivery: payload.estimatedDelivery,
          deliveryPartnerId: payload.deliveryPartnerId,
        })
        .subscribe({
          next: () => {
            this.fulfillmentModalOpen.set(false);
            this.toast.success('Order fulfillment updated & customer notified!');
            this.load(this.debouncedSearchQuery(), this.selectedStatus());
          },
          error: (err) => {
            const msg = err?.error?.message;
            this.toast.error(typeof msg === 'string' ? msg : 'Failed to fulfill order');
          },
        });
    }
  }

  openOrderInvoice(order: OrderView) {
    this.api.getInvoice(order.id).subscribe({
      next: (invoice) => {
        this.selectedInvoice.set(invoice);
        this.invoiceModalOpen.set(true);
      },
      error: () => {
        const rawSubtotal = order.items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
        const taxRate = 5.0;
        const taxAmount = Number(((rawSubtotal * taxRate) / 100).toFixed(2));
        const fallbackInvoice: InvoiceData = {
          invoiceNumber: `INV-ORD-${order.id.slice(0, 8).toUpperCase()}`,
          documentType: 'COMMERCIAL_TAX_INVOICE',
          orderId: order.id,
          issueDate: order.createdAt,
          status: order.status,
          paymentMethod: 'Stripe Enterprise Escrow',
          paymentStatus: order.status === OrderStatuses.CANCELLED ? PaymentStatuses.CANCELLED : PaymentStatuses.PAID,
          issuer: {
            legalName: 'Nexus B2B Wholesale Marketplace Inc.',
            taxId: 'US-EIN-94-3829102',
            address: '100 Market St, Suite 500, San Francisco, CA 94105',
            supportEmail: 'billing@nexus.b2b',
            phone: '+1 (800) 555-NEXUS',
            website: 'nexus.b2b',
          },
          customer: {
            id: 'buyer-account',
            name: 'Verified Enterprise Buyer',
            email: order.customerEmail || 'buyer@nexus.b2b',
            accountType: 'Verified B2B Buyer',
          },
          items: order.items.map((it) => ({
            id: it.id,
            productId: it.productId,
            productTitle: it.productTitle,
            productSku: `SKU-${it.productId.slice(0, 8).toUpperCase()}`,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.quantity * it.unitPrice,
            status: it.status,
          })),
          subtotal: rawSubtotal,
          taxRatePercent: taxRate,
          taxAmount,
          shippingFee: 0,
          totalAmount: Number(order.totalAmount) || rawSubtotal + taxAmount,
        };
        this.selectedInvoice.set(fallbackInvoice);
        this.invoiceModalOpen.set(true);
      },
    });
  }

  downloadOrderWaybill(order: OrderView) {
    if (this.downloadingWaybillOrderId()) return;
    this.downloadingWaybillOrderId.set(order.id);

    this.api.downloadWaybillPdf(order.id).subscribe({
      next: (blob) => {
        this.downloadingWaybillOrderId.set(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const carrierClean = (order.carrier || 'NEXUS').toUpperCase().replace(/[^A-Z0-9]/g, '');
        a.download = `WB-${carrierClean}-${order.id.slice(0, 8).toUpperCase()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Shipping waybill downloaded successfully');
      },
      error: (err) => {
        this.downloadingWaybillOrderId.set(null);
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Failed to download shipping waybill');
      },
    });
  }

  payOrder(order: OrderView) {
    void this.router.navigate(['/checkout', order.id]);
  }

  cancelCustomerOrder(orderId: string) {
    if (this.cancellingOrderId()) return;
    this.cancellingOrderId.set(orderId);

    this.api.cancelOrder(orderId).subscribe({
      next: () => {
        this.cancellingOrderId.set(null);
        this.toast.success('Order cancelled successfully! Stock restocked.');
        this.load(this.debouncedSearchQuery(), this.selectedStatus());
      },
      error: (err) => {
        this.cancellingOrderId.set(null);
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Unable to cancel order');
      },
    });
  }

  canFulfill(): boolean {
    const role = this.auth.role();
    return role === UserRoles.SUPPLIER || role === UserRoles.ADMIN;
  }

  updateItem(id: string, status: OrderStatus, success: string) {
    this.api.setItemStatus(id, status).subscribe({
      next: () => {
        this.toast.success(success);
        this.load(this.debouncedSearchQuery(), this.selectedStatus());
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Unable to update order');
      },
    });
  }

  accept(item: OrderView['items'][number]) {
    this.updateItem(item.id, OrderStatuses.PROCESSING, 'Order accepted');
  }

  ship(item: OrderView['items'][number]) {
    this.updateItem(item.id, OrderStatuses.SHIPPED, 'Marked shipped');
  }

  outForDelivery(item: OrderView['items'][number]) {
    this.updateItem(item.id, OrderStatuses.OUT_FOR_DELIVERY, 'Marked out for delivery');
  }

  deliver(item: OrderView['items'][number]) {
    this.updateItem(item.id, OrderStatuses.DELIVERED, 'Marked delivered');
  }
}
