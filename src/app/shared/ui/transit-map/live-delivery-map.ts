import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { OrderView } from '@core/models';
import { OrderSocketService } from '@core/services/order-socket.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCheckCircle2,
  LucideCheckCheck,
  LucideClock,
  LucideCompass,
  LucideMapPin,
  LucidePause,
  LucidePhone,
  LucidePlay,
  LucideQrCode,
  LucideRadio,
  LucideRotateCcw,
  LucideScanLine,
  LucideSend,
  LucideShieldCheck,
  LucideSparkles,
  LucideX,
  LucideZap,
} from '@lucide/angular';

export interface CourierChatMessage {
  id: string;
  sender: 'courier' | 'user';
  text: string;
  time: string;
}

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface CourierProfile {
  name: string;
  phone: string;
  rating: number;
  tripsCount: number;
  vehicleType: string;
  vehiclePlate: string;
  avatarUrl: string;
}

interface CityGeoConfig {
  lat: number;
  lng: number;
  hubName: string;
  dockName: string;
}

const CITY_DATABASE: Record<string, CityGeoConfig> = {
  // Gujarat / India
  ahmedabad: {
    lat: 23.0225,
    lng: 72.5714,
    hubName: 'Ahmedabad GIDC Logistics Hub (SG Highway Depot)',
    dockName: 'Buyer Receiving Bay · Ahmedabad',
  },
  gandhinagar: {
    lat: 23.2156,
    lng: 72.6369,
    hubName: 'GIFT City Tech Logistics Depot',
    dockName: 'Enterprise Dock · Gandhinagar',
  },
  surat: {
    lat: 21.1702,
    lng: 72.8311,
    hubName: 'Surat Industrial Freight Hub (Sachin GIDC)',
    dockName: 'Commercial Receiving Dock · Surat',
  },
  vadodara: {
    lat: 22.3072,
    lng: 73.1812,
    hubName: 'Vadodara Makarpura Freight Terminal',
    dockName: 'Corporate Receiving Bay · Vadodara',
  },
  rajkot: {
    lat: 22.3039,
    lng: 70.8022,
    hubName: 'Rajkot Shapar Freight Depot',
    dockName: 'Industrial Consignment Dock · Rajkot',
  },
  bhavnagar: {
    lat: 21.7645,
    lng: 72.1519,
    hubName: 'Bhavnagar Port Freight Terminal',
    dockName: 'Commercial Receiving Dock · Bhavnagar',
  },
  jamnagar: {
    lat: 22.4707,
    lng: 70.0577,
    hubName: 'Jamnagar Refinery & Freight Terminal',
    dockName: 'Industrial Receiving Bay · Jamnagar',
  },
  // Maharashtra / India
  mumbai: {
    lat: 19.076,
    lng: 72.8777,
    hubName: 'Bhiwandi Central Freight Hub · Mumbai',
    dockName: 'BKC Corporate Receiving Dock · Mumbai',
  },
  pune: {
    lat: 18.5204,
    lng: 73.8567,
    hubName: 'Chakan Logistics Depot · Pune',
    dockName: 'Hinjawadi Phase 1 Dock · Pune',
  },
  nagpur: {
    lat: 21.1458,
    lng: 79.0882,
    hubName: 'MIHAN Multi-Modal Logistics Hub · Nagpur',
    dockName: 'Central India Receiving Bay · Nagpur',
  },
  // Delhi NCR / North India
  delhi: {
    lat: 28.6139,
    lng: 77.209,
    hubName: 'Okhla Industrial Freight Depot · Delhi',
    dockName: 'Capital Receiving Dock · Delhi',
  },
  noida: {
    lat: 28.5355,
    lng: 77.391,
    hubName: 'Noida Expressway Logistics Center',
    dockName: 'Sector 62 Receiving Bay · Noida',
  },
  gurgaon: {
    lat: 28.4595,
    lng: 77.0266,
    hubName: 'CyberCity Logistics Terminal · Gurgaon',
    dockName: 'Enterprise Fulfillment Dock · Gurgaon',
  },
  // South India
  bengaluru: {
    lat: 12.9716,
    lng: 77.5946,
    hubName: 'Peenya Industrial Freight Terminal · Bengaluru',
    dockName: 'Whitefield Receiving Bay · Bengaluru',
  },
  bangalore: {
    lat: 12.9716,
    lng: 77.5946,
    hubName: 'Peenya Industrial Freight Terminal · Bengaluru',
    dockName: 'Whitefield Receiving Bay · Bengaluru',
  },
  hyderabad: {
    lat: 17.385,
    lng: 78.4867,
    hubName: 'Shamshabad Logistics Depot · Hyderabad',
    dockName: 'HITEC City Logistics Bay · Hyderabad',
  },
  chennai: {
    lat: 13.0827,
    lng: 80.2707,
    hubName: 'Sriperumbudur Freight Depot · Chennai',
    dockName: 'OMR Tech Corridor Dock · Chennai',
  },
  kolkata: {
    lat: 22.5726,
    lng: 88.3639,
    hubName: 'Dankuni Logistics Park · Kolkata',
    dockName: 'Salt Lake Sector V Bay · Kolkata',
  },
  jaipur: {
    lat: 26.9124,
    lng: 75.7873,
    hubName: 'Sitapura Industrial Hub · Jaipur',
    dockName: 'Commercial Depot · Jaipur',
  },
  indore: {
    lat: 22.7196,
    lng: 75.8577,
    hubName: 'Pithampur Logistics Park · Indore',
    dockName: 'Vijay Nagar Receiving Bay · Indore',
  },
  chandigarh: {
    lat: 30.7333,
    lng: 76.7794,
    hubName: 'Mohali Freight Terminal · Chandigarh',
    dockName: 'Industrial Area Phase 2 Dock · Chandigarh',
  },
  kochi: {
    lat: 9.9312,
    lng: 76.2673,
    hubName: 'Vallarpadam Container Terminal · Kochi',
    dockName: 'Infopark Receiving Bay · Kochi',
  },
  // USA / North America
  'san francisco': {
    lat: 37.7749,
    lng: -122.4194,
    hubName: 'San Francisco Metro Logistics Port (SFO)',
    dockName: 'Silicon Valley Commercial Dock #2',
  },
  'san jose': {
    lat: 37.3382,
    lng: -121.8863,
    hubName: 'Silicon Valley Distribution Center (SJC-DC)',
    dockName: 'Innovation Parkway Receiving Bay',
  },
  'los angeles': {
    lat: 34.0522,
    lng: -118.2437,
    hubName: 'Port of Los Angeles Container Terminal',
    dockName: 'Downtown LA Enterprise Receiving Dock',
  },
  'new york': {
    lat: 40.7128,
    lng: -74.006,
    hubName: 'JFK Air Cargo Logistics Depot',
    dockName: 'Manhattan Enterprise Receiving Bay',
  },
  seattle: {
    lat: 47.6062,
    lng: -122.3321,
    hubName: 'Port of Seattle Freight Terminal',
    dockName: 'South Lake Union Receiving Dock',
  },
  chicago: {
    lat: 41.8781,
    lng: -87.6298,
    hubName: "O'Hare Air Cargo Center · Chicago",
    dockName: 'Loop Enterprise Receiving Bay',
  },
  austin: {
    lat: 30.2672,
    lng: -97.7431,
    hubName: 'Austin Silicon Hills Freight Hub',
    dockName: 'Tech Ridge Receiving Bay · Austin',
  },
  toronto: {
    lat: 43.6532,
    lng: -79.3832,
    hubName: 'Pearson Cargo Distribution Center · Toronto',
    dockName: 'GTA Commercial Receiving Dock',
  },
  // Europe
  london: {
    lat: 51.5074,
    lng: -0.1278,
    hubName: 'Heathrow International Freight Hub · London',
    dockName: 'Canary Wharf Commercial Dock',
  },
  berlin: {
    lat: 52.52,
    lng: 13.405,
    hubName: 'BER Cargo Logistics Terminal · Berlin',
    dockName: 'Mitte Enterprise Receiving Bay',
  },
  paris: {
    lat: 48.8566,
    lng: 2.3522,
    hubName: 'CDG Air Cargo Hub · Paris',
    dockName: 'La Défense Commercial Receiving Dock',
  },
  // Middle East & APAC
  dubai: {
    lat: 25.2048,
    lng: 55.2708,
    hubName: 'Jebel Ali Free Zone Logistics Hub · Dubai',
    dockName: 'Business Bay Enterprise Dock',
  },
  singapore: {
    lat: 1.3521,
    lng: 103.8198,
    hubName: 'Jurong Port Logistics Facility · Singapore',
    dockName: 'Marina Bay Receiving Dock',
  },
  tokyo: {
    lat: 35.6762,
    lng: 139.6503,
    hubName: 'Tokyo Bay Intermodal Terminal · Tokyo',
    dockName: 'Shibuya Enterprise Receiving Bay',
  },
  sydney: {
    lat: -33.8688,
    lng: 151.2093,
    hubName: 'Port Botany Freight Terminal · Sydney',
    dockName: 'Sydney CBD Commercial Receiving Dock',
  },
};

@Component({
  selector: 'app-live-delivery-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideCheckCircle2,
    LucideCheckCheck,
    LucideClock,
    LucideCompass,
    LucideMapPin,
    LucidePause,
    LucidePhone,
    LucidePlay,
    LucideQrCode,
    LucideRadio,
    LucideRotateCcw,
    LucideScanLine,
    LucideSend,
    LucideShieldCheck,
    LucideSparkles,
    LucideX,
    LucideZap,
  ],
  template: `
    <div class="relative w-full overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950 text-zinc-100 shadow-2xl">
      <!-- 🗺️ Main Leaflet Map Container -->
      <div class="relative h-80 sm:h-[440px] w-full bg-zinc-950">
        <div #mapContainer class="h-full w-full z-0"></div>

        <!-- Ambient Dark Vignette Overlay -->
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/40 z-10"></div>

        <!-- 📡 Top Live Telematics Pill (Zomato/Uber Style) -->
        <div class="absolute top-3 left-3 right-3 sm:right-auto z-20 flex flex-wrap items-center gap-2">
          <!-- Live Status Beacon -->
          <div class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-950/90 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="text-xs font-bold text-white uppercase tracking-wider">Live Delivery GPS</span>
            @if (isLiveBeaconActive()) {
              <span class="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-black text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                <svg lucideRadio class="h-3 w-3"></svg>
                BEACON ACTIVE
              </span>
            } @else {
              <span class="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-indigo-300 border border-indigo-500/30">
                {{ telemetryCarrier() }}
              </span>
            }
          </div>

          <!-- Dynamic Speed & Distance Ticker (Hide if Delivered) -->
          @if (order().status !== 'DELIVERED') {
            <div class="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-1.5 text-xs font-semibold text-zinc-300 shadow-xl backdrop-blur-md">
              <span class="flex items-center gap-1 text-cyan-400 font-mono">
                <svg lucideZap class="h-3.5 w-3.5"></svg>
                {{ currentSpeed() }} km/h
              </span>
              <span class="h-3 w-[1px] bg-zinc-800"></span>
              <span class="flex items-center gap-1 text-emerald-400 font-mono">
                <svg lucideMapPin class="h-3.5 w-3.5"></svg>
                {{ remainingDistanceKm() }} km away
              </span>
              <span class="h-3 w-[1px] bg-zinc-800"></span>
              <span class="flex items-center gap-1 text-amber-400 font-mono">
                <svg lucideClock class="h-3.5 w-3.5"></svg>
                ETA: {{ etaMinutes() }}m
              </span>
            </div>
          } @else {
            <div class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/80 px-3 py-1.5 text-xs font-bold text-emerald-400 shadow-xl backdrop-blur-md">
              <svg lucideCheckCircle2 class="h-4 w-4"></svg>
              <span>DELIVERY COMPLETED</span>
            </div>
          }
        </div>

        <!-- 🎮 Simulation Controls (Speed 1x, 2x, 5x, Play/Pause, Replay) -->
        @if (order().status !== 'DELIVERED') {
          <div class="absolute top-3 right-3 z-20 hidden sm:flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/90 p-1 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              (click)="toggleSimulation()"
              [title]="isPlaying() ? 'Pause Transit' : 'Play Transit'"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              @if (isPlaying()) {
                <svg lucidePause class="h-3.5 w-3.5 text-amber-400"></svg>
              } @else {
                <svg lucidePlay class="h-3.5 w-3.5 text-emerald-400 fill-current"></svg>
              }
            </button>

            <button
              type="button"
              (click)="resetSimulation()"
              title="Restart Route"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <svg lucideRotateCcw class="h-3.5 w-3.5"></svg>
            </button>

            <!-- Speed Multiplier Buttons -->
            <div class="flex items-center border-l border-zinc-800 pl-1 gap-1">
              @for (spd of [1, 2, 5]; track spd) {
                <button
                  type="button"
                  (click)="setSpeedMultiplier(spd)"
                  [class]="speedMultiplier() === spd ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'"
                  class="h-6 px-1.5 rounded text-[10px] transition cursor-pointer"
                >
                  {{ spd }}x
                </button>
              }
            </div>

            <!-- Auto Center / Follow Driver Toggle -->
            <button
              type="button"
              (click)="toggleFollowDriver()"
              [title]="followDriver() ? 'Auto-pan Active' : 'Auto-pan Disabled'"
              [class]="followDriver() ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/40' : 'text-zinc-500 hover:text-zinc-300'"
              class="flex h-6 px-2 items-center gap-1 rounded text-[10px] font-semibold transition cursor-pointer ml-1"
            >
              <svg lucideCompass class="h-3 w-3" [class.animate-spin]="followDriver()"></svg>
              <span>Lock</span>
            </button>
          </div>
        }

        <!-- 🏁 Dock Arrival Notification Banner (When driver reaches 0 km) -->
        @if (hasArrived() && order().status !== 'DELIVERED') {
          <div class="absolute inset-x-3 sm:inset-x-8 top-16 z-30 animate-in fade-in zoom-in-95 duration-300">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-zinc-950/95 p-3.5 sm:p-4 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner">
                  <svg lucideCheckCircle2 class="h-5 w-5"></svg>
                </div>
                <div>
                  <h4 class="text-sm font-black text-white flex items-center gap-2">
                    <span>Driver Arrived at Destination Dock!</span>
                    <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">DOCK-VERIFIED</span>
                  </h4>
                  <p class="text-xs text-zinc-400 mt-0.5">Physical consignment is ready for barcode scan & signoff.</p>
                </div>
              </div>

              <!-- Instant Call-To-Action: Trigger Delivery QR Scanner -->
              <button
                type="button"
                (click)="triggerQrScan()"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
              >
                <svg lucideScanLine class="h-4 w-4"></svg>
                <span>Scan Delivery QR Code</span>
              </button>
            </div>
          </div>
        }

        <!-- 🛵 Bottom Courier Profile Card (Zomato / Uber Style) -->
        <div class="absolute bottom-3 left-3 right-3 z-20">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/95 p-3 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-xl">
            <!-- Left: Courier Info -->
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative shrink-0">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-900/60 to-zinc-900 text-lg shadow-md">
                  👨‍✈️
                </div>
                <!-- Online Live Badge -->
                <span class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-950"></span>
                </span>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="text-sm font-bold text-white truncate">{{ courier().name }}</h4>
                  <span class="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
                    ⭐ {{ courier().rating }}
                  </span>
                  <span class="text-[11px] text-zinc-500">({{ courier().tripsCount }} trips)</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono">
                  <span class="truncate">{{ courier().vehicleType }}</span>
                  <span class="h-1 w-1 rounded-full bg-zinc-600"></span>
                  <span class="text-indigo-400 font-bold">{{ courier().vehiclePlate }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Interactive Actions -->
            <div class="flex items-center gap-2 shrink-0 justify-end">
              <button
                type="button"
                (click)="callCourier()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-500 hover:text-white transition cursor-pointer active:scale-95"
              >
                <svg lucidePhone class="h-3.5 w-3.5 text-emerald-400"></svg>
                <span>Call</span>
              </button>

              <button
                type="button"
                (click)="chatWithCourier()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-500 hover:text-white transition cursor-pointer active:scale-95"
              >
                <svg lucideSend class="h-3.5 w-3.5 text-indigo-400"></svg>
                <span>Message</span>
              </button>

              @if (!hasArrived() && order().status !== 'DELIVERED') {
                <button
                  type="button"
                  (click)="triggerQrScan()"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer active:scale-95"
                >
                  <svg lucideQrCode class="h-3.5 w-3.5"></svg>
                  <span>QR Ready</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- 💬 Priority Courier Dispatch Chat Drawer / Slide-Over Modal -->
      @if (isCourierChatOpen()) {
        <!-- Global Backdrop -->
        <div
          class="fixed inset-0 z-[99998] bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          (click)="closeCourierChat()"
        ></div>

        <!-- Slide-over Drawer / Interactive Dispatch Terminal -->
        <aside
          class="fixed inset-y-0 right-0 z-[99999] flex w-full max-w-md sm:max-w-lg flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right"
        >
          <!-- Drawer Header -->
          <div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-5 py-4 backdrop-blur-md">
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative shrink-0">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-900/60 to-zinc-900 text-xl shadow-lg">
                  👨‍✈️
                </div>
                <!-- Online Green Pulse Indicator -->
                <span class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-950"></span>
                </span>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white truncate">{{ courier().name }}</h3>
                  <span class="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
                    ⭐ {{ courier().rating }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                  <span class="truncate">{{ courier().vehicleType }}</span>
                  <span class="h-1 w-1 rounded-full bg-zinc-600"></span>
                  <span class="text-indigo-400 font-bold">{{ courier().vehiclePlate }}</span>
                </div>
              </div>
            </div>

            <!-- Top Actions: Direct Call & Close -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                (click)="callCourier()"
                class="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95 cursor-pointer"
                title="Direct Phone Call"
              >
                <svg lucidePhone class="h-3.5 w-3.5"></svg>
                <span class="hidden sm:inline">Call</span>
              </button>

              <button
                type="button"
                (click)="closeCourierChat()"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                title="Close Courier Chat"
              >
                <svg lucideX class="h-4.5 w-4.5"></svg>
              </button>
            </div>
          </div>

          <!-- Consignment Live Context Strip -->
          <div class="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/40 px-5 py-2.5 text-xs">
            <div class="flex items-center gap-2 text-zinc-300 truncate">
              <svg lucideShieldCheck class="h-3.5 w-3.5 text-indigo-400 shrink-0"></svg>
              <span class="font-mono text-zinc-400">Order #{{ order().id.slice(0, 8).toUpperCase() }}</span>
              <span class="text-zinc-600">•</span>
              <span class="text-emerald-400 font-mono font-semibold">{{ remainingDistanceKm() }} km away</span>
              <span class="text-zinc-600">•</span>
              <span class="text-amber-300 font-mono font-bold">ETA ~{{ etaMinutes() }}m</span>
            </div>
            <span class="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 shrink-0">
              DISPATCH CHANNEL
            </span>
          </div>

          <!-- Chat Conversation Scroll Area -->
          <div #courierChatScrollContainer class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <!-- System Security Chip -->
            <div class="flex flex-col items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-400">
                <svg lucideShieldCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                Direct encrypted dispatch channel with {{ telemetryCarrier() }}
              </span>
            </div>

            <!-- Messages Stream -->
            @for (msg of courierChatMessages(); track msg.id) {
              @if (msg.sender === 'courier') {
                <!-- Courier Message Bubble (Left) -->
                <div class="flex items-start gap-2.5 max-w-[85%]">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-sm shadow">
                    👨‍✈️
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-bold text-zinc-300">{{ courier().name }}</span>
                      <span class="text-[10px] text-zinc-500">{{ msg.time }}</span>
                    </div>
                    <div class="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-200 shadow-md">
                      {{ msg.text }}
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Buyer Message Bubble (Right) -->
                <div class="flex items-start justify-end gap-2.5 ml-auto max-w-[85%]">
                  <div class="space-y-1 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <span class="text-[10px] text-zinc-500">{{ msg.time }}</span>
                      <span class="text-[11px] font-bold text-indigo-300">You</span>
                    </div>
                    <div class="rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-xs font-medium text-white shadow-md shadow-indigo-600/20 text-left">
                      {{ msg.text }}
                    </div>
                    <div class="flex items-center justify-end gap-1 text-[10px] text-emerald-400 font-mono">
                      <svg lucideCheckCheck class="h-3 w-3"></svg>
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>
              }
            }

            <!-- Typing Indicator -->
            @if (isCourierTyping()) {
              <div class="flex items-center gap-2.5 max-w-[80%] animate-in fade-in">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-sm">
                  👨‍✈️
                </div>
                <div class="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-400">
                  <span class="flex gap-1 items-center">
                    <span class="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                    <span class="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span class="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span class="text-[11px] text-zinc-400 font-medium ml-1">{{ courier().name }} is typing...</span>
                </div>
              </div>
            }
          </div>

          <!-- Quick Suggestion Action Chips -->
          <div class="border-t border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5">
            <p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
              <svg lucideSparkles class="h-3 w-3 text-indigo-400"></svg>
              Quick Logistics Presets
            </p>
            <div class="flex flex-wrap gap-1.5">
              @for (preset of courierQuickPresets; track preset.label) {
                <button
                  type="button"
                  (click)="sendPresetMessage(preset.text)"
                  class="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:border-indigo-500/50 hover:bg-indigo-500/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-indigo-300 transition cursor-pointer active:scale-95"
                >
                  {{ preset.label }}
                </button>
              }
            </div>
          </div>

          <!-- Bottom Message Input Bar -->
          <div class="border-t border-zinc-800 bg-zinc-900/90 p-4">
            <form (submit)="submitCourierMessage($event)" class="flex items-center gap-2">
              <input
                type="text"
                [value]="courierInputText()"
                (input)="courierInputText.set($any($event.target).value)"
                (keydown.enter)="submitCourierMessage($event)"
                placeholder="Message {{ courier().name }}..."
                class="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
              <button
                type="submit"
                [disabled]="!courierInputText().trim()"
                class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer shrink-0"
                title="Send Message"
              >
                <svg lucideSend class="h-4 w-4"></svg>
              </button>
            </form>
          </div>
        </aside>
      }
    </div>
  `,
})
export class LiveDeliveryMapComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly order = input.required<OrderView>();
  readonly qrScanRequested = output<void>();

  private readonly toast = inject(ToastService);
  private readonly orderSocket = inject(OrderSocketService);
  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  // SSR check & socket subscription
  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    effect(() => {
      const loc = this.orderSocket.latestDriverLocation();
      const currentOrd = this.order();
      if (loc && currentOrd && loc.orderId === currentOrd.id) {
        this.handleLiveDriverBeacon(loc.latitude, loc.longitude, loc.heading, loc.speed);
      }
    });

    effect(() => {
      const msg = this.orderSocket.latestChatMessage();
      const currentOrd = this.order();
      if (msg && currentOrd && msg.orderId === currentOrd.id && msg.sender === 'courier') {
        const exists = this.courierChatMessages().find(m => m.id === msg.id);
        if (!exists) {
          this.courierChatMessages.update(msgs => [...msgs, msg as any]);
          this.scrollToChatBottom();
        }
      }
    });
  }

  // Leaflet references
  private map: any = null;
  private vehicleMarker: any = null;
  private traveledPolyline: any = null;
  private remainingPolyline: any = null;
  private originMarker: any = null;
  private destinationMarker: any = null;
  private animationTimer: any = null;

  // Resolved Location Meta
  private resolvedHubTitle = 'Regional Logistics Dispatch Depot';
  private resolvedDockTitle = 'Buyer Receiving Dock';
  private resolvedAddressText = '';

  // Telemetry signals
  readonly isLiveBeaconActive = signal(false);
  readonly isPlaying = signal(true);
  readonly followDriver = signal(true);
  readonly speedMultiplier = signal(1);
  readonly currentSpeed = signal(38);
  readonly progress = signal(0.15); // 0 to 1
  readonly hasArrived = signal(false);

  // Deterministic Courier Profile based on order ID
  readonly courier = computed<CourierProfile>(() => {
    const orderObj = this.order();
    const id = orderObj.id || 'NEXUS';
    const carrier = orderObj.carrier || '';
    
    // First try carrier string
    const match = carrier.match(/Nexus Fleet \(([^)]+)\)/i);
    let assignedName = match ? match[1] : null;

    // Fallback to tracking events description where admin assigned or partner accepted
    if (!assignedName && orderObj.trackingEvents) {
      const dpEvent = orderObj.trackingEvents.find((e: any) => 
        e.description?.includes('delivery partner') || 
        e.description?.includes('local partner')
      );
      if (dpEvent && dpEvent.description) {
        const partnerMatch = dpEvent.description.match(/partner\s+([^(]+)\s*\(/i);
        if (partnerMatch) {
          assignedName = partnerMatch[1].trim();
        }
      }
    }

    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const plates = [
      'DL-04-NX-2026',
      'MH-02-EX-4190',
      'CA-89-TR-7721',
      'NY-55-NX-1044',
      'KA-05-FD-8832',
    ];
    const name = assignedName || 'Local Courier';
    const plate = plates[hash % plates.length];
    const rating = +(4.9 + ((hash % 2) * 0.05)).toFixed(2);
    const trips = 1000 + (hash % 1200);

    return {
      name,
      phone: `+1 (555) ${100 + (hash % 899)}-${1000 + (hash % 8999)}`,
      rating,
      tripsCount: trips,
      vehicleType: assignedName ? 'Verified E-Cargo Van' : 'Electric Express Cargo Van',
      vehiclePlate: plate,
      avatarUrl: '',
    };
  });

  readonly telemetryCarrier = computed(() => {
    return this.order().carrier || 'Nexus Express Fleet';
  });

  // Street coordinates forming realistic road waypoints
  private routePoints: LatLngPoint[] = [];
  private totalDistanceMeters = 0;

  readonly remainingDistanceKm = computed(() => {
    const pct = this.progress();
    const remainingM = this.totalDistanceMeters * (1 - pct);
    return Math.max(0, +(remainingM / 1000).toFixed(1));
  });

  readonly etaMinutes = computed(() => {
    const km = this.remainingDistanceKm();
    if (km <= 0.05) return 0;
    // Avg speed 40 km/h -> 1.5 min per km
    return Math.max(1, Math.round(km * 1.5));
  });

  ngOnInit(): void {
    if (this.order()) {
      this.orderSocket.joinOrder(this.order().id);
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initLeafletMap();
  }

  ngOnDestroy(): void {
    if (this.order()) {
      this.orderSocket.leaveOrder(this.order().id);
    }
    this.stopAnimation();
    if (this.map) {
      try {
        this.map.remove();
      } catch {}
      this.map = null;
    }
  }

  private resolveLocation(): {
    baseLat: number;
    baseLng: number;
    hubTitle: string;
    dockTitle: string;
    fullAddress: string;
  } {
    const ord = this.order();
    const city = (ord.destinationCity || '').trim().toLowerCase();
    const region = (ord.destinationRegion || '').trim().toLowerCase();
    const country = (ord.destinationCountry || '').trim().toLowerCase();
    const address = ord.destinationAddress || '';
    const recipient = ord.recipientName || 'Buyer Enterprise Facility';

    // 1. Direct match on city
    let matchedConfig: CityGeoConfig | null = null;
    for (const [key, config] of Object.entries(CITY_DATABASE)) {
      if (city.includes(key) || key.includes(city) && city.length > 2) {
        matchedConfig = config;
        break;
      }
    }

    // 2. Region match
    if (!matchedConfig) {
      if (region.includes('gujarat') || region.includes('gj')) {
        matchedConfig = CITY_DATABASE['ahmedabad'];
      } else if (region.includes('maharashtra') || region.includes('mh')) {
        matchedConfig = CITY_DATABASE['mumbai'];
      } else if (region.includes('karnataka') || region.includes('ka')) {
        matchedConfig = CITY_DATABASE['bengaluru'];
      } else if (region.includes('delhi') || region.includes('dl')) {
        matchedConfig = CITY_DATABASE['delhi'];
      } else if (region.includes('california') || region.includes('ca')) {
        matchedConfig = CITY_DATABASE['san francisco'];
      } else if (region.includes('new york') || region.includes('ny')) {
        matchedConfig = CITY_DATABASE['new york'];
      } else if (region.includes('texas') || region.includes('tx')) {
        matchedConfig = CITY_DATABASE['austin'];
      }
    }

    // 3. Country fallback
    if (!matchedConfig) {
      if (country.includes('india') || country.includes('in')) {
        matchedConfig = CITY_DATABASE['ahmedabad'];
      } else if (country.includes('united states') || country.includes('us') || country.includes('usa')) {
        matchedConfig = CITY_DATABASE['san francisco'];
      } else if (country.includes('united kingdom') || country.includes('uk')) {
        matchedConfig = CITY_DATABASE['london'];
      } else if (country.includes('emirates') || country.includes('uae')) {
        matchedConfig = CITY_DATABASE['dubai'];
      } else if (country.includes('singapore')) {
        matchedConfig = CITY_DATABASE['singapore'];
      } else {
        // Fallback default
        matchedConfig = CITY_DATABASE['ahmedabad'];
      }
    }

    const hasExactCoords =
      ord.destinationLatitude !== null &&
      ord.destinationLatitude !== undefined &&
      ord.destinationLongitude !== null &&
      ord.destinationLongitude !== undefined;

    const cityName = ord.destinationCity || 'Regional';
    const hubTitle = matchedConfig.hubName || `${cityName} Logistics Dispatch Hub`;
    const dockTitle = `${recipient} · ${ord.destinationCity || 'Receiving Dock'}`;
    const fullAddress = address
      ? `${address}, ${ord.destinationCity || ''} ${ord.destinationPostalCode || ''}`.trim()
      : `${ord.destinationCity || 'Commercial Zone'}, ${ord.destinationCountry || ''}`;

    return {
      baseLat: hasExactCoords ? Number(ord.destinationLatitude) : matchedConfig.lat,
      baseLng: hasExactCoords ? Number(ord.destinationLongitude) : matchedConfig.lng,
      hubTitle,
      dockTitle,
      fullAddress,
    };
  }

  private async initLeafletMap(): Promise<void> {
    const L = await import('leaflet');

    const container = this.mapContainer().nativeElement;
    if (!container) return;

    // Generate realistic localized route based on order location & partner hub
    this.generateRoutePoints();

    if (this.routePoints.length < 2) return;

    const startPoint = this.routePoints[0];
    const endPoint = this.routePoints[this.routePoints.length - 1];

    // Initialize Map with custom options
    this.map = L.map(container, {
      center: [startPoint.lat, startPoint.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Disable auto-pan if user manually interacts with the map
    this.map.on('dragstart', () => {
      if (this.followDriver()) {
        this.followDriver.set(false);
      }
    });

    // Public OpenStreetMap Layer styled via CSS dark-mode invert filter (eliminates API key watermarks)
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(this.map);

    // Custom Origin Warehouse Marker
    const originIcon = L.divIcon({
      className: 'origin-marker-pin',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-500 shadow-xl text-indigo-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    this.originMarker = L.marker([startPoint.lat, startPoint.lng], { icon: originIcon })
      .bindPopup(`
        <div class="p-1 min-w-[190px]">
          <strong class="text-white text-xs block font-bold">${this.resolvedHubTitle}</strong>
          <p class="text-emerald-400 text-[11px] font-mono mt-0.5 font-bold">● Origin Dispatch Bay</p>
          <p class="text-zinc-400 text-[10px] mt-0.5">${this.telemetryCarrier()}</p>
        </div>
      `)
      .addTo(this.map);

    // Custom Destination Dock Marker
    const destinationIcon = L.divIcon({
      className: 'dest-marker-pin',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-400 shadow-xl text-emerald-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    this.destinationMarker = L.marker([endPoint.lat, endPoint.lng], { icon: destinationIcon })
      .bindPopup(`
        <div class="p-1 min-w-[200px]">
          <strong class="text-white text-xs block font-bold">${this.resolvedDockTitle}</strong>
          <p class="text-indigo-300 text-[11px] font-medium mt-0.5">${this.resolvedAddressText}</p>
          <p class="text-zinc-400 text-[10px] mt-0.5">Physical Barcode POD Signoff Required</p>
        </div>
      `)
      .addTo(this.map);

    // Remaining Polyline (Dashed glowing Indigo)
    const latLngArray = this.routePoints.map((p) => [p.lat, p.lng] as [number, number]);
    this.remainingPolyline = L.polyline(latLngArray, {
      color: '#6366f1',
      weight: 4,
      opacity: 0.6,
      dashArray: '8, 8',
    }).addTo(this.map);

    // Traveled Polyline (Solid glowing Emerald)
    this.traveledPolyline = L.polyline([], {
      color: '#10b981',
      weight: 5,
      opacity: 0.9,
    }).addTo(this.map);

    // Custom Moving Vehicle Marker with Rotating Van Icon and Pulsing Radar Wave
    const vehicleIcon = L.divIcon({
      className: 'vehicle-marker',
      html: `
        <div id="live-courier-vehicle" class="relative flex items-center justify-center w-10 h-10 transition-transform duration-100 ease-linear">
          <!-- Pulsing Radar Beacon -->
          <div class="absolute -inset-2 rounded-full bg-emerald-400/40 vehicle-radar-beacon pointer-events-none"></div>
          <!-- Vehicle Inner Badge -->
          <div class="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-zinc-950 border-2 border-emerald-400 text-emerald-300 shadow-2xl shadow-emerald-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const initialPos = this.getPositionAtProgress(this.progress());
    this.vehicleMarker = L.marker([initialPos.point.lat, initialPos.point.lng], {
      icon: vehicleIcon,
      zIndexOffset: 1000,
    }).addTo(this.map);

    // Fit view to include origin and destination bounds in the target city
    const bounds = L.latLngBounds(latLngArray);
    this.map.fitBounds(bounds, { padding: [40, 40] });

    if (this.order().status === 'DELIVERED') {
      // Order is already delivered, do not animate. Pin truck at the destination dock.
      this.progress.set(1);
      this.hasArrived.set(true);
      this.isPlaying.set(false);
      this.currentSpeed.set(0);
      this.isLiveBeaconActive.set(false);
      this.updateMapState(1);
    } else {
      // Start movement loop
      this.startAnimation();
    }
  }

  private generateRoutePoints(): void {
    const loc = this.resolveLocation();
    this.resolvedHubTitle = loc.hubTitle;
    this.resolvedDockTitle = loc.dockTitle;
    this.resolvedAddressText = loc.fullAddress;

    const id = this.order().id || 'NEXUS-01';
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Offset Hub and Dock realistically around the city coordinates
    const startLat = loc.baseLat - 0.018 - ((hash % 5) * 0.002);
    const startLng = loc.baseLng - 0.022 - ((hash % 5) * 0.002);
    const endLat = loc.baseLat + 0.015 + ((hash % 4) * 0.002);
    const endLng = loc.baseLng + 0.019 + ((hash % 4) * 0.002);

    // 14 Realistic street turns following urban street blocks
    const steps = 14;
    const points: LatLngPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const interpLat = startLat + (endLat - startLat) * t;
      const interpLng = startLng + (endLng - startLng) * t;

      // Realistic city street curve and grid turning
      const curve = Math.sin(t * Math.PI * 2 + (hash % 3)) * 0.004;
      const gridJitter = (i % 2 === 1 ? 0.0015 : -0.001) * Math.cos(t * Math.PI);

      points.push({
        lat: Number((interpLat + curve * 0.6 + gridJitter).toFixed(6)),
        lng: Number((interpLng + curve * 0.8).toFixed(6)),
      });
    }

    points[0] = { lat: startLat, lng: startLng };
    points[points.length - 1] = { lat: endLat, lng: endLng };
    this.routePoints = points;

    // Compute total distance
    let dist = 0;
    for (let i = 0; i < this.routePoints.length - 1; i++) {
      dist += this.haversineMeters(this.routePoints[i], this.routePoints[i + 1]);
    }
    this.totalDistanceMeters = dist || 6800; // ~6.8 km
  }

  private haversineMeters(p1: LatLngPoint, p2: LatLngPoint): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
    const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private getPositionAtProgress(pct: number): {
    point: LatLngPoint;
    heading: number;
    traveledPoints: LatLngPoint[];
    remainingPoints: LatLngPoint[];
  } {
    const totalPoints = this.routePoints.length;
    if (totalPoints === 0) {
      return {
        point: { lat: 0, lng: 0 },
        heading: 0,
        traveledPoints: [],
        remainingPoints: [],
      };
    }
    if (pct <= 0) {
      return {
        point: this.routePoints[0],
        heading: 45,
        traveledPoints: [this.routePoints[0]],
        remainingPoints: [...this.routePoints],
      };
    }
    if (pct >= 1) {
      return {
        point: this.routePoints[totalPoints - 1],
        heading: 45,
        traveledPoints: [...this.routePoints],
        remainingPoints: [],
      };
    }

    const targetDistance = this.totalDistanceMeters * pct;
    let accumulated = 0;

    for (let i = 0; i < totalPoints - 1; i++) {
      const p1 = this.routePoints[i];
      const p2 = this.routePoints[i + 1];
      const segmentDistance = this.haversineMeters(p1, p2);

      if (accumulated + segmentDistance >= targetDistance) {
        const segmentPct = (targetDistance - accumulated) / segmentDistance;
        const currentLat = p1.lat + (p2.lat - p1.lat) * segmentPct;
        const currentLng = p1.lng + (p2.lng - p1.lng) * segmentPct;

        // Calculate heading angle in degrees
        const dLat = p2.lat - p1.lat;
        const dLng = p2.lng - p1.lng;
        let heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        if (heading < 0) heading += 360;

        const currentPoint: LatLngPoint = { lat: currentLat, lng: currentLng };
        const traveled = [...this.routePoints.slice(0, i + 1), currentPoint];
        const remaining = [currentPoint, ...this.routePoints.slice(i + 1)];

        return {
          point: currentPoint,
          heading,
          traveledPoints: traveled,
          remainingPoints: remaining,
        };
      }

      accumulated += segmentDistance;
    }

    const last = this.routePoints[totalPoints - 1];
    return {
      point: last,
      heading: 45,
      traveledPoints: [...this.routePoints],
      remainingPoints: [],
    };
  }

  private startAnimation(): void {
    this.stopAnimation();

    const intervalMs = 250;
    this.animationTimer = setInterval(() => {
      if (!this.isPlaying()) return;

      const step = 0.0015 * this.speedMultiplier();
      let nextPct = this.progress() + step;

      if (nextPct >= 1) {
        nextPct = 1;
        this.progress.set(1);
        this.hasArrived.set(true);
        this.currentSpeed.set(0);
        this.updateMapState(1);
        this.stopAnimation();
        this.toast.success('Courier has arrived at your warehouse delivery dock!');
        return;
      }

      this.progress.set(nextPct);

      // Realistic speed variance (35 - 46 km/h)
      const baseSpeed = 40;
      const jitter = Math.floor(Math.sin(Date.now() / 2000) * 6);
      this.currentSpeed.set(baseSpeed + jitter);

      this.updateMapState(nextPct);
    }, intervalMs);
  }

  private stopAnimation(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  private updateMapState(pct: number): void {
    if (!this.map || !this.vehicleMarker) return;

    const { point, heading, traveledPoints, remainingPoints } = this.getPositionAtProgress(pct);

    // Update vehicle position
    this.vehicleMarker.setLatLng([point.lat, point.lng]);

    // Update vehicle icon rotation
    const el = document.getElementById('live-courier-vehicle');
    if (el) {
      el.style.transform = `rotate(${Math.round(heading)}deg)`;
    }

    // Update polylines
    if (this.traveledPolyline) {
      this.traveledPolyline.setLatLngs(traveledPoints.map((p) => [p.lat, p.lng]));
    }
    if (this.remainingPolyline) {
      this.remainingPolyline.setLatLngs(remainingPoints.map((p) => [p.lat, p.lng]));
    }

    // Auto-center camera if followDriver is active
    if (this.followDriver()) {
      this.map.panTo([point.lat, point.lng], { animate: false });
    }
  }

  private handleLiveDriverBeacon(lat: number, lng: number, heading?: number, speed?: number): void {
    this.isLiveBeaconActive.set(true);
    if (typeof speed === 'number') {
      this.currentSpeed.set(Math.max(0, Math.round(speed)));
    }

    if (!this.map || !this.vehicleMarker) return;

    // Update marker directly from real-world courier GPS coordinates
    this.vehicleMarker.setLatLng([lat, lng]);

    if (typeof heading === 'number') {
      const el = document.getElementById('live-courier-vehicle');
      if (el) {
        el.style.transform = `rotate(${Math.round(heading)}deg)`;
      }
    }

    if (this.followDriver()) {
      this.map.panTo([lat, lng], { animate: false });
    }

    // Check distance to destination dock
    if (this.routePoints.length > 0) {
      const dest = this.routePoints[this.routePoints.length - 1];
      const dist = this.haversineMeters({ lat, lng }, dest);
      if (dist <= 60 && !this.hasArrived()) {
        this.hasArrived.set(true);
        this.currentSpeed.set(0);
        this.toast.success('Live GPS: Courier has arrived at delivery destination dock!');
      }
    }
  }

  toggleSimulation(): void {
    this.isPlaying.update((v) => !v);
    if (this.isPlaying()) {
      if (this.progress() >= 1) {
        this.resetSimulation();
      } else {
        this.startAnimation();
      }
    }
  }

  resetSimulation(): void {
    this.progress.set(0.05);
    this.hasArrived.set(false);
    this.isPlaying.set(true);
    this.updateMapState(0.05);
    this.startAnimation();
  }

  setSpeedMultiplier(mult: number): void {
    this.speedMultiplier.set(mult);
  }

  toggleFollowDriver(): void {
    this.followDriver.update((v) => !v);
    if (this.followDriver() && this.vehicleMarker) {
      this.map.panTo(this.vehicleMarker.getLatLng(), { animate: true });
    }
  }

  callCourier(): void {
    const c = this.courier();
    this.toast.info(`Connecting direct line to courier ${c.name} (${c.phone})...`);
  }

  // 💬 Courier Interactive Chat State & Handlers
  readonly isCourierChatOpen = signal(false);
  readonly courierInputText = signal('');
  readonly isCourierTyping = signal(false);
  readonly courierChatMessages = signal<CourierChatMessage[]>([]);
  readonly courierChatScrollContainer = viewChild<ElementRef<HTMLDivElement>>('courierChatScrollContainer');
  readonly driverAutoReplyMode = signal<'AI_BOT' | 'MANUAL'>('AI_BOT');

  readonly courierQuickPresets = [
    { label: '🏢 At Loading Dock', text: "I'm currently waiting at the facility receiving dock." },
    { label: '📞 Call When Outside', text: "Please give me a call when you arrive outside the gate." },
    { label: '🔐 Gate Pass Ready', text: "Security gate has your vehicle details and visitor pass pre-approved." },
    { label: '⚡ Forklift Ready', text: "Receiving team and forklift are standing by for immediate offloading." },
  ];

  chatWithCourier(): void {
    const c = this.courier();
    this.isCourierChatOpen.set(true);

    // Initialize with realistic courier greeting if first time opening
    if (this.courierChatMessages().length === 0) {
      const orderNum = this.order().id ? this.order().id.slice(0, 8).toUpperCase() : 'NX-DELIVERY';
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.courierChatMessages.set([
        {
          id: 'init-courier-1',
          sender: 'courier',
          text: `Hello! I'm ${c.name} with ${this.telemetryCarrier()}. I've picked up your order consignment #${orderNum} and am currently en route to your receiving bay. Let me know if you have specific gate or loading dock instructions!`,
          time: timeStr,
        },
      ]);
    }
    this.scrollToChatBottom();
  }

  closeCourierChat(): void {
    this.isCourierChatOpen.set(false);
  }

  toggleDriverAutoReply(): void {
    this.driverAutoReplyMode.set(this.driverAutoReplyMode() === 'AI_BOT' ? 'MANUAL' : 'AI_BOT');
  }

  submitCourierMessage(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const text = this.courierInputText().trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message locally for immediate UI update
    const msgPayload = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: timeStr,
    };
    
    this.courierChatMessages.update((msgs) => [
      ...msgs,
      msgPayload as any,
    ]);
    this.courierInputText.set('');
    this.scrollToChatBottom();

    // Emit via socket
    this.orderSocket.sendChatMessage({
      orderId: this.order().id,
      text,
      sender: 'customer'
    });
  }

  sendPresetMessage(text: string): void {
    this.courierInputText.set(text);
    this.submitCourierMessage();
  }

  private triggerCourierReply(userText: string): void {
    const lower = userText.toLowerCase();
    const eta = this.etaMinutes();
    const isBot = this.driverAutoReplyMode() === 'AI_BOT';

    const typingDelay = isBot ? 400 : 2000;
    const replyDelay = isBot ? 1300 : 5000;

    setTimeout(() => {
      this.isCourierTyping.set(true);
      this.scrollToChatBottom();

      setTimeout(() => {
        let replyText = '';

        if (lower.includes('dock') || lower.includes('bay')) {
          replyText = isBot 
            ? `Understood! I'll maneuver directly into the designated receiving bay upon entering the compound.`
            : `Ok, will head to the bay.`;
        } else if (lower.includes('call') || lower.includes('phone') || lower.includes('ring')) {
          replyText = isBot
            ? `Will do! I have your contact saved and will ring your line as soon as I pull up to the main gate.`
            : `Will call when I arrive.`;
        } else if (lower.includes('gate') || lower.includes('pass') || lower.includes('security')) {
          replyText = isBot
            ? `Excellent, thank you! I have my Nexus digital waybill and QR delivery token ready to show security.`
            : `Got it, have the pass ready.`;
        } else if (lower.includes('forklift') || lower.includes('offload') || lower.includes('unload')) {
          replyText = isBot
            ? `Great, that will make turn-around much faster! The pallet freight is secured and ready for forklift transfer.`
            : `Ok, sounds good.`;
        } else {
          replyText = isBot
            ? `Copy that! Driving smoothly towards your destination. Current ETA is ~${eta} minutes.`
            : `Driving right now. ETA ${eta}m.`;
        }

        if (isBot) {
          replyText = `🤖 AI Assist: ${replyText}`;
        }

        const now = new Date();
        const replyTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this.isCourierTyping.set(false);
        this.courierChatMessages.update((msgs) => [
          ...msgs,
          {
            id: `courier-${Date.now()}`,
            sender: 'courier',
            text: replyText,
            time: replyTime,
          },
        ]);
        this.scrollToChatBottom();
      }, replyDelay);
    }, typingDelay);
  }

  private scrollToChatBottom(): void {
    setTimeout(() => {
      const el = this.courierChatScrollContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 60);
  }

  triggerQrScan(): void {
    this.qrScanRequested.emit();
  }
}

