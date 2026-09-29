import {
  LogisticsCarriers,
  OrderStatuses,
  PaymentStatuses,
  ProductStatuses,
  RfqStatuses,
  TicketStatuses,
  getCarrierTrackingUrl,
} from '@core/constants/status.constant';
import { UserRoles } from '@core/constants/user.constant';

export {
  LogisticsCarriers,
  OrderStatuses,
  PaymentStatuses,
  ProductStatuses,
  RfqStatuses,
  TicketStatuses,
  getCarrierTrackingUrl,
};

export type UserRole = `${UserRoles}`;
export type ProductStatus = `${ProductStatuses}`;
export type OrderStatus = `${OrderStatuses}`;
export type TicketStatus = `${TicketStatuses}`;
export type RFQStatus = `${RfqStatuses}`;
export type PaymentStatus = `${PaymentStatuses}`;
export type LogisticsCarrier = `${LogisticsCarriers}`;

export interface RFQQuote {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  supplierId: string;
  storeName: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productImage: string;
  unitPrice: number;
  targetQuantity: number;
  requestedUnitPrice: number;
  counterUnitPrice?: number;
  platformFeePercent?: number;
  platformFeeAmount?: number;
  supplierPayoutAmount?: number;
  deliveryTimeline: string;
  notes?: string;
  status: RFQStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RfqChatAttachment {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface RfqChatMessage {
  id: string;
  rfqId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachments?: RfqChatAttachment[];
  isDeleted: boolean;
  deletedAt?: string | null;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RfqNotification {
  rfqId: string;
  productTitle: string;
  storeName?: string;
  customerName?: string;
  message: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  attachmentsCount: number;
  createdAt: string;
}

// re-export enums for convenient imports from models if needed
export { AccountTypes, UserRoles } from '@core/constants/user.constant';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  userId: string;
  storeName: string;
  commissionRate: number;
  payoutAccount: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  supplierId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  platformFeePercent?: number;
  stockQuantity: number;
  status: ProductStatus;
  images: ProductImage[];
  attributes: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface TrackingEvent {
  id?: string;
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  location?: string | null;
  description?: string | null;
  note?: string | null;
  timestamp: string;
}

export interface Order {
  id: string;
  customerId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  trackingEvents?: TrackingEvent[];
  paymentMode?: string;
  escrowFundedAmount?: number;
  escrowReleasedAmount?: number;
  deliveryQrToken?: string | null;
  deliveredAt?: string | null;
  inspectionStartedAt?: string | null;
  inspectionExpiresAt?: string | null;
  inspectionStatus?: 'NOT_STARTED' | 'ACTIVE' | 'PASSED' | 'DISPUTED';
  deliveryPartnerId?: string | null;
  destinationCountry?: string;
  destinationRegion?: string;
  destinationCity?: string;
  destinationAddress?: string;
  destinationPostalCode?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  proofOfDeliverySignature?: string | null;
  proofOfDeliveryPhoto?: string | null;
  proofOfDeliveryNotes?: string | null;
  podRecipientName?: string | null;
  podCompletedAt?: string | null;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
  driverHeading?: number | null;
  driverSpeed?: number | null;
  driverLastPingAt?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  billingSameAsShipping?: boolean;
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingRegion?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
}

export interface EscrowDisputeView {
  id: string;
  orderId: string;
  milestoneIndex: number;
  disputeType: string;
  claimAmount: number;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED_REFUND' | 'RESOLVED_SPLIT' | 'RESOLVED_RELEASED' | 'REJECTED';
  resolutionType?: string | null;
  refundedAmount?: number;
  releasedAmount?: number;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface EscrowMilestone {
  id: string;
  milestoneIndex: number;
  title: string;
  percentage: number;
  amount: number;
  status: 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'FROZEN_IN_DISPUTE' | 'REFUNDED';
  triggerCondition: 'UPFRONT_PAYMENT' | 'CUSTOMS_CHECKPOINT' | 'DELIVERY_INSPECTION';
  releasedAt?: string | null;
  autoReleaseAt?: string | null;
  releaseTxHash?: string | null;
  releaseNotes?: string | null;
}

export interface OrderEscrowView {
  orderId: string;
  isEligible: boolean;
  paymentMode: string;
  totalAmount: number;
  fundedAmount: number;
  releasedAmount: number;
  heldAmount: number;
  releasePercentage: number;
  dispute?: EscrowDisputeView | null;
  milestones: EscrowMilestone[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  productImages?: Array<{ id?: string; url: string; isPrimary?: boolean }>;
  storeName?: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  createdAt: string;
}

export interface Wishlist {
  id: string;
  customerId: string;
  productId: string;
  createdAt: string;
}

export interface TicketLastMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachmentsCount: number;
  createdAt: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  orderId: string | null;
  subject: string;
  body: string;
  status: TicketStatus;
  createdAt: string;
  unreadCount?: number;
  totalMessages?: number;
  lastMessage?: TicketLastMessage | null;
}

export interface TicketNotification {
  ticketId: string;
  ticketSubject: string;
  messageId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachmentsCount: number;
  createdAt: string;
  isMention?: boolean;
  mentionText?: string;
}


export interface TicketAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface TicketReplyTo {
  id: string;
  senderName: string;
  text: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  senderEmail: string;
  message: string;
  attachments?: TicketAttachment[];
  replyTo?: TicketReplyTo | null;
  reactions?: Record<string, string[]>;
  isRead?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}


export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  name?: string;
  iat: number;
}

export interface AuthSession {
  token: string;
  user: PublicUser;
}

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductView extends Product {
  storeName: string;
  categoryName: string;
}

export interface OrderView extends Order {
  customerEmail: string;
  items: (OrderItem & { productTitle: string })[];
  escrow?: OrderEscrowView | null;
}

export interface PaginatedOrdersResponse {
  data: OrderView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedEscrowList {
  data: (OrderEscrowView & {
    orderNumber: string;
    status: string;
    customerEmail: string;
    deliveryQrToken?: string | null;
    deliveredAt?: string | null;
    inspectionStatus?: string;
    inspectionStartedAt?: string | null;
    inspectionExpiresAt?: string | null;
    createdAt: string;
  })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatMetric {
  label: string;
  value: string;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface ChartTrendPoint {
  label: string;
  date: string;
  amount: number;
  count: number;
}

export interface DashboardTimeSeries {
  '7D': ChartTrendPoint[];
  '30D': ChartTrendPoint[];
  '12M': ChartTrendPoint[];
}

export interface FulfillmentPipeline {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface CategoryShareItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface RfqFunnelData {
  inquired: number;
  negotiating: number;
  accepted: number;
  paid: number;
  conversionRate: number;
}

export interface EscrowPipelineSummary {
  totalLocked: number;
  totalReleased: number;
  milestone1Locked: number;
  milestone2Locked: number;
  milestone3Locked: number;
  activeOrdersCount: number;
}

export interface CashflowForecastBucket {
  label: string;
  period: string;
  amount: number;
  orderCount: number;
}

export interface EscrowDashboardData {
  summary: EscrowPipelineSummary;
  forecast: CashflowForecastBucket[];
}

export interface CustomerDashboard {
  metrics: StatMetric[];
  activeOrders: OrderView[];
  recentPurchases: OrderView[];
  recommended: ProductView[];
  wishlistCount: number;
  trend?: DashboardTimeSeries;
  pipeline?: FulfillmentPipeline;
  categoryDistribution?: CategoryShareItem[];
  rfqFunnel?: RfqFunnelData;
  escrowPipeline?: EscrowDashboardData;
}

export interface SupplierSlaScorecard {
  compositeScore: number;
  slaTier: 'TIER_A_PLUS' | 'TIER_A' | 'TIER_B' | 'TIER_C';
  tierLabel: string;
  onTimeDispatchRate: number;
  firstPassInspectionRate: number;
  avgDispatchLeadDays: number;
  avgTransitDeliveryDays: number;
  totalShipmentsEvaluated: number;
  compliantShipmentsCount: number;
}

export interface SupplierDashboard {
  metrics: StatMetric[];
  lowStock: ProductView[];
  topSkus: { product: ProductView; units: number; revenue: number }[];
  fulfillment: (OrderItem & { productTitle: string; orderId: string })[];
  trend?: DashboardTimeSeries;
  pipeline?: FulfillmentPipeline;
  categoryDistribution?: CategoryShareItem[];
  rfqFunnel?: RfqFunnelData;
  escrowPipeline?: EscrowDashboardData;
  slaScorecard?: SupplierSlaScorecard;
}

export interface SubAdminDashboard {
  metrics: StatMetric[];
  pendingProducts: ProductView[];
  tickets: Ticket[];
  ticketPipeline?: { open: number; inReview: number; resolved: number; closed: number };
}

export interface AdminDashboard {
  metrics: StatMetric[];
  vendorCommissions: { storeName: string; rate: number; gmv: number; fee: number }[];
  audit: (AuditLog & { actorEmail: string | null })[];
  activeUsers: number;
  trend?: DashboardTimeSeries;
  pipeline?: FulfillmentPipeline;
  categoryDistribution?: CategoryShareItem[];
  rfqFunnel?: RfqFunnelData;
  escrowPipeline?: EscrowDashboardData;
  slaScorecard?: SupplierSlaScorecard;
}

export type DashboardPayload =
  | { role: UserRoles.CUSTOMER; data: CustomerDashboard }
  | { role: UserRoles.SUPPLIER; data: SupplierDashboard }
  | { role: UserRoles.SUBADMIN; data: SubAdminDashboard }
  | { role: UserRoles.ADMIN; data: AdminDashboard };

export type NotificationType = 'RFQ' | 'ORDER' | 'TICKET' | 'WATCHLIST' | 'SYSTEM';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  linkUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userRole: string;
  rating: number;
  title?: string | null;
  comment: string;
  isVerifiedBuyer: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingBreakdownItem {
  star: number;
  count: number;
  percentage: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  recommendedPercent: number;
  breakdown: RatingBreakdownItem[];
  userReview: ProductReview | null;
  isVerifiedBuyer: boolean;
}

export interface SupplierTrustScore {
  supplierId: string;
  storeName: string;
  trustScore: number;
  rating: number;
  totalReviews: number;
  totalOrders: number;
  fulfillmentRate: number;
  tier: 'TOP_RATED' | 'VERIFIED' | 'STANDARD';
  badgeLabel: string;
  verifiedSince: string;
}

export interface CreateReviewDto {
  rating: number;
  title?: string;
  comment: string;
}

export enum DeliveryPartnerVerificationStatuses {
  PENDING_SUBMISSION = 'PENDING_SUBMISSION',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type DeliveryPartnerVerificationStatus = `${DeliveryPartnerVerificationStatuses}`;

export interface DeliveryPartnerDocument {
  id: string;
  type: 'GOVT_ID' | 'DRIVING_LICENSE' | 'VEHICLE_RC' | 'TRANSIT_INSURANCE' | 'OTHER';
  name: string;
  url: string;
  fileSize?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedAt?: string;
  reviewedBy?: string;
  uploadedAt: string;
}

export interface DeliveryPartnerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_plate_number: string;
  country: string;
  region_state: string;
  city: string;
  service_postal_codes: string;
  verification_status: DeliveryPartnerVerificationStatus;
  rejection_reason: string | null;
  documents: DeliveryPartnerDocument[];
  is_available: boolean;
  rating: number;
  completed_trips: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  user_name?: string;
}

export interface EligibleDeliveryPartner {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_plate_number: string;
  city: string;
  region_state: string;
  country: string;
  rating: number;
  completed_trips: number;
  is_available: boolean;
  match_priority: number;
}

export interface DeliveryPartnerTaskItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  product_title: string;
  product_image?: string;
}

export interface DeliveryPartnerTask {
  id: string;
  status: OrderStatus;
  total_amount: number;
  carrier?: string;
  tracking_number?: string;
  destination_address?: string;
  destination_city?: string;
  destination_region?: string;
  destination_country?: string;
  created_at: string;
  delivery_qr_token?: string;
  customer_name: string;
  customer_email: string;
  recipient_name?: string;
  proof_of_delivery_signature?: string;
  proof_of_delivery_photo?: string;
  proof_of_delivery_notes?: string;
  pod_recipient_name?: string;
  pod_completed_at?: string;
  items: DeliveryPartnerTaskItem[];
}

export interface SupplierPayout {
  id: string;
  orderId: string;
  supplierId: string;
  storeName: string;
  milestoneIndex: number;
  milestoneTitle: string;
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netPayoutAmount: number;
  currency: string;
  status: 'SETTLED' | 'PROCESSING' | 'PENDING_CLEARANCE';
  payoutMethod: string;
  bankAccountHint?: string;
  transactionReference: string;
  remittanceNumber: string;
  notes?: string;
  disbursedAt: string;
  orderStatus: string;
  orderTotalAmount: number;
}

export interface SupplierPayoutSummary {
  totalGrossDisbursed: number;
  totalNetDisbursed: number;
  totalPlatformFees: number;
  totalPayoutsCount: number;
  totalHeldInEscrow: number;
  nextSettlementDate: string;
}

