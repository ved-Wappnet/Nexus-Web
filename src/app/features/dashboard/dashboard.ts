import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserRoles } from '@core/constants/user.constant';
import {
  DashboardPayload,
  OrderStatuses,
  OrderView,
  PaymentStatuses,
  ProductStatus,
  ProductStatuses,
  TicketStatus,
  TicketStatuses,
} from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { DashboardService } from '@core/services/dashboard.service';
import { OrderService } from '@core/services/catalog.service';
import { ProductService } from '@core/services/product.service';
import { ToastService } from '@core/services/toast.service';
import { LucideArrowRight } from '@lucide/angular';
import { Badge, actionTone, statusTone } from '@shared/ui/badge/badge';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Loader } from '@shared/ui/loader/loader';
import { ProductCard } from '@shared/ui/product-card/product-card';
import { StatCard } from '@shared/ui/stat-card/stat-card';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';

import { environment } from '../../../environments/environment';

import { InvoiceData, InvoiceModal } from '@shared/ui/invoice-modal/invoice-modal';
import { DashboardActiveOrderCard } from './components/dashboard-active-order';
import {
  CategoryBarChart,
  FulfillmentDonutChart,
  RevenueTrendChart,
  RfqFunnelCard,
} from './components/dashboard-charts';
import { EscrowPipelineCard } from './components/escrow-pipeline-card';
import { SupplierSlaCard } from './components/supplier-sla-card';
import { CampaignAnalyticsCard } from './components/campaign-analytics-card';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    RouterLink,
    Badge,
    EmptyState,
    StatCard,
    ProductCard,
    Loader,
    LabelFormatPipe,
    LucideArrowRight,
    DashboardActiveOrderCard,
    InvoiceModal,
    RevenueTrendChart,
    FulfillmentDonutChart,
    CategoryBarChart,
    RfqFunnelCard,
    EscrowPipelineCard,
    SupplierSlaCard,
    CampaignAnalyticsCard,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly dashboard = inject(DashboardService);
  private readonly products = inject(ProductService);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly OrderStatuses = OrderStatuses;
  readonly ProductStatuses = ProductStatuses;
  readonly TicketStatuses = TicketStatuses;

  readonly invoiceModalOpen = signal(false);
  readonly selectedInvoice = signal<InvoiceData | null>(null);

  readonly marketingRunning = signal(false);

  readonly payload = signal<DashboardPayload | null>(null);
  readonly analytics = signal<any[]>([]);
  readonly loading = signal(true);
  readonly statusTone = statusTone;
  readonly actionTone = actionTone;

  readonly metrics = computed(() => this.payload()?.data.metrics ?? []);
  readonly customer = computed(() => {
    const p = this.payload();
    return p?.role === UserRoles.CUSTOMER ? p.data : null;
  });
  readonly supplier = computed(() => {
    const p = this.payload();
    return p?.role === UserRoles.SUPPLIER ? p.data : null;
  });
  readonly subadmin = computed(() => {
    const p = this.payload();
    return p?.role === UserRoles.SUBADMIN ? p.data : null;
  });
  readonly admin = computed(() => {
    const p = this.payload();
    return p?.role === UserRoles.ADMIN ? p.data : null;
  });

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.dashboard.overview().subscribe({
      next: (data) => {
        this.payload.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    
    this.fetchAnalytics();
  }

  fetchAnalytics() {
    const token = this.auth.accessToken();
    const authHeader = token ? `Bearer ${token}` : undefined;
    fetch(`${environment.apiUrl}/marketing/analytics`, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          this.analytics.set(data);
        }
      })
      .catch(() => {});
  }

  moderate(id: string, status: ProductStatuses.APPROVED | ProductStatuses.REJECTED) {
    this.products.moderate(id, status).subscribe({
      next: () => {
        this.toast.success(
          status === ProductStatuses.APPROVED ? 'Product approved' : 'Product rejected',
        );
        this.refresh();
      },
      error: () => this.toast.error('Unable to update status'),
    });
  }

  resolveTicket(id: string, status: TicketStatus) {
    this.orders.updateTicket(id, status).subscribe({
      next: () => {
        this.toast.success('Ticket updated');
        this.refresh();
      },
      error: () => this.toast.error('Unable to update ticket'),
    });
  }

  ship(id: string) {
    this.updateItemStatus(id, OrderStatuses.SHIPPED, 'Marked shipped');
  }

  accept(id: string) {
    this.updateItemStatus(id, OrderStatuses.PROCESSING, 'Order accepted');
  }

  outForDelivery(id: string) {
    this.updateItemStatus(id, OrderStatuses.OUT_FOR_DELIVERY, 'Marked out for delivery');
  }

  deliver(id: string) {
    this.updateItemStatus(id, OrderStatuses.DELIVERED, 'Marked delivered');
  }

  openInvoice(order: OrderView) {
    this.orders.getInvoice(order.id).subscribe({
      next: (invoice) => {
        this.selectedInvoice.set(invoice);
        this.invoiceModalOpen.set(true);
      },
      error: () => {
        const rawSubtotal = (order.items || []).reduce(
          (acc, it) => acc + it.quantity * it.unitPrice,
          0,
        );
        const taxRate = 5.0;
        const taxAmount = Number(((rawSubtotal * taxRate) / 100).toFixed(2));
        const fallbackInvoice: InvoiceData = {
          invoiceNumber: `INV-ORD-${order.id.slice(0, 8).toUpperCase()}`,
          documentType: 'COMMERCIAL_TAX_INVOICE',
          orderId: order.id,
          issueDate: order.createdAt,
          status: order.status,
          paymentMethod: 'Stripe Enterprise Escrow',
          paymentStatus:
            order.status === OrderStatuses.CANCELLED
              ? PaymentStatuses.CANCELLED
              : PaymentStatuses.PAID,
          issuer: {
            legalName: 'Nexus B2B Wholesale Marketplace Inc.',
            taxId: 'US-EIN-94-3829102',
            address: '100 Market St, Suite 500, San Francisco, CA 94105',
            supportEmail: 'billing@nexus.b2b',
            phone: '+1 (800) 555-NEXUS',
            website: 'nexus.b2b',
          },
          customer: {
            name: order.customerEmail ? order.customerEmail.split('@')[0] : 'Corporate Buyer',
            accountType: 'Wholesale Verified Account',
            email: order.customerEmail || 'buyer@nexus.b2b',
            id: order.customerId || 'CUST-ORG',
          },
          items: (order.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            productTitle: it.productTitle,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.quantity * it.unitPrice,
            status: it.status,
          })),
          subtotal: rawSubtotal,
          taxRatePercent: taxRate,
          taxAmount,
          shippingFee: 0,
          totalAmount: order.totalAmount,
          logistics: {
            deliveryTimeline: order.estimatedDelivery
              ? 'Priority Courier Tracking'
              : 'Standard 3-5 Days',
            shippingTerms: 'FOB Destination / Nexus Escrow Insured',
          },
        };
        this.selectedInvoice.set(fallbackInvoice);
        this.invoiceModalOpen.set(true);
      },
    });
  }

  private updateItemStatus(
    id: string,
    status:
      | OrderStatuses.PROCESSING
      | OrderStatuses.SHIPPED
      | OrderStatuses.OUT_FOR_DELIVERY
      | OrderStatuses.DELIVERED,
    success: string,
  ) {
    this.orders.setItemStatus(id, status).subscribe({
      next: () => {
        this.toast.success(success);
        this.refresh();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Unable to update order');
      },
    });
  }

  async triggerMarketingCampaign() {
    this.marketingRunning.set(true);
    try {
      const token = this.auth.accessToken();
      const authHeader = token ? `Bearer ${token}` : undefined;
      const res = await fetch(`${environment.apiUrl}/marketing/campaigns/trigger-wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      if (res.ok) {
        this.toast.success('AI Marketing Campaign successfully triggered in the background!');
      } else {
        this.toast.error('Failed to trigger marketing campaign');
      }
    } catch (err) {
      this.toast.error('Failed to trigger marketing campaign');
    } finally {
      this.marketingRunning.set(false);
    }
  }
}
