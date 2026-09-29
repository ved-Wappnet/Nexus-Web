import { CurrencyPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EscrowDashboardData } from '@core/models';
import {
  LucideArrowUpRight,
  LucideCalendar,
  LucideClock,
  LucideLock,
  LucidePackageCheck,
  LucideShieldCheck,
  LucideUnlock,
} from '@lucide/angular';

@Component({
  selector: 'app-escrow-pipeline-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    PercentPipe,
    RouterLink,
    LucideShieldCheck,
    LucideLock,
    LucideUnlock,
    LucidePackageCheck,
    LucideClock,
    LucideCalendar,
    LucideArrowUpRight,
  ],
  template: `
    @if (data(); as escrow) {
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-md">
        <!-- Header -->
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-inner">
              <svg lucideShieldCheck class="h-6 w-6"></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-zinc-100 sm:text-lg">
                  {{ title() }}
                </h3>
                <span class="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                  Stripe-Backed Escrow
                </span>
              </div>
              <p class="mt-0.5 text-xs text-zinc-400 sm:text-sm">
                {{ subtitle() }}
              </p>
            </div>
          </div>

          <a
            routerLink="/orders"
            class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700/80 hover:text-white"
          >
            <span>View Active Escrow Orders</span>
            <svg lucideArrowUpRight class="h-3.5 w-3.5"></svg>
          </a>
        </div>

        <!-- Metric KPI Cards -->
        <div class="my-5 grid gap-4 sm:grid-cols-3">
          <!-- Total Locked in Escrow -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total in Escrow Custody</span>
              <div class="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-400">
                <svg lucideLock class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-white">
                {{ escrow.summary.totalLocked | currency }}
              </span>
            </div>
            <p class="mt-1 text-xs text-indigo-300/80">
              Across {{ escrow.summary.activeOrdersCount }} wholesale contracts
            </p>
          </div>

          <!-- Total Settled to Date -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Settled & Released</span>
              <div class="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
                <svg lucideUnlock class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-emerald-400">
                {{ escrow.summary.totalReleased | currency }}
              </span>
            </div>
            <p class="mt-1 text-xs text-emerald-500/80">
              Completed milestone payouts
            </p>
          </div>

          <!-- Overall Pipeline Ratio -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Escrow Settlement Rate</span>
              <div class="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
                <svg lucidePackageCheck class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-zinc-100">
                {{ settlementRate() | percent:'1.0-1' }}
              </span>
            </div>
            <p class="mt-1 text-xs text-zinc-400">
              {{ escrow.summary.totalReleased | currency }} of {{ (escrow.summary.totalLocked + escrow.summary.totalReleased) | currency }}
            </p>
          </div>
        </div>

        <!-- Stage Distribution Breakdown -->
        <div class="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div class="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>Staged Capital Distribution (30% / 40% / 30%)</span>
            <span class="text-zinc-500">Live Stage Allocation</span>
          </div>

          <!-- Multi-Segment Distribution Bar -->
          <div class="flex h-3.5 w-full overflow-hidden rounded-full bg-zinc-800 p-0.5">
            <div
              class="rounded-l-full bg-indigo-500 transition-all duration-500"
              [style.width.%]="m1Share()"
              title="Milestone 1: Upfront 30%"
            ></div>
            <div
              class="bg-amber-500 transition-all duration-500"
              [style.width.%]="m2Share()"
              title="Milestone 2: In-Transit 40%"
            ></div>
            <div
              class="rounded-r-full bg-emerald-500 transition-all duration-500"
              [style.width.%]="m3Share()"
              title="Milestone 3: Delivery 30%"
            ></div>
          </div>

          <!-- Stage Legends -->
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <!-- Stage 1 -->
            <div class="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <div class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></div>
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-1 text-xs font-medium text-zinc-200">
                  <span>M1: Upfront (30%)</span>
                  <span class="font-bold text-indigo-400">{{ escrow.summary.milestone1Locked | currency }}</span>
                </div>
                <p class="text-[11px] text-zinc-500 truncate">Committed for factory tooling</p>
              </div>
            </div>

            <!-- Stage 2 -->
            <div class="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <div class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div>
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-1 text-xs font-medium text-zinc-200">
                  <span>M2: In-Transit (40%)</span>
                  <span class="font-bold text-amber-400">{{ escrow.summary.milestone2Locked | currency }}</span>
                </div>
                <p class="text-[11px] text-zinc-500 truncate">Awaiting customs scan</p>
              </div>
            </div>

            <!-- Stage 3 -->
            <div class="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <div class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-1 text-xs font-medium text-zinc-200">
                  <span>M3: Delivery (30%)</span>
                  <span class="font-bold text-emerald-400">{{ escrow.summary.milestone3Locked | currency }}</span>
                </div>
                <p class="text-[11px] text-zinc-500 truncate">Awaiting goods signoff</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 30-Day Forward Liquidity Forecast -->
        <div>
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg lucideCalendar class="h-4 w-4 text-indigo-400"></svg>
              <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                30-Day Liquidity Release Horizon
              </h4>
            </div>
            <span class="text-xs text-zinc-500">Projected by courier ETA</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            @for (horizon of escrow.forecast; track horizon.label) {
              <div class="group rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 transition-colors hover:border-zinc-700">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-zinc-200">{{ horizon.label }}</span>
                  <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {{ horizon.orderCount }} {{ horizon.orderCount === 1 ? 'order' : 'orders' }}
                  </span>
                </div>
                <div class="mt-2 flex items-baseline justify-between">
                  <span class="text-lg font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                    {{ horizon.amount | currency }}
                  </span>
                </div>
                <div class="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <svg lucideClock class="h-3 w-3 text-zinc-500"></svg>
                  <span>{{ horizon.period }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class EscrowPipelineCard {
  readonly data = input<EscrowDashboardData | undefined>();
  readonly title = input<string>('Milestone Escrow & Cashflow Pipeline');
  readonly subtitle = input<string>(
    'Real-time capital tracking across Upfront (30%), In-Transit (40%), and Delivery (30%) stages.',
  );

  readonly totalVolume = computed(() => {
    const s = this.data()?.summary;
    if (!s) return 0;
    return s.totalLocked + s.totalReleased;
  });

  readonly settlementRate = computed(() => {
    const total = this.totalVolume();
    if (total <= 0) return 0;
    return (this.data()?.summary.totalReleased || 0) / total;
  });

  readonly m1Share = computed(() => {
    const locked = this.data()?.summary.totalLocked || 0;
    if (locked <= 0) return 33.3;
    return Math.max(5, ((this.data()?.summary.milestone1Locked || 0) / locked) * 100);
  });

  readonly m2Share = computed(() => {
    const locked = this.data()?.summary.totalLocked || 0;
    if (locked <= 0) return 33.3;
    return Math.max(5, ((this.data()?.summary.milestone2Locked || 0) / locked) * 100);
  });

  readonly m3Share = computed(() => {
    const locked = this.data()?.summary.totalLocked || 0;
    if (locked <= 0) return 33.4;
    return Math.max(5, ((this.data()?.summary.milestone3Locked || 0) / locked) * 100);
  });
}
