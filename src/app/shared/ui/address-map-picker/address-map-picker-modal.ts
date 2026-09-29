import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCheck,
  LucideCrosshair,
  LucideLoader2,
  LucideMapPin,
  LucideSearch,
  LucideX,
} from '@lucide/angular';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  street?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-address-map-picker-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideMapPin,
    LucideSearch,
    LucideCrosshair,
    LucideCheck,
    LucideX,
    LucideLoader2,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        class="relative flex flex-col w-full max-w-3xl h-[90vh] max-h-[720px] rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/60">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <svg lucideMapPin class="h-5 w-5"></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>Select Physical Delivery Location</span>
                <span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                  GPS PINPOINT
                </span>
              </h3>
              <p class="text-xs text-zinc-400 mt-0.5">Move the map or search to pin your dock & auto-fill address details.</p>
            </div>
          </div>

          <button
            type="button"
            (click)="onClose()"
            class="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <svg lucideX class="h-5 w-5"></svg>
          </button>
        </div>

        <!-- Search Bar & Controls Bar -->
        <div class="relative z-20 border-b border-zinc-800/80 bg-zinc-900/40 p-3 flex items-center gap-2">
          <!-- Search Input -->
          <div class="relative flex-1">
            <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"></svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchInput($event)"
              placeholder="Search area, landmark, street, or city (e.g., Prahlad Nagar, S.G. Highway, SF Bay)..."
              class="w-full rounded-xl border border-zinc-700 bg-zinc-950/90 pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            @if (isSearching()) {
              <svg lucideLoader2 class="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 animate-spin"></svg>
            }
          </div>

          <!-- GPS Locate Me Button -->
          <button
            type="button"
            (click)="locateUserGps()"
            [disabled]="isLocatingGps()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition cursor-pointer active:scale-95 shrink-0"
            title="Locate Current Device Location"
          >
            @if (isLocatingGps()) {
              <svg lucideLoader2 class="h-3.5 w-3.5 animate-spin text-indigo-400"></svg>
              <span>Locating...</span>
            } @else {
              <svg lucideCrosshair class="h-3.5 w-3.5 text-indigo-400"></svg>
              <span>Use Current GPS</span>
            }
          </button>

          <!-- Search Results Dropdown -->
          @if (searchResults().length > 0) {
            <div
              class="absolute top-full left-3 right-3 sm:right-auto sm:w-[480px] mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl divide-y divide-zinc-800/80"
            >
              @for (res of searchResults(); track res.lat + res.lon) {
                <button
                  type="button"
                  (click)="selectSearchResult(res)"
                  class="w-full text-left p-2 hover:bg-zinc-800/80 rounded-lg text-xs text-zinc-200 transition flex items-start gap-2 cursor-pointer"
                >
                  <svg lucideMapPin class="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5"></svg>
                  <span class="line-clamp-2">{{ res.display_name }}</span>
                </button>
              }
            </div>
          }
        </div>

        <!-- Interactive Map Body with Floating Center Pin -->
        <div class="relative flex-1 w-full bg-zinc-950 overflow-hidden">
          <div #mapContainer class="h-full w-full z-0"></div>

          <!-- Center Target Pin (Stays fixed at screen center while map is panned) -->
          <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center -translate-y-4">
            <div class="relative flex flex-col items-center">
              <!-- Animated Pulse Ripple -->
              <div class="absolute -inset-3 rounded-full bg-emerald-400/30 animate-ping"></div>
              <!-- Glowing Pin Icon -->
              <div class="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-2xl shadow-emerald-500/80 border-2 border-white ring-4 ring-emerald-950">
                <svg lucideMapPin class="h-5 w-5"></svg>
              </div>
              <!-- Pin Pointer Stem -->
              <div class="w-1 h-3 bg-emerald-400 rounded-b shadow-md"></div>
              <div class="w-3 h-1 bg-black/60 rounded-full blur-[1px]"></div>
            </div>
          </div>

          <!-- Bottom Geocoded Address Preview Floating Card -->
          <div class="absolute bottom-3 left-3 right-3 z-30 pointer-events-auto">
            <div
              class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-zinc-700/80 bg-zinc-950/95 p-3.5 sm:px-4 sm:py-3.5 shadow-2xl backdrop-blur-xl"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                    LAT: {{ currentLat().toFixed(5) }}° · LNG: {{ currentLng().toFixed(5) }}°
                  </span>
                  @if (isGeocoding()) {
                    <span class="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                      <svg lucideLoader2 class="h-3 w-3 animate-spin text-emerald-400"></svg>
                      Resolving address...
                    </span>
                  }
                </div>

                <h4 class="text-xs sm:text-sm font-bold text-white truncate mt-1">
                  {{ currentAddress() || 'Move map to resolve location address...' }}
                </h4>
                <p class="text-[11px] text-zinc-400 truncate font-mono mt-0.5">
                  {{ currentCity() }} {{ currentState() ? ', ' + currentState() : '' }} {{ currentCountry() ? '· ' + currentCountry() : '' }} {{ currentPostal() ? '(' + currentPostal() + ')' : '' }}
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  (click)="onClose()"
                  class="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  (click)="confirmSelection()"
                  [disabled]="isGeocoding()"
                  class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                >
                  <svg lucideCheck class="h-4 w-4"></svg>
                  <span>Confirm & Auto-Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AddressMapPickerModalComponent implements AfterViewInit, OnDestroy {
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);
  readonly initialCity = input<string | null>(null);

  readonly locationSelected = output<PickedLocation>();
  readonly closed = output<void>();

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private map: any = null;
  private searchTimeout: any = null;
  private geocodeTimeout: any = null;

  readonly currentLat = signal<number>(23.0225);
  readonly currentLng = signal<number>(72.5714);
  readonly currentAddress = signal<string>('Loading address...');
  readonly currentCity = signal<string>('Ahmedabad');
  readonly currentState = signal<string>('Gujarat');
  readonly currentCountry = signal<string>('India');
  readonly currentPostal = signal<string>('380015');

  searchQuery = '';
  readonly searchResults = signal<SearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly isGeocoding = signal(false);
  readonly isLocatingGps = signal(false);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.geocodeTimeout) clearTimeout(this.geocodeTimeout);
    if (this.map) {
      try {
        this.map.remove();
      } catch {}
      this.map = null;
    }
  }

  private async initMap(): Promise<void> {
    const L = await import('leaflet');
    const container = this.mapContainer().nativeElement;
    if (!container) return;

    const startLat = this.initialLat() || 23.0225;
    const startLng = this.initialLng() || 72.5714;
    this.currentLat.set(startLat);
    this.currentLng.set(startLng);

    this.map = L.map(container, {
      center: [startLat, startLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark styled OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(this.map);

    // Initial reverse geocode
    this.reverseGeocode(startLat, startLng);

    // Trigger reverse geocoding whenever user finishes panning / dragging the map
    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      this.currentLat.set(center.lat);
      this.currentLng.set(center.lng);

      if (this.geocodeTimeout) clearTimeout(this.geocodeTimeout);
      this.geocodeTimeout = setTimeout(() => {
        this.reverseGeocode(center.lat, center.lng);
      }, 350);
    });
  }

  async reverseGeocode(lat: number, lng: number): Promise<void> {
    this.isGeocoding.set(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();

      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
        const houseNumber = addr.house_number ? `${addr.house_number}, ` : '';
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Ahmedabad';
        const state = addr.state || 'Gujarat';
        const country = addr.country || 'India';
        const postcode = addr.postcode || '';

        const fullStr = data.display_name || `${houseNumber}${road}, ${city}`;
        this.currentAddress.set(fullStr);
        this.currentCity.set(city);
        this.currentState.set(state);
        this.currentCountry.set(country);
        this.currentPostal.set(postcode);
      } else {
        this.currentAddress.set(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      this.currentAddress.set(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      this.isGeocoding.set(false);
    }
  }

  onSearchInput(val: string): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (!val || val.trim().length < 3) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchTimeout = setTimeout(async () => {
      try {
        // Photon API provides much better fuzzy search/autocomplete than standard Nominatim
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(val.trim())}&limit=10`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        
        const mapped = (data.features || []).map((f: any) => {
          const p = f.properties;
          const parts = [p.name, p.street, p.city || p.town, p.state, p.country].filter(Boolean);
          // deduplicate contiguous parts (sometimes name == city)
          const uniqueParts = parts.filter((item, pos, arr) => pos === 0 || item !== arr[pos - 1]);
          
          return {
            display_name: uniqueParts.join(', '),
            lat: f.geometry.coordinates[1].toString(),
            lon: f.geometry.coordinates[0].toString()
          };
        });
        
        this.searchResults.set(mapped);
      } catch {
        this.searchResults.set([]);
      } finally {
        this.isSearching.set(false);
      }
    }, 400);
  }

  selectSearchResult(item: SearchResult): void {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (this.map && !isNaN(lat) && !isNaN(lon)) {
      this.map.flyTo([lat, lon], 16, { animate: true, duration: 1 });
      this.searchResults.set([]);
      this.searchQuery = item.display_name;
    }
  }

  locateUserGps(): void {
    if (!navigator.geolocation) return;
    this.isLocatingGps.set(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.isLocatingGps.set(false);
        if (this.map) {
          this.map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
        }
      },
      () => {
        this.isLocatingGps.set(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  confirmSelection(): void {
    this.locationSelected.emit({
      latitude: Number(this.currentLat().toFixed(7)),
      longitude: Number(this.currentLng().toFixed(7)),
      formattedAddress: this.currentAddress(),
      city: this.currentCity(),
      state: this.currentState(),
      country: this.currentCountry(),
      postalCode: this.currentPostal(),
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
