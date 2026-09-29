import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CreateReviewDto,
  Paginated,
  ProductFilters,
  ProductReview,
  ProductStatus,
  ProductStatuses,
  ProductView,
  ReviewSummary,
  SupplierTrustScore,
} from '@core/models';
import { environment } from '../../../environments/environment';

export type ProductUpsertPayload = {
  title: string;
  categoryId: string;
  price: number;
  description: string;
  stockQuantity: number;
  attributes: Record<string, string>;
  supplierId?: string;
};

export interface CompetitorPriceQuote {
  platform: 'amazon' | 'flipkart';
  platformName: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  deliveryDays: number;
  inStock: boolean;
  sellerName: string;
  productUrl: string;
  differenceAmount: number;
  differencePercent: number;
  isNexusCheaper: boolean;
}

export interface MarketPriceComparisonResponse {
  productId: string;
  productTitle: string;
  nexusPrice: number;
  currency: string;
  bestCompetitorPrice: number;
  averageCompetitorPrice: number;
  maxSavingsAmount: number;
  maxSavingsPercent: number;
  priceMatchGuarantee: boolean;
  competitors: CompetitorPriceQuote[];
  lastUpdated: string;
}


@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(filters: ProductFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Paginated<ProductView>>(`${this.api}/products`, { params });
  }

  priceBounds() {
    return this.http.get<{ minPrice: number; maxPrice: number }>(`${this.api}/products/price-bounds`);
  }

  bySlug(slug: string) {
    return this.http.get<ProductView>(`${this.api}/products/slug/${slug}`);
  }

  getSimilarProducts(productId: string) {
    return this.http.get<ProductView[]>(`${this.api}/products/${productId}/similar`);
  }

  create(payload: ProductUpsertPayload, image?: File | null) {
    return this.http.post<ProductView>(`${this.api}/products`, this.toFormData(payload, image));
  }

  update(id: string, payload: ProductUpsertPayload, image?: File | null) {
    return this.http.patch<ProductView>(`${this.api}/products/${id}`, this.toFormData(payload, image));
  }

  moderate(id: string, status: ProductStatuses.APPROVED | ProductStatuses.REJECTED) {
    return this.http.post<ProductView>(`${this.api}/products/${id}/moderate`, { status });
  }

  setStock(id: string, stockQuantity: number) {
    return this.http.post<ProductView>(`${this.api}/products/${id}/stock`, { stockQuantity });
  }

  delete(id: string) {
    return this.http.delete<{ success: boolean; message: string }>(`${this.api}/products/${id}`);
  }

  getReviews(productId: string, query?: { rating?: number; verifiedOnly?: boolean; page?: number; pageSize?: number }) {
    let params = new HttpParams();
    if (query?.rating) params = params.set('rating', String(query.rating));
    if (query?.verifiedOnly) params = params.set('verifiedOnly', 'true');
    if (query?.page) params = params.set('page', String(query.page));
    if (query?.pageSize) params = params.set('pageSize', String(query.pageSize));
    return this.http.get<Paginated<ProductReview>>(`${this.api}/products/${productId}/reviews`, { params });
  }

  getReviewSummary(productId: string) {
    return this.http.get<ReviewSummary>(`${this.api}/products/${productId}/reviews/summary`);
  }

  getAiReviewSummary(productId: string) {
    return this.http.get<{ summary: string }>(`${this.api}/products/${productId}/reviews/ai-summary`);
  }

  submitReview(productId: string, dto: CreateReviewDto) {
    return this.http.post<ProductReview>(`${this.api}/products/${productId}/reviews`, dto);
  }

  getSupplierTrustScore(supplierId: string) {
    return this.http.get<SupplierTrustScore>(`${this.api}/products/suppliers/${supplierId}/trust-score`);
  }

  getMarketComparison(productId: string) {
    return this.http.get<MarketPriceComparisonResponse>(`${this.api}/products/${productId}/market-comparison`);
  }


  private toFormData(payload: ProductUpsertPayload, image?: File | null) {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('categoryId', payload.categoryId);
    form.append('price', String(payload.price));
    form.append('description', payload.description ?? '');
    form.append('stockQuantity', String(payload.stockQuantity));
    form.append('attributes', JSON.stringify(payload.attributes ?? {}));
    if (payload.supplierId) form.append('supplierId', payload.supplierId);
    if (image) form.append('image', image, image.name);
    return form;
  }
}
