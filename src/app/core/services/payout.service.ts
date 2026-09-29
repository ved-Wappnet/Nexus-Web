import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SupplierPayout, SupplierPayoutSummary } from '@core/models';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PayoutListResponse {
  data: SupplierPayout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class PayoutService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payouts`;

  getPayouts(query?: {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<PayoutListResponse> {
    let params = new HttpParams();
    if (query?.q) params = params.set('q', query.q);
    if (query?.status) params = params.set('status', query.status);
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());

    return this.http.get<PayoutListResponse>(this.baseUrl, { params });
  }

  getPayoutSummary(): Observable<SupplierPayoutSummary> {
    return this.http.get<SupplierPayoutSummary>(`${this.baseUrl}/summary`);
  }

  downloadRemittancePdf(payoutId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${payoutId}/remittance-pdf`, {
      responseType: 'blob',
    });
  }

  settlePayout(payoutId: string, notes?: string): Observable<{ success: boolean; message: string; payout: SupplierPayout }> {
    return this.http.post<{ success: boolean; message: string; payout: SupplierPayout }>(
      `${this.baseUrl}/${payoutId}/settle`,
      { notes },
    );
  }
}
