import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  DeliveryPartnerDocument,
  DeliveryPartnerProfile,
  DeliveryPartnerTask,
  DeliveryPartnerVerificationStatus,
  EligibleDeliveryPartner,
  OrderStatus,
  OrderStatuses,
} from '@core/models';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminFleetResponse {
  partners: DeliveryPartnerProfile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    pending: number;
    awaiting_upload?: number;
    approved: number;
    rejected: number;
  };
}

export interface EligiblePartnersResponse {
  orderId: string;
  destinationArea: {
    city: string;
    region: string;
    country: string;
  };
  eligiblePartners: EligibleDeliveryPartner[];
}

export interface MyTasksResponse {
  partnerStatus: DeliveryPartnerVerificationStatus;
  rejectionReason?: string | null;
  isApproved: boolean;
  message?: string;
  partnerProfile?: {
    id: string;
    fullName: string;
    phone: string;
    vehicleType: string;
    vehiclePlate: string;
    rating: number;
    completedTrips: number;
  };
  tasks: DeliveryPartnerTask[];
}

@Injectable({ providedIn: 'root' })
export class DeliveryPartnerService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /**
   * Get current delivery partner profile and KYC status
   */
  getProfile(): Observable<DeliveryPartnerProfile> {
    return this.http.get<DeliveryPartnerProfile>(`${this.api}/delivery-partners/me`);
  }

  /**
   * Upload / append a KYC compliance document
   */
  uploadDocument(doc: {
    type: 'GOVT_ID' | 'DRIVING_LICENSE' | 'VEHICLE_RC' | 'TRANSIT_INSURANCE' | 'OTHER';
    name: string;
    url: string;
    fileSize?: string;
  }): Observable<DeliveryPartnerProfile> {
    return this.http.post<DeliveryPartnerProfile>(`${this.api}/delivery-partners/documents`, doc);
  }

  /**
   * Update partner details or geographic territory
   */
  updateProfile(data: {
    fullName?: string;
    phone?: string;
    vehicleType?: string;
    vehiclePlateNumber?: string;
    country?: string;
    regionState?: string;
    city?: string;
    servicePostalCodes?: string;
  }): Observable<DeliveryPartnerProfile> {
    return this.http.patch<DeliveryPartnerProfile>(`${this.api}/delivery-partners/profile`, data);
  }

  /**
   * Admin: List fleet applications with filters
   */
  getAdminList(query: {
    status?: string;
    search?: string;
    city?: string;
    country?: string;
    page?: number;
    limit?: number;
  }): Observable<AdminFleetResponse> {
    let params = new HttpParams();
    if (query.status && query.status !== 'ALL') params = params.set('status', query.status);
    if (query.search) params = params.set('search', query.search);
    if (query.city) params = params.set('city', query.city);
    if (query.country) params = params.set('country', query.country);
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());

    return this.http.get<AdminFleetResponse>(`${this.api}/delivery-partners/admin/list`, { params });
  }

  /**
   * Admin: Approve or Reject a Delivery Partner application
   */
  verifyPartner(
    partnerId: string,
    status: DeliveryPartnerVerificationStatus,
    rejectionReason?: string,
  ): Observable<DeliveryPartnerProfile> {
    return this.http.patch<DeliveryPartnerProfile>(`${this.api}/delivery-partners/admin/${partnerId}/verify`, {
      status,
      rejectionReason,
    });
  }

  /**
   * Admin: Approve or Reject a specific Delivery Partner KYC document
   */
  verifyDocument(
    partnerId: string,
    docId: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string,
  ): Observable<DeliveryPartnerProfile> {
    return this.http.patch<DeliveryPartnerProfile>(
      `${this.api}/delivery-partners/admin/${partnerId}/documents/${docId}/verify`,
      { status, rejectionReason },
    );
  }

  /**
   * Fetch approved delivery partners eligible for an order's destination area
   */
  getEligiblePartners(
    orderId: string,
    location?: { city?: string; region?: string; country?: string },
  ): Observable<EligiblePartnersResponse> {
    let params = new HttpParams();
    if (location?.city) params = params.set('city', location.city);
    if (location?.region) params = params.set('region', location.region);
    if (location?.country) params = params.set('country', location.country);

    return this.http.get<EligiblePartnersResponse>(
      `${this.api}/delivery-partners/orders/${orderId}/eligible`,
      { params },
    );
  }

  /**
   * Assign an order to an approved Delivery Partner
   */
  assignOrder(
    orderId: string,
    deliveryPartnerId: string,
    assignmentNote?: string,
  ): Observable<any> {
    return this.http.post<any>(`${this.api}/delivery-partners/orders/${orderId}/assign`, {
      deliveryPartnerId,
      assignmentNote,
    });
  }

  /**
   * Delivery Partner: Fetch assigned deliveries and task status
   */
  getMyTasks(): Observable<MyTasksResponse> {
    return this.http.get<MyTasksResponse>(`${this.api}/delivery-partners/my-tasks`);
  }

  /**
   * Delivery Partner: Update assigned task run status (Start run or Confirm delivered)
   */
  updateTaskStatus(
    orderId: string,
    status: OrderStatuses.OUT_FOR_DELIVERY | OrderStatuses.DELIVERED,
    options?: { checkpointLocation?: string; checkpointNote?: string; proofNote?: string },
  ): Observable<any> {
    return this.http.patch<any>(`${this.api}/delivery-partners/tasks/${orderId}/status`, {
      status,
      ...options,
    });
  }

  /**
   * Delivery Partner: Fetch unassigned orders available in partner's service area
   */
  getAvailableOrders(): Observable<AvailableOrdersResponse> {
    return this.http.get<AvailableOrdersResponse>(`${this.api}/delivery-partners/available-orders`);
  }

  /**
   * Delivery Partner: Accept / claim an available order in local territory
   */
  acceptOrder(orderId: string): Observable<any> {
    return this.http.post<any>(`${this.api}/delivery-partners/orders/${orderId}/accept`, {});
  }

  /**
   * Delivery Partner: Send real-time GPS location beacon ping
   */
  updateLocationPing(dto: {
    orderId?: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.api}/delivery-partners/location-ping`, dto);
  }

  /**
   * Delivery Partner: Submit Proof of Delivery (POD)
   */
  submitProofOfDelivery(
    orderId: string,
    dto: {
      signatureDataUrl?: string;
      photoUrl?: string;
      recipientName?: string;
      notes?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Observable<any> {
    return this.http.post<any>(`${this.api}/delivery-partners/tasks/${orderId}/proof-of-delivery`, dto);
  }
}

export interface AvailableOrdersResponse {
  partnerStatus: string;
  isApproved: boolean;
  serviceArea: {
    city: string;
    region: string;
    country: string;
    postalCodes: string;
  };
  availableOrders: Array<{
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    destination_address: string;
    destination_city: string;
    destination_region: string;
    destination_country: string;
    destination_postal_code?: string;
    recipient_name?: string;
    recipient_phone?: string;
    customer_name: string;
    customer_email: string;
    match_type: 'EXACT_CITY' | 'REGION_MATCH' | 'COUNTRY_MATCH' | 'ZONE_PROXIMITY';
    items: Array<{
      id: string;
      quantity: number;
      unit_price: number;
      status: string;
      product_title: string;
      product_image: string;
    }>;
  }>;
}
