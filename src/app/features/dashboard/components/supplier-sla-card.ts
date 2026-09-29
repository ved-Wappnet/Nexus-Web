import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SupplierSlaScorecard } from '@core/models';
import {
  LucideAward,
  LucideCheckCircle2,
  LucideClock,
  LucideShieldCheck,
  LucideSparkles,
  LucideTruck,
  LucideZap,
} from '@lucide/angular';

@Component({
  selector: 'app-supplier-sla-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    LucideAward,
    LucideCheckCircle2,
    LucideShieldCheck,
    LucideTruck,
    LucideZap,
    LucideClock,
    LucideSparkles,
  ],
  template: `
    @if (scorecard(); as sla) {
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-md">
        <!-- Header -->
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl border"
              [class]="tierBadgeStyle().iconBox"
            >
              <svg lucideAward class="h-6 w-6"></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-zinc-100 sm:text-lg">
                  {{ title() }}
                </h3>
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  [class]="tierBadgeStyle().badge"
                >
                  <svg lucideSparkles class="h-3 w-3"></svg>
                  <span>{{ sla.tierLabel }}</span>
                </span>
              </div>
              <p class="mt-0.5 text-xs text-zinc-400 sm:text-sm">
                {{ subtitle() }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3.5 py-2">
            <div class="text-right">
              <span class="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Composite SLA</span>
              <div class="text-xl font-extrabold text-white">
                {{ sla.compositeScore }}%
              </div>
            </div>
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg border font-bold text-xs"
              [class]="tierBadgeStyle().scoreBadge"
            >
              {{ tierLetter() }}
            </div>
          </div>
        </div>

        <!-- 4-Metric Operational Grid -->
        <div class="my-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Metric 1: On-Time Customs Dispatch -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">On-Time Dispatch</span>
              <div class="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-400">
                <svg lucideTruck class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-white">
                {{ sla.onTimeDispatchRate }}%
              </span>
              <span class="text-xs font-medium text-emerald-400">
                M2 Target: 95%+
              </span>
            </div>
            <p class="mt-1 text-xs text-zinc-400">
              Scanned on/before estimated delivery
            </p>
          </div>

          <!-- Metric 2: First-Pass Inspection Acceptance -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Inspection Pass Rate</span>
              <div class="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
                <svg lucideShieldCheck class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-emerald-400">
                {{ sla.firstPassInspectionRate }}%
              </span>
            </div>
            <p class="mt-1 text-xs text-zinc-400">
              M3 delivered with zero buyer disputes
            </p>
          </div>

          <!-- Metric 3: Factory Dispatch Velocity -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Avg Factory Lead</span>
              <div class="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
                <svg lucideZap class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-white">
                {{ sla.avgDispatchLeadDays | number:'1.1-1' }} <span class="text-sm font-normal text-zinc-400">days</span>
              </span>
            </div>
            <p class="mt-1 text-xs text-zinc-400">
              From M1 upfront funding to courier scan
            </p>
          </div>

          <!-- Metric 4: Transit Corridor Duration -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Transit Velocity</span>
              <div class="rounded-lg bg-sky-500/10 p-1.5 text-sky-400">
                <svg lucideClock class="h-4 w-4"></svg>
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-white">
                {{ sla.avgTransitDeliveryDays | number:'1.1-1' }} <span class="text-sm font-normal text-zinc-400">days</span>
              </span>
            </div>
            <p class="mt-1 text-xs text-zinc-400">
              From customs scan to final delivery
            </p>
          </div>
        </div>

        <!-- Compliance Progress Footer -->
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
          <div class="flex items-center gap-2">
            <svg lucideCheckCircle2 class="h-4 w-4 text-emerald-400"></svg>
            <span>
              <strong class="font-semibold text-zinc-200">{{ sla.compliantShipmentsCount }} of {{ sla.totalShipmentsEvaluated }}</strong> shipments met 100% strict wholesale SLA standards.
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span>Evaluated automatically via escrow milestone timestamps & inspection logs</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class SupplierSlaCard {
  readonly scorecard = input<SupplierSlaScorecard | undefined>();
  readonly title = input<string>('Supplier SLA & Fulfillment Performance Scorecard');
  readonly subtitle = input<string>(
    'Real-time compliance tracking based on customs dispatch timeliness and inspection acceptance.',
  );

  readonly tierLetter = computed(() => {
    const tier = this.scorecard()?.slaTier;
    if (tier === 'TIER_A_PLUS') return 'A+';
    if (tier === 'TIER_A') return 'A';
    if (tier === 'TIER_B') return 'B';
    return 'C';
  });

  readonly tierBadgeStyle = computed(() => {
    const tier = this.scorecard()?.slaTier;
    if (tier === 'TIER_A_PLUS') {
      return {
        iconBox: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
        scoreBadge: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300',
      };
    }
    if (tier === 'TIER_A') {
      return {
        iconBox: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
        badge: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300',
        scoreBadge: 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300',
      };
    }
    if (tier === 'TIER_B') {
      return {
        iconBox: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        badge: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
        scoreBadge: 'border-amber-500/40 bg-amber-500/20 text-amber-300',
      };
    }
    return {
      iconBox: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      badge: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
      scoreBadge: 'border-rose-500/40 bg-rose-500/20 text-rose-300',
    };
  });
}
