import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorEmail: string;
  action: string;
  entityName: string;
  entityId: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface AuditLogPaginatedResponse {
  data: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalLogs: number;
  logs24h: number;
  uniqueActors: number;
  entityBreakdown: { entityName: string; count: number }[];
}

export interface AuditFilterParams {
  q?: string;
  entity?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audit-logs`;

  getAuditLogs(params: AuditFilterParams = {}): Observable<AuditLogPaginatedResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 1)
      .set('limit', params.limit ?? 15);

    if (params.q?.trim()) httpParams = httpParams.set('q', params.q.trim());
    if (params.entity && params.entity.toUpperCase() !== 'ALL') {
      httpParams = httpParams.set('entity', params.entity);
    }
    if (params.action && params.action.toUpperCase() !== 'ALL') {
      httpParams = httpParams.set('action', params.action);
    }
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<AuditLogPaginatedResponse>(this.baseUrl, { params: httpParams });
  }

  getStats(): Observable<AuditStats> {
    return this.http.get<AuditStats>(`${this.baseUrl}/stats`);
  }

  exportCsv(params: Omit<AuditFilterParams, 'page' | 'limit'> = {}): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params.q?.trim()) httpParams = httpParams.set('q', params.q.trim());
    if (params.entity && params.entity.toUpperCase() !== 'ALL') {
      httpParams = httpParams.set('entity', params.entity);
    }
    if (params.action && params.action.toUpperCase() !== 'ALL') {
      httpParams = httpParams.set('action', params.action);
    }
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get(`${this.baseUrl}/export`, {
      params: httpParams,
      responseType: 'blob',
    });
  }
}
