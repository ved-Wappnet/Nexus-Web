import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import {
  CategoryShareItem,
  ChartTrendPoint,
  DashboardTimeSeries,
  FulfillmentPipeline,
  RfqFunnelData,
} from '@core/models';

// Register required Chart.js controllers and elements once
Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
  Title,
);

// --- 1. REVENUE / SPEND TREND AREA CHART ---
@Component({
  selector: 'app-revenue-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: `
    <div
      class="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 shadow-xl backdrop-blur-md"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/60"
      >
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold tracking-wide text-zinc-100">{{ title() }}</h3>
            <span
              class="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30"
            >
              Live Trends
            </span>
          </div>
          <p class="mt-1 text-2xl font-extrabold tracking-tight text-white">
            {{ activeTotal() | currency }}
          </p>
        </div>

        <!-- Timeframe selector tabs -->
        <div
          class="inline-flex items-center rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs font-medium"
        >
          @for (tf of timeframes; track tf) {
            <button
              type="button"
              (click)="setTimeframe(tf)"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none"
              [class]="
                selectedTimeframe() === tf
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              "
            >
              {{ tf }}
            </button>
          }
        </div>
      </div>

      <!-- Canvas Chart Container -->
      <div class="relative mt-4 h-64 w-full">
        <canvas #chartCanvas class="w-full h-full"></canvas>
      </div>

      <!-- Footer Insight -->
      <div
        class="mt-3 flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/40"
      >
        <span
          >Volume: <strong class="text-zinc-200">{{ activeOrderCount() }} orders</strong> in this
          period</span
        >
        <span class="text-indigo-400 font-medium"
          >Avg Order: {{ averageOrderValue() | currency }}</span
        >
      </div>
    </div>
  `,
})
export class RevenueTrendChart {
  readonly title = input<string>('Revenue & Volume Trend');
  readonly trend = input<DashboardTimeSeries | undefined>();

  readonly timeframes: Array<'7D' | '30D' | '12M'> = ['7D', '30D', '12M'];
  readonly selectedTimeframe = signal<'7D' | '30D' | '12M'>('30D');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private chartInstance: Chart<'line'> | null = null;

  readonly activePoints = computed<ChartTrendPoint[]>(() => {
    const t = this.trend();
    if (!t) return [];
    return t[this.selectedTimeframe()] || [];
  });

  readonly activeTotal = computed(() => {
    return this.activePoints().reduce((sum, p) => sum + p.amount, 0);
  });

  readonly activeOrderCount = computed(() => {
    return this.activePoints().reduce((sum, p) => sum + p.count, 0);
  });

  readonly averageOrderValue = computed(() => {
    const total = this.activeTotal();
    const count = this.activeOrderCount();
    return count > 0 ? total / count : 0;
  });

  constructor() {
    afterNextRender(() => {
      this.initChart();
    });

    effect(() => {
      const t = this.trend();
      if (this.chartInstance && t) {
        this.updateChart();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.chartInstance?.destroy();
    });
  }

  setTimeframe(tf: '7D' | '30D' | '12M') {
    this.selectedTimeframe.set(tf);
    this.updateChart();
  }

  private initChart() {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create glowing neon gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.08)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

    const points = this.activePoints();
    const labels = points.map((p) => p.label);
    const amounts = points.map((p) => p.amount);

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Amount ($)',
            data: amounts,
            borderColor: '#6366f1',
            borderWidth: 2.5,
            pointBackgroundColor: '#818cf8',
            pointBorderColor: '#1e1b4b',
            pointBorderWidth: 2,
            pointRadius: points.length > 20 ? 0 : 3.5,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#6366f1',
            pointHoverBorderWidth: 3,
            fill: true,
            backgroundColor: gradient,
            tension: 0.38,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#09090b',
            titleColor: '#e4e4e7',
            bodyColor: '#a1a1aa',
            borderColor: '#27272a',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: (context) =>
                `Total: $${Number(context.parsed.y).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#71717a',
              font: { size: 11 },
              maxTicksLimit: 10,
            },
            border: { display: false },
          },
          y: {
            grid: {
              color: 'rgba(63, 63, 70, 0.2)',
            },
            ticks: {
              color: '#71717a',
              font: { size: 11 },
              callback: (value) => `$${Number(value).toLocaleString()}`,
              maxTicksLimit: 5,
            },
            border: { display: false },
          },
        },
      },
    });
  }

  private updateChart() {
    if (!this.chartInstance) {
      this.initChart();
      return;
    }

    const points = this.activePoints();
    this.chartInstance.data.labels = points.map((p) => p.label);
    this.chartInstance.data.datasets[0].data = points.map((p) => p.amount);
    this.chartInstance.data.datasets[0].pointRadius = points.length > 20 ? 0 : 3.5;
    this.chartInstance.update();
  }
}

// --- 2. FULFILLMENT PIPELINE DOUGHNUT CHART ---
@Component({
  selector: 'app-fulfillment-donut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-full"
    >
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-zinc-800/60">
          <h3 class="text-sm font-semibold tracking-wide text-zinc-100">{{ title() }}</h3>
          <span class="text-xs font-mono text-zinc-400">Total: {{ totalOrders() }}</span>
        </div>

        <!-- Doughnut Canvas with Centered Overlay -->
        <div class="relative mt-4 h-48 w-full flex items-center justify-center">
          <canvas #donutCanvas class="max-h-full"></canvas>
          <div
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span class="text-2xl font-black tracking-tight text-white"
              >{{ activePercentage() }}%</span
            >
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400"
              >Fulfilled</span
            >
          </div>
        </div>
      </div>

      <!-- Legend pills -->
      <div class="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800/40 text-xs">
        <div class="flex items-center gap-1.5 text-zinc-300">
          <span class="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"></span>
          <span class="truncate"
            >Pending: <strong class="text-white">{{ pipeData().pending }}</strong></span
          >
        </div>
        <div class="flex items-center gap-1.5 text-zinc-300">
          <span class="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"></span>
          <span class="truncate"
            >Processing: <strong class="text-white">{{ pipeData().processing }}</strong></span
          >
        </div>
        <div class="flex items-center gap-1.5 text-zinc-300">
          <span class="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0"></span>
          <span class="truncate"
            >Shipped: <strong class="text-white">{{ pipeData().shipped }}</strong></span
          >
        </div>
        <div class="flex items-center gap-1.5 text-zinc-300">
          <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span class="truncate"
            >Delivered: <strong class="text-white">{{ pipeData().delivered }}</strong></span
          >
        </div>
      </div>
    </div>
  `,
})
export class FulfillmentDonutChart {
  readonly title = input<string>('Fulfillment Pipeline');
  readonly pipeline = input<FulfillmentPipeline | undefined>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('donutCanvas');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private chartInstance: Chart<'doughnut'> | null = null;

  readonly pipeData = computed<FulfillmentPipeline>(() => {
    return this.pipeline() || { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  });

  readonly totalOrders = computed(() => {
    const p = this.pipeData();
    return p.pending + p.processing + p.shipped + p.delivered + p.cancelled;
  });

  readonly activePercentage = computed(() => {
    const total = this.totalOrders();
    if (total === 0) return 0;
    return Math.round((this.pipeData().delivered / total) * 100);
  });

  constructor() {
    afterNextRender(() => {
      this.initChart();
    });

    effect(() => {
      const p = this.pipeData();
      if (this.chartInstance && p) {
        this.chartInstance.data.datasets[0].data = [
          p.pending,
          p.processing,
          p.shipped,
          p.delivered,
          p.cancelled,
        ];
        this.chartInstance.update();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.chartInstance?.destroy();
    });
  }

  private initChart() {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = this.pipeData();

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        datasets: [
          {
            data: [p.pending, p.processing, p.shipped, p.delivered, p.cancelled],
            backgroundColor: [
              '#fbbf24', // amber-400
              '#3b82f6', // blue-500
              '#a855f7', // purple-500
              '#10b981', // emerald-500
              '#ef4444', // rose-500
            ],
            borderWidth: 2,
            borderColor: '#18181b', // zinc-900 border to separate slices cleanly
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#09090b',
            titleColor: '#e4e4e7',
            bodyColor: '#a1a1aa',
            borderColor: '#27272a',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 8,
          },
        },
      },
    });
  }
}

// --- 3. TOP CATEGORIES & SKUs REVENUE BAR CHART ---
@Component({
  selector: 'app-category-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 shadow-xl backdrop-blur-md"
    >
      <div class="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <h3 class="text-sm font-semibold tracking-wide text-zinc-100">{{ title() }}</h3>
        <span class="text-xs text-indigo-400 font-medium">Revenue Distribution</span>
      </div>

      <div class="relative mt-4 h-56 w-full">
        <canvas #barCanvas class="w-full h-full"></canvas>
      </div>
    </div>
  `,
})
export class CategoryBarChart {
  readonly title = input<string>('Revenue by Category');
  readonly distribution = input<CategoryShareItem[] | undefined>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('barCanvas');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private chartInstance: Chart<'bar'> | null = null;

  constructor() {
    afterNextRender(() => {
      this.initChart();
    });

    effect(() => {
      const items = this.distribution();
      if (this.chartInstance && items) {
        this.chartInstance.data.labels = items.map((i) => i.category);
        this.chartInstance.data.datasets[0].data = items.map((i) => i.amount);
        this.chartInstance.update();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.chartInstance?.destroy();
    });
  }

  private initChart() {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const items = this.distribution() || [];
    const labels = items.map((i) => i.category);
    const amounts = items.map((i) => i.amount);

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue ($)',
            data: amounts,
            backgroundColor: [
              'rgba(99, 102, 241, 0.85)',
              'rgba(56, 189, 248, 0.85)',
              'rgba(168, 85, 247, 0.85)',
              'rgba(236, 72, 153, 0.85)',
              'rgba(245, 158, 11, 0.85)',
            ],
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Horizontal bars
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#09090b',
            titleColor: '#e4e4e7',
            bodyColor: '#a1a1aa',
            borderColor: '#27272a',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Revenue: $${Number(ctx.parsed.x).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(63, 63, 70, 0.2)' },
            ticks: {
              color: '#71717a',
              font: { size: 10 },
              callback: (val) => `$${Number(val).toLocaleString()}`,
            },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#e4e4e7',
              font: { size: 11, weight: 'bold' },
            },
            border: { display: false },
          },
        },
      },
    });
  }
}

// --- 4. RFQ TRADE NEGOTIATION FUNNEL CARD ---
@Component({
  selector: 'app-rfq-funnel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-full"
    >
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-zinc-800/60">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold tracking-wide text-zinc-100">RFQ Conversion Funnel</h3>
            <span
              class="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30"
            >
              B2B Trade
            </span>
          </div>
          <div class="flex items-center gap-1 text-emerald-400 font-extrabold text-sm">
            <span>{{ funnelData().conversionRate }}%</span>
            <span class="text-[10px] font-medium text-zinc-400 uppercase">Won</span>
          </div>
        </div>

        <!-- Funnel Steps Visualizer -->
        <div class="mt-4 space-y-2.5 text-xs">
          <!-- Step 1: Inquiries -->
          <div>
            <div class="flex justify-between pb-1 text-zinc-300">
              <span>1. Quotes Inquired</span>
              <strong class="text-white">{{ funnelData().inquired }}</strong>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full" style="width: 100%"></div>
            </div>
          </div>

          <!-- Step 2: Negotiating -->
          <div>
            <div class="flex justify-between pb-1 text-zinc-300">
              <span>2. Counter-Offered / Chatting</span>
              <strong class="text-white">{{ funnelData().negotiating }}</strong>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-amber-500 rounded-full" style="width: 75%"></div>
            </div>
          </div>

          <!-- Step 3: Accepted -->
          <div>
            <div class="flex justify-between pb-1 text-zinc-300">
              <span>3. Accepted Contracts</span>
              <strong class="text-white">{{ funnelData().accepted }}</strong>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full" style="width: 60%"></div>
            </div>
          </div>

          <!-- Step 4: Paid Settlement -->
          <div>
            <div class="flex justify-between pb-1 text-zinc-300">
              <span>4. Paid & Settled in Escrow</span>
              <strong class="text-emerald-400">{{ funnelData().paid }}</strong>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full" style="width: 48%"></div>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-4 pt-3 border-t border-zinc-800/40 text-[11px] text-zinc-400">
        💡 Real-time wholesale negotiation velocity across buyer-vendor quote threads.
      </p>
    </div>
  `,
})
export class RfqFunnelCard {
  readonly funnel = input<RfqFunnelData | undefined>();

  readonly funnelData = computed<RfqFunnelData>(() => {
    return (
      this.funnel() || { inquired: 12, negotiating: 7, accepted: 5, paid: 4, conversionRate: 67 }
    );
  });
}
