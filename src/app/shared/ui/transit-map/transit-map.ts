import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { OrderView } from '@core/models';
import {
  LucideCheck,
  LucideClock,
  LucideCompass,
  LucideCopy,
  LucideGlobe,
  LucideLayers,
  LucideNavigation,
  LucidePlane,
  LucideShieldCheck,
  LucideShip,
  LucideTruck,
  LucideX,
} from '@lucide/angular';
import { LogisticsWaypoint, TransitTelemetry } from './transit-telemetry.model';
import { TransitTelemetryService } from './transit-telemetry.service';
import { LiveDeliveryMapComponent } from './live-delivery-map';

@Component({
  selector: 'app-transit-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LiveDeliveryMapComponent,
    LucidePlane,
    LucideShip,
    LucideTruck,
    LucideNavigation,
    LucideShieldCheck,
    LucideCheck,
    LucideClock,
    LucideGlobe,
    LucideCompass,
    LucideCopy,
    LucideX,
    LucideLayers,
  ],
  template: `
    <div
      class="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950 p-4 sm:p-5 text-zinc-100 shadow-2xl"
    >
      <!-- Telemetry Header Strip -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
          >
            @if (telemetry().mode === 'AIR_CARGO') {
              <svg lucidePlane class="h-5 w-5"></svg>
            } @else if (telemetry().mode === 'OCEAN_VESSEL') {
              <svg lucideShip class="h-5 w-5"></svg>
            } @else {
              <svg lucideTruck class="h-5 w-5"></svg>
            }
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase tracking-widest text-indigo-400">
                {{ telemetry().carrier }}
              </span>
              <span class="h-1 w-1 rounded-full bg-zinc-600"></span>
              <span class="font-mono text-xs font-bold text-zinc-300">
                {{ telemetry().vesselOrFlightNumber }}
              </span>
            </div>
            <h4
              class="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 mt-0.5"
            >
              <span>{{ telemetry().originName }}</span>
              <svg lucideNavigation class="h-3.5 w-3.5 text-zinc-500 rotate-90"></svg>
              <span>{{ telemetry().destinationName }}</span>
            </h4>
          </div>
        </div>

        <!-- View Switcher & ETA Badge -->
        <div class="flex items-center gap-2 shrink-0 ml-auto flex-wrap">
          <div
            class="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300"
          >
            <svg lucideClock class="h-3.5 w-3.5"></svg>
            <span>Est. Arrival: {{ telemetry().estimatedArrival }}</span>
          </div>

          <!-- Mode Selector (Live Courier vs Radar Map vs Scan Log) -->
          <div class="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-0.5 shadow-md">
            <button
              type="button"
              (click)="activeView.set('LIVE_COURIER')"
              [class]="
                activeView() === 'LIVE_COURIER'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              "
              class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer"
              title="Uber / Zomato Style Live Street Tracking"
            >
              <svg lucideTruck class="h-3.5 w-3.5"></svg>
              <span>Live Courier (Street)</span>
            </button>
            <button
              type="button"
              (click)="activeView.set('RADAR')"
              [class]="
                activeView() === 'RADAR'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              "
              class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer"
              title="International Transit Corridor Map"
            >
              <svg lucideGlobe class="h-3.5 w-3.5"></svg>
              <span>Radar Map</span>
            </button>
            <button
              type="button"
              (click)="activeView.set('LOG')"
              [class]="
                activeView() === 'LOG'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              "
              class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer"
              title="Official Waypoint Checkpoint Audit"
            >
              <svg lucideLayers class="h-3.5 w-3.5"></svg>
              <span>Scan Log</span>
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW 1: LIVE UBER/ZOMATO STREET TRACKING MAP -->
      @if (activeView() === 'LIVE_COURIER') {
        <div class="mt-4 animate-fade-in">
          <app-live-delivery-map
            [order]="order()"
            (qrScanRequested)="qrScanRequested.emit()"
          />
        </div>
      }

      <!-- VIEW 2: INTERACTIVE VECTOR RADAR MAP -->
      @if (activeView() === 'RADAR') {
        <div
          class="relative mt-4 h-72 sm:h-80 w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-[#08090d]"
        >
          <!-- Stylized Radar Background Grid (Subtle) -->
          <svg
            class="absolute inset-0 h-full w-full opacity-25 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="radarGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#27272a" stroke-width="0.75" />
                <circle cx="36" cy="36" r="1" fill="#52525b" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#radarGrid)" />

            <!-- Ambient Global Trade Corridors -->
            <path
              d="M 20 180 Q 250 80 500 120 T 980 90"
              fill="none"
              stroke="#27272a"
              stroke-width="1"
              stroke-dasharray="3,3"
            />
            <path
              d="M 50 240 Q 300 200 600 230 T 950 210"
              fill="none"
              stroke="#18181b"
              stroke-width="1"
            />
          </svg>

          <!-- Master High-Precision Vector Route Layer (100% Coordinate-Aligned to Waypoint Pins) -->
          <svg
            class="absolute inset-0 h-full w-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#10b981" />
                <stop offset="35%" stop-color="#6366f1" />
                <stop offset="70%" stop-color="#06b6d4" />
                <stop offset="100%" stop-color="#a855f7" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Glowing Ambient Path Underlay -->
            <path
              [attr.d]="svgBezierPath()"
              fill="none"
              stroke="#6366f1"
              stroke-width="2"
              stroke-opacity="0.35"
              stroke-linecap="round"
              stroke-linejoin="round"
              filter="url(#glow)"
            />

            <!-- Guide Track -->
            <path
              [attr.d]="svgBezierPath()"
              fill="none"
              stroke="#312e81"
              stroke-width="0.8"
              stroke-opacity="0.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- High-Tech Animated Marching Dash Beam -->
            <path
              [attr.d]="svgBezierPath()"
              fill="none"
              stroke="url(#routeGradient)"
              stroke-width="0.95"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="transit-route-dash"
            />
          </svg>

          <!-- Waypoint Pins on Map -->
          @for (wp of telemetry().waypoints; track wp.id) {
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 z-20"
              [style.left.%]="wp.coords.x"
              [style.top.%]="wp.coords.y"
              (click)="selectedWaypoint.set(wp)"
            >
              <!-- Pin Marker Bubble -->
              <div class="relative flex items-center justify-center">
                @if (wp.status === 'COMPLETED') {
                  <div
                    class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 group-hover:scale-125 transition"
                  >
                    <svg lucideCheck class="h-3.5 w-3.5 stroke-[3]"></svg>
                  </div>
                } @else if (wp.status === 'IN_TRANSIT') {
                  <div class="relative flex items-center justify-center">
                    <span
                      class="absolute -inset-2.5 rounded-full bg-indigo-500/30 animate-ping"
                    ></span>
                    <span
                      class="absolute -inset-1 rounded-full bg-indigo-500/50 animate-pulse"
                    ></span>
                    <div
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/60 ring-2 ring-white/80 group-hover:scale-125 transition"
                    >
                      <svg lucideCompass class="h-4 w-4 animate-spin-slow"></svg>
                    </div>
                  </div>
                } @else {
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-400 group-hover:scale-125 group-hover:border-zinc-400 group-hover:text-white transition"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                  </div>
                }

                <!-- Waypoint Label Pill -->
                <div
                  class="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-950/90 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 backdrop-blur-md shadow-md pointer-events-none group-hover:border-indigo-500 group-hover:text-white transition flex items-center gap-1"
                >
                  @if (wp.type === 'EXPORT_PORT' || wp.type === 'IMPORT_CUSTOMS') {
                    <svg lucideShieldCheck class="h-2.5 w-2.5 text-amber-400"></svg>
                  }
                  <span>{{ wp.hubCode }}</span>
                </div>
              </div>
            </div>
          }

          <!-- Live In-Flight Vehicle Beacon -->
          @if (telemetry().progressPercent > 0 && telemetry().progressPercent < 100) {
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 transition-all duration-700 ease-out"
              [style.left.%]="telemetry().currentCoords.x"
              [style.top.%]="telemetry().currentCoords.y"
            >
              <div class="relative flex items-center justify-center">
                <!-- Glowing Radar Beacon Rings -->
                <span class="absolute -inset-4 rounded-full bg-cyan-500/25 animate-ping"></span>
                <span class="absolute -inset-2 rounded-full bg-indigo-500/40 animate-pulse"></span>

                <!-- Vehicle Icon Container -->
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-xl shadow-cyan-500/40 ring-2 ring-white/90"
                >
                  @if (telemetry().mode === 'AIR_CARGO') {
                    <svg lucidePlane class="h-4 w-4 rotate-45"></svg>
                  } @else if (telemetry().mode === 'OCEAN_VESSEL') {
                    <svg lucideShip class="h-4 w-4"></svg>
                  } @else {
                    <svg lucideTruck class="h-4 w-4"></svg>
                  }
                </div>

                <!-- Telemetry HUD Bubble -->
                <div
                  class="absolute bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-cyan-500/40 bg-zinc-950/95 px-2.5 py-1 text-[11px] font-mono text-cyan-300 shadow-2xl backdrop-blur-md flex items-center gap-1.5"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span class="font-bold text-white">{{ telemetry().speedOrAltitude }}</span>
                  <span class="text-zinc-500">·</span>
                  <span class="text-cyan-400 font-extrabold"
                    >{{ telemetry().progressPercent }}%</span
                  >
                </div>
              </div>
            </div>
          }

          <!-- Selected Waypoint Inspector Popover -->
          @if (selectedWaypoint(); as wp) {
            <div
              class="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs z-40 rounded-xl border border-indigo-500/40 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md animate-fade-in text-xs"
            >
              <div
                class="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2 mb-2"
              >
                <div>
                  <span
                    class="inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                    [class]="
                      wp.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : wp.status === 'IN_TRANSIT'
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    "
                  >
                    {{ wp.status }} · {{ wp.hubCode }}
                  </span>
                  <h5 class="font-bold text-white text-sm mt-1">{{ wp.name }}</h5>
                  <p class="text-zinc-400 text-[11px]">{{ wp.location }}</p>
                </div>
                <button
                  type="button"
                  (click)="selectedWaypoint.set(null)"
                  class="text-zinc-400 hover:text-white p-1 rounded-md transition cursor-pointer"
                >
                  <svg lucideX class="h-4 w-4"></svg>
                </button>
              </div>

              <div class="space-y-1.5 text-[11px]">
                <p class="text-zinc-300 leading-relaxed">{{ wp.details }}</p>
                @if (wp.timestamp) {
                  <p class="text-zinc-400 flex items-center gap-1">
                    <svg lucideClock class="h-3 w-3 text-indigo-400"></svg>
                    <span
                      >Checkpoint Time:
                      <strong class="text-zinc-200">{{ wp.timestamp }}</strong></span
                    >
                  </p>
                }
                @if (wp.sealNumber) {
                  <p class="text-zinc-400 flex items-center gap-1 font-mono text-[10px]">
                    <svg lucideShieldCheck class="h-3 w-3 text-emerald-400"></svg>
                    <span
                      >Tamper-Proof Seal:
                      <span class="text-emerald-300 font-bold">{{ wp.sealNumber }}</span></span
                    >
                  </p>
                }
                @if (wp.temperatureOrSpec) {
                  <p class="text-zinc-400 flex items-center gap-1 text-[10px]">
                    <span class="text-cyan-400">●</span>
                    <span>Spec: {{ wp.temperatureOrSpec }}</span>
                  </p>
                }
                @if (wp.type === 'EXPORT_PORT' || wp.type === 'IMPORT_CUSTOMS') {
                  <div class="mt-2 rounded-lg border border-indigo-500/30 bg-indigo-950/50 p-2 text-[10px] text-zinc-300 flex items-start gap-1.5">
                    <svg lucideShieldCheck class="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5"></svg>
                    <div>
                      <strong class="text-white">Milestone 2 Trigger (40% Escrow):</strong>
                      <p class="text-zinc-400 text-[9px] mt-0.5">Scanning this customs gateway verifies transit & releases 40% funds to supplier.</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- VIEW 2: CHRONOLOGICAL COURIER SCAN LOG -->
      @if (activeView() === 'LOG') {
        <div
          class="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 divide-y divide-zinc-800/60 max-h-80 overflow-y-auto"
        >
          @for (wp of telemetry().waypoints; track wp.id; let idx = $index) {
            <div
              class="py-3 flex items-start gap-3.5 group hover:bg-zinc-800/20 px-2 rounded-lg transition"
            >
              <div class="flex flex-col items-center shrink-0 mt-0.5">
                <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  [class]="
                    wp.status === 'COMPLETED'
                      ? 'bg-emerald-500 text-white'
                      : wp.status === 'IN_TRANSIT'
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 animate-pulse'
                        : 'border border-zinc-700 bg-zinc-800 text-zinc-400'
                  "
                >
                  @if (wp.status === 'COMPLETED') {
                    <svg lucideCheck class="h-3.5 w-3.5"></svg>
                  } @else {
                    {{ idx + 1 }}
                  }
                </div>
                @if (idx < telemetry().waypoints.length - 1) {
                  <span class="h-8 w-0.5 bg-zinc-800 my-1"></span>
                }
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-1">
                  <h5 class="text-sm font-bold text-white">{{ wp.name }}</h5>
                  <span class="text-xs font-mono text-zinc-400">{{
                    wp.timestamp || 'Pending'
                  }}</span>
                </div>
                <p class="text-xs text-zinc-400">
                  {{ wp.location }} · <span class="font-mono text-zinc-500">{{ wp.hubCode }}</span>
                </p>
                <p class="text-xs text-zinc-300 mt-1">{{ wp.details }}</p>

                @if (wp.sealNumber) {
                  <div
                    class="mt-1.5 inline-flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400"
                  >
                    <svg lucideShieldCheck class="h-3 w-3"></svg>
                    <span>Escrow Seal: {{ wp.sealNumber }}</span>
                  </div>
                }
                @if (wp.type === 'EXPORT_PORT' || wp.type === 'IMPORT_CUSTOMS') {
                  <div
                    class="mt-1.5 inline-flex items-center gap-1 rounded bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300"
                  >
                    <svg lucideShieldCheck class="h-3 w-3 text-emerald-400"></svg>
                    <span>🛡️ 40% Escrow Customs Trigger</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Bottom Telemetry Bar -->
      <div
        class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-3.5 text-xs text-zinc-400"
      >
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span
            >Status:
            <strong class="text-zinc-200">{{ telemetry().currentStatusText }}</strong></span
          >
        </div>

        <div class="flex items-center gap-3 font-mono">
          <span>Tracking ID:</span>
          <span class="text-indigo-400 font-bold">{{ telemetry().trackingNumber }}</span>
          <button
            type="button"
            (click)="copyTracking(telemetry().trackingNumber)"
            class="text-zinc-400 hover:text-white transition cursor-pointer"
            title="Copy Tracking #"
          >
            @if (copied()) {
              <span class="text-emerald-400 text-[11px]">Copied</span>
            } @else {
              <svg lucideCopy class="h-3.5 w-3.5"></svg>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .transit-route-dash {
        stroke-dasharray: 2.2 1.6;
        animation: marchDash 1.2s linear infinite;
      }

      @keyframes marchDash {
        to {
          stroke-dashoffset: -7.6;
        }
      }

      .animate-spin-slow {
        animation: spin 6s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class TransitMapComponent {
  private readonly telemetryService = inject(TransitTelemetryService);

  readonly order = input.required<OrderView>();
  readonly qrScanRequested = output<void>();

  readonly activeView = signal<'LIVE_COURIER' | 'RADAR' | 'LOG'>('LIVE_COURIER');
  readonly selectedWaypoint = signal<LogisticsWaypoint | null>(null);
  readonly copied = signal(false);

  readonly telemetry = computed<TransitTelemetry>(() => {
    return this.telemetryService.getTelemetryForOrder(this.order());
  });

  readonly svgBezierPath = computed<string>(() => {
    const wps = this.telemetry().waypoints;
    if (wps.length < 2) return '';

    const pts = wps.map((w) => w.coords);
    const n = pts.length;

    let d = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < n - 1; i++) {
      const pPrev = i === 0 ? pts[0] : pts[i - 1];
      const pCurr = pts[i];
      const pNext = pts[i + 1];
      const pAfter = i + 2 < n ? pts[i + 2] : pNext;

      const cp1X = Number((pCurr.x + (pNext.x - pPrev.x) / 6).toFixed(2));
      const cp1Y = Number((pCurr.y + (pNext.y - pPrev.y) / 6).toFixed(2));
      const cp2X = Number((pNext.x - (pAfter.x - pCurr.x) / 6).toFixed(2));
      const cp2Y = Number((pNext.y - (pAfter.y - pCurr.y) / 6).toFixed(2));

      d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${pNext.x} ${pNext.y}`;
    }

    return d;
  });

  copyTracking(num: string) {
    if (num) {
      navigator.clipboard.writeText(num);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
