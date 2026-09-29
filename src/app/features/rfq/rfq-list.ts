import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentStatuses, RFQQuote, RFQStatus, RfqStatuses, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CurrencyService } from '@core/services/currency.service';
import { PaymentService } from '@core/services/payment.service';
import { RfqService } from '@core/services/rfq.service';
import { ToastService } from '@core/services/toast.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import { CheckoutModal } from '@shared/ui/checkout-modal/checkout-modal';
import {
  LucideArrowRight,
  LucideBuilding2,
  LucideCheck,
  LucideClock,
  LucideCreditCard,
  LucideDollarSign,
  LucideFileText,
  LucideHandshake,
  LucideMessageSquare,
  LucideReceipt,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { InvoiceData, InvoiceModal } from '@shared/ui/invoice-modal/invoice-modal';
import { RfqChatDrawer } from '@shared/ui/rfq-chat-drawer/rfq-chat-drawer';
import { RfqChatService } from '@core/services/rfq-chat.service';

import { useDebounce } from '@core/hooks/use-debounce';

@Component({
  selector: 'app-rfq-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NexusCurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    CheckoutModal,
    InvoiceModal,
    RfqChatDrawer,
    LucideFileText,
    LucideBuilding2,
    LucideClock,
    LucideHandshake,
    LucideCheck,
    LucideX,
    LucideDollarSign,
    LucideTrash2,
    LucideArrowRight,
    LucideMessageSquare,
    LucideCreditCard,
    LucideSearch,
    LucideReceipt,
  ],
  templateUrl: './rfq-list.html',
})
export class RfqList {
  readonly rfqService = inject(RfqService);
  readonly rfqChatService = inject(RfqChatService);
  readonly currencyService = inject(CurrencyService);
  readonly auth = inject(AuthService);
  private readonly paymentService = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = useDebounce(this.searchQuery, 350);
  readonly filterStatus = signal<'ALL' | RFQStatus>('ALL');

  // Paying quote loading state
  readonly payingQuoteId = signal<string | null>(null);

  // Checkout modal state
  readonly checkoutOpen = signal(false);
  readonly checkoutQuote = signal<RFQQuote | null>(null);

  // Invoice modal state
  readonly invoiceModalOpen = signal(false);
  readonly selectedInvoice = signal<InvoiceData | null>(null);

  readonly RfqStatuses = RfqStatuses;
  readonly PaymentStatuses = PaymentStatuses;
  readonly UserRoles = UserRoles;

  // Active Quote selected for counter offer modal
  readonly selectedCounterQuote = signal<RFQQuote | null>(null);
  readonly counterPriceInput = signal<number>(0);

  constructor() {
    effect(() => {
      const q = this.debouncedSearchQuery();
      const status = this.filterStatus();
      this.rfqService.fetchQuotes(q, status);
    });

    const params = this.route.snapshot.queryParams;
    if (params['payment_success'] === 'true' && params['rfqId']) {
      this.rfqService.updateStatus(params['rfqId'], RfqStatuses.PAID);
      this.toast.success('Stripe Payment Verified & Contract Settled!');
    }

    // Auto-open chat drawer if quoteId query param is provided (e.g. from notification)
    this.route.queryParams.subscribe((p) => {
      const qid = p['quoteId'];
      if (qid) {
        const match = this.rfqService.quotes().find((q) => q.id === qid);
        if (
          match &&
          (!this.rfqChatService.isDrawerOpen() || this.rfqChatService.activeQuote()?.id !== qid)
        ) {
          this.rfqChatService.openChat(match);
        }
      }
    });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  openPaymentModal(quote: RFQQuote) {
    if (this.payingQuoteId()) return;
    this.payingQuoteId.set(quote.id);

    this.checkoutQuote.set(quote);
    this.payingQuoteId.set(null);
    this.checkoutOpen.set(true);
  }

  onPaymentCompleted() {
    const q = this.checkoutQuote();
    if (q) {
      this.rfqService.updateStatus(q.id, RfqStatuses.PAID);
    }
    this.payingQuoteId.set(null);
    this.checkoutOpen.set(false);
    this.checkoutQuote.set(null);
  }

  openQuoteInvoice(quote: RFQQuote) {
    this.rfqService.getInvoice(quote.id).subscribe({
      next: (inv) => {
        this.selectedInvoice.set(inv);
        this.invoiceModalOpen.set(true);
      },
      error: () => {
        const effectiveUnitPrice = Number(
          quote.counterUnitPrice || quote.requestedUnitPrice || quote.unitPrice,
        );
        const lineTotal = Number((effectiveUnitPrice * quote.targetQuantity).toFixed(2));
        const platformFee = Number(
          quote.platformFeeAmount ||
            ((lineTotal * (quote.platformFeePercent || 10)) / 100).toFixed(2),
        );
        const fallbackInvoice: InvoiceData = {
          invoiceNumber: `PO-RFQ-${quote.id.slice(0, 8).toUpperCase()}`,
          documentType: 'WHOLESALE_PURCHASE_ORDER',
          quoteId: quote.id,
          issueDate: quote.createdAt,
          status: quote.status,
          paymentMethod: 'Stripe Wholesale Escrow',
          paymentStatus:
            quote.status === RfqStatuses.PAID
              ? PaymentStatuses.PAID
              : quote.status === RfqStatuses.ACCEPTED
                ? PaymentStatuses.AWAITING_PAYMENT
                : quote.status,
          issuer: {
            legalName: 'Nexus B2B Wholesale Marketplace Inc.',
            taxId: 'US-EIN-94-3829102',
            address: '100 Market St, Suite 500, San Francisco, CA 94105',
            supportEmail: 'wholesale@nexus.b2b',
            phone: '+1 (800) 555-NEXUS',
            website: 'nexus.b2b',
          },
          supplier: {
            id: quote.supplierId,
            storeName: quote.storeName || 'Verified Nexus Supplier',
            verified: true,
          },
          customer: {
            id: quote.customerId,
            name: quote.customerName || 'Enterprise Bulk Buyer',
            email: quote.customerEmail,
            accountType: 'Enterprise Wholesale Buyer',
          },
          logistics: {
            deliveryTimeline: quote.deliveryTimeline || 'Standard Freight - 3 to 5 Days',
            shippingTerms: 'FOB Destination / Courier Tracked',
            buyerNotes: quote.notes || 'None provided',
          },
          items: [
            {
              id: quote.productId,
              productId: quote.productId,
              productTitle: quote.productTitle,
              productSku: `RFQ-${quote.productSlug ? quote.productSlug.slice(0, 8).toUpperCase() : 'BULK-ITEM'}`,
              storeName: quote.storeName,
              quantity: quote.targetQuantity,
              unitPrice: effectiveUnitPrice,
              subtotal: lineTotal,
              originalMSRP: Number(quote.unitPrice),
            },
          ],
          subtotal: lineTotal,
          platformFeePercent: Number(quote.platformFeePercent || 10),
          platformFeeAmount: platformFee,
          supplierPayoutAmount: Number(quote.supplierPayoutAmount || lineTotal - platformFee),
          taxRatePercent: 0,
          taxAmount: 0,
          shippingFee: 0,
          totalAmount: lineTotal,
        };
        this.selectedInvoice.set(fallbackInvoice);
        this.invoiceModalOpen.set(true);
      },
    });
  }

  readonly quotes = computed(() => {
    const list = this.rfqService.quotes();
    const filter = this.filterStatus();
    if (filter === 'ALL') return list;
    return list.filter((q: RFQQuote) => q.status === filter);
  });

  readonly totalCount = computed(() => this.rfqService.quotes().length);

  readonly pendingCount = computed(
    () =>
      this.rfqService
        .quotes()
        .filter(
          (q: RFQQuote) =>
            q.status === RfqStatuses.SUBMITTED || q.status === RfqStatuses.UNDER_REVIEW,
        ).length,
  );

  readonly counterCount = computed(
    () =>
      this.rfqService.quotes().filter((q: RFQQuote) => q.status === RfqStatuses.COUNTER_OFFERED)
        .length,
  );

  readonly acceptedCount = computed(
    () =>
      this.rfqService.quotes().filter((q: RFQQuote) => q.status === RfqStatuses.ACCEPTED).length,
  );

  readonly totalAgreedValue = computed(() => {
    return this.rfqService
      .quotes()
      .filter((q: RFQQuote) => q.status === RfqStatuses.ACCEPTED)
      .reduce(
        (sum: number, q: RFQQuote) =>
          sum + (q.counterUnitPrice || q.requestedUnitPrice) * q.targetQuantity,
        0,
      );
  });

  openCounterModal(quote: RFQQuote) {
    this.selectedCounterQuote.set(quote);
    this.counterPriceInput.set(
      quote.counterUnitPrice || Math.round((quote.unitPrice + quote.requestedUnitPrice) / 2),
    );
  }

  closeCounterModal() {
    this.selectedCounterQuote.set(null);
  }

  submitCounterOffer() {
    const q = this.selectedCounterQuote();
    if (!q || !this.counterPriceInput()) return;
    this.rfqService.counterOffer(q.id, this.counterPriceInput());
    this.closeCounterModal();
  }

  acceptQuote(rfqId: string) {
    this.rfqService.updateStatus(rfqId, RfqStatuses.ACCEPTED);
  }

  rejectQuote(rfqId: string) {
    this.rfqService.updateStatus(rfqId, RfqStatuses.REJECTED);
  }

  deleteQuote(rfqId: string) {
    this.rfqService.deleteRFQ(rfqId);
  }

  openChat(quote: RFQQuote) {
    this.rfqChatService.openChat(quote);
  }

  statusClass(status: RFQStatus): string {
    switch (status) {
      case RfqStatuses.SUBMITTED:
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case RfqStatuses.COUNTER_OFFERED:
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
      case RfqStatuses.ACCEPTED:
      case RfqStatuses.PAID:
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case RfqStatuses.REJECTED:
        return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
      default:
        return 'border-zinc-800 bg-zinc-900 text-zinc-400';
    }
  }
}
