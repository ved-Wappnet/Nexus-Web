import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { UserRoles } from '@core/constants/user.constant';
import { OrderEscrowView, OrderStatus, OrderStatuses, OrderView } from '@core/models';
import { OrderService } from '@core/services/catalog.service';
import { OrderSocketService } from '@core/services/order-socket.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideAlertTriangle,
  LucideCamera,
  LucideCheck,
  LucideCheckCircle2,
  LucideChevronDown,
  LucideChevronUp,
  LucideClock,
  LucideCopy,
  LucideCreditCard,
  LucideExternalLink,
  LucideFileCheck,
  LucideGlobe,
  LucideLock,
  LucideMapPin,
  LucideNavigation,
  LucidePackage,
  LucidePenTool,
  LucideQrCode,
  LucideReceipt,
  LucideScale,
  LucideScanLine,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideTruck,
  LucideUserCheck,
  LucideXCircle,
} from '@lucide/angular';
import { Badge, statusTone } from '@shared/ui/badge/badge';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { TransitMapComponent } from '@shared/ui/transit-map/transit-map';
import { InspectionDisputeModal } from '../inspection-dispute-modal/inspection-dispute-modal';
import { DisputeResolutionModal } from '../inspection-dispute-modal/dispute-resolution-modal';
import { PackingSlipModalComponent } from '../packing-slip-modal/packing-slip-modal';
import { DeliveryQrScannerModalComponent } from '../delivery-qr-scanner/delivery-qr-scanner-modal';
import { InspectionCountdownComponent } from '../inspection-countdown/inspection-countdown';

export interface TrackingStep {
  id: OrderStatus;
  title: string;
  description: string;
  icon: unknown;
}

const STEPS: TrackingStep[] = [
  {
    id: OrderStatuses.PENDING,
    title: 'Order Placed',
    description: 'Order confirmed & verified',
    icon: LucideShoppingBag,
  },
  {
    id: OrderStatuses.PROCESSING,
    title: 'Processing',
    description: 'Packed & prepared for dispatch',
    icon: LucidePackage,
  },
  {
    id: OrderStatuses.SHIPPED,
    title: 'In Transit',
    description: 'Handed over to carrier partner',
    icon: LucideTruck,
  },
  {
    id: OrderStatuses.OUT_FOR_DELIVERY,
    title: 'Out for Delivery',
    description: 'With local courier for dropoff',
    icon: LucideNavigation,
  },
  {
    id: OrderStatuses.DELIVERED,
    title: 'Delivered',
    description: 'Package handed over / signed',
    icon: LucideCheckCircle2,
  },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  [OrderStatuses.PENDING]: 1,
  [OrderStatuses.PROCESSING]: 2,
  [OrderStatuses.SHIPPED]: 3,
  [OrderStatuses.OUT_FOR_DELIVERY]: 4,
  [OrderStatuses.DELIVERED]: 5,
  [OrderStatuses.CANCELLED]: 0,
};

@Component({
  selector: 'app-order-tracker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    Badge,
    LabelFormatPipe,
    LucideShoppingBag,
    LucidePackage,
    LucideTruck,
    LucideNavigation,
    LucideCheckCircle2,
    LucideXCircle,
    LucideCopy,
    LucideCheck,
    LucideMapPin,
    LucideClock,
    LucideCreditCard,
    LucideReceipt,
    LucideExternalLink,
    LucideChevronDown,
    LucideChevronUp,
    LucideGlobe,
    LucideShieldCheck,
    LucideLock,
    LucideScanLine,
    LucideAlertTriangle,
    LucideShieldAlert,
    LucideScale,
    LucideQrCode,
    LucideFileCheck,
    LucideCamera,
    LucidePenTool,
    LucideUserCheck,
    TransitMapComponent,
    InspectionDisputeModal,
    DisputeResolutionModal,
    PackingSlipModalComponent,
    DeliveryQrScannerModalComponent,
    InspectionCountdownComponent,
  ],
  template: `
    @if (order(); as ord) {
      @if (compact()) {
        <!-- COMPACT DASHBOARD-SUITABLE VIEW -->
        <div
          class="rounded-xl border border-zinc-800/90 bg-zinc-950/70 p-4 transition-all hover:border-zinc-700/80 shadow-lg"
        >
          @if (error(); as err) {
            <div
              class="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300"
            >
              <svg lucideXCircle class="h-4 w-4 shrink-0 text-rose-400"></svg>
              <span>{{ err }}</span>
            </div>
          }

          <!-- Top Header -->
          <div
            class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/60"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shrink-0"
              >
                <svg lucidePackage class="h-4.5 w-4.5"></svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white text-sm tracking-tight truncate">
                    Order #NX-{{ ord.id.slice(0, 8).toUpperCase() }}
                  </span>
                  <button
                    type="button"
                    (click)="copyTrackingCode(ord.id)"
                    class="text-zinc-400 hover:text-white transition cursor-pointer p-0.5"
                    title="Copy Tracking ID"
                  >
                    @if (copied()) {
                      <svg lucideCheck class="h-3 w-3 text-emerald-400"></svg>
                    } @else if (copyError()) {
                      <svg lucideXCircle class="h-3 w-3 text-rose-400"></svg>
                    } @else {
                      <svg lucideCopy class="h-3 w-3"></svg>
                    }
                  </button>
                  <app-badge [tone]="statusTone(ord.status)">{{
                    ord.status | labelFormat
                  }}</app-badge>
                </div>
                <p class="text-xs text-zinc-400 mt-0.5 truncate">
                  Placed {{ ord.createdAt | date: 'mediumDate' }} • {{ ord.items.length }}
                  {{ ord.items.length === 1 ? 'item' : 'items' }}
                  @if (ord.customerEmail) {
                    <span class="text-zinc-500 hidden sm:inline">• {{ ord.customerEmail }}</span>
                  }
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
              <span class="text-base font-extrabold text-white font-mono">{{
                ord.totalAmount | currency
              }}</span>
              <button
                type="button"
                (click)="invoiceClicked.emit()"
                class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-indigo-500/50 hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
                title="View Tax Invoice"
              >
                <svg lucideReceipt class="h-3.5 w-3.5 text-indigo-400"></svg>
                <span>Invoice</span>
              </button>

              @if (ord.status !== OrderStatuses.CANCELLED) {
                <button
                  type="button"
                  (click)="waybillClicked.emit()"
                  [disabled]="isDownloadingWaybill()"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-emerald-500/50 hover:bg-zinc-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="Download Logistics Shipping Waybill (PDF)"
                >
                  <svg lucideTruck class="h-3.5 w-3.5 text-emerald-400"></svg>
                  <span>Waybill</span>
                </button>
                <button
                  type="button"
                  (click)="packingSlipModalOpen.set(true)"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-cyan-500/50 hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
                  title="View Warehouse Packing List & Signoff QR"
                >
                  <svg lucideQrCode class="h-3.5 w-3.5 text-cyan-400"></svg>
                  <span>Packing Slip</span>
                </button>
              }
            </div>
          </div>

          <!-- Cancelled Banner -->
          @if (ord.status === OrderStatuses.CANCELLED) {
            <div
              class="my-3 flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300"
            >
              <svg lucideXCircle class="h-4 w-4 shrink-0 text-rose-400"></svg>
              <span>This order was cancelled. Escrow funds have been refunded.</span>
            </div>
          } @else {
            <!-- Dashboard Modern Segmented Stepper -->
            <div class="py-3">
              <!-- Live Active Status Row (Single row, zero text overlap) -->
              <div class="flex items-center justify-between gap-2 text-xs mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="relative flex h-2 w-2 shrink-0">
                    <span
                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"
                    ></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span class="font-bold text-indigo-300 shrink-0">{{ currentStep().title }}</span>
                  <span class="text-zinc-600 shrink-0 hidden sm:inline">•</span>
                  <span class="text-zinc-400 truncate hidden sm:inline">{{
                    currentStep().description
                  }}</span>
                </div>
                <span class="font-mono text-[11px] font-semibold text-zinc-400 shrink-0">
                  Step {{ currentStepIndex() }} of 5
                </span>
              </div>

              <!-- 5 Segmented Horizontal Progress Bars -->
              <div class="grid grid-cols-5 gap-1.5">
                @for (step of steps; track step.id; let idx = $index) {
                  @let stepState = getStepState(step.id);
                  <div class="flex flex-col gap-1 min-w-0">
                    <div
                      class="h-1.5 rounded-full transition-all duration-300"
                      [class]="
                        stepState === 'completed'
                          ? 'bg-emerald-500'
                          : stepState === 'current'
                            ? 'bg-indigo-500 shadow-sm shadow-indigo-500/60 ring-2 ring-indigo-500/30'
                            : 'bg-zinc-800'
                      "
                    ></div>
                    <span
                      class="text-[10px] truncate text-center transition-colors"
                      [class]="
                        stepState === 'completed'
                          ? 'text-emerald-400 font-medium'
                          : stepState === 'current'
                            ? 'text-indigo-300 font-bold'
                            : 'text-zinc-500'
                      "
                    >
                      {{ step.title }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- Compact Logistics & Delivery Footer -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-zinc-800/60 text-xs"
            >
              <div
                class="flex items-center gap-2 rounded-lg bg-zinc-900/60 px-2.5 py-1.5 border border-zinc-800/50 min-w-0"
              >
                <svg lucideClock class="h-3.5 w-3.5 text-indigo-400 shrink-0"></svg>
                <span class="text-zinc-400 shrink-0">Est. Delivery:</span>
                <span class="font-bold text-zinc-200 truncate">{{
                  displayEstimatedDelivery(ord)
                }}</span>
              </div>
              <div
                class="flex items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-2.5 py-1.5 border border-zinc-800/50 min-w-0"
              >
                <div class="flex items-center gap-2 truncate">
                  <svg lucideTruck class="h-3.5 w-3.5 text-emerald-400 shrink-0"></svg>
                  <span class="text-zinc-200 font-medium truncate">{{
                    ord.carrier || 'Nexus Priority Logistics'
                  }}</span>
                </div>
                @if (ord.trackingNumber) {
                  <span
                    class="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0"
                  >
                    {{ ord.trackingNumber }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- REGULAR FULL VIEW (FOR /orders PAGE) -->
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl"
        >
          @if (error(); as err) {
            <div
              class="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300"
            >
              <svg lucideXCircle class="h-4 w-4 shrink-0 text-rose-400"></svg>
              <span class="font-medium">{{ err }}</span>
            </div>
          }

          <!-- Header Info -->
          <div
            class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4"
          >
            <div class="flex items-center gap-3.5">
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
              >
                <svg lucidePackage class="h-6 w-6"></svg>
              </div>
              <div>
                <div class="flex items-center gap-2.5">
                  <h3 class="font-bold tracking-tight text-white text-lg">
                    Order #NX-{{ ord.id.slice(0, 8).toUpperCase() }}
                  </h3>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
                    (click)="copyTrackingCode(ord.id)"
                    title="Copy Tracking ID"
                  >
                    @if (copied()) {
                      <svg lucideCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                      <span class="text-emerald-400">Copied</span>
                    } @else if (copyError()) {
                      <svg lucideXCircle class="h-3.5 w-3.5 text-rose-400"></svg>
                      <span class="text-rose-400">Failed</span>
                    } @else {
                      <svg lucideCopy class="h-3.5 w-3.5"></svg>
                      <span>Copy ID</span>
                    }
                  </button>
                </div>
                <p class="text-sm text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>Placed on {{ ord.createdAt | date: 'mediumDate' }}</span>
                  <span>•</span>
                  <span class="text-zinc-300 font-semibold"
                    >{{ ord.items.length }} {{ ord.items.length === 1 ? 'item' : 'items' }}</span
                  >
                  @if (ord.customerEmail) {
                    <span>•</span>
                    <span
                      class="text-indigo-300 font-semibold text-xs bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-500/30"
                      >Customer: {{ ord.customerEmail }}</span
                    >
                  }
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-xs uppercase tracking-wider text-zinc-400 font-bold">Total Amount</p>
                <p class="text-lg sm:text-xl font-extrabold text-white font-mono">
                  {{ ord.totalAmount | currency }}
                </p>
              </div>
              <app-badge [tone]="statusTone(ord.status)">{{ ord.status | labelFormat }}</app-badge>

              <!-- Vendor / Admin Fulfill Action -->
              @if (canFulfill()) {
                <button
                  type="button"
                  (click)="fulfillClicked.emit()"
                  class="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3.5 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-600/30 active:scale-95 transition cursor-pointer"
                  title="Update Carrier Logistics & Checkpoints"
                >
                  <svg lucideTruck class="h-4 w-4"></svg>
                  <span>Fulfill & Track</span>
                </button>
              }

              @if (canPay() && ord.status === OrderStatuses.PENDING) {
                <button
                  type="button"
                  [disabled]="isPaying()"
                  (click)="payClicked.emit()"
                  class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  @if (isPaying()) {
                    <svg
                      class="h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Redirecting…</span>
                  } @else {
                    <svg lucideCreditCard class="h-4 w-4"></svg>
                    <span>Pay {{ ord.totalAmount | currency }} Now</span>
                  }
                </button>
              }

              @if (
                canCancel() &&
                (ord.status === OrderStatuses.PENDING || ord.status === OrderStatuses.PROCESSING)
              ) {
                <button
                  type="button"
                  [disabled]="isCancelling()"
                  (click)="cancelClicked.emit()"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  @if (isCancelling()) {
                    <svg
                      class="h-4 w-4 animate-spin text-rose-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Cancelling…</span>
                  } @else {
                    <svg lucideXCircle class="h-4 w-4 text-rose-400"></svg>
                    <span>Cancel Order</span>
                  }
                </button>
              }

              <button
                type="button"
                (click)="invoiceClicked.emit()"
                class="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-indigo-500/50 hover:text-white hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
                title="View & Print Official B2B Tax Invoice"
              >
                <svg lucideReceipt class="h-4 w-4 text-indigo-400"></svg>
                <span>Invoice</span>
              </button>

              @if (ord.status !== OrderStatuses.CANCELLED) {
                <button
                  type="button"
                  (click)="waybillClicked.emit()"
                  [disabled]="isDownloadingWaybill()"
                  class="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500/50 hover:text-white hover:bg-zinc-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="Download Logistics Shipping Waybill (PDF)"
                >
                  <svg lucideTruck class="h-4 w-4 text-emerald-400"></svg>
                  <span>Waybill</span>
                </button>
                <button
                  type="button"
                  (click)="packingSlipModalOpen.set(true)"
                  class="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-cyan-500/50 hover:text-white hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
                  title="View Warehouse Packing List & Signoff QR Code"
                >
                  <svg lucideQrCode class="h-4 w-4 text-cyan-400"></svg>
                  <span>Packing Slip & QR</span>
                </button>
              }
            </div>
          </div>

          <!-- Cancelled Alert Banner -->
          @if (ord.status === OrderStatuses.CANCELLED) {
            <div
              class="my-5 flex items-center gap-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300"
            >
              <svg lucideXCircle class="h-6 w-6 shrink-0 text-rose-400"></svg>
              <div>
                <p class="font-bold text-base">Order Cancelled</p>
                <p class="text-sm text-rose-300/80 mt-0.5">
                  This order was cancelled. Restocked inventory and escrow funds have been released.
                </p>
              </div>
            </div>
          } @else {
            <!-- View Mode Switcher: Stage Stepper vs Interactive Radar Map -->
            <div
              class="my-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-zinc-400"
                  >Shipment Route & Checkpoints</span
                >
              </div>
              <div class="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 p-0.5">
                <button
                  type="button"
                  (click)="trackingView.set('TIMELINE')"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer"
                  [class]="
                    trackingView() === 'TIMELINE'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  "
                >
                  <svg lucideClock class="h-3.5 w-3.5"></svg>
                  <span>Stage Stepper</span>
                </button>
                <button
                  type="button"
                  (click)="trackingView.set('MAP')"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer"
                  [class]="
                    trackingView() === 'MAP'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  "
                >
                  <svg lucideNavigation class="h-3.5 w-3.5 text-indigo-400"></svg>
                  <span>Live Courier & Map</span>
                </button>
              </div>
            </div>

            @if (trackingView() === 'MAP') {
              <div class="my-4 animate-fade-in">
                <app-transit-map
                  [order]="ord"
                  (qrScanRequested)="openScannerForOrder(ord)"
                />
              </div>
            } @else {
              <!-- 5-Stage Progress Stepper (Timeline) -->
              <div class="my-6 px-2">
                <div
                  class="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0"
                >
                  <!-- Connecting Line for Desktop -->
                  <div
                    class="absolute top-5 left-10 right-10 hidden md:block h-1.5 bg-zinc-800 rounded-full z-0"
                  >
                    <div
                      class="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                      [style.width.%]="progressPercentage()"
                    ></div>
                  </div>

                  <!-- Steps List -->
                  @for (step of steps; track step.id; let idx = $index) {
                    @let stepState = getStepState(step.id);
                    <div
                      class="relative z-10 flex md:flex-col items-center gap-4 md:gap-2 md:flex-1 min-w-0 max-w-full overflow-hidden text-center"
                    >
                      <!-- Step Circle Icon -->
                      <div
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 shadow-md"
                        [class]="getStepCircleClass(stepState)"
                      >
                        @if (stepState === 'completed') {
                          <svg lucideCheck class="h-5 w-5 text-white"></svg>
                        } @else if (stepState === 'current') {
                          @if (step.id === OrderStatuses.PENDING) {
                            <svg lucideShoppingBag class="h-5 w-5"></svg>
                          } @else if (step.id === OrderStatuses.PROCESSING) {
                            <svg lucidePackage class="h-5 w-5"></svg>
                          } @else if (step.id === OrderStatuses.SHIPPED) {
                            <svg lucideTruck class="h-5 w-5"></svg>
                          } @else if (step.id === OrderStatuses.OUT_FOR_DELIVERY) {
                            <svg lucideNavigation class="h-5 w-5"></svg>
                          } @else if (step.id === OrderStatuses.DELIVERED) {
                            <svg lucideCheckCircle2 class="h-5 w-5"></svg>
                          }
                        } @else {
                          <span class="text-sm font-bold text-zinc-500">{{ idx + 1 }}</span>
                        }
                      </div>

                      <!-- Step Label & Description -->
                      <div class="md:text-center min-w-0 max-w-full w-full px-1">
                        <p
                          class="text-xs sm:text-sm font-bold tracking-tight transition-colors truncate"
                          [class]="stepState === 'upcoming' ? 'text-zinc-500' : 'text-zinc-100'"
                        >
                          {{ step.title }}
                        </p>
                        <p
                          class="text-[11px] text-zinc-400 hidden lg:block truncate w-full mt-0.5"
                          [title]="step.description"
                        >
                          {{ step.description }}
                        </p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }

          <!-- Estimated Delivery & Logistics Carrier Info Box -->
          @if (ord.status !== OrderStatuses.CANCELLED) {
            <div
              class="grid gap-3 sm:grid-cols-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-sm text-zinc-300"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 shrink-0"
                >
                  <svg lucideClock class="h-4 w-4"></svg>
                </div>
                <div class="min-w-0">
                  <p class="text-zinc-400 text-xs font-semibold">Estimated Delivery</p>
                  <p class="font-bold text-zinc-100 text-sm">
                    {{ displayEstimatedDelivery(ord) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 shrink-0"
                  >
                    <svg lucideTruck class="h-4 w-4"></svg>
                  </div>
                  <div class="min-w-0">
                    <p class="text-zinc-400 text-xs font-semibold">Carrier Logistics</p>
                    <div class="flex flex-wrap items-center gap-2 mt-0.5">
                      <span class="font-bold text-zinc-100 text-sm">
                        {{ ord.carrier || 'Nexus Priority Logistics' }}
                      </span>
                      @if (ord.trackingNumber) {
                        <span
                          class="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md"
                        >
                          {{ ord.trackingNumber }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Track on Carrier Portal Button -->
                @if (ord.trackingUrl) {
                  <a
                    [href]="ord.trackingUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition"
                    title="Open official carrier package tracking page"
                  >
                    <span>Track Carrier</span>
                    <svg lucideExternalLink class="h-3.5 w-3.5"></svg>
                  </a>
                }
              </div>
            </div>

            <!-- 📜 Verified Proof of Delivery (e-POD) Certificate -->
            @if (ord.status === OrderStatuses.DELIVERED || ord.proofOfDeliverySignature || ord.podCompletedAt) {
              <div class="mt-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-950 p-4 sm:p-5 shadow-2xl">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-md">
                      <svg lucideFileCheck class="h-5 w-5"></svg>
                    </div>
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="text-sm sm:text-base font-extrabold text-white">Electronic Proof of Delivery (e-POD)</h4>
                        <span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30">
                          ● DOCK VERIFIED
                        </span>
                      </div>
                      <p class="text-xs text-zinc-400 mt-0.5">
                        Cryptographically signed handover receipt & dropoff verification
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    @if (ord.podCompletedAt) {
                      <div class="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-right font-mono">
                        <div class="text-[10px] text-zinc-500 uppercase font-bold">Completed At</div>
                        <div class="text-xs font-black text-emerald-400">
                          {{ ord.podCompletedAt | date: 'medium' }}
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- e-POD Grid: Signature, Dropoff Photo, Telematics Details -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
                  <!-- 1. Digital Signature Preview -->
                  <div class="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-2">
                        <span class="flex items-center gap-1.5 font-bold text-white">
                          <svg lucidePenTool class="h-3.5 w-3.5 text-indigo-400"></svg>
                          <span>Recipient Signature</span>
                        </span>
                        <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          SIGNED
                        </span>
                      </div>
                      
                      <div class="h-28 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center p-2 overflow-hidden">
                        @if (ord.proofOfDeliverySignature) {
                          <img [src]="ord.proofOfDeliverySignature" alt="Recipient Signature" class="max-h-full max-w-full object-contain filter invert brightness-200" />
                        } @else {
                          <div class="flex flex-col items-center justify-center text-zinc-500 text-xs">
                            <svg lucidePenTool class="h-6 w-6 mb-1 opacity-40"></svg>
                            <span>Digital signoff captured at dock</span>
                          </div>
                        }
                      </div>
                    </div>
                    
                    <div class="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span class="text-zinc-400">Signed By:</span>
                      <span class="font-bold text-zinc-100 truncate">{{ ord.podRecipientName || ord.recipientName || 'Authorized Receiving Agent' }}</span>
                    </div>
                  </div>

                  <!-- 2. Dropoff Verification Photo -->
                  <div class="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-2">
                        <span class="flex items-center gap-1.5 font-bold text-white">
                          <svg lucideCamera class="h-3.5 w-3.5 text-emerald-400"></svg>
                          <span>Dropoff Photo</span>
                        </span>
                        <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                          VERIFIED
                        </span>
                      </div>
                      
                      <div class="h-28 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden">
                        @if (ord.proofOfDeliveryPhoto) {
                          <img [src]="ord.proofOfDeliveryPhoto" alt="Delivery Dropoff Photo" class="h-full w-full object-cover rounded-lg" />
                        } @else {
                          <div class="flex flex-col items-center justify-center text-zinc-500 text-xs p-2 text-center">
                            <svg lucideCamera class="h-6 w-6 mb-1 opacity-40"></svg>
                            <span>Dropoff photo verified at destination dock</span>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span class="text-zinc-400">Verification:</span>
                      <span class="font-mono text-emerald-400 font-bold">Dock Handover Photo</span>
                    </div>
                  </div>

                  <!-- 3. Delivery Handover & Telematics Audit -->
                  <div class="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-2">
                        <span class="flex items-center gap-1.5 font-bold text-white">
                          <svg lucideUserCheck class="h-3.5 w-3.5 text-cyan-400"></svg>
                          <span>Handover Telematics</span>
                        </span>
                        <span class="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                          AUDITED
                        </span>
                      </div>

                      <div class="space-y-2 text-xs">
                        <div class="rounded-lg bg-zinc-950/80 p-2 border border-zinc-800/60">
                          <span class="text-[10px] uppercase font-bold text-zinc-500 block">Courier Notes</span>
                          <p class="text-zinc-300 text-xs mt-0.5 line-clamp-2">
                            {{ ord.proofOfDeliveryNotes || 'Consignment delivered in sealed original container.' }}
                          </p>
                        </div>

                        @if (ord.driverLatitude && ord.driverLongitude) {
                          <div class="flex items-center justify-between text-[11px] text-zinc-400">
                            <span class="flex items-center gap-1">
                              <svg lucideMapPin class="h-3 w-3 text-indigo-400"></svg>
                              <span>Dropoff GPS:</span>
                            </span>
                            <span class="font-mono text-zinc-200">{{ ord.driverLatitude | number:'1.3-3' }}, {{ ord.driverLongitude | number:'1.3-3' }}</span>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span class="text-zinc-400">Carrier:</span>
                      <span class="font-bold text-zinc-200 truncate">{{ ord.carrier || 'Nexus Priority Fleet' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- 📱 72-Hour Inspection Countdown & Delivery Signoff Card -->
            @if (ord.status === OrderStatuses.DELIVERED || ord.inspectionStatus === 'ACTIVE' || ord.inspectionStatus === 'PASSED' || ord.inspectionStatus === 'DISPUTED') {
              <div class="mt-4">
                <app-inspection-countdown [order]="ord" (escrowReleased)="onInspectionEscrowReleased()" />
              </div>
            } @else if (ord.status === OrderStatuses.SHIPPED || ord.status === OrderStatuses.OUT_FOR_DELIVERY || ord.status === OrderStatuses.PROCESSING) {
              <div class="mt-4 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/30 via-zinc-900 to-zinc-900 p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                    <svg lucideScanLine class="h-5 w-5"></svg>
                  </div>
                  <div>
                    <h5 class="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Warehouse Delivery Signoff</span>
                      <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">72H SLA Protection</span>
                    </h5>
                    <p class="text-xs text-zinc-300 mt-0.5">
                      Upon arrival at receiving dock, scan the packing list QR code to verify physical delivery and trigger your 72-Hour Inspection Window.
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    (click)="openScannerForOrder(ord)"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-500 active:scale-95 transition cursor-pointer shadow-lg shadow-cyan-600/20"
                  >
                    <svg lucideScanLine class="h-4 w-4"></svg>
                    <span>Scan Delivery QR</span>
                  </button>
                  <button
                    type="button"
                    (click)="packingSlipModalOpen.set(true)"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
                  >
                    <svg lucideQrCode class="h-4 w-4 text-cyan-400"></svg>
                    <span>View Packing QR</span>
                  </button>
                </div>
              </div>
            }
          }

          <!-- 🛡️ B2B Milestone Escrow & Split Payments Card -->
            @if (ord.totalAmount >= 5000 || ord.paymentMode === 'MILESTONE_ESCROW') {
              <div class="mt-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 via-zinc-950/80 to-zinc-950 p-4 sm:p-5 shadow-xl">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                      <svg lucideShieldCheck class="h-5 w-5"></svg>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h4 class="text-sm sm:text-base font-extrabold text-white">B2B Milestone Escrow Vault</h4>
                        <span class="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-300 border border-indigo-500/30">
                          Wholesale Trade Protected
                        </span>
                      </div>
                      <p class="text-xs text-zinc-400 mt-0.5">3-Stage split milestone escrow with cryptographic payout releases</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-right font-mono">
                      <div class="text-[10px] text-zinc-500 uppercase font-bold">Disbursed to Vendor</div>
                      <div class="text-xs sm:text-sm font-black text-emerald-400">
                        {{ getEscrowReleasedAmount(ord) | currency }}
                        <span class="text-[10px] text-zinc-400 font-normal">({{ getEscrowPercentage(ord) }}%)</span>
                      </div>
                    </div>
                    <div class="rounded-xl border border-indigo-500/30 bg-indigo-950/50 px-3 py-1.5 text-right font-mono">
                      <div class="text-[10px] text-indigo-300 uppercase font-bold">Secured in Escrow</div>
                      <div class="text-xs sm:text-sm font-black text-indigo-200">
                        {{ (ord.totalAmount - getEscrowReleasedAmount(ord)) | currency }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3 Milestones Detailed Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
                  <!-- Milestone 1: 30% Upfront -->
                  <div class="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 flex flex-col justify-between"
                       [class.border-emerald-500/40]="isMilestone1Released(ord)"
                       [class.bg-emerald-950/10]="isMilestone1Released(ord)">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-2">
                        <span class="flex items-center gap-1.5 font-bold text-white">
                          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-[10px]">1</span>
                          <span>30% Upfront Deposit</span>
                        </span>
                        @if (isMilestone1Released(ord)) {
                          <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <svg lucideCheck class="h-2.5 w-2.5"></svg> RELEASED
                          </span>
                        } @else {
                          <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">PENDING</span>
                        }
                      </div>
                      <div class="font-mono text-base font-extrabold text-white mb-1">
                        {{ (ord.totalAmount * 0.30) | currency }}
                      </div>
                      <p class="text-[11px] text-zinc-400">
                        Released to supplier to initiate raw materials procurement & factory packaging.
                      </p>
                    </div>
                    <div class="mt-3 pt-2.5 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                      <span>Trigger: Order Payment</span>
                      <span class="text-emerald-400 font-semibold">{{ isMilestone1Released(ord) ? 'Disbursed' : 'Awaiting Pay' }}</span>
                    </div>
                  </div>

                  <!-- Milestone 2: 40% In-Transit Corridor -->
                  <div class="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 flex flex-col justify-between"
                       [class.border-emerald-500/40]="isMilestone2Released(ord)"
                       [class.bg-emerald-950/10]="isMilestone2Released(ord)"
                       [class.border-amber-500/30]="!isMilestone2Released(ord) && isMilestone1Released(ord)">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-2">
                        <span class="flex items-center gap-1.5 font-bold text-white">
                          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-[10px]">2</span>
                          <span>40% In-Transit Corridor</span>
                        </span>
                        @if (isMilestone2Released(ord)) {
                          <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <svg lucideCheck class="h-2.5 w-2.5"></svg> RELEASED
                          </span>
                        } @else {
                          <span class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <svg lucideLock class="h-2.5 w-2.5"></svg> HELD IN ESCROW
                          </span>
                        }
                      </div>
                      <div class="font-mono text-base font-extrabold text-white mb-1">
                        {{ (ord.totalAmount * 0.40) | currency }}
                      </div>
                      <p class="text-[11px] text-zinc-400">
                        Released when courier scans customs checkpoint on Transit Map.
                      </p>
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-zinc-800/60 flex flex-col gap-2">
                      <div class="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>Trigger: Customs Scan</span>
                        <span [class]="isMilestone2Released(ord) ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'">
                          {{ isMilestone2Released(ord) ? 'Customs Cleared' : 'In Transit Hold' }}
                        </span>
                      </div>
                      @if (!isMilestone2Released(ord)) {
                        <div class="flex flex-col gap-1.5">
                          <button
                            type="button"
                            (click)="trackingView.set('MAP')"
                            class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition cursor-pointer"
                          >
                            <svg lucideGlobe class="h-3.5 w-3.5 shrink-0"></svg>
                            <span>View Customs on Map</span>
                          </button>

                          <!-- Scan Checkpoint: ONLY visible to Courier/Supplier or Admin -->
                          @if (canScanCustoms()) {
                            <button
                              type="button"
                              [disabled]="isReleasingMilestone()"
                              (click)="releaseCustomsMilestone(ord)"
                              class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition cursor-pointer disabled:opacity-50"
                              title="Verify courier customs checkpoint scan"
                            >
                              <svg lucideScanLine class="h-3.5 w-3.5 shrink-0"></svg>
                              <span>Scan Checkpoint</span>
                            </button>
                          } @else {
                            <div class="rounded-lg bg-zinc-950/40 border border-zinc-800/80 px-2 py-1.5 text-[10px] text-zinc-400 text-center font-mono">
                              Awaiting courier customs scan on transit corridor
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Milestone 3: 30% Upon Delivery & Inspection -->
                  <div class="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 flex flex-col justify-between"
                       [class.border-emerald-500/40]="isMilestone3Released(ord)"
                       [class.bg-emerald-950/10]="isMilestone3Released(ord)"
                       [class.border-rose-500/50]="isMilestone3Frozen(ord)"
                       [class.bg-rose-950/10]="isMilestone3Frozen(ord)">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-2">
                        <span class="flex items-center gap-1.5 font-bold text-white">
                          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">3</span>
                          <span>30% Upon Delivery</span>
                        </span>
                        @if (isMilestone3Released(ord)) {
                          <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <svg lucideCheck class="h-2.5 w-2.5"></svg> RELEASED
                          </span>
                        } @else if (isMilestone3Frozen(ord)) {
                          <span class="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <svg lucideShieldAlert class="h-2.5 w-2.5"></svg> FROZEN IN DISPUTE
                          </span>
                        } @else {
                          <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                            <svg lucideLock class="h-2.5 w-2.5"></svg> HELD IN ESCROW
                          </span>
                        }
                      </div>
                      <div class="font-mono text-base font-extrabold text-white mb-1">
                        {{ (ord.totalAmount * 0.30) | currency }}
                      </div>
                      <p class="text-[11px] text-zinc-400">
                        Released after buyer physical inspection & quality acceptance at delivery bay.
                      </p>
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-zinc-800/60 flex flex-col gap-2">
                      <div class="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>Trigger: Goods Inspection</span>
                        <span [class]="isMilestone3Released(ord) ? 'text-emerald-400 font-semibold' : isMilestone3Frozen(ord) ? 'text-rose-400 font-bold' : 'text-zinc-400'">
                          {{ isMilestone3Released(ord) ? 'Inspection Passed' : isMilestone3Frozen(ord) ? 'Dispute Open' : (ord.status === OrderStatuses.DELIVERED ? 'Ready for Signoff' : 'Awaiting Arrival') }}
                        </span>
                      </div>

                      @if (isMilestone3Frozen(ord)) {
                        <!-- Frozen Dispute Info Banner -->
                        <div class="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-left space-y-1.5">
                          <div class="flex items-center justify-between text-[11px]">
                            <span class="font-bold text-rose-300 flex items-center gap-1">
                              <svg lucideAlertTriangle class="h-3.5 w-3.5 shrink-0 text-rose-400"></svg>
                              <span>Claim: {{ activeDispute()?.reason || 'Inspection defect reported' }}</span>
                            </span>
                          </div>
                          @if (activeDispute()?.description) {
                            <p class="text-[10px] text-zinc-300 line-clamp-2">
                              {{ activeDispute()?.description }}
                            </p>
                          }
                          <div class="flex items-center justify-between text-[10px] pt-1 border-t border-rose-500/20">
                            <span class="text-zinc-400">Claim: <strong class="text-white">{{ (activeDispute()?.claimAmount || ord.totalAmount * 0.3) | currency }}</strong></span>
                            <span class="text-amber-300 font-semibold">Under Admin Arbitration</span>
                          </div>
                        </div>

                        @if (auth.role() === UserRoles.ADMIN || auth.role() === UserRoles.SUBADMIN) {
                          <button
                            type="button"
                            (click)="resolveModalOpen.set(true)"
                            class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-600/30 px-2.5 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-600/40 active:scale-95 transition cursor-pointer shadow-sm"
                          >
                            <svg lucideScale class="h-3.5 w-3.5 text-amber-300 shrink-0"></svg>
                            <span>Arbitrate Dispute (Admin)</span>
                          </button>
                        } @else {
                          <div class="rounded-lg bg-zinc-950/40 border border-zinc-800/80 px-2.5 py-1.5 text-[10px] text-zinc-400 text-center font-medium">
                            Funds protected in escrow custody
                          </div>
                        }
                      } @else if (!isMilestone3Released(ord)) {
                        @if (auth.role() === UserRoles.CUSTOMER) {
                          @if (ord.status !== OrderStatuses.CANCELLED) {
                            <div class="flex flex-col gap-1.5 w-full">
                              @if (ord.status === OrderStatuses.DELIVERED || ord.inspectionStatus === 'ACTIVE') {
                                <app-inspection-countdown [order]="ord" (escrowReleased)="onInspectionEscrowReleased()" />
                              } @else {
                                <button
                                  type="button"
                                  (click)="openScannerForOrder(ord)"
                                  class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-600/20 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-600/30 active:scale-95 transition cursor-pointer"
                                >
                                  <svg lucideScanLine class="h-3.5 w-3.5 text-cyan-400 shrink-0"></svg>
                                  <span>Scan QR to Start 72h SLA</span>
                                </button>
                                <a
                                  [routerLink]="['/inspection-dispute', ord.id]"
                                  class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer text-center"
                                >
                                  <svg lucideShieldAlert class="h-3.5 w-3.5 text-rose-400 shrink-0"></svg>
                                  <span>Report Defect / Dispute</span>
                                </a>
                              }
                            </div>
                          } @else {
                            <div class="rounded-lg bg-zinc-950/40 border border-zinc-800/80 px-2.5 py-1.5 text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1 font-medium">
                              <svg lucideLock class="h-3 w-3 shrink-0 text-zinc-500"></svg>
                              <span>Order Cancelled</span>
                            </div>
                          }
                        } @else if (auth.role() === UserRoles.ADMIN) {
                          <div class="flex flex-col gap-1.5 w-full">
                            <button
                              type="button"
                              [disabled]="isReleasingMilestone()"
                              (click)="releaseInspectionMilestone(ord)"
                              class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/30 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-600/40 active:scale-95 transition cursor-pointer disabled:opacity-50"
                            >
                              <svg lucideShieldCheck class="h-3.5 w-3.5 text-emerald-300 shrink-0"></svg>
                              <span>Inspect & Release (Admin)</span>
                            </button>
                            <a
                              [routerLink]="['/inspection-dispute', ord.id]"
                              class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer text-center"
                            >
                              <svg lucideShieldAlert class="h-3.5 w-3.5 text-rose-400 shrink-0"></svg>
                              <span>Open Dispute (Admin)</span>
                            </a>
                          </div>
                        } @else {
                          <div class="rounded-lg bg-zinc-950/40 border border-zinc-800/80 px-2.5 py-1.5 text-[10px] text-zinc-400 text-center font-medium">
                            Awaiting buyer delivery inspection
                          </div>
                        }
                      } @else {
                        <a
                          [routerLink]="['/inspection-dispute', ord.id]"
                          class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer text-center"
                        >
                          <svg lucideShieldAlert class="h-3.5 w-3.5 text-rose-400 shrink-0"></svg>
                          <span>Report Defect / Dispute</span>
                        </a>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Collapsible Checkpoint History Timeline -->
            @if (ord.trackingEvents && ord.trackingEvents.length > 0) {
              <div class="mt-4 border-t border-zinc-800/80 pt-3">
                <button
                  type="button"
                  (click)="showEvents.set(!showEvents())"
                  class="flex items-center justify-between w-full text-xs font-bold text-zinc-400 hover:text-indigo-400 transition cursor-pointer py-1"
                >
                  <div class="flex items-center gap-2">
                    <svg lucideMapPin class="h-3.5 w-3.5 text-indigo-400"></svg>
                    <span
                      >Shipment Activity & Checkpoints ({{
                        ord.trackingEvents.length
                      }}
                      updates)</span
                    >
                  </div>
                  @if (showEvents()) {
                    <svg lucideChevronUp class="h-4 w-4"></svg>
                  } @else {
                    <svg lucideChevronDown class="h-4 w-4"></svg>
                  }
                </button>

                @if (showEvents()) {
                  <div class="mt-3 space-y-3 pl-2 border-l-2 border-zinc-800 ml-1.5 animate-fadeIn">
                    @for (evt of ord.trackingEvents; track $index) {
                      <div class="relative pl-4">
                        <!-- Bullet dot -->
                        <div
                          class="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 bg-indigo-500"
                        ></div>

                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div class="flex items-center gap-2">
                            <app-badge [tone]="statusTone(evt.status)">{{
                              evt.status | labelFormat
                            }}</app-badge>
                            @if (evt.location) {
                              <span
                                class="text-xs text-zinc-300 font-semibold flex items-center gap-1"
                              >
                                <svg lucideMapPin class="h-3 w-3 text-zinc-500"></svg>
                                {{ evt.location }}
                              </span>
                            }
                          </div>
                          <span class="text-[11px] text-zinc-500 font-mono">
                            {{ evt.timestamp | date: 'medium' }}
                          </span>
                        </div>

                        @if (evt.note) {
                          <p class="text-xs text-zinc-400 mt-1">
                            {{ evt.note }}
                          </p>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <app-inspection-dispute-modal
            [open]="disputeModalOpen()"
            [order]="ord"
            [escrow]="escrowData()"
            (closed)="disputeModalOpen.set(false)"
            (disputeCreated)="loadEscrow(ord.id)"
          />

          <app-dispute-resolution-modal
            [open]="resolveModalOpen()"
            [order]="ord"
            [escrow]="escrowData()"
            [dispute]="activeDispute()"
            (closed)="resolveModalOpen.set(false)"
            (resolved)="loadEscrow(ord.id)"
          />

          @if (packingSlipModalOpen()) {
            <app-packing-slip-modal
              [order]="ord"
              (close)="packingSlipModalOpen.set(false)"
              (downloadPdf)="waybillClicked.emit()"
              (scanCodeRequested)="openScannerForOrder(ord)"
            />
          }

          @if (deliveryScannerOpen()) {
            <app-delivery-qr-scanner-modal
              [prefillCode]="selectedScannerPrefill()"
              [activeOrders]="[ord]"
              (close)="deliveryScannerOpen.set(false)"
              (deliveryVerified)="onDeliveryVerified($event)"
            />
          }
        }
      } @else {
      <div
        class="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-zinc-400"
      >
        <svg lucidePackage class="mx-auto h-8 w-8 text-zinc-600 mb-2"></svg>
        <p class="text-sm font-semibold text-zinc-300">Order Information Unavailable</p>
        <p class="text-xs text-zinc-500 mt-1">Unable to load tracking details for this order.</p>
      </div>
    }
  `,
})
export class OrderTracker {
  readonly order = input<OrderView | null>(null);
  readonly compact = input(false);
  readonly error = input<string | null>(null);
  readonly canPay = input(false);
  readonly isPaying = input(false);
  readonly payClicked = output<void>();

  readonly canCancel = input(false);
  readonly isCancelling = input(false);
  readonly cancelClicked = output<void>();
  readonly invoiceClicked = output<void>();
  readonly waybillClicked = output<void>();
  readonly isDownloadingWaybill = input(false);

  readonly canFulfill = input(false);
  readonly fulfillClicked = output<void>();

  readonly steps = STEPS;
  readonly statusTone = statusTone;
  readonly copied = signal(false);
  readonly copyError = signal(false);
  readonly showEvents = signal(false);
  readonly trackingView = signal<'TIMELINE' | 'MAP'>('TIMELINE');
  readonly OrderStatuses = OrderStatuses;
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;
  readonly canScanCustoms = computed(() => {
    const r = this.auth.role();
    return r === UserRoles.ADMIN || r === UserRoles.SUPPLIER;
  });

  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly orderSocket = inject(OrderSocketService);

  readonly orderUpdated = output<OrderView>();
  readonly escrowData = signal<OrderEscrowView | null>(null);
  readonly isReleasingMilestone = signal(false);
  readonly disputeModalOpen = signal(false);
  readonly resolveModalOpen = signal(false);
  readonly activeDispute = computed(() => this.escrowData()?.dispute || null);
  readonly packingSlipModalOpen = signal(false);
  readonly deliveryScannerOpen = signal(false);
  readonly selectedScannerPrefill = signal('');

  openScannerForOrder(o: OrderView) {
    this.selectedScannerPrefill.set(o.deliveryQrToken || `NX-DLV-${o.id.substring(0, 8).toUpperCase()}`);
    this.deliveryScannerOpen.set(true);
  }

  onDeliveryVerified(updatedOrder: OrderView) {
    this.deliveryScannerOpen.set(false);
    this.loadEscrow(updatedOrder.id);
    this.orderUpdated.emit(updatedOrder);
  }

  onInspectionEscrowReleased() {
    const ord = this.order();
    if (ord) {
      this.loadEscrow(ord.id);
      this.orderService.getOne(ord.id).subscribe({
        next: (fresh) => this.orderUpdated.emit(fresh),
        error: () => {},
      });
    }
  }

  private loadedEscrowOrderId: string | null = null;
  private isFetchingEscrow = false;

  constructor() {
    effect(() => {
      const ord = this.order();
      if (ord) {
        // If order already has escrow preloaded from the batched /orders API, use it with 0 network calls!
        if (ord.escrow) {
          this.loadedEscrowOrderId = ord.id;
          this.escrowData.set(ord.escrow);
          return;
        }

        if (ord.totalAmount >= 5000 || ord.paymentMode === 'MILESTONE_ESCROW') {
          const orderId = ord.id;
          untracked(() => {
            if (this.loadedEscrowOrderId !== orderId) {
              this.loadEscrow(orderId);
            }
          });
        }
      }
    });

    effect(() => {
      const evt = this.orderSocket.latestEscrowUpdated();
      const ord = this.order();
      if (evt && ord && evt.orderId === ord.id) {
        const orderId = ord.id;
        untracked(() => {
          this.loadEscrow(orderId, true);
        });
      }
    });
  }

  loadEscrow(orderId: string, force = false) {
    if (!orderId) return;
    if (!force && (this.loadedEscrowOrderId === orderId || this.isFetchingEscrow)) {
      return;
    }
    this.isFetchingEscrow = true;
    this.orderService.getOrderEscrow(orderId, force).subscribe({
      next: (esc) => {
        this.loadedEscrowOrderId = orderId;
        this.isFetchingEscrow = false;
        this.escrowData.set(esc);
      },
      error: () => {
        this.isFetchingEscrow = false;
      },
    });
  }

  readonly currentStepIndex = computed(() => {
    const ord = this.order();
    if (!ord || ord.status === OrderStatuses.CANCELLED) return 1;
    return STATUS_ORDER[ord.status] || 1;
  });

  readonly currentStep = computed<TrackingStep>(() => {
    const idx = this.currentStepIndex();
    return STEPS[Math.max(0, Math.min(STEPS.length - 1, idx - 1))];
  });

  readonly progressPercentage = computed(() => {
    const ord = this.order();
    if (!ord || ord.status === OrderStatuses.CANCELLED) return 0;
    const currentNum = STATUS_ORDER[ord.status] || 1;
    if (currentNum >= 5) return 100;
    return ((currentNum - 1) / (STEPS.length - 1)) * 100;
  });

  getStepState(stepId: OrderStatus): 'completed' | 'current' | 'upcoming' {
    const ord = this.order();
    if (!ord || ord.status === OrderStatuses.CANCELLED) return 'upcoming';

    const currentNum = STATUS_ORDER[ord.status] || 1;
    const stepNum = STATUS_ORDER[stepId] || 1;

    if (stepNum < currentNum) return 'completed';
    if (stepNum === currentNum) return 'current';
    return 'upcoming';
  }

  getStepCircleClass(state: 'completed' | 'current' | 'upcoming'): string {
    switch (state) {
      case 'completed':
        return 'bg-emerald-600 text-white border-2 border-emerald-500';
      case 'current':
        return 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 border-2 border-indigo-400 animate-pulse';
      case 'upcoming':
        return 'bg-zinc-950 text-zinc-500 border border-zinc-800';
    }
  }

  copyTrackingCode(id?: string) {
    const ord = this.order();
    const trackingCode =
      ord?.trackingNumber || (id ? `TRK-NX-${id.slice(0, 8).toUpperCase()}` : 'TRK-NX-UNKNOWN');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(trackingCode)
        .then(() => {
          this.copied.set(true);
          this.copyError.set(false);
          setTimeout(() => this.copied.set(false), 2000);
        })
        .catch(() => {
          this.fallbackCopy(trackingCode);
        });
    } else {
      this.fallbackCopy(trackingCode);
    }
  }

  private fallbackCopy(text: string) {
    try {
      if (typeof document === 'undefined') return;
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        this.copied.set(true);
        this.copyError.set(false);
        setTimeout(() => this.copied.set(false), 2000);
      } else {
        this.copyError.set(true);
        setTimeout(() => this.copyError.set(false), 3000);
      }
    } catch {
      this.copyError.set(true);
      setTimeout(() => this.copyError.set(false), 3000);
    }
  }

  displayEstimatedDelivery(ord: OrderView | null): string {
    if (!ord) return 'TBD';
    if (ord.status === OrderStatuses.CANCELLED) return 'Order Cancelled';
    if (ord.status === OrderStatuses.DELIVERED) return 'Package Delivered';
    if (ord.estimatedDelivery) {
      try {
        const d = new Date(ord.estimatedDelivery);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          });
        }
      } catch {
        // ignore error
      }
    }
    if (ord.createdAt) {
      try {
        const date = new Date(ord.createdAt);
        if (!isNaN(date.getTime())) {
          date.setDate(date.getDate() + 3);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          });
        }
      } catch {
        // ignore error
      }
    }
    return '3–5 Business Days';
  }

  getEscrowPercentage(ord: OrderView): number {
    const esc = this.escrowData();
    if (esc) return esc.releasePercentage;
    if (ord.status === OrderStatuses.DELIVERED) return 100;
    if (ord.status === OrderStatuses.SHIPPED || ord.status === OrderStatuses.OUT_FOR_DELIVERY) return 70;
    if (ord.status === OrderStatuses.PROCESSING) return 30;
    return 0;
  }

  getEscrowReleasedAmount(ord: OrderView): number {
    const esc = this.escrowData();
    if (esc) return esc.releasedAmount;
    const pct = this.getEscrowPercentage(ord);
    return Math.round((ord.totalAmount * (pct / 100)) * 100) / 100;
  }

  isMilestone1Released(ord: OrderView): boolean {
    const m = this.escrowData()?.milestones?.find((x) => x.milestoneIndex === 1);
    if (m) return m.status === 'RELEASED';
    return ord.status !== OrderStatuses.PENDING && ord.status !== OrderStatuses.CANCELLED;
  }

  isMilestone2Released(ord: OrderView): boolean {
    const m = this.escrowData()?.milestones?.find((x) => x.milestoneIndex === 2);
    if (m) return m.status === 'RELEASED';
    return (
      ord.status === OrderStatuses.SHIPPED ||
      ord.status === OrderStatuses.OUT_FOR_DELIVERY ||
      ord.status === OrderStatuses.DELIVERED
    );
  }

  isMilestone3Released(ord: OrderView): boolean {
    const m = this.escrowData()?.milestones?.find((x) => x.milestoneIndex === 3);
    if (m) return m.status === 'RELEASED';
    return false;
  }

  isMilestone3Frozen(ord: OrderView): boolean {
    const m = this.escrowData()?.milestones?.find((x) => x.milestoneIndex === 3);
    return m?.status === 'FROZEN_IN_DISPUTE';
  }

  releaseCustomsMilestone(ord: OrderView) {
    if (this.isReleasingMilestone()) return;
    this.isReleasingMilestone.set(true);

    this.orderService
      .releaseEscrowMilestone(
        ord.id,
        2,
        'Export customs checkpoint scanned and verified on Transit Map. Milestone 2 (40%) released.',
      )
      .subscribe({
        next: (res) => {
          this.isReleasingMilestone.set(false);
          this.toast.success(res.message || 'Milestone 2 (40% In-Transit) released to supplier!');
          this.loadEscrow(ord.id);
        },
        error: (err) => {
          this.isReleasingMilestone.set(false);
          const msg = err?.error?.message;
          this.toast.error(typeof msg === 'string' ? msg : 'Failed to release customs milestone');
        },
      });
  }

  releaseInspectionMilestone(ord: OrderView) {
    if (this.isReleasingMilestone()) return;
    this.isReleasingMilestone.set(true);

    this.orderService
      .releaseEscrowMilestone(
        ord.id,
        3,
        'Buyer inspected physical consignment and approved quality inspection signoff. Final 30% released.',
      )
      .subscribe({
        next: (res) => {
          this.isReleasingMilestone.set(false);
          this.toast.success('Goods inspection accepted! Final 30% escrow released to supplier.');
          this.loadEscrow(ord.id);
        },
        error: (err) => {
          this.isReleasingMilestone.set(false);
          const msg = err?.error?.message;
          this.toast.error(typeof msg === 'string' ? msg : 'Failed to release inspection milestone');
        },
      });
  }
}
