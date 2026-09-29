import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EligibleDeliveryPartner,
  LogisticsCarrier,
  LogisticsCarriers,
  OrderStatus,
  OrderStatuses,
  getCarrierTrackingUrl,
} from '@core/models';
import { DeliveryPartnerService } from '@core/services/delivery-partner.service';
import {
  LucideCheckCircle2,
  LucideExternalLink,
  LucideMapPin,
  LucideSparkles,
  LucideTruck,
  LucideUserCheck,
  LucideX,
} from '@lucide/angular';

export interface FulfillmentPayload {
  orderId?: string;
  orderItemId?: string;
  status: OrderStatus;
  carrier?: LogisticsCarrier | string;
  trackingNumber?: string;
  trackingUrl?: string;
  checkpointLocation?: string;
  checkpointNote?: string;
  estimatedDelivery?: string;
  deliveryPartnerId?: string;
}

@Component({
  selector: 'app-fulfillment-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideTruck,
    LucideX,
    LucideExternalLink,
    LucideCheckCircle2,
    LucideSparkles,
    LucideUserCheck,
  ],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn"
        (click)="onBackdropClick($event)"
      >
        <div
          class="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-700/80 bg-zinc-900 shadow-2xl p-6 sm:p-7 text-zinc-100 animate-scaleUp"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-zinc-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <svg lucideTruck class="h-6 w-6"></svg>
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-white">Update Fulfillment & Tracking</h3>
                <p class="text-xs text-zinc-400 mt-0.5">
                  {{ targetTitle() || 'Assign carrier logistics or local fleet dispatch' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              title="Close modal"
            >
              <svg lucideX class="h-5 w-5"></svg>
            </button>
          </div>

          <!-- Form Body -->
          <div class="space-y-5 pt-5">
            <!-- Shipment Stage Selector -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Shipment Status Stage *
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                @for (stage of availableStages; track stage.value) {
                  <button
                    type="button"
                    (click)="selectedStatus.set(stage.value)"
                    class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer"
                    [class]="selectedStatus() === stage.value 
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                      : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'"
                  >
                    <span>{{ stage.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Dispatch Method Selector -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Fulfillment Channel & Assignment
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="dispatchMode.set('PARTNER')"
                  class="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer"
                  [class]="dispatchMode() === 'PARTNER'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:text-white'"
                >
                  <svg lucideUserCheck class="h-4 w-4"></svg>
                  <span>Local Delivery Partner</span>
                </button>
                <button
                  type="button"
                  (click)="dispatchMode.set('CARRIER'); selectedPartnerId.set(null)"
                  class="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer"
                  [class]="dispatchMode() === 'CARRIER'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:text-white'"
                >
                  <svg lucideTruck class="h-4 w-4"></svg>
                  <span>National Freight Carrier</span>
                </button>
              </div>
            </div>

            <!-- Approved Local Delivery Partners List (PARTNER mode) -->
            @if (dispatchMode() === 'PARTNER') {
              <div class="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Verified Fleet ({{ destinationArea()?.city || 'Local' }})
                    </span>
                    <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.5">
                      Admin Approved Only
                    </span>
                  </div>
                  @if (loadingPartners()) {
                    <span class="text-[11px] text-zinc-400 animate-pulse">Matching fleet...</span>
                  }
                </div>

                @if (eligiblePartners().length === 0 && !loadingPartners()) {
                  <p class="text-xs text-zinc-400 py-2">
                    No approved delivery partners found in {{ destinationArea()?.city || 'this area' }}. Switch to National Carrier or approve a driver in Admin Fleet.
                  </p>
                } @else {
                  <div class="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                    @for (partner of eligiblePartners(); track partner.id) {
                      <div
                        (click)="selectPartner(partner)"
                        class="p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                        [class]="selectedPartnerId() === partner.id
                          ? 'border-emerald-500 bg-emerald-950/40 text-white ring-1 ring-emerald-400'
                          : 'border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700'"
                      >
                        <div class="flex items-center gap-2.5">
                          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 font-bold text-[11px]">
                            {{ partner.full_name?.charAt(0) || 'D' }}
                          </span>
                          <div>
                            <p class="font-bold text-zinc-100 flex items-center gap-1.5">
                              <span>{{ partner.full_name }}</span>
                              <span class="text-[10px] text-amber-400">⭐ {{ partner.rating }}</span>
                            </p>
                            <p class="text-[11px] text-zinc-400 font-mono">
                              {{ partner.vehicle_type }} • {{ partner.vehicle_plate_number }} ({{ partner.city }})
                            </p>
                          </div>
                        </div>

                        <div class="text-right">
                          <span class="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 uppercase">
                            {{ partner.city === destinationArea()?.city ? 'Exact City' : 'Regional' }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <!-- Logistics Carrier Selection -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Logistics Carrier Partner
                </label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  @for (c of carrierList; track c.value) {
                    <button
                      type="button"
                      (click)="selectedCarrier.set(c.value)"
                      class="px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer text-center truncate"
                      [class]="selectedCarrier() === c.value
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white hover:border-zinc-700'"
                    >
                      {{ c.label }}
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Tracking Number with Sample Generator -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Tracking Number / Waybill
                </label>
                <button
                  type="button"
                  (click)="generateSampleTrackingNumber()"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  title="Generate realistic carrier tracking number for testing"
                >
                  <svg lucideSparkles class="h-3.5 w-3.5"></svg>
                  <span>Auto-Generate #</span>
                </button>
              </div>
              <input
                type="text"
                [ngModel]="trackingNumber()"
                (ngModelChange)="trackingNumber.set($event)"
                placeholder="e.g. 783920194820 or NX-DP-VAN-9928"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono transition"
              />

              <!-- Carrier Tracking Link Preview -->
              @if (computedTrackingUrl(); as url) {
                <div class="mt-2 flex items-center gap-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20 px-3 py-2 text-xs text-indigo-300">
                  <svg lucideExternalLink class="h-3.5 w-3.5 shrink-0 text-indigo-400"></svg>
                  <span class="truncate">Live Carrier Portal: <a [href]="url" target="_blank" rel="noopener noreferrer" class="underline hover:text-indigo-200">{{ url }}</a></span>
                </div>
              }
            </div>

            <!-- Estimated Delivery Date & Checkpoint Location -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  [ngModel]="estimatedDelivery()"
                  (ngModelChange)="estimatedDelivery.set($event)"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Current Checkpoint Location
                </label>
                <input
                  type="text"
                  [ngModel]="checkpointLocation()"
                  (ngModelChange)="checkpointLocation.set($event)"
                  placeholder="e.g. San Francisco Sort Hub, CA"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <!-- Checkpoint Activity Note -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Checkpoint Log & Customer Update Note
              </label>
              <textarea
                rows="2"
                [ngModel]="checkpointNote()"
                (ngModelChange)="checkpointNote.set($event)"
                placeholder="Details of this shipment update that will be visible in the tracking timeline and live notification..."
                class="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              ></textarea>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="mt-7 flex items-center justify-end gap-3 border-t border-zinc-800 pt-5">
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              [disabled]="submitting()"
              (click)="submit()"
              class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              @if (submitting()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Updating…</span>
              } @else {
                <svg lucideCheckCircle2 class="h-4 w-4"></svg>
                <span>Save & Notify Customer</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FulfillmentModal {
  private readonly partnerService = inject(DeliveryPartnerService);

  readonly open = input(false);
  readonly orderId = input<string | null>(null);
  readonly orderItemId = input<string | null>(null);
  readonly initialStatus = input<OrderStatus>(OrderStatuses.PROCESSING);
  readonly initialCarrier = input<string | null | undefined>(undefined);
  readonly initialTrackingNumber = input<string | null | undefined>(undefined);
  readonly initialEstimatedDelivery = input<string | null | undefined>(undefined);
  readonly targetTitle = input<string>('');

  readonly closed = output<void>();
  readonly submitted = output<FulfillmentPayload>();

  readonly dispatchMode = signal<'CARRIER' | 'PARTNER'>('PARTNER');
  readonly eligiblePartners = signal<EligibleDeliveryPartner[]>([]);
  readonly selectedPartnerId = signal<string | null>(null);
  readonly destinationArea = signal<{ city: string; region: string; country: string } | null>(null);
  readonly loadingPartners = signal(false);

  readonly selectedStatus = signal<OrderStatus>(OrderStatuses.PROCESSING);
  readonly selectedCarrier = signal<LogisticsCarrier>(LogisticsCarriers.FEDEX);
  readonly trackingNumber = signal<string>('');
  readonly checkpointLocation = signal<string>('San Francisco Distribution Hub');
  readonly checkpointNote = signal<string>('');
  readonly estimatedDelivery = signal<string>('');
  readonly submitting = signal(false);

  readonly availableStages: { value: OrderStatus; label: string }[] = [
    { value: OrderStatuses.PROCESSING, label: 'Processing' },
    { value: OrderStatuses.SHIPPED, label: 'Shipped' },
    { value: OrderStatuses.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
    { value: OrderStatuses.DELIVERED, label: 'Delivered' },
  ];

  readonly carrierList: { value: LogisticsCarrier; label: string }[] = [
    { value: LogisticsCarriers.FEDEX, label: 'FedEx' },
    { value: LogisticsCarriers.DHL, label: 'DHL Express' },
    { value: LogisticsCarriers.UPS, label: 'UPS' },
    { value: LogisticsCarriers.USPS, label: 'USPS' },
    { value: LogisticsCarriers.BLUEDART, label: 'BlueDart' },
    { value: LogisticsCarriers.DELHIVERY, label: 'Delhivery' },
    { value: LogisticsCarriers.OTHER, label: 'Other' },
  ];

  readonly computedTrackingUrl = computed(() => {
    const carrier = this.selectedCarrier();
    const trk = this.trackingNumber().trim();
    if (!trk) return '';
    return getCarrierTrackingUrl(carrier, trk);
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        const initStat = this.initialStatus();
        this.selectedStatus.set(
          initStat === OrderStatuses.PENDING ? OrderStatuses.PROCESSING : initStat,
        );

        if (this.initialCarrier()) {
          this.selectedCarrier.set(this.initialCarrier() as LogisticsCarrier);
        }
        if (this.initialTrackingNumber()) {
          this.trackingNumber.set(this.initialTrackingNumber()!);
        }
        if (this.initialEstimatedDelivery()) {
          try {
            const d = new Date(this.initialEstimatedDelivery()!);
            this.estimatedDelivery.set(d.toISOString().slice(0, 10));
          } catch {
            this.estimatedDelivery.set('');
          }
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 3);
          this.estimatedDelivery.set(d.toISOString().slice(0, 10));
        }

        const oid = this.orderId();
        if (oid) {
          this.loadingPartners.set(true);
          this.partnerService.getEligiblePartners(oid).subscribe({
            next: (res) => {
              this.eligiblePartners.set(res.eligiblePartners || []);
              this.destinationArea.set(res.destinationArea);
              this.loadingPartners.set(false);
              if (res.eligiblePartners && res.eligiblePartners.length > 0) {
                this.dispatchMode.set('PARTNER');
                this.selectPartner(res.eligiblePartners[0]);
              }
            },
            error: () => {
              this.loadingPartners.set(false);
            },
          });
        }
      }
    });
  }

  selectPartner(partner: EligibleDeliveryPartner) {
    this.selectedPartnerId.set(partner.id);
    this.selectedCarrier.set(LogisticsCarriers.OTHER);
    const ordId = this.orderId() || '';
    const cleanPlate = (partner.vehicle_plate_number || 'VAN').replace(/[^A-Za-z0-9]/g, '');
    this.trackingNumber.set(`NX-DP-${cleanPlate}-${ordId.slice(0, 6).toUpperCase()}`);
    this.checkpointLocation.set(`${partner.city}, ${partner.country}`);
    this.checkpointNote.set(`Assigned to verified local delivery partner ${partner.full_name} (${partner.vehicle_type})`);
  }

  generateSampleTrackingNumber() {
    const carrier = this.selectedCarrier();
    const rand = (len: number) => Math.floor(Math.random() * Math.pow(10, len)).toString().padStart(len, '0');
    let num = '';

    switch (carrier) {
      case LogisticsCarriers.FEDEX:
        num = `FX${rand(10)}`;
        break;
      case LogisticsCarriers.DHL:
        num = `DHL${rand(8)}`;
        break;
      case LogisticsCarriers.UPS:
        num = `1Z${rand(6)}02${rand(8)}`;
        break;
      case LogisticsCarriers.USPS:
        num = `94001${rand(15)}`;
        break;
      case LogisticsCarriers.BLUEDART:
        num = `BD${rand(9)}`;
        break;
      case LogisticsCarriers.DELHIVERY:
        num = `DLV${rand(10)}`;
        break;
      default:
        num = `TRK${rand(10)}`;
        break;
    }
    this.trackingNumber.set(num);
  }

  onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.closed.emit();
    }
  }

  submit() {
    this.submitting.set(true);
    const isPartner = this.dispatchMode() === 'PARTNER' && !!this.selectedPartnerId();
    const partner = this.eligiblePartners().find((p) => p.id === this.selectedPartnerId());

    const payload: FulfillmentPayload = {
      orderId: this.orderId() || undefined,
      orderItemId: this.orderItemId() || undefined,
      status: this.selectedStatus(),
      carrier: isPartner ? `Nexus Fleet (${partner?.full_name || 'Courier'})` : this.selectedCarrier(),
      trackingNumber: this.trackingNumber().trim() || undefined,
      trackingUrl: this.computedTrackingUrl() || undefined,
      checkpointLocation: this.checkpointLocation().trim() || undefined,
      checkpointNote: this.checkpointNote().trim() || undefined,
      estimatedDelivery: this.estimatedDelivery() || undefined,
      deliveryPartnerId: isPartner ? this.selectedPartnerId()! : undefined,
    };
    this.submitted.emit(payload);
    setTimeout(() => this.submitting.set(false), 500);
  }
}
