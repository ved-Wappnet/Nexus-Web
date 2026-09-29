import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderStatus, OrderStatuses, OrderView } from '@core/models';
import {
  LucideAlertCircle,
  LucideArrowRight,
  LucideCheck,
  LucideClock,
  LucideCopy,
  LucideGlobe,
  LucidePackage,
  LucideReceipt,
  LucideTruck,
} from '@lucide/angular';
import { Badge, statusTone } from '@shared/ui/badge/badge';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { TransitMapComponent } from '@shared/ui/transit-map/transit-map';

interface StageProgressInfo {
  percent: number;
  stage: number;
  label: string;
  next: string;
  note: string;
}

const STAGE_MAP: Record<OrderStatus, StageProgressInfo> = {
  [OrderStatuses.PENDING]: {
    percent: 20,
    stage: 1,
    label: 'Order Placed',
    next: 'Processing',
    note: 'Order confirmed & verified',
  },
  [OrderStatuses.PROCESSING]: {
    percent: 40,
    stage: 2,
    label: 'Processing',
    next: 'In Transit',
    note: 'Packed & prepared for dispatch',
  },
  [OrderStatuses.SHIPPED]: {
    percent: 65,
    stage: 3,
    label: 'In Transit',
    next: 'Out for Delivery',
    note: 'Handed over to carrier partner',
  },
  [OrderStatuses.OUT_FOR_DELIVERY]: {
    percent: 85,
    stage: 4,
    label: 'Out for Delivery',
    next: 'Delivered',
    note: 'With local courier for dropoff',
  },
  [OrderStatuses.DELIVERED]: {
    percent: 100,
    stage: 5,
    label: 'Delivered',
    next: 'Completed',
    note: 'Package delivered & signed',
  },
  [OrderStatuses.CANCELLED]: {
    percent: 0,
    stage: 0,
    label: 'Cancelled',
    next: 'Refunded',
    note: 'Order was cancelled',
  },
};

@Component({
  selector: 'app-dashboard-active-order',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    Badge,
    LabelFormatPipe,
    LucidePackage,
    LucideTruck,
    LucideClock,
    LucideCopy,
    LucideCheck,
    LucideReceipt,
    LucideArrowRight,
    LucideAlertCircle,
    LucideGlobe,
    TransitMapComponent,
  ],
  template: `
    <div
      class="rounded-2xl border border-zinc-800/90 bg-zinc-950/80 p-4.5 sm:p-5 shadow-xl transition-all hover:border-zinc-700/80 backdrop-blur-md"
    >
      <!-- Top Row: Order Header & Actions -->
      <div
        class="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-zinc-800/60"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shrink-0"
          >
            <svg lucidePackage class="h-5 w-5 sm:h-5.5 sm:w-5.5"></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                Order #NX-{{ (order().id || '').slice(0, 8).toUpperCase() }}
              </h4>
              <button
                type="button"
                (click)="copyCode(order().id)"
                class="inline-flex items-center gap-1 rounded-md bg-zinc-800/90 px-2 py-0.5 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
                title="Copy Order ID"
              >
                @if (copied()) {
                  <svg lucideCheck class="h-3 w-3 text-emerald-400"></svg>
                  <span class="text-emerald-400">Copied</span>
                } @else {
                  <svg lucideCopy class="h-3 w-3"></svg>
                  <span>Copy</span>
                }
              </button>
            </div>
            <p class="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-1.5 truncate">
              <span>Placed {{ order().createdAt | date: 'mediumDate' }}</span>
              <span>•</span>
              <span class="text-zinc-300 font-medium">
                {{ order().items.length }} {{ order().items.length === 1 ? 'item' : 'items' }}
              </span>
              @if (order().customerEmail) {
                <span class="text-zinc-500 hidden sm:inline">• {{ order().customerEmail }}</span>
              }
            </p>
          </div>
        </div>

        <!-- Amount & Action Buttons -->
        <div class="flex flex-col items-end gap-1.5 shrink-0 ml-auto">
          <div class="flex items-center gap-2">
            <span class="text-base sm:text-lg font-extrabold text-white font-mono">
              {{ order().totalAmount | currency }}
            </span>
            <app-badge [tone]="statusTone(order().status)">{{
              order().status | labelFormat
            }}</app-badge>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="showRouteMap.set(!showRouteMap())"
              class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold active:scale-95 transition cursor-pointer"
              [class]="
                showRouteMap()
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
              "
              title="Toggle Live Visual Route Map"
            >
              <svg lucideGlobe class="h-3.5 w-3.5"></svg>
              <span>{{ showRouteMap() ? 'Hide Map' : 'Live Route' }}</span>
            </button>
            <button
              type="button"
              (click)="invoiceClicked.emit()"
              class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-indigo-500/50 hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
            >
              <svg lucideReceipt class="h-3.5 w-3.5 text-indigo-400"></svg>
              <span>Invoice</span>
            </button>
            <a
              routerLink="/orders"
              class="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 transition"
            >
              <span>Track</span>
              <svg lucideArrowRight class="h-3 w-3"></svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Item Preview Pill -->
      @if (order().items && order().items.length > 0) {
        <div
          class="mt-3 flex items-center justify-between gap-3 rounded-xl bg-zinc-900/60 px-3.5 py-2 text-xs border border-zinc-800/50"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0"></span>
            <span class="font-medium text-zinc-200 truncate">
              {{ order().items[0].productTitle }}
            </span>
            @if (order().items.length > 1) {
              <span class="text-zinc-500 shrink-0">+{{ order().items.length - 1 }} more</span>
            }
          </div>
          <span class="font-mono text-zinc-400 shrink-0">Qty: {{ order().items[0].quantity }}</span>
        </div>
      }

      <!-- Order Status Progress (CLEAN DASHBOARD METER - ZERO TEXT OVERLAP) -->
      @if (order().status === OrderStatuses.CANCELLED) {
        <div
          class="mt-3.5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
        >
          <svg lucideAlertCircle class="h-4 w-4 shrink-0 text-rose-400"></svg>
          <span>This order was cancelled. Restocked inventory and escrow funds were released.</span>
        </div>
      } @else {
        <div class="mt-3.5">
          <!-- Active Stage Headline -->
          <div class="flex items-center justify-between text-xs mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="relative flex h-2 w-2 shrink-0">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"
                ></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span class="font-bold text-indigo-300 shrink-0">{{ info().label }}</span>
              <span class="text-zinc-600 shrink-0 hidden sm:inline">•</span>
              <span class="text-zinc-400 truncate hidden sm:inline">{{ info().note }}</span>
            </div>
            <span class="font-mono text-[11px] font-semibold text-zinc-400 shrink-0">
              Stage {{ info().stage }} of 5 ({{ info().percent }}%)
            </span>
          </div>

          <!-- Single Smooth Progress Bar -->
          <div class="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800/80">
            <div
              class="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-600 rounded-full transition-all duration-500 shadow-sm shadow-indigo-500/50"
              [style.width.%]="info().percent"
            ></div>
          </div>

          <!-- 5 Clean Step Labels (Spaced horizontally without multi-line paragraphs) -->
          <div
            class="mt-2.5 flex items-center justify-between text-[11px] font-medium text-zinc-500 px-0.5"
          >
            <span
              [class.text-emerald-400]="info().stage >= 1"
              [class.font-bold]="info().stage === 1"
              >1. Placed</span
            >
            <span
              [class.text-emerald-400]="info().stage > 2"
              [class.text-indigo-300]="info().stage === 2"
              [class.font-bold]="info().stage === 2"
              >2. Processing</span
            >
            <span
              [class.text-emerald-400]="info().stage > 3"
              [class.text-indigo-300]="info().stage === 3"
              [class.font-bold]="info().stage === 3"
              >3. In Transit</span
            >
            <span
              [class.text-emerald-400]="info().stage > 4"
              [class.text-indigo-300]="info().stage === 4"
              [class.font-bold]="info().stage === 4"
              >4. Out for Delivery</span
            >
            <span
              [class.text-emerald-400]="info().stage === 5"
              [class.font-bold]="info().stage === 5"
              >5. Delivered</span
            >
          </div>
        </div>

        <!-- Logistics & Delivery Strip -->
        <div
          class="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-zinc-800/60 text-xs"
        >
          <div
            class="flex items-center gap-2.5 rounded-xl bg-zinc-900/40 px-3 py-2 border border-zinc-800/40 min-w-0"
          >
            <svg lucideClock class="h-4 w-4 text-indigo-400 shrink-0"></svg>
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Est. Delivery
              </p>
              <p class="font-bold text-zinc-200 truncate text-xs">{{ deliveryDate() }}</p>
            </div>
          </div>

          <div
            class="flex items-center justify-between gap-2 rounded-xl bg-zinc-900/40 px-3 py-2 border border-zinc-800/40 min-w-0"
          >
            <div class="flex items-center gap-2.5 min-w-0 truncate">
              <svg lucideTruck class="h-4 w-4 text-emerald-400 shrink-0"></svg>
              <div class="min-w-0 truncate">
                <p class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Carrier</p>
                <p class="font-semibold text-zinc-200 truncate text-xs">
                  {{ order().carrier || 'Nexus Priority Logistics' }}
                </p>
              </div>
            </div>
            @if (order().trackingNumber) {
              <span
                class="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-500/30 shrink-0"
              >
                {{ order().trackingNumber }}
              </span>
            }
          </div>
        </div>
      }

      <!-- Interactive Live Transit Route Map Drawer -->
      @if (showRouteMap()) {
        <div class="mt-4 pt-4 border-t border-zinc-800/80 animate-fade-in">
          <app-transit-map [order]="order()" />
        </div>
      }
    </div>
  `,
})
export class DashboardActiveOrderCard {
  readonly order = input.required<OrderView>();
  readonly invoiceClicked = output<void>();

  readonly showRouteMap = signal(false);
  readonly copied = signal(false);
  readonly statusTone = statusTone;
  readonly OrderStatuses = OrderStatuses;

  readonly info = computed<StageProgressInfo>(() => {
    const s = this.order()?.status;
    return STAGE_MAP[s] || STAGE_MAP[OrderStatuses.PENDING];
  });

  readonly deliveryDate = computed(() => {
    const ord = this.order();
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
        // ignore
      }
    }
    if (ord.createdAt) {
      try {
        const d = new Date(ord.createdAt);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 3);
          return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          });
        }
      } catch {
        // ignore
      }
    }
    return '3–5 Business Days';
  });

  copyCode(id: string) {
    const tracking =
      this.order()?.trackingNumber || (id ? `TRK-NX-${id.slice(0, 8).toUpperCase()}` : '');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tracking).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    } else {
      this.fallbackCopy(tracking);
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
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // ignore
    }
  }
}
