import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, tap, map } from 'rxjs';
import { Category, EscrowDisputeView, EscrowMilestone, OrderEscrowView, OrderItem, OrderStatus, OrderView, PaginatedEscrowList, PaginatedOrdersResponse, ProductView, Supplier, Ticket, TicketAttachment, TicketMessage, TicketReplyTo, TicketStatus } from '@core/models';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  categories() {
    return this.http.get<Category[]>(`${this.api}/categories`);
  }

  createCategory(body: { name: string; slug?: string; parentId?: string | null }) {
    return this.http.post<Category>(`${this.api}/categories`, body);
  }

  suppliers() {
    return this.http.get<Supplier[]>(`${this.api}/suppliers`);
  }

  wishlist() {
    return this.http.get<ProductView[]>(`${this.api}/wishlist`);
  }

  toggleWishlist(productId: string) {
    return this.http.post<ProductView[]>(`${this.api}/wishlist`, { productId });
  }
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(q?: string, status?: string, page?: number, limit = 5): Observable<PaginatedOrdersResponse> {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (status && status !== 'ALL') params['status'] = status;
    if (page) params['page'] = page.toString();
    params['limit'] = (limit ?? 5).toString();
    return this.http.get<any>(`${this.api}/orders`, { params }).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return {
            data: res,
            total: res.length,
            page: 1,
            limit: res.length,
            totalPages: 1,
          };
        }
        return res as PaginatedOrdersResponse;
      }),
    );
  }

  getOne(orderId: string) {
    return this.http.get<OrderView>(`${this.api}/orders/${orderId}`);
  }

  create(
    payload: string | { productId?: string; quantity?: number; items?: { productId: string; quantity: number }[]; [key: string]: any },
    quantity = 1,
  ) {
    const body = typeof payload === 'string' ? { productId: payload, quantity } : payload;
    return this.http.post<OrderView>(`${this.api}/orders`, body);
  }

  updateAddress(orderId: string, addressData: any) {
    return this.http.patch<OrderView>(`${this.api}/orders/${orderId}/address`, addressData);
  }

  setItemStatus(
    id: string,
    payload:
      | OrderItem['status']
      | {
          status: OrderItem['status'];
          carrier?: string;
          trackingNumber?: string;
          trackingUrl?: string;
          estimatedDelivery?: string;
          checkpointLocation?: string;
          checkpointNote?: string;
          deliveryPartnerId?: string;
        },
  ) {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return this.http.post<OrderItem>(`${this.api}/order-items/${id}/status`, body);
  }

  fulfillOrder(
    orderId: string,
    payload: {
      status: OrderStatus;
      carrier?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      estimatedDelivery?: string;
      checkpointLocation?: string;
      checkpointNote?: string;
      deliveryPartnerId?: string;
    },
  ) {
    return this.http.post<OrderView>(`${this.api}/orders/${orderId}/fulfill`, payload);
  }

  cancelOrder(orderId: string) {
    return this.http.post<OrderView>(`${this.api}/orders/${orderId}/cancel`, {});
  }

  getInvoice(orderId: string) {
    return this.http.get<any>(`${this.api}/orders/${orderId}/invoice`);
  }

  downloadInvoicePdf(orderId: string) {
    return this.http.get(`${this.api}/orders/${orderId}/invoice/pdf`, {
      responseType: 'blob',
    });
  }

  downloadWaybillPdf(orderId: string) {
    return this.http.get(`${this.api}/orders/${orderId}/waybill/pdf`, {
      responseType: 'blob',
    });
  }

  private readonly escrowCache = new Map<string, OrderEscrowView>();

  getOrderEscrow(orderId: string, bypassCache = false): Observable<OrderEscrowView> {
    if (!bypassCache && this.escrowCache.has(orderId)) {
      return of(this.escrowCache.get(orderId)!);
    }
    return this.http.get<OrderEscrowView>(`${this.api}/orders/${orderId}/escrow`).pipe(
      tap((escrow) => {
        this.escrowCache.set(orderId, escrow);
      }),
    );
  }

  clearEscrowCache(orderId?: string) {
    if (orderId) {
      this.escrowCache.delete(orderId);
    } else {
      this.escrowCache.clear();
    }
  }

  getEscrowList(page = 1, limit = 10, status?: string, q?: string): Observable<PaginatedEscrowList> {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };
    if (status && status !== 'ALL') params['status'] = status;
    if (q && q.trim()) params['q'] = q.trim();
    return this.http.get<PaginatedEscrowList>(`${this.api}/orders/escrow`, { params });
  }

  releaseEscrowMilestone(orderId: string, milestoneIndex: number, notes?: string) {
    this.clearEscrowCache(orderId);
    return this.http.post<{
      success: boolean;
      message: string;
      milestone: EscrowMilestone;
      totalReleasedAmount: number;
    }>(`${this.api}/orders/${orderId}/escrow/release`, {
      milestoneIndex,
      notes,
    });
  }

  createEscrowDispute(
    orderId: string,
    payload: {
      disputeType: string;
      reason: string;
      description: string;
      evidenceUrls?: string[];
      claimAmount?: number;
    },
  ) {
    this.clearEscrowCache(orderId);
    return this.http.post<{
      success: boolean;
      message: string;
      dispute: EscrowDisputeView;
    }>(`${this.api}/orders/${orderId}/escrow/dispute`, payload);
  }

  getEscrowDispute(orderId: string) {
    return this.http.get<{ dispute: EscrowDisputeView | null }>(
      `${this.api}/orders/${orderId}/escrow/dispute`,
    );
  }

  resolveEscrowDispute(
    orderId: string,
    disputeId: string,
    payload: {
      resolutionType: string;
      refundedAmount?: number;
      releasedAmount?: number;
      resolutionNotes: string;
    },
  ) {
    this.clearEscrowCache(orderId);
    return this.http.post<{
      success: boolean;
      message: string;
      disputeStatus: string;
      refundedAmount: number;
      releasedAmount: number;
      milestoneStatus: string;
    }>(`${this.api}/orders/${orderId}/escrow/dispute/${disputeId}/resolve`, payload);
  }

  processAutoReleaseEscrows() {
    return this.http.post<{
      success: boolean;
      message: string;
      processedCount: number;
      processedOrders: string[];
    }>(`${this.api}/orders/escrow/auto-release/process`, {});
  }

  getDeliveryQr(orderId: string) {
    return this.http.get<{
      orderId: string;
      token: string;
      qrPayload: string;
      inspectionStatus: string;
      inspectionStartedAt: string | null;
      inspectionExpiresAt: string | null;
      deliveredAt: string | null;
      order: OrderView;
    }>(`${this.api}/orders/${orderId}/delivery-qr`);
  }

  verifyDeliveryQr(payload: { qrCodeOrToken: string; orderId?: string }) {
    if (payload.orderId) this.clearEscrowCache(payload.orderId);
    return this.http.post<{
      success: boolean;
      alreadyActive: boolean;
      message: string;
      order: OrderView;
      inspectionStartedAt?: string;
      inspectionExpiresAt?: string;
    }>(`${this.api}/orders/verify-delivery-qr`, payload);
  }

  checkInspectionExpiry(orderId: string) {
    this.clearEscrowCache(orderId);
    return this.http.post<{
      success: boolean;
      expired: boolean;
      released: boolean;
      disputed?: boolean;
      remainingMs?: number;
      inspectionExpiresAt?: string;
      releasedAmount?: number;
      message: string;
      order?: OrderView;
    }>(`${this.api}/orders/${orderId}/check-inspection-expiry`, {});
  }

  tickets(q?: string, status?: string) {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (status && status !== 'ALL') params['status'] = status;
    return this.http.get<Ticket[]>(`${this.api}/tickets`, { params });
  }

  createTicket(payload: { subject: string; body: string; orderId?: string }) {
    return this.http.post<Ticket>(`${this.api}/tickets`, payload);
  }

  updateTicket(id: string, status: TicketStatus) {
    return this.http.patch<Ticket>(`${this.api}/tickets/${id}`, { status });
  }

  ticketMessages(ticketId: string) {
    return this.http.get<TicketMessage[]>(`${this.api}/tickets/${ticketId}/messages`);
  }

  postTicketMessage(
    ticketId: string,
    message: string,
    attachments?: TicketAttachment[],
    replyTo?: TicketReplyTo | null,
  ) {
    return this.http.post<TicketMessage>(`${this.api}/tickets/${ticketId}/messages`, {
      message,
      attachments,
      replyTo,
    });
  }

  uploadTicketAttachment(ticketId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TicketAttachment>(`${this.api}/tickets/${ticketId}/attachments`, formData);
  }

  markTicketAsRead(ticketId: string) {
    return this.http.post<{ success: boolean }>(`${this.api}/tickets/${ticketId}/read`, {});
  }

  deleteTicketMessage(ticketId: string, messageId: string) {
    return this.http.delete<{ success: boolean; messageId: string }>(`${this.api}/tickets/${ticketId}/messages/${messageId}`);
  }
}



