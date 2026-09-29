import { OrderStatus, OrderStatuses } from '@core/models';

export function orderProgressPercent(status: OrderStatus | string): number {
  switch (status) {
    case OrderStatuses.PENDING:
      return 20;
    case OrderStatuses.PROCESSING:
      return 45;
    case OrderStatuses.SHIPPED:
      return 70;
    case OrderStatuses.OUT_FOR_DELIVERY:
      return 88;
    case OrderStatuses.DELIVERED:
      return 100;
    case OrderStatuses.CANCELLED:
      return 0;
    default:
      return 10;
  }
}

export function orderProgressLabel(status: OrderStatus | string): string {
  switch (status) {
    case OrderStatuses.PENDING:
      return 'Order Confirmed';
    case OrderStatuses.PROCESSING:
      return 'Being prepared';
    case OrderStatuses.SHIPPED:
      return 'In transit with carrier';
    case OrderStatuses.OUT_FOR_DELIVERY:
      return 'Out for delivery';
    case OrderStatuses.DELIVERED:
      return 'Delivered';
    case OrderStatuses.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
}
