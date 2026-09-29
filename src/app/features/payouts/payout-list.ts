import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserRoles } from '@core/constants/user.constant';
import { SupplierPayout, SupplierPayoutSummary } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { PayoutService } from '@core/services/payout.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCheck,
  LucideCheckCircle2,
  LucideClock,
  LucideCopy,
  LucideDownload,
  LucideEye,
  LucideLandmark,
  LucideLock,
  LucideReceipt,
  LucideRefreshCw,
  LucideSearch,
  LucideTrendingUp,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-payout-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    LucideCheck,
    LucideCheckCircle2,
    LucideClock,
    LucideCopy,
    LucideDownload,
    LucideEye,
    LucideLandmark,
    LucideLock,
    LucideReceipt,
    LucideRefreshCw,
    LucideSearch,
    LucideTrendingUp,
    LucideX,
  ],
  template: `
    <div class="space-y-6 pb-12 animate-fade-in">
      <!-- 👑 Top Header Banner -->
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
      >
        <div class="flex items-center gap-3.5">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-950/50"
          >
            <svg lucideLandmark class="h-6 w-6"></svg>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">
                Treasury & Payout Ledger
              </h1>
              <span
                class="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/40"
              >
                ● Live Disbursals
              </span>
            </div>
            <p class="text-xs sm:text-sm text-zinc-400 mt-1">
              B2B Milestone Escrow Disbursals, Platform Commission Deductions & Bank Remittance Vouchers
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            (click)="loadData()"
            [disabled]="isLoading()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500 hover:text-white active:scale-95 transition cursor-pointer disabled:opacity-50"
            title="Refresh Ledger"
          >
            <svg lucideRefreshCw class="h-4 w-4" [class.animate-spin]="isLoading()"></svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            (click)="exportCsv()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 active:scale-95 transition cursor-pointer shadow-lg shadow-emerald-950/40"
            title="Export CSV Audit"
          >
            <svg lucideDownload class="h-4 w-4"></svg>
            <span>Export Ledger (CSV)</span>
          </button>
        </div>
      </div>

      <!-- 📊 KPI Financial Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Net Disbursed Revenue (Emerald) -->
        <div
          class="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950/80 p-5 shadow-xl transition-all hover:border-emerald-500/50"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Net Disbursed to Bank</span>
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <svg lucideTrendingUp class="h-4.5 w-4.5"></svg>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-white font-mono">
              {{ (summary()?.totalNetDisbursed || 0) | currency }}
            </span>
            <p class="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span>●</span>
              <span>Direct ACH/Wire Credits Received</span>
            </p>
          </div>
        </div>

        <!-- Card 2: Milestone Escrow Held in Custody (Indigo/Cyan) -->
        <div
          class="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-zinc-950/80 p-5 shadow-xl transition-all hover:border-indigo-500/50"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Escrow in Custody</span>
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <svg lucideLock class="h-4.5 w-4.5"></svg>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-indigo-300 font-mono">
              {{ (summary()?.totalHeldInEscrow || 0) | currency }}
            </span>
            <p class="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span>Awaiting transit/inspection clearance</span>
            </p>
          </div>
        </div>

        <!-- Card 3: Platform Fees & Commission (Amber) -->
        <div
          class="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950/80 p-5 shadow-xl transition-all hover:border-amber-500/50"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Platform Fees Deducted</span>
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <svg lucideReceipt class="h-4.5 w-4.5"></svg>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {{ (summary()?.totalPlatformFees || 0) | currency }}
            </span>
            <p class="text-[11px] text-zinc-400 mt-1">
              Platform brokerage & escrow insurance fee (5%)
            </p>
          </div>
        </div>

        <!-- Card 4: Total Settled Payouts Count (Cyan) -->
        <div
          class="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-zinc-950/80 p-5 shadow-xl transition-all hover:border-cyan-500/50"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Disbursements</span>
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <svg lucideCheckCircle2 class="h-4.5 w-4.5"></svg>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
              {{ summary()?.totalPayoutsCount || 0 }}
            </span>
            <p class="text-[11px] text-zinc-400 mt-1">
              Gross Volume: {{ (summary()?.totalGrossDisbursed || 0) | currency }}
            </p>
          </div>
        </div>
      </div>

      <!-- 🔍 Filters & Search Toolbar -->
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-950/70 p-3.5 backdrop-blur-md shadow-xl"
      >
        <!-- Filter Tabs -->
        <div class="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-1">
          <button
            type="button"
            (click)="setStatusTab('ALL')"
            [class]="activeStatusTab() === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
          >
            All Disbursals
          </button>
          <button
            type="button"
            (click)="setStatusTab('SETTLED')"
            [class]="activeStatusTab() === 'SETTLED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Settled</span>
          </button>
          <button
            type="button"
            (click)="setStatusTab('PROCESSING')"
            [class]="activeStatusTab() === 'PROCESSING' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Pending</span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-72">
          <svg lucideSearch class="absolute left-3 top-2.5 h-4 w-4 text-zinc-500"></svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search Remittance #, Order, Ref..."
            class="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <!-- 📋 Payouts Ledger Table -->
      <div
        class="overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/80 shadow-2xl backdrop-blur-xl"
      >
        @if (isLoading()) {
          <div class="p-12 text-center text-zinc-400 space-y-3">
            <svg lucideRefreshCw class="mx-auto h-8 w-8 animate-spin text-indigo-400"></svg>
            <p class="text-sm font-semibold">Synchronizing Treasury & Payout Ledger...</p>
          </div>
        } @else if (filteredPayouts().length === 0) {
          <div class="p-12 text-center text-zinc-500 space-y-2">
            <svg lucideReceipt class="mx-auto h-10 w-10 text-zinc-700"></svg>
            <p class="text-sm font-bold text-zinc-300">No Payout Disbursals Found</p>
            <p class="text-xs text-zinc-500">
              When milestone escrow phases are released for your orders, financial disbursals will be registered here.
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-zinc-800 bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                <tr>
                  <th class="py-3.5 pl-5 pr-3">Remittance Voucher</th>
                  <th class="py-3.5 px-3">Commercial Order</th>
                  <th class="py-3.5 px-3">Milestone Phase</th>
                  <th class="py-3.5 px-3 text-right">Gross Release</th>
                  <th class="py-3.5 px-3 text-right">Nexus Fee (5%)</th>
                  <th class="py-3.5 px-3 text-right">Net Bank Deposit</th>
                  <th class="py-3.5 px-3 text-center">Status</th>
                  <th class="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/60 font-sans">
                @for (payout of filteredPayouts(); track payout.id) {
                  <tr class="group hover:bg-zinc-900/40 transition">
                    <!-- Remittance # & Date -->
                    <td class="py-3.5 pl-5 pr-3">
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-emerald-400">
                          {{ payout.remittanceNumber }}
                        </span>
                        <button
                          type="button"
                          (click)="copyText(payout.remittanceNumber)"
                          class="text-zinc-500 hover:text-white transition cursor-pointer p-0.5"
                          title="Copy Remittance #"
                        >
                          @if (copiedText() === payout.remittanceNumber) {
                            <svg lucideCheck class="h-3 w-3 text-emerald-400"></svg>
                          } @else {
                            <svg lucideCopy class="h-3 w-3"></svg>
                          }
                        </button>
                      </div>
                      <div class="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {{ payout.disbursedAt | date: 'mediumDate' }} • {{ payout.disbursedAt | date: 'shortTime' }}
                      </div>
                    </td>

                    <!-- Order Reference -->
                    <td class="py-3.5 px-3">
                      <div class="flex items-center gap-1.5">
                        <a
                          routerLink="/orders"
                          class="font-mono font-bold text-zinc-200 hover:text-indigo-400 transition"
                        >
                          #NX-{{ payout.orderId.slice(0, 8).toUpperCase() }}
                        </a>
                      </div>
                      <div class="text-[10px] text-zinc-400 mt-0.5">
                        Total: {{ payout.orderTotalAmount | currency }}
                      </div>
                    </td>

                    <!-- Milestone Phase -->
                    <td class="py-3.5 px-3">
                      <div class="inline-flex items-center gap-1.5">
                        @if (payout.milestoneIndex === 1) {
                          <span class="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                            30% Deposit (M1)
                          </span>
                        } @else if (payout.milestoneIndex === 2) {
                          <span class="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                            40% Transit (M2)
                          </span>
                        } @else {
                          <span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                            30% Signoff (M3)
                          </span>
                        }
                      </div>
                      <p class="text-[10px] text-zinc-500 truncate max-w-[160px] mt-0.5">
                        {{ payout.milestoneTitle }}
                      </p>
                    </td>

                    <!-- Gross Amount -->
                    <td class="py-3.5 px-3 text-right font-mono font-bold text-zinc-300">
                      {{ payout.grossAmount | currency }}
                    </td>

                    <!-- Platform Fee -->
                    <td class="py-3.5 px-3 text-right font-mono text-rose-400">
                      -{{ payout.platformFeeAmount | currency }}
                    </td>

                    <!-- Net Disbursed to Bank -->
                    <td class="py-3.5 px-3 text-right">
                      <span class="font-mono font-black text-sm text-emerald-400">
                        {{ payout.netPayoutAmount | currency }}
                      </span>
                      <div class="text-[10px] text-zinc-500 font-mono truncate max-w-[140px] ml-auto">
                        {{ payout.bankAccountHint || 'Direct ACH/Wire' }}
                      </div>
                    </td>

                    <!-- Status -->
                    <td class="py-3.5 px-3 text-center">
                      @if (payout.status === 'SETTLED') {
                        <span class="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          <svg lucideCheck class="h-2.5 w-2.5"></svg> SETTLED
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 animate-pulse">
                          <svg lucideClock class="h-2.5 w-2.5"></svg> PROCESSING
                        </span>
                      }
                    </td>

                    <!-- Actions -->
                    <td class="py-3.5 pl-3 pr-5 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="openVoucherPreview(payout)"
                          class="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition cursor-pointer"
                          title="View Remittance Voucher"
                        >
                          <svg lucideEye class="h-3 w-3 text-cyan-400"></svg>
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          (click)="downloadPdf(payout)"
                          [disabled]="isDownloadingId() === payout.id"
                          class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition cursor-pointer disabled:opacity-50"
                          title="Download Remittance PDF"
                        >
                          @if (isDownloadingId() === payout.id) {
                            <svg lucideRefreshCw class="h-3 w-3 animate-spin"></svg>
                          } @else {
                            <svg lucideDownload class="h-3 w-3"></svg>
                          }
                          <span>PDF</span>
                        </button>

                        @if (isAdmin() && payout.status !== 'SETTLED') {
                          <button
                            type="button"
                            (click)="settlePayout(payout)"
                            class="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-600/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-600/30 transition cursor-pointer"
                            title="Admin Settlement"
                          >
                            <span>Clear</span>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- 📜 Interactive Remittance Voucher Modal Preview -->
      @if (selectedPayoutForVoucher(); as p) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
          <div class="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <!-- Modal Header -->
            <div class="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <svg lucideReceipt class="h-5 w-5"></svg>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Remittance Advice</span>
                    <span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30">
                      SETTLED
                    </span>
                  </h3>
                  <p class="font-mono text-xs text-zinc-400 mt-0.5">{{ p.remittanceNumber }}</p>
                </div>
              </div>

              <button
                type="button"
                (click)="selectedPayoutForVoucher.set(null)"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              >
                <svg lucideX class="h-5 w-5"></svg>
              </button>
            </div>

            <!-- Voucher Content -->
            <div class="space-y-4 text-xs">
              <div class="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5">
                <div>
                  <span class="text-[10px] uppercase font-bold text-zinc-500 block">Beneficiary</span>
                  <p class="font-bold text-zinc-100 text-sm mt-0.5">{{ p.storeName }}</p>
                  <p class="text-[11px] text-zinc-400 mt-0.5">{{ p.bankAccountHint || 'Direct ACH Wire Credit' }}</p>
                </div>
                <div class="text-right">
                  <span class="text-[10px] uppercase font-bold text-zinc-500 block">Settlement Date</span>
                  <p class="font-bold text-zinc-100 text-sm mt-0.5">{{ p.disbursedAt | date: 'mediumDate' }}</p>
                  <p class="text-[11px] text-zinc-400 mt-0.5">{{ p.disbursedAt | date: 'mediumTime' }}</p>
                </div>
              </div>

              <!-- Milestone Breakdown Box -->
              <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3.5 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-zinc-300 font-semibold">Milestone Phase:</span>
                  <span class="font-bold text-emerald-300">{{ p.milestoneTitle }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-zinc-400">Order Reference:</span>
                  <span class="font-mono text-zinc-200">#NX-{{ p.orderId.slice(0, 8).toUpperCase() }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-zinc-400">Banking Transaction Reference:</span>
                  <span class="font-mono text-zinc-300">{{ p.transactionReference }}</span>
                </div>
              </div>

              <!-- Financial Reconciliation Breakdown -->
              <div class="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-zinc-400">Gross Milestone Volume:</span>
                  <span class="font-mono font-bold text-white">{{ p.grossAmount | currency }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-zinc-400">Nexus Platform Fee ({{ p.platformFeePercent }}%):</span>
                  <span class="font-mono font-bold text-rose-400">-{{ p.platformFeeAmount | currency }}</span>
                </div>
                <div class="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm">
                  <span class="font-bold text-emerald-400">Net Credit to Bank Account:</span>
                  <span class="font-mono font-black text-base text-emerald-400">{{ p.netPayoutAmount | currency }}</span>
                </div>
              </div>
            </div>

            <!-- Modal Footer Actions -->
            <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <button
                type="button"
                (click)="selectedPayoutForVoucher.set(null)"
                class="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                (click)="downloadPdf(p)"
                class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <svg lucideDownload class="h-4 w-4"></svg>
                <span>Download Remittance PDF</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PayoutListComponent implements OnInit {
  private readonly payoutService = inject(PayoutService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly payouts = signal<SupplierPayout[]>([]);
  readonly summary = signal<SupplierPayoutSummary | null>(null);
  readonly isLoading = signal(true);
  readonly activeStatusTab = signal<'ALL' | 'SETTLED' | 'PROCESSING'>('ALL');
  readonly searchQuery = signal('');
  readonly selectedPayoutForVoucher = signal<SupplierPayout | null>(null);
  readonly isDownloadingId = signal<string | null>(null);
  readonly copiedText = signal<string | null>(null);

  readonly isAdmin = computed(() => {
    const role = this.auth.role();
    return role === UserRoles.ADMIN || role === UserRoles.SUBADMIN;
  });

  readonly filteredPayouts = computed(() => {
    const list = this.payouts();
    const tab = this.activeStatusTab();
    const q = this.searchQuery().trim().toLowerCase();

    return list.filter((p) => {
      if (tab === 'SETTLED' && p.status !== 'SETTLED') return false;
      if (tab === 'PROCESSING' && p.status === 'SETTLED') return false;
      if (q) {
        const matchesRem = p.remittanceNumber.toLowerCase().includes(q);
        const matchesTx = p.transactionReference.toLowerCase().includes(q);
        const matchesOrd = p.orderId.toLowerCase().includes(q);
        const matchesStore = p.storeName.toLowerCase().includes(q);
        if (!matchesRem && !matchesTx && !matchesOrd && !matchesStore) return false;
      }
      return true;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    this.payoutService.getPayoutSummary().subscribe({
      next: (sum) => this.summary.set(sum),
      error: () => {},
    });

    this.payoutService.getPayouts().subscribe({
      next: (res) => {
        this.payouts.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error('Failed to load financial payout records.');
      },
    });
  }

  setStatusTab(tab: 'ALL' | 'SETTLED' | 'PROCESSING') {
    this.activeStatusTab.set(tab);
  }

  onSearchChange() {
    // Computed property triggers dynamically
  }

  openVoucherPreview(p: SupplierPayout) {
    this.selectedPayoutForVoucher.set(p);
  }

  downloadPdf(p: SupplierPayout) {
    this.isDownloadingId.set(p.id);
    this.payoutService.downloadRemittancePdf(p.id).subscribe({
      next: (blob) => {
        this.isDownloadingId.set(null);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${p.remittanceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success(`Downloaded Remittance Advice ${p.remittanceNumber}`);
      },
      error: () => {
        this.isDownloadingId.set(null);
        this.toast.error('Failed to generate Remittance PDF.');
      },
    });
  }

  settlePayout(p: SupplierPayout) {
    this.payoutService.settlePayout(p.id).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Payout cleared successfully.');
        this.loadData();
      },
      error: (err) => {
        this.toast.error('Failed to settle payout.');
      },
    });
  }

  copyText(val: string) {
    navigator.clipboard.writeText(val);
    this.copiedText.set(val);
    setTimeout(() => this.copiedText.set(null), 2000);
  }

  exportCsv() {
    const list = this.filteredPayouts();
    if (!list.length) {
      this.toast.info('No transactions to export.');
      return;
    }

    const headers = ['RemittanceNumber', 'OrderId', 'StoreName', 'Milestone', 'GrossAmount', 'PlatformFee', 'NetPayout', 'Currency', 'Status', 'Date', 'TransactionRef'];
    const rows = list.map((p) => [
      p.remittanceNumber,
      p.orderId,
      `"${p.storeName}"`,
      `"${p.milestoneTitle}"`,
      p.grossAmount,
      p.platformFeeAmount,
      p.netPayoutAmount,
      p.currency,
      p.status,
      p.disbursedAt,
      p.transactionReference,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nexus_Treasury_Payout_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toast.success('Exported Treasury Payout Ledger CSV.');
  }
}
