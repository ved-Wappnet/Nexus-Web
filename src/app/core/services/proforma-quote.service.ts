import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { CurrencyService } from './currency.service';
import { ToastService } from './toast.service';

export interface ProFormaItemPayload {
  productId?: string;
  productTitle: string;
  productSku?: string;
  storeName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  customTierPrice?: number;
}

export interface ProFormaQuotePayload {
  orderId?: string;
  rfqId?: string;
  companyName?: string;
  buyerName?: string;
  email?: string;
  taxId?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  exchangeRate?: number;
  items?: ProFormaItemPayload[];
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProFormaQuoteService {
  private readonly http = inject(HttpClient);
  private readonly cart = inject(CartService);
  private readonly currency = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly isGenerating = signal<boolean>(false);

  /**
   * Generates a Pro-Forma Quote PDF from the current cart items.
   */
  generatePdfFromCart(customDetails?: Partial<ProFormaQuotePayload>): Observable<Blob> {
    const items = this.cart.items();
    const curr = this.currency.current();
    const user = this.auth.currentUser();

    const payload: ProFormaQuotePayload = {
      buyerName: customDetails?.buyerName || user?.name || 'Enterprise Procurement Officer',
      companyName: customDetails?.companyName || 'Enterprise Wholesale Purchaser',
      email: customDetails?.email || user?.email || 'procurement@enterprise.com',
      taxId: customDetails?.taxId,
      shippingAddress: customDetails?.shippingAddress,
      currency: curr.code,
      exchangeRate: curr.rate,
      items: items.map((i) => ({
        productId: i.product.id,
        productTitle: i.product.title,
        productSku: `SKU-${i.product.id.slice(0, 8).toUpperCase()}`,
        storeName: (i.product as any).storeName || (i.product as any).supplierName || 'Nexus Verified Vendor',
        quantity: i.quantity,
        unitPrice: Number(i.product.price),
        discountPercent: this.cart.getItemVolumeDiscountPct(i),
        customTierPrice: this.cart.getItemUnitPrice(i),
      })),
      notes: customDetails?.notes,
      ...customDetails,
    };

    this.isGenerating.set(true);

    return this.http
      .post(`${environment.apiUrl}/orders/proforma-quote/pdf`, payload, {
        responseType: 'blob',
      })
      .pipe(
        tap({
          next: () => this.isGenerating.set(false),
          error: () => this.isGenerating.set(false),
        }),
      );
  }

  /**
   * Downloads Pro-Forma Quote PDF for an existing placed or pending order.
   */
  generatePdfFromOrder(orderId: string): Observable<Blob> {
    this.isGenerating.set(true);
    return this.http
      .get(`${environment.apiUrl}/orders/${orderId}/proforma/pdf`, {
        responseType: 'blob',
      })
      .pipe(
        tap({
          next: () => this.isGenerating.set(false),
          error: () => this.isGenerating.set(false),
        }),
      );
  }

  /**
   * Helper to trigger browser download of a PDF blob
   */
  saveBlobAsPdf(blob: Blob, defaultFilename = 'nexus-proforma-invoice.pdf') {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.toast.success('Official Pro-Forma Invoice & Quote downloaded');
    } catch {
      this.toast.error('Failed to trigger file download');
    }
  }

  /**
   * One-click download from cart with toast feedback
   */
  downloadCartProForma() {
    if (this.cart.items().length === 0) {
      this.toast.error('Your cart is empty. Add items to generate a quotation.');
      return;
    }

    this.toast.info('Generating official B2B Pro-Forma Invoice with price lock...');
    this.generatePdfFromCart().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        this.saveBlobAsPdf(blob, `nexus-proforma-quote-${timestamp}.pdf`);
      },
      error: () => {
        this.toast.error('Unable to generate Pro-Forma PDF. Please try again.');
      },
    });
  }

  /**
   * One-click download for an order
   */
  downloadOrderProForma(orderId: string) {
    this.toast.info('Generating official Pro-Forma Invoice...');
    this.generatePdfFromOrder(orderId).subscribe({
      next: (blob) => {
        this.saveBlobAsPdf(blob, `nexus-proforma-order-${orderId.slice(0, 8)}.pdf`);
      },
      error: () => {
        this.toast.error('Unable to generate Pro-Forma PDF for this order.');
      },
    });
  }
}
