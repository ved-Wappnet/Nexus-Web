import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreatePaymentIntentPayload {
  rfqId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  paymentMode?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  intentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface StripeCheckoutSessionResponse {
  url: string | null;
  sessionId?: string;
  isLive: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payments`;

  createCheckoutSession(
    payload: CreatePaymentIntentPayload & { itemTitle?: string; successUrl?: string; cancelUrl?: string }
  ): Observable<StripeCheckoutSessionResponse> {
    return this.http.post<StripeCheckoutSessionResponse>(`${this.baseUrl}/create-checkout-session`, payload);
  }

  createPaymentIntent(payload: CreatePaymentIntentPayload): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.baseUrl}/create-intent`, payload);
  }

  confirmPayment(payload: { rfqId?: string; orderId?: string; paymentIntentId?: string; paymentMethod?: string; paymentMode?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/confirm`, payload);
  }

  processRefund(payload: { orderId?: string; rfqId?: string; paymentIntentId?: string; amount?: number; reason?: string }): Observable<{ success: boolean; refundId: string; isLive: boolean; message: string }> {
    return this.http.post<{ success: boolean; refundId: string; isLive: boolean; message: string }>(`${this.baseUrl}/refund`, payload);
  }
}
