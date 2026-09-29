import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Socket } from 'socket.io-client';
import { AudioTelemetryService } from './audio-telemetry.service';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';
import { ToastService } from './toast.service';

export interface OrderCreatedSocketEvent {
  orderId: string;
  customerId: string;
  customerEmail?: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}

export interface ChatMessageSocketEvent {
  orderId: string;
  id: string;
  text: string;
  sender: 'courier' | 'customer';
  time: string;
}

export interface OrderStatusUpdatedSocketEvent {
  orderId: string;
  previousStatus?: string;
  newStatus: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  checkpointLocation?: string | null;
  checkpointNote?: string | null;
  estimatedDelivery?: string | null;
  updatedAt: string;
}

export interface OrderItemUpdatedSocketEvent {
  orderId: string;
  itemId: string;
  status: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  checkpointLocation?: string | null;
  checkpointNote?: string | null;
  estimatedDelivery?: string | null;
  updatedAt: string;
}

export interface OrderPaidSocketEvent {
  orderId: string;
  amount: number;
  status: string;
  paidAt: string;
}

export interface OrderEscrowUpdatedSocketEvent {
  orderId: string;
  milestoneIndex: number;
  milestoneTitle: string;
  releasedAmount: number;
  totalReleasedAmount: number;
  status: string;
  releaseTxHash?: string;
  updatedAt: string;
}

export interface DriverLocationSocketEvent {
  orderId?: string;
  partnerId?: string;
  partnerName?: string;
  vehicleType?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

export interface ProofOfDeliverySocketEvent {
  orderId: string;
  recipientName: string;
  hasSignature: boolean;
  hasPhoto: boolean;
  notes?: string;
  completedAt: string;
  deliveredAt?: string;
  inspectionExpiresAt?: string;
}

export interface DriverDispatchedSocketEvent {
  orderId: string;
  partnerId: string;
  partnerName: string;
  vehicleType: string;
  vehiclePlateNumber: string;
  trackingNumber?: string;
  destinationAddress?: string;
  destinationCity?: string;
  dispatchedAt: string;
}

export interface DriverApproachingDockSocketEvent {
  orderId: string;
  partnerId: string;
  partnerName: string;
  vehicleType: string;
  vehiclePlateNumber: string;
  distanceMeters: number;
  estimatedArrivalMinutes: number;
  destinationAddress?: string;
  destinationCity?: string;
  deliveryQrToken?: string;
  arrivedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderSocketService {
  private readonly socketService = inject(SocketService);
  private readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly audioTelemetry = inject(AudioTelemetryService);
  private readonly toast = inject(ToastService);

  private socket: Socket | null = null;
  private currentJoinedOrderId: string | null = null;

  readonly latestOrderCreated = signal<OrderCreatedSocketEvent | null>(null);
  readonly latestStatusUpdated = signal<OrderStatusUpdatedSocketEvent | null>(null);
  readonly latestItemUpdated = signal<OrderItemUpdatedSocketEvent | null>(null);
  readonly latestOrderPaid = signal<OrderPaidSocketEvent | null>(null);
  readonly latestEscrowUpdated = signal<OrderEscrowUpdatedSocketEvent | null>(null);
  readonly latestDeliveryPartnerUpdated = signal<any | null>(null);
  readonly latestDeliveryPartnerRegistered = signal<any | null>(null);
  readonly latestDriverLocation = signal<DriverLocationSocketEvent | null>(null);
  readonly latestProofOfDelivery = signal<ProofOfDeliverySocketEvent | null>(null);
  readonly latestDriverDispatched = signal<DriverDispatchedSocketEvent | null>(null);
  readonly latestDriverApproaching = signal<DriverApproachingDockSocketEvent | null>(null);
  readonly activeDockArrivalAlert = signal<DriverApproachingDockSocketEvent | null>(null);
  readonly latestChatMessage = signal<ChatMessageSocketEvent | null>(null);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.initSocket();
    }
  }

  dismissDockArrivalAlert() {
    this.activeDockArrivalAlert.set(null);
  }

  initSocket(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = this.socketService.getSocket('/orders');

    this.socket.off('orderCreated');
    this.socket.off('orderStatusUpdated');
    this.socket.off('orderItemUpdated');
    this.socket.off('orderPaid');
    this.socket.off('orderEscrowUpdated');
    this.socket.off('deliveryPartnerUpdated');
    this.socket.off('deliveryPartnerRegistered');
    this.socket.off('driverLocationUpdated');
    this.socket.off('proofOfDeliverySubmitted');
    this.socket.off('driverDispatched');
    this.socket.off('driverApproachingDock');
    this.socket.off('chatMessage');

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        if (this.currentJoinedOrderId) {
          this.socket?.emit('joinOrder', { orderId: this.currentJoinedOrderId });
        }
      });
    });

    this.socket.on('orderCreated', (event: OrderCreatedSocketEvent) => {
      this.ngZone.run(() => {
        this.latestOrderCreated.set(event);
      });
    });

    this.socket.on('orderStatusUpdated', (event: OrderStatusUpdatedSocketEvent) => {
      this.ngZone.run(() => {
        this.latestStatusUpdated.set(event);
      });
    });

    this.socket.on('orderItemUpdated', (event: OrderItemUpdatedSocketEvent) => {
      this.ngZone.run(() => {
        this.latestItemUpdated.set(event);
      });
    });

    this.socket.on('orderPaid', (event: OrderPaidSocketEvent) => {
      this.ngZone.run(() => {
        this.latestOrderPaid.set(event);
      });
    });

    this.socket.on('orderEscrowUpdated', (event: OrderEscrowUpdatedSocketEvent) => {
      this.ngZone.run(() => {
        this.latestEscrowUpdated.set(event);
      });
    });

    this.socket.on('deliveryPartnerUpdated', (partner: any) => {
      this.ngZone.run(() => {
        this.latestDeliveryPartnerUpdated.set(partner);
      });
    });

    this.socket.on('deliveryPartnerRegistered', (partner: any) => {
      this.ngZone.run(() => {
        this.latestDeliveryPartnerRegistered.set(partner);
      });
    });

    this.socket.on('driverLocationUpdated', (location: DriverLocationSocketEvent) => {
      this.ngZone.run(() => {
        this.latestDriverLocation.set(location);
      });
    });

    this.socket.on('driverDispatched', (event: DriverDispatchedSocketEvent) => {
      this.ngZone.run(() => {
        this.latestDriverDispatched.set(event);
        this.audioTelemetry.playDispatchPing();
        this.toast.info(`🚚 Courier Dispatched: ${event.partnerName} (${event.vehicleType}) has departed for Order #NX-${event.orderId.slice(0, 8).toUpperCase()}`);
      });
    });

    this.socket.on('driverApproachingDock', (event: DriverApproachingDockSocketEvent) => {
      this.ngZone.run(() => {
        this.latestDriverApproaching.set(event);
        this.activeDockArrivalAlert.set(event);
        this.audioTelemetry.playProximityAlert();
      });
    });

    this.socket.on('proofOfDeliverySubmitted', (pod: ProofOfDeliverySocketEvent) => {
      this.ngZone.run(() => {
        this.latestProofOfDelivery.set(pod);
        this.audioTelemetry.playPodSuccessChord();
        this.toast.success(`✅ Delivery Handover Complete: Signed by ${pod.recipientName} for Order #NX-${pod.orderId.slice(0, 8).toUpperCase()}`);
      });
    });

    this.socket.on('chatMessage', (msg: ChatMessageSocketEvent) => {
      this.ngZone.run(() => {
        this.latestChatMessage.set(msg);
      });
    });

    return this.socket;
  }

  emitDriverLocation(payload: {
    orderId?: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }) {
    const s = this.initSocket();
    if (s.connected) {
      s.emit('updateDriverLocation', payload);
    }
  }

  sendChatMessage(payload: { orderId: string; text: string; sender: 'courier' | 'customer' }) {
    const s = this.initSocket();
    if (s.connected) {
      s.emit('sendChatMessage', payload);
    }
  }

  joinOrder(orderId: string) {
    this.currentJoinedOrderId = orderId;
    const s = this.initSocket();
    if (s.connected) {
      s.emit('joinOrder', { orderId });
    }
  }

  leaveOrder(orderId: string) {
    if (this.currentJoinedOrderId === orderId) {
      this.currentJoinedOrderId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('leaveOrder', { orderId });
    }
  }
}
