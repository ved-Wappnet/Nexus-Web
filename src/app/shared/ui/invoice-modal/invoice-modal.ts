import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import { OrderService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCheck,
  LucideCheckCircle2,
  LucideClock,
  LucideCopy,
  LucideDownload,
  LucidePrinter,
  LucideReceipt,
  LucideShieldCheck,
  LucideTruck,
  LucideX,
} from '@lucide/angular';
import {
  OrderStatus,
  OrderStatuses,
  PaymentStatus,
  PaymentStatuses,
  RFQStatus,
} from '@core/models';

export interface InvoiceItem {
  id?: string;
  productId?: string;
  productTitle: string;
  productSku?: string;
  storeName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status?: string;
  originalMSRP?: number;
}

export interface InvoiceParty {
  name?: string;
  legalName?: string;
  id?: string;
  email?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  website?: string;
  supportEmail?: string;
  accountType?: string;
  storeName?: string;
  verified?: boolean;
}

export interface InvoiceData {
  invoiceNumber: string;
  documentType: 'COMMERCIAL_TAX_INVOICE' | 'WHOLESALE_PURCHASE_ORDER';
  orderId?: string;
  quoteId?: string;
  issueDate: string | Date;
  status: OrderStatus | RFQStatus | string;
  paymentMethod: string;
  paymentStatus: PaymentStatus | string;
  issuer: InvoiceParty;
  customer: InvoiceParty;
  supplier?: InvoiceParty;
  logistics?: {
    deliveryTimeline?: string;
    shippingTerms?: string;
    buyerNotes?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxRatePercent?: number;
  taxAmount?: number;
  platformFeePercent?: number;
  platformFeeAmount?: number;
  supplierPayoutAmount?: number;
  shippingFee?: number;
  totalAmount: number;
}

@Component({
  selector: 'app-invoice-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NexusCurrencyPipe,
    DatePipe,
    LucideX,
    LucidePrinter,
    LucideDownload,
    LucideCopy,
    LucideCheck,
    LucideReceipt,
    LucideShieldCheck,
    LucideTruck,
    LucideCheckCircle2,
    LucideClock,
  ],
  template: `
    @if (open()) {
      <div
        class="invoice-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-fade-in overflow-y-auto"
      >
        <!-- Backdrop close listener -->
        <div class="fixed inset-0 z-0 no-print" (click)="closed.emit()"></div>

        <!-- Invoice Container -->
        <div
          class="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-2xl shadow-indigo-950/40 text-zinc-100 print:max-w-none print:m-0 print:p-8 print:border-none print:bg-white print:text-zinc-900 print:shadow-none"
          id="printable-invoice"
        >
          <!-- Action Bar (Hidden when Printing) -->
          <div
            class="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-5"
          >
            <div class="flex items-center gap-2">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
              >
                <svg lucideReceipt class="h-5 w-5"></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">
                  {{
                    isWholesale() ? 'Wholesale Purchase Order & Proforma' : 'Commercial Tax Invoice'
                  }}
                </h3>
                <p class="text-xs text-zinc-400">
                  Official B2B Transaction Document · Nexus Platform
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="copyInvoiceNumber()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition cursor-pointer"
                title="Copy Reference"
              >
                @if (copied()) {
                  <svg lucideCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                  <span class="text-emerald-400">Copied</span>
                } @else {
                  <svg lucideCopy class="h-3.5 w-3.5"></svg>
                  <span>Copy ID</span>
                }
              </button>

              <button
                type="button"
                (click)="downloadJson()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition cursor-pointer"
                title="Export JSON"
              >
                <svg lucideDownload class="h-3.5 w-3.5 text-zinc-400"></svg>
                <span class="hidden sm:inline">JSON</span>
              </button>

              <button
                type="button"
                (click)="downloadPdf()"
                [disabled]="isDownloadingPdf()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition cursor-pointer disabled:opacity-50"
                title="Download Vector PDF Invoice"
              >
                @if (isDownloadingPdf()) {
                  <svg class="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating…</span>
                } @else {
                  <svg lucideDownload class="h-3.5 w-3.5 text-white"></svg>
                  <span>Download PDF</span>
                }
              </button>

              <button
                type="button"
                (click)="printInvoice()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition cursor-pointer"
                title="Print Browser View"
              >
                <svg lucidePrinter class="h-3.5 w-3.5"></svg>
                <span class="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                (click)="closed.emit()"
                class="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer ml-1"
                title="Close"
              >
                <svg lucideX class="h-4 w-4"></svg>
              </button>
            </div>
          </div>

          <!-- Printable Invoice Content Container -->
          <div id="printable-invoice-document" class="print-document-content">
            <!-- Document Header -->
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6 print:border-zinc-300"
            >
            <div>
              <div class="flex items-center gap-2.5">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 [background:linear-gradient(135deg,#6366f1_0%,#4338ca_100%)] text-white font-black text-lg shadow-md shadow-indigo-950/40"
                >
                  N
                </div>
                <div>
                  <h1
                    class="text-xl sm:text-2xl font-black tracking-tight text-white print:text-zinc-900"
                  >
                    NEXUS <span class="text-indigo-400 font-medium">B2B ENTERPRISE</span>
                  </h1>
                  <p
                    class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold print:text-zinc-600"
                  >
                    Verified Wholesale & Multi-Vendor Marketplace
                  </p>
                </div>
              </div>
            </div>

            <!-- Invoice Reference Box -->
            <div class="sm:text-right space-y-1">
              <div
                class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                [class]="statusBadgeClass()"
              >
                @if (invoice()?.paymentStatus === PaymentStatuses.PAID) {
                  <svg
                    lucideCheckCircle2
                    class="h-3.5 w-3.5 text-emerald-400 print:text-emerald-700"
                  ></svg>
                  <span>PAID · SETTLED</span>
                } @else if (
                  invoice()?.status === OrderStatuses.CANCELLED ||
                  invoice()?.paymentStatus === PaymentStatuses.CANCELLED
                ) {
                  <span>CANCELLED</span>
                } @else {
                  <svg lucideClock class="h-3.5 w-3.5 text-amber-400 print:text-amber-700"></svg>
                  <span>{{ invoice()?.paymentStatus || 'AWAITING PAYMENT' }}</span>
                }
              </div>

              <p class="font-mono text-lg font-black text-white print:text-zinc-900">
                {{ invoice()?.invoiceNumber }}
              </p>
              <p class="text-xs text-zinc-400 print:text-zinc-600">
                Issued Date:
                <strong class="text-zinc-200 print:text-zinc-800">{{
                  invoice()?.issueDate | date: 'mediumDate'
                }}</strong>
              </p>
            </div>
          </div>

          <!-- Parties Grid (Issuer / Vendor vs Buyer) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 text-sm print:my-4">
            <!-- Issuer / Vendor Box -->
            <div
              class="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-2.5 print:border-zinc-300 print:bg-zinc-50"
            >
              <div
                class="flex items-center justify-between border-b border-zinc-800/60 pb-2 print:border-zinc-300"
              >
                <span
                  class="font-bold uppercase tracking-wider text-indigo-400 print:text-indigo-700 text-xs"
                >
                  {{ isWholesale() ? 'Target Vendor & Marketplace' : 'Marketplace Operator' }}
                </span>
                <span
                  class="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-300 print:border print:border-zinc-300 print:bg-white print:text-zinc-700"
                >
                  Seller
                </span>
              </div>

              <div>
                @if (invoice()?.supplier?.storeName) {
                  <p class="text-base font-bold text-white print:text-zinc-900">
                    {{ invoice()?.supplier?.storeName }}
                  </p>
                  <p class="text-xs text-zinc-400 print:text-zinc-600">
                    Nexus Platform Authorized Vendor
                  </p>
                } @else {
                  <p class="text-base font-bold text-white print:text-zinc-900">
                    {{ invoice()?.issuer?.legalName }}
                  </p>
                }
              </div>

              <div class="space-y-1.5 text-zinc-400 print:text-zinc-700 text-xs">
                <p>
                  Tax Reg / VAT:
                  <strong class="text-zinc-200 print:text-zinc-900 font-mono">{{
                    invoice()?.issuer?.taxId
                  }}</strong>
                </p>
                <p>{{ invoice()?.issuer?.address }}</p>
                <p>
                  Support:
                  <span class="text-indigo-300 print:text-indigo-800 font-medium">{{
                    invoice()?.issuer?.supportEmail
                  }}</span>
                </p>
              </div>
            </div>

            <!-- Bill To / Customer Box -->
            <div
              class="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-2.5 print:border-zinc-300 print:bg-zinc-50"
            >
              <div
                class="flex items-center justify-between border-b border-zinc-800/60 pb-2 print:border-zinc-300"
              >
                <span
                  class="font-bold uppercase tracking-wider text-indigo-400 print:text-indigo-700 text-xs"
                >
                  Bill To / Procured By
                </span>
                <span
                  class="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-300 print:border print:border-zinc-300 print:bg-white print:text-zinc-700"
                >
                  Buyer
                </span>
              </div>

              <div>
                <p class="text-base font-bold text-white print:text-zinc-900">
                  {{ invoice()?.customer?.name }}
                </p>
                <p class="text-xs text-zinc-400 print:text-zinc-600">
                  {{ invoice()?.customer?.accountType }}
                </p>
              </div>

              <div class="space-y-1.5 text-zinc-400 print:text-zinc-700 text-xs">
                <p>
                  Email:
                  <strong class="text-zinc-200 print:text-zinc-900">{{
                    invoice()?.customer?.email
                  }}</strong>
                </p>
                <p>
                  Account ID:
                  <span class="font-mono text-zinc-400 print:text-zinc-700">{{
                    invoice()?.customer?.id
                  }}</span>
                </p>
                <p>
                  Payment Mode:
                  <strong class="text-zinc-200 print:text-zinc-900">{{
                    invoice()?.paymentMethod
                  }}</strong>
                </p>
              </div>
            </div>
          </div>

          <!-- Logistics & Terms Strip (For Wholesale or Tracked Orders) -->
          @if (invoice()?.logistics; as log) {
            <div
              class="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 mb-6 text-sm flex flex-wrap items-center justify-between gap-3 print:border-zinc-300 print:bg-zinc-50"
            >
              <div class="flex items-center gap-2">
                <svg lucideTruck class="h-4 w-4 text-indigo-400 print:text-indigo-700"></svg>
                <span class="text-zinc-400 print:text-zinc-600">Freight & Delivery:</span>
                <strong class="text-zinc-200 print:text-zinc-900">{{
                  log.deliveryTimeline
                }}</strong>
              </div>

              @if (log.shippingTerms) {
                <div class="flex items-center gap-1.5 text-zinc-400 print:text-zinc-600">
                  <span>Terms:</span>
                  <strong class="text-zinc-200 print:text-zinc-900">{{ log.shippingTerms }}</strong>
                </div>
              }

              @if (log.buyerNotes && log.buyerNotes !== 'None provided') {
                <div
                  class="w-full pt-1.5 border-t border-indigo-500/15 text-xs text-zinc-300 print:text-zinc-700"
                >
                  <span class="font-semibold text-zinc-400">Buyer RFQ Specs:</span>
                  <em class="text-zinc-200 print:text-zinc-900">"{{ log.buyerNotes }}"</em>
                </div>
              }
            </div>
          }

          <!-- Line Items Table -->
          <div
            class="overflow-x-auto rounded-2xl border border-zinc-800/80 my-6 print:border-zinc-300 print:my-4"
          >
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr
                  class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-300 font-bold print:bg-zinc-100 print:text-zinc-700 print:border-zinc-300"
                >
                  <th class="py-3.5 px-4">#</th>
                  <th class="py-3.5 px-4">Description / Product</th>
                  <th class="py-3.5 px-4">SKU / Code</th>
                  <th class="py-3.5 px-4 text-right">Unit Price</th>
                  <th class="py-3.5 px-4 text-center">Qty</th>
                  <th class="py-3.5 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/60 print:divide-zinc-200">
                @for (item of invoice()?.items; track item.productId || $index; let idx = $index) {
                  <tr class="hover:bg-zinc-900/30 transition print:hover:bg-transparent">
                    <td class="py-4 px-4 text-zinc-500 font-mono">{{ idx + 1 }}</td>
                    <td class="py-4 px-4">
                      <p class="font-bold text-white print:text-zinc-900 text-base">
                        {{ item.productTitle }}
                      </p>
                      @if (item.storeName) {
                        <p class="text-xs text-zinc-400 print:text-zinc-600 mt-0.5">
                          Vendor: {{ item.storeName }}
                        </p>
                      }
                    </td>
                    <td class="py-4 px-4 font-mono text-zinc-400 print:text-zinc-600 text-xs">
                      {{ item.productSku || 'SKU-NEXUS' }}
                    </td>
                    <td
                      class="py-4 px-4 text-right font-mono font-semibold text-zinc-200 print:text-zinc-800"
                    >
                      {{ item.unitPrice | nexusCurrency }}
                    </td>
                    <td
                      class="py-4 px-4 text-center font-bold text-white print:text-zinc-900 text-base"
                    >
                      {{ item.quantity }}
                    </td>
                    <td
                      class="py-4 px-4 text-right font-mono font-bold text-zinc-100 print:text-zinc-900 text-base"
                    >
                      {{ item.subtotal | nexusCurrency }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Financial Calculation Breakdown -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 print:my-4">
            <div
              class="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-2.5 text-sm print:border-zinc-300 print:bg-zinc-50"
            >
              <div
                class="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider print:text-indigo-800"
              >
                <svg lucideShieldCheck class="h-4.5 w-4.5"></svg>
                <span>Payment & Escrow Protection</span>
              </div>
              <p class="text-zinc-300 text-xs leading-relaxed print:text-zinc-600">
                Processed via 256-bit SSL encrypted Stripe payment gateway. Funds are safeguarded
                under Nexus B2B escrow compliance until goods delivery.
              </p>
              <div
                class="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-400 print:text-zinc-600"
              >
                <span>Auth Stamp:</span>
                <span
                  class="rounded bg-zinc-800 px-2 py-0.5 text-zinc-200 font-bold print:bg-zinc-200 print:text-zinc-800"
                >
                  NX-SEC-{{ invoice()?.invoiceNumber?.slice(-6) }}
                </span>
              </div>
            </div>

            <!-- Calculation Box -->
            <div
              class="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-2.5 text-sm print:border-zinc-300 print:bg-zinc-50"
            >
              <div class="flex justify-between text-zinc-300 print:text-zinc-600">
                <span>Subtotal</span>
                <span class="font-mono font-semibold text-zinc-100 print:text-zinc-900">{{
                  (invoice()?.subtotal || 0) | nexusCurrency
                }}</span>
              </div>

              @if (invoice()?.platformFeeAmount; as fee) {
                <div class="flex justify-between text-zinc-300 print:text-zinc-600">
                  <span>Wholesale Platform Fee ({{ invoice()?.platformFeePercent || 10 }}%)</span>
                  <span class="font-mono font-bold text-amber-400 print:text-amber-800"
                    >+{{ fee | nexusCurrency }}</span
                  >
                </div>
              }

              <div class="flex justify-between text-zinc-300 print:text-zinc-600">
                <span>Sales Tax / VAT ({{ invoice()?.taxRatePercent || 0 }}%)</span>
                <span class="font-mono font-semibold text-zinc-100 print:text-zinc-900">{{
                  (invoice()?.taxAmount || 0) | nexusCurrency
                }}</span>
              </div>

              <div class="flex justify-between text-zinc-300 print:text-zinc-600">
                <span>Shipping & Freight</span>
                <span class="font-bold text-emerald-400 print:text-emerald-700">Free B2B Tier</span>
              </div>

              <div
                class="border-t border-zinc-800 pt-3 flex justify-between items-center text-base font-bold text-white print:border-zinc-300 print:text-zinc-900"
              >
                <span class="text-base font-extrabold">Grand Total</span>
                <span class="font-mono text-2xl font-black text-indigo-400 print:text-indigo-800">
                  {{ (invoice()?.totalAmount || 0) | nexusCurrency }}
                </span>
              </div>
            </div>
          </div>

          <!-- Document Footer / Legal -->
          <div
            class="border-t border-zinc-800/80 pt-6 mt-6 text-center text-xs text-zinc-400 space-y-2 print:border-zinc-300 print:text-zinc-600 print:mt-4"
          >
            <p class="leading-relaxed">
              Thank you for trading with Nexus B2B Marketplace. For inquiries, disputes, or tax
              queries, email
              <strong class="text-zinc-300 print:text-zinc-800">billing&#64;nexus.b2b</strong>
              quoting reference
              <span class="font-mono text-indigo-300 print:text-zinc-900">{{
                invoice()?.invoiceNumber
              }}</span
              >.
            </p>
            <p class="font-mono text-xs text-zinc-500 print:text-zinc-500">
              Nexus B2B Marketplace Inc. · 100 Market St, Suite 500, San Francisco, CA 94105 ·
              System Generated Official Tax Invoice
            </p>
          </div>
          </div> <!-- Close #printable-invoice-document -->
        </div>
      </div>
    }
  `,
  styles: [
    `
      @media print {
        @page {
          size: auto;
          margin: 10mm 15mm;
        }
        body * {
          visibility: hidden !important;
        }
        .invoice-modal-overlay,
        #printable-invoice,
        #printable-invoice * {
          visibility: visible !important;
        }
        .invoice-modal-overlay {
          position: static !important;
          display: block !important;
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
        }
        #printable-invoice {
          position: static !important;
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: none !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 20px !important;
          background: white !important;
          color: #09090b !important;
          border: none !important;
          box-shadow: none !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `,
  ],
})
export class InvoiceModal {
  readonly open = input(false);
  readonly invoice = input<InvoiceData | null>(null);
  readonly closed = output<void>();

  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly copied = signal(false);
  readonly isDownloadingPdf = signal(false);

  readonly PaymentStatuses = PaymentStatuses;
  readonly OrderStatuses = OrderStatuses;

  readonly isWholesale = computed(() => {
    return this.invoice()?.documentType === 'WHOLESALE_PURCHASE_ORDER';
  });

  statusBadgeClass(): string {
    const status = this.invoice()?.paymentStatus;
    if (status === PaymentStatuses.PAID) {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 print:border-emerald-700 print:text-emerald-800';
    }
    if (
      status === PaymentStatuses.CANCELLED ||
      this.invoice()?.status === OrderStatuses.CANCELLED
    ) {
      return 'border-rose-500/30 bg-rose-500/10 text-rose-400 print:border-rose-700 print:text-rose-800';
    }
    return 'border-amber-500/30 bg-amber-500/10 text-amber-400 print:border-amber-700 print:text-amber-800';
  }

  copyInvoiceNumber() {
    const inv = this.invoice()?.invoiceNumber;
    if (inv) {
      navigator.clipboard.writeText(inv);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  printInvoice() {
    const docEl = document.getElementById('printable-invoice-document');
    if (!docEl) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe for clean 1-page/natural-page printing (prevents 4x background repeating)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Clone all active stylesheets and CSS variables from parent document
    let styleSheetsHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      styleSheetsHtml += node.outerHTML;
    });

    frameDoc.open();
    frameDoc.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${this.invoice()?.invoiceNumber || 'Nexus-Official-Invoice'}</title>
          ${styleSheetsHtml}
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            html, body {
              background: #ffffff !important;
              color: #18181b !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-invoice-document {
              background: #ffffff !important;
              color: #18181b !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .text-white { color: #09090b !important; }
            .text-zinc-100 { color: #18181b !important; }
            .text-zinc-200 { color: #27272a !important; }
            .text-zinc-300 { color: #3f3f46 !important; }
            .text-zinc-400 { color: #52525b !important; }
            .text-zinc-500 { color: #71717a !important; }
            .bg-zinc-950, .bg-zinc-900, .bg-zinc-900\\/40, .bg-zinc-900\\/50, .bg-zinc-900\\/60, .bg-zinc-900\\/80 {
              background-color: #f4f4f5 !important;
            }
            .border-zinc-800, .border-zinc-800\\/80, .border-zinc-800\\/60, .border-zinc-700 {
              border-color: #e4e4e7 !important;
            }
          </style>
        </head>
        <body>
          <div id="printable-invoice-document" class="p-6">
            ${docEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    // Trigger printing once the iframe has evaluated and parsed its DOM
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 250);
  }

  downloadPdf() {
    const inv = this.invoice();
    if (!inv?.orderId) {
      this.printInvoice();
      return;
    }

    this.isDownloadingPdf.set(true);
    this.orderService.downloadInvoicePdf(inv.orderId).subscribe({
      next: (blob) => {
        this.isDownloadingPdf.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoiceNumber || 'nexus-invoice'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Invoice PDF downloaded successfully');
      },
      error: (err) => {
        this.isDownloadingPdf.set(false);
        this.toast.error('Failed to generate PDF. Opening browser print view instead.');
        this.printInvoice();
      },
    });
  }

  downloadJson() {
    const data = this.invoice();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.invoiceNumber || 'nexus-invoice'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
