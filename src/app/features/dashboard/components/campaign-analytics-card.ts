import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import {
  LucideDollarSign,
  LucideEye,
  LucideHeart,
  LucideMousePointerClick,
  LucidePlay,
  LucideRotateCcw,
  LucideSend,
  LucideShoppingCart,
  LucideSparkles,
  LucideTrendingUp,
  LucideZap,
} from '@lucide/angular';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { environment } from '../../../../environments/environment';

export interface CampaignAnalyticsItem {
  id: string;
  campaign_type: string;
  total_sent: number;
  total_opens: number;
  total_clicks: number;
  revenue_generated: string | number;
  updated_at: string;
}

@Component({
  selector: 'app-campaign-analytics-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    DecimalPipe,
    LucideSparkles,
    LucideSend,
    LucideEye,
    LucideMousePointerClick,
    LucideDollarSign,
    LucideRotateCcw,
    LucideTrendingUp,
    LucidePlay,
    LucideShoppingCart,
    LucideHeart,
    LucideZap,
  ],
  template: `
    <section class="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <!-- Glow ambient decorative accents -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl"></div>

      <!-- Header Section -->
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <svg lucideSparkles class="h-5 w-5"></svg>
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-bold tracking-tight text-zinc-100">AI Campaign Analytics & Intelligence</h2>
                <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Autopilot Active
                </span>
              </div>
              <p class="text-xs text-zinc-400 mt-0.5">
                Real-time tracking of AI-driven Wishlist & Cart Abandonment recovery campaigns, pixel open telemetry & conversion attribution.
              </p>
            </div>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Refresh button -->
          <button
            type="button"
            (click)="triggerRefresh()"
            [disabled]="isRefreshing()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700/80 transition cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <svg lucideRotateCcw class="h-3.5 w-3.5" [class.animate-spin]="isRefreshing()"></svg>
            <span>Refresh</span>
          </button>

          <!-- Trigger Wishlist AI Campaign -->
          <button
            type="button"
            (click)="triggerCampaign('wishlist')"
            [disabled]="triggeringWishlist()"
            class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
          >
            @if (triggeringWishlist()) {
              <span class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Deploying AI...</span>
            } @else {
              <svg lucideHeart class="h-3.5 w-3.5"></svg>
              <span>Run Wishlist AI</span>
            }
          </button>

          <!-- Trigger Abandonment AI Campaign -->
          <button
            type="button"
            (click)="triggerCampaign('abandonment')"
            [disabled]="triggeringAbandonment()"
            class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
          >
            @if (triggeringAbandonment()) {
              <span class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Scanning Carts...</span>
            } @else {
              <svg lucideShoppingCart class="h-3.5 w-3.5"></svg>
              <span>Run Cart Recovery</span>
            }
          </button>
        </div>
      </div>

      <!-- Top KPI Metric Cards -->
      <div class="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <!-- 1. Total Dispatched -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-700/80">
          <div class="flex items-center justify-between text-zinc-400">
            <span class="text-xs font-medium uppercase tracking-wider">Emails Dispatched</span>
            <span class="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
              <svg lucideSend class="h-4 w-4"></svg>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl font-black text-white tracking-tight">{{ totalSent() }}</span>
            <span class="text-xs text-zinc-400 font-medium">recipients</span>
          </div>
          <div class="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span class="text-indigo-400 font-semibold">100% Delivery Target</span>
            <span>via SMTP Relay</span>
          </div>
        </div>

        <!-- 2. Unique Opens & Open Rate -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-700/80">
          <div class="flex items-center justify-between text-zinc-400">
            <span class="text-xs font-medium uppercase tracking-wider">Open Rate (Pixel)</span>
            <span class="rounded-lg bg-sky-500/10 p-2 text-sky-400 border border-sky-500/20">
              <svg lucideEye class="h-4 w-4"></svg>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl font-black text-white tracking-tight">{{ avgOpenRate() | number:'1.1-1' }}%</span>
            <span class="text-xs text-sky-400 font-medium">({{ totalOpens() }} opens)</span>
          </div>
          <div class="mt-2 flex items-center gap-1.5 text-[11px]">
            <span class="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-400 font-bold border border-sky-500/20">
              {{ avgOpenRate() >= 25 ? 'High Engagement' : 'Standard' }}
            </span>
            <span class="text-zinc-500">Benchmark: 21%</span>
          </div>
        </div>

        <!-- 3. Clicks & CTR -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-700/80">
          <div class="flex items-center justify-between text-zinc-400">
            <span class="text-xs font-medium uppercase tracking-wider">Click-Through (CTR)</span>
            <span class="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
              <svg lucideMousePointerClick class="h-4 w-4"></svg>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl font-black text-white tracking-tight">{{ avgCtr() | number:'1.1-1' }}%</span>
            <span class="text-xs text-amber-400 font-medium">({{ totalClicks() }} clicks)</span>
          </div>
          <div class="mt-2 flex items-center gap-1.5 text-[11px]">
            <span class="text-amber-400 font-semibold">CTOR: {{ avgCtor() | number:'1.1-1' }}%</span>
            <span class="text-zinc-500">Click-to-Open</span>
          </div>
        </div>

        <!-- 4. Generated Revenue -->
        <div class="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 transition hover:border-emerald-500/50 relative overflow-hidden">
          <div class="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl"></div>
          <div class="flex items-center justify-between text-zinc-400">
            <span class="text-xs font-medium uppercase tracking-wider text-emerald-300">Recovered Revenue</span>
            <span class="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 border border-emerald-500/30">
              <svg lucideDollarSign class="h-4 w-4"></svg>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl font-black text-emerald-300 tracking-tight">{{ totalRevenue() | currency }}</span>
          </div>
          <div class="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-medium">
            <svg lucideTrendingUp class="h-3.5 w-3.5"></svg>
            <span>Direct AI Attribution</span>
          </div>
        </div>
      </div>

      <!-- Funnel Progress Visualization -->
      <div class="relative z-10 mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-300">Campaign Conversion Funnel</h3>
          <span class="text-xs text-zinc-500">Audience Flow: Sent &rarr; Opened &rarr; Clicked &rarr; Converted</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <!-- Step 1: Sent -->
          <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-zinc-400 font-medium">1. Dispatched</span>
              <span class="font-bold text-zinc-200">100%</span>
            </div>
            <div class="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full" style="width: 100%"></div>
            </div>
            <p class="mt-2 text-xs font-semibold text-zinc-300">{{ totalSent() }} Recipients</p>
          </div>

          <!-- Step 2: Opened -->
          <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-zinc-400 font-medium">2. Read (Pixel Open)</span>
              <span class="font-bold text-sky-400">{{ avgOpenRate() | number:'1.0-1' }}%</span>
            </div>
            <div class="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-sky-500 rounded-full transition-all duration-500" [style.width.%]="avgOpenRate() > 100 ? 100 : avgOpenRate()"></div>
            </div>
            <p class="mt-2 text-xs font-semibold text-sky-300">{{ totalOpens() }} Opened</p>
          </div>

          <!-- Step 3: Clicked -->
          <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-zinc-400 font-medium">3. Clicked Link</span>
              <span class="font-bold text-amber-400">{{ avgCtr() | number:'1.0-1' }}%</span>
            </div>
            <div class="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-amber-500 rounded-full transition-all duration-500" [style.width.%]="avgCtr() > 100 ? 100 : avgCtr()"></div>
            </div>
            <p class="mt-2 text-xs font-semibold text-amber-300">{{ totalClicks() }} Clicks</p>
          </div>

          <!-- Step 4: Converted -->
          <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-emerald-300 font-medium">4. Converted Orders</span>
              <span class="font-bold text-emerald-400">{{ totalRevenue() > 0 ? 'Active' : 'Awaiting' }}</span>
            </div>
            <div class="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" [style.width.%]="totalRevenue() > 0 ? 100 : 0"></div>
            </div>
            <p class="mt-2 text-xs font-semibold text-emerald-300">{{ totalRevenue() | currency }} Generated</p>
          </div>
        </div>
      </div>

      <!-- Campaign Comparison Table -->
      <div class="relative z-10 mt-6">
        <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-3">Live Campaign Breakdown</h3>
        <div class="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-semibold uppercase">
              <tr>
                <th class="py-3.5 px-4">Campaign Strategy</th>
                <th class="py-3.5 px-4">Schedule / Trigger</th>
                <th class="py-3.5 px-4 text-center">Sent</th>
                <th class="py-3.5 px-4 text-center">Opens</th>
                <th class="py-3.5 px-4 text-center">Clicks (CTR)</th>
                <th class="py-3.5 px-4 text-right">Revenue</th>
                <th class="py-3.5 px-4 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
              @for (item of items(); track item.campaign_type) {
                <tr class="hover:bg-zinc-900/40 transition">
                  <!-- Strategy Name -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2.5">
                      <span
                        class="flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold"
                        [class]="item.campaign_type === 'WISHLIST' 
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' 
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'"
                      >
                        @if (item.campaign_type === 'WISHLIST') {
                          <svg lucideHeart class="h-3.5 w-3.5"></svg>
                        } @else {
                          <svg lucideShoppingCart class="h-3.5 w-3.5"></svg>
                        }
                      </span>
                      <div>
                        <p class="font-bold text-zinc-100">
                          {{ item.campaign_type === 'WISHLIST' ? 'Personalized Wishlist Promo' : 'Abandoned Cart Recovery' }}
                        </p>
                        <p class="text-[11px] text-zinc-500">
                          {{ item.campaign_type === 'WISHLIST' ? 'Dynamic 10% promo code generation' : 'FOMO urgent low-stock trigger' }}
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- Schedule -->
                  <td class="py-3.5 px-4">
                    <span class="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                      {{ item.campaign_type === 'WISHLIST' ? 'Every Friday @ 9:00 AM' : 'Autonomous Hourly Cron' }}
                    </span>
                  </td>

                  <!-- Sent -->
                  <td class="py-3.5 px-4 text-center font-bold text-zinc-100">
                    {{ item.total_sent }}
                  </td>

                  <!-- Opens -->
                  <td class="py-3.5 px-4 text-center">
                    <span class="font-bold text-sky-400">{{ item.total_opens }}</span>
                    <span class="text-[10px] text-zinc-500 block">
                      {{ item.total_sent > 0 ? ((item.total_opens / item.total_sent) * 100 | number:'1.0-0') : 0 }}% open rate
                    </span>
                  </td>

                  <!-- Clicks -->
                  <td class="py-3.5 px-4 text-center">
                    <span class="font-bold text-amber-400">{{ item.total_clicks }}</span>
                    <span class="text-[10px] text-zinc-500 block">
                      {{ item.total_sent > 0 ? ((item.total_clicks / item.total_sent) * 100 | number:'1.0-0') : 0 }}% CTR
                    </span>
                  </td>

                  <!-- Revenue -->
                  <td class="py-3.5 px-4 text-right font-bold text-emerald-400">
                    {{ item.revenue_generated | currency }}
                  </td>

                  <!-- Quick Action Button -->
                  <td class="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      (click)="triggerCampaign(item.campaign_type === 'WISHLIST' ? 'wishlist' : 'abandonment')"
                      class="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                    >
                      <svg lucidePlay class="h-3 w-3 text-indigo-400"></svg>
                      <span>Trigger</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Interactive Telemetry Sandbox / Testing Suite -->
      <div class="relative z-10 mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
              <svg lucideZap class="h-3.5 w-3.5 text-amber-400"></svg>
            </span>
            <div>
              <p class="text-xs font-semibold text-zinc-200">Live Engagement Simulation Sandbox</p>
              <p class="text-[11px] text-zinc-500">Simulate customer open/click/order webhooks to inspect real-time dashboard analytics.</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="simulate('CART_ABANDONMENT', 'open')"
              [disabled]="simulating() !== null"
              class="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 transition cursor-pointer disabled:opacity-50"
            >
              + Simulate Open
            </button>
            <button
              type="button"
              (click)="simulate('CART_ABANDONMENT', 'click')"
              [disabled]="simulating() !== null"
              class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              + Simulate Click
            </button>
            <button
              type="button"
              (click)="simulate('CART_ABANDONMENT', 'conversion', 189.50)"
              [disabled]="simulating() !== null"
              class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50"
            >
              + Simulate Conversion ($189.50)
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CampaignAnalyticsCard {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly analyticsData = input<CampaignAnalyticsItem[]>([]);
  readonly refreshRequested = output<void>();

  readonly triggeringWishlist = signal(false);
  readonly triggeringAbandonment = signal(false);
  readonly isRefreshing = signal(false);
  readonly simulating = signal<string | null>(null);

  readonly items = computed<CampaignAnalyticsItem[]>(() => {
    const raw = this.analyticsData() || [];
    const types = ['WISHLIST', 'CART_ABANDONMENT'];
    const map = new Map<string, CampaignAnalyticsItem>();
    
    for (const t of types) {
      map.set(t, {
        id: t,
        campaign_type: t,
        total_sent: 0,
        total_opens: 0,
        total_clicks: 0,
        revenue_generated: 0,
        updated_at: new Date().toISOString(),
      });
    }

    for (const r of raw) {
      if (r && r.campaign_type) {
        map.set(r.campaign_type, {
          id: r.id || r.campaign_type,
          campaign_type: r.campaign_type,
          total_sent: Number(r.total_sent) || 0,
          total_opens: Number(r.total_opens) || 0,
          total_clicks: Number(r.total_clicks) || 0,
          revenue_generated: Number(r.revenue_generated) || 0,
          updated_at: r.updated_at || new Date().toISOString(),
        });
      }
    }

    return Array.from(map.values());
  });

  readonly totalSent = computed(() => {
    return this.items().reduce((acc, it) => acc + it.total_sent, 0);
  });

  readonly totalOpens = computed(() => {
    return this.items().reduce((acc, it) => acc + it.total_opens, 0);
  });

  readonly totalClicks = computed(() => {
    return this.items().reduce((acc, it) => acc + it.total_clicks, 0);
  });

  readonly totalRevenue = computed(() => {
    return this.items().reduce((acc, it) => acc + Number(it.revenue_generated || 0), 0);
  });

  readonly avgOpenRate = computed(() => {
    const sent = this.totalSent();
    return sent > 0 ? (this.totalOpens() / sent) * 100 : 0;
  });

  readonly avgCtr = computed(() => {
    const sent = this.totalSent();
    return sent > 0 ? (this.totalClicks() / sent) * 100 : 0;
  });

  readonly avgCtor = computed(() => {
    const opens = this.totalOpens();
    return opens > 0 ? (this.totalClicks() / opens) * 100 : 0;
  });

  triggerRefresh() {
    this.isRefreshing.set(true);
    this.refreshRequested.emit();
    setTimeout(() => this.isRefreshing.set(false), 600);
  }

  async triggerCampaign(type: 'wishlist' | 'abandonment') {
    const isWishlist = type === 'wishlist';
    if (isWishlist) {
      this.triggeringWishlist.set(true);
    } else {
      this.triggeringAbandonment.set(true);
    }

    const endpoint = isWishlist ? 'campaigns/trigger-wishlist' : 'campaigns/trigger-abandonment';

    try {
      const token = this.auth.accessToken();
      const authHeader = token ? `Bearer ${token}` : undefined;
      const res = await fetch(`${environment.apiUrl}/marketing/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });

      if (res.ok) {
        this.toast.success(
          isWishlist
            ? 'AI Wishlist campaign successfully initiated!'
            : 'AI Cart Abandonment campaign successfully initiated!'
        );
        this.triggerRefresh();
      } else {
        this.toast.error('Failed to trigger campaign.');
      }
    } catch {
      this.toast.error('Error connecting to AI campaign service.');
    } finally {
      if (isWishlist) {
        this.triggeringWishlist.set(false);
      } else {
        this.triggeringAbandonment.set(false);
      }
    }
  }

  async simulate(type: string, action: 'open' | 'click' | 'conversion', amount?: number) {
    this.simulating.set(`${type}-${action}`);
    try {
      const token = this.auth.accessToken();
      const authHeader = token ? `Bearer ${token}` : undefined;
      const queryParams = new URLSearchParams({
        type,
        action,
        ...(amount ? { amount: String(amount) } : {}),
      });

      const res = await fetch(`${environment.apiUrl}/marketing/analytics/simulate-interaction?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });

      if (res.ok) {
        this.toast.success(`Successfully simulated ${action.toUpperCase()} on ${type}!`);
        this.triggerRefresh();
      } else {
        this.toast.error('Simulation failed.'); 
      }
    } catch {
      this.toast.error('Failed to reach simulation endpoint.');
    } finally {
      this.simulating.set(null);
    }
  }
}
