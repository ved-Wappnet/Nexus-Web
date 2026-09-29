import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RfqStatuses } from '@core/models';
import { RfqService } from '@core/services/rfq.service';
import {
  LucideCheckCircle2,
  LucideCreditCard,
  LucidePackage,
  LucideRefreshCw,
  LucideShoppingBag,
  LucideXCircle,
} from '@lucide/angular';
import { Badge } from '@shared/ui/badge/badge';
import { PaymentService } from '@core/services/payment.service';

@Component({
  selector: 'app-payment-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Badge,
    LucideCheckCircle2,
    LucideXCircle,
    LucideCreditCard,
    LucidePackage,
    LucideShoppingBag,
    LucideRefreshCw,
  ],
  template: `
    <div class="mx-auto max-w-2xl py-8">
      @if (status() === 'success') {
        <!-- SUCCESS STATE CARD -->
        <div class="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div class="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>

          <div class="relative text-center">
            <!-- Animated Glowing Badge Icon -->
            <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <svg lucideCheckCircle2 class="h-10 w-10"></svg>
            </div>

            <h1 class="mt-6 text-3xl font-bold tracking-tight text-zinc-100">Payment Successful!</h1>
            <p class="mt-2 text-sm text-zinc-400">
              Thank you for your purchase. Your transaction has been verified and processed securely via Stripe.
            </p>

            <!-- Order / Transaction Breakdown -->
            <div class="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-left space-y-4">
              <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span class="text-xs uppercase tracking-wider text-zinc-500 font-medium">Payment Method</span>
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                  <svg lucideCreditCard class="h-4 w-4 text-indigo-400"></svg>
                  Stripe Hosted Checkout
                </span>
              </div>

              @if (orderId()) {
                <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span class="text-xs uppercase tracking-wider text-zinc-500 font-medium">Order Reference</span>
                  <span class="font-mono text-xs font-bold text-indigo-300">#NX-{{ orderId()!.slice(0, 8).toUpperCase() }}</span>
                </div>
              }

              @if (rfqId()) {
                <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span class="text-xs uppercase tracking-wider text-zinc-500 font-medium">RFQ Contract ID</span>
                  <span class="font-mono text-xs font-bold text-indigo-300">#RFQ-{{ rfqId()!.slice(0, 8).toUpperCase() }}</span>
                </div>
              }

              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-wider text-zinc-500 font-medium">Transaction Status</span>
                <app-badge tone="emerald">VERIFIED & PAID</app-badge>
              </div>
            </div>

            <!-- Next Action Buttons -->
            <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                routerLink="/orders"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition cursor-pointer"
              >
                <svg lucidePackage class="h-4 w-4"></svg>
                <span>Track Order Status</span>
              </a>

              <a
                routerLink="/products"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition cursor-pointer"
              >
                <svg lucideShoppingBag class="h-4 w-4"></svg>
                <span>Continue Shopping</span>
              </a>
            </div>
          </div>
        </div>
      } @else {
        <!-- CANCELLED / FAILED STATE CARD -->
        <div class="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div class="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"></div>

          <div class="relative text-center">
            <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-xl shadow-amber-500/20">
              <svg lucideXCircle class="h-10 w-10"></svg>
            </div>

            <h1 class="mt-6 text-3xl font-bold tracking-tight text-zinc-100">Payment Incomplete</h1>
            <p class="mt-2 text-sm text-zinc-400">
              The Stripe transaction was not finalized or was cancelled. Your order remains saved.
            </p>

            <div class="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-left space-y-4">
              @if (orderId()) {
                <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span class="text-xs uppercase tracking-wider text-zinc-500 font-medium">Pending Order</span>
                  <span class="font-mono text-xs font-bold text-amber-300">#NX-{{ orderId()!.slice(0, 8).toUpperCase() }}</span>
                </div>
              }

              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-wider text-zinc-500 font-medium">Current Status</span>
                <app-badge tone="amber">PENDING PAYMENT</app-badge>
              </div>
            </div>

            <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                routerLink="/orders"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition cursor-pointer"
              >
                <svg lucideRefreshCw class="h-4 w-4"></svg>
                <span>Retry Payment in Orders</span>
              </a>

              <a
                routerLink="/products"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition cursor-pointer"
              >
                <svg lucideShoppingBag class="h-4 w-4"></svg>
                <span>Return to Catalog</span>
              </a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PaymentStatus {
  private readonly route = inject(ActivatedRoute);
  private readonly rfqService = inject(RfqService);
  private readonly paymentService = inject(PaymentService);

  readonly status = signal<'success' | 'cancelled'>('success');
  readonly orderId = signal<string | null>(null);
  readonly rfqId = signal<string | null>(null);

  constructor() {
    const query = this.route.snapshot.queryParams;
    const isSuccess = query['type'] === 'success' || query['payment_success'] === 'true';
    const isCancel = query['type'] === 'cancel' || query['payment_cancelled'] === 'true';

    this.status.set(isSuccess && !isCancel ? 'success' : 'cancelled');
    this.orderId.set(query['orderId'] || null);
    this.rfqId.set(query['rfqId'] || null);

    if (isSuccess && query['rfqId']) {
      this.rfqService.updateStatus(query['rfqId'], RfqStatuses.PAID);
    }

    if (isSuccess && query['orderId']) {
      this.paymentService.confirmPayment({
        orderId: query['orderId'],
        paymentMode: query['paymentMode'] || 'FULL_UPFRONT',
      }).subscribe({
        next: () => {},
        error: () => {},
      });
    }
  }
}
