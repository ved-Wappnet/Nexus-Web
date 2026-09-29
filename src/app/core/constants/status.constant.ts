export enum OrderStatuses {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum LogisticsCarriers {
  FEDEX = 'FedEx',
  DHL = 'DHL Express',
  UPS = 'UPS',
  USPS = 'USPS',
  BLUEDART = 'BlueDart',
  DELHIVERY = 'Delhivery',
  OTHER = 'Other',
}

export function getCarrierTrackingUrl(
  carrier?: string | null,
  trackingNumber?: string | null,
  customUrl?: string | null,
): string | null {
  if (customUrl && customUrl.trim()) return customUrl.trim();
  if (!carrier || !trackingNumber || !trackingNumber.trim()) return null;
  const c = carrier.toLowerCase();
  const num = encodeURIComponent(trackingNumber.trim());
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${num}`;
  if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${num}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${num}`;
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`;
  if (c.includes('bluedart')) return `https://www.bluedart.com/tracking?trackNumber=${num}`;
  if (c.includes('delhivery')) return `https://www.delhivery.com/track/package/${num}`;
  return null;
}

export enum ProductStatuses {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TicketStatuses {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum RfqStatuses {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COUNTER_OFFERED = 'COUNTER_OFFERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum PaymentStatuses {
  PENDING = 'PENDING',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}
