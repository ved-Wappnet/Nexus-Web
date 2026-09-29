import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ProductView, RFQQuote, RFQStatus, RfqStatuses } from '@core/models';
import { ToastService } from '@core/services/toast.service';
import { environment } from '../../../environments/environment';

import { AuthService } from '@core/services/auth.service';

const RFQ_STORAGE_KEY = 'nexus_rfq_quotes_v3';

@Injectable({
  providedIn: 'root',
})
export class RfqService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/quotes`;

  readonly quotes = signal<RFQQuote[]>(this.readStorage());
  readonly activeModalProduct = signal<ProductView | null>(null);

  constructor() {
    if (this.isBrowser) {
      this.fetchQuotes();

      window.addEventListener('storage', (event) => {
        if (event.key === RFQ_STORAGE_KEY) {
          this.quotes.set(this.readStorage());
        }
      });
    }
  }

  fetchQuotes(q?: string, status?: string) {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (status && status !== 'ALL') params['status'] = status;

    this.http.get<any[]>(this.api, { params }).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          const normalized = data.map((item) => this.normalizeQuote(item));
          this.quotes.set(normalized);
          this.writeStorage(normalized);
        }
      },
      error: () => {
        this.quotes.set(this.readStorage());
      },
    });
  }

  openModal(product: ProductView) {
    this.activeModalProduct.set(product);
  }

  getInvoice(quoteId: string) {
    return this.http.get<any>(`${this.api}/${quoteId}/invoice`);
  }

  closeModal() {
    this.activeModalProduct.set(null);
  }

  createRFQ(payload: {
    product: ProductView;
    targetQuantity: number;
    requestedUnitPrice: number;
    deliveryTimeline: string;
    notes?: string;
    customerName?: string;
    customerEmail?: string;
  }) {
    const dto = {
      productId: payload.product.id,
      productTitle: payload.product.title,
      productSlug: payload.product.slug,
      productImage: payload.product.images?.[0]?.url || '',
      unitPrice: payload.product.price,
      targetQuantity: payload.targetQuantity,
      requestedUnitPrice: payload.requestedUnitPrice,
      deliveryTimeline: payload.deliveryTimeline,
      notes: payload.notes || '',
      customerName: payload.customerName || this.auth.currentUser()?.name || 'Enterprise Buyer',
      customerEmail: payload.customerEmail || this.auth.currentUser()?.email || 'buyer@nexus.b2b',
      supplierId: payload.product.supplierId || 'supp-1',
      storeName: payload.product.storeName || 'Prem Store Hub',
    };

    this.http.post<any>(this.api, dto).subscribe({
      next: (res) => {
        const normalized = this.normalizeQuote(res);
        const updated = [normalized, ...this.quotes().filter((q) => q.id !== normalized.id)];
        this.quotes.set(updated);
        this.writeStorage(updated);
      },
      error: () => {
        // Optimistic local fallback
        const fallbackQuote: RFQQuote = {
          id: `rfq-${Date.now()}`,
          customerId: 'cust-current',
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          supplierId: dto.supplierId,
          storeName: dto.storeName,
          productId: dto.productId,
          productTitle: dto.productTitle,
          productSlug: dto.productSlug,
          productImage: dto.productImage,
          unitPrice: dto.unitPrice,
          targetQuantity: dto.targetQuantity,
          requestedUnitPrice: dto.requestedUnitPrice,
          deliveryTimeline: dto.deliveryTimeline,
          notes: dto.notes,
          status: RfqStatuses.SUBMITTED,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updated = [fallbackQuote, ...this.quotes()];
        this.quotes.set(updated);
        this.writeStorage(updated);
      },
    });

    this.toast.success(
      `Wholesale RFQ submitted for ${payload.targetQuantity}x ${payload.product.title} @ $${payload.requestedUnitPrice}/unit!`
    );
    this.closeModal();
  }

  counterOffer(rfqId: string, counterUnitPrice: number) {
    this.http.patch<any>(`${this.api}/${rfqId}/counter`, { counterUnitPrice }).subscribe({
      next: (res) => {
        const normalized = this.normalizeQuote(res);
        const updated = this.quotes().map((q) => (q.id === rfqId ? normalized : q));
        this.quotes.set(updated);
        this.writeStorage(updated);
      },
      error: () => {
        const updated = this.quotes().map((q: RFQQuote) => {
          if (q.id === rfqId) {
            return {
              ...q,
              counterUnitPrice,
              status: RfqStatuses.COUNTER_OFFERED,
              updatedAt: new Date().toISOString(),
            };
          }
          return q;
        });
        this.quotes.set(updated);
        this.writeStorage(updated);
      },
    });

    this.toast.success(`Counter offer of $${counterUnitPrice}/unit sent to buyer!`);
  }

  updateStatus(rfqId: string, status: RFQStatus) {
    this.http.patch<any>(`${this.api}/${rfqId}/status`, { status }).subscribe({
      next: (res) => {
        const normalized = this.normalizeQuote(res);
        const updated = this.quotes().map((q) => (q.id === rfqId ? normalized : q));
        this.quotes.set(updated);
        this.writeStorage(updated);
      },
      error: () => {
        const updated = this.quotes().map((q: RFQQuote) => {
          if (q.id === rfqId) {
            return {
              ...q,
              status,
              updatedAt: new Date().toISOString(),
            };
          }
          return q;
        });
        this.quotes.set(updated);
        this.writeStorage(updated);
      },
    });

    if (status === RfqStatuses.ACCEPTED) {
      this.toast.success('RFQ Quote accepted! Order generated.');
    } else if (status === RfqStatuses.REJECTED) {
      this.toast.info('RFQ Quote request declined.');
    }
  }

  deleteRFQ(rfqId: string) {
    this.http.delete(`${this.api}/${rfqId}`).subscribe({
      error: () => {},
    });

    const updated = this.quotes().filter((q: RFQQuote) => q.id !== rfqId);
    this.quotes.set(updated);
    this.writeStorage(updated);
    this.toast.info('RFQ Quote removed.');
  }

  private normalizeQuote(raw: any): RFQQuote {
    return {
      id: raw.id,
      customerId: raw.customerId || raw.customer_id || 'cust-1',
      customerName: raw.customerName || raw.customer_name || 'Enterprise Buyer',
      customerEmail: raw.customerEmail || raw.customer_email || 'buyer@nexus.b2b',
      supplierId: raw.supplierId || raw.supplier_id || 'supp-1',
      storeName: raw.storeName || raw.store_name || 'Prem Store Hub',
      productId: raw.productId || raw.product_id,
      productTitle: raw.productTitle || raw.product_title,
      productSlug: raw.productSlug || raw.product_slug,
      productImage: raw.productImage || raw.product_image || '',
      unitPrice: Number(raw.unitPrice ?? raw.unit_price ?? 0),
      targetQuantity: Number(raw.targetQuantity ?? raw.target_quantity ?? 1),
      requestedUnitPrice: Number(raw.requestedUnitPrice ?? raw.requested_unit_price ?? 0),
      counterUnitPrice:
        raw.counterUnitPrice != null
          ? Number(raw.counterUnitPrice)
          : raw.counter_unit_price != null
            ? Number(raw.counter_unit_price)
            : undefined,
      platformFeePercent: Number(raw.platformFeePercent ?? raw.platform_fee_percent ?? 10.0),
      platformFeeAmount: Number(
        raw.platformFeeAmount ??
          raw.platform_fee_amount ??
          Math.round(
            ((raw.counterUnitPrice || raw.requestedUnitPrice || 0) *
              (raw.targetQuantity || 1) *
              ((raw.platformFeePercent ?? raw.platform_fee_percent ?? 10.0) / 100)) *
              100
          ) / 100
      ),
      supplierPayoutAmount: Number(
        raw.supplierPayoutAmount ??
          raw.supplier_payout_amount ??
          Math.round(
            ((raw.counterUnitPrice || raw.requestedUnitPrice || 0) * (raw.targetQuantity || 1) -
              ((raw.counterUnitPrice || raw.requestedUnitPrice || 0) *
                (raw.targetQuantity || 1) *
                ((raw.platformFeePercent ?? raw.platform_fee_percent ?? 10.0) / 100))) *
              100
          ) / 100
      ),
      deliveryTimeline: raw.deliveryTimeline || raw.delivery_timeline || 'Air Freight Express',
      notes: raw.notes || '',
      status: (raw.status || RfqStatuses.SUBMITTED) as RFQStatus,
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    };
  }

  private readStorage(): RFQQuote[] {
    if (!this.isBrowser) return [];
    try {
      const data = localStorage.getItem(RFQ_STORAGE_KEY);
      return data ? JSON.parse(data).map((q: any) => this.normalizeQuote(q)) : [];
    } catch {
      return [];
    }
  }

  private writeStorage(items: RFQQuote[]) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(RFQ_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }
}
