import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { OrderView } from '@core/models';
import { ToastService } from '@core/services/toast.service';
import {
  LucidePrinter,
  LucideDownload,
  LucideCopy,
  LucideCheck,
  LucideX,
  LucideQrCode,
  LucideTruck,
  LucidePackage,
  LucideShieldCheck,
  LucideScanLine,
} from '@lucide/angular';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-packing-slip-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    LucidePrinter,
    LucideDownload,
    LucideCopy,
    LucideCheck,
    LucideX,
    LucideQrCode,
    LucideTruck,
    LucidePackage,
    LucideShieldCheck,
    LucideScanLine,
  ],
  template: `
    @let ord = order();
    @if (ord) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
        (click)="close.emit()"
      >
        <div
          class="relative w-full max-w-2xl rounded-2xl border border-zinc-700/80 bg-zinc-950 p-5 sm:p-6 text-zinc-100 shadow-2xl my-8"
          (click)="$event.stopPropagation()"
          id="printable-packing-slip"
        >
          <!-- Header / Warehouse Manifest Note -->
          <div class="border-b border-zinc-800/80 pb-4 mb-5">
            <div class="flex items-start justify-between gap-3">
              <!-- Left: Brand Icon & Title -->
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner">
                  <svg lucidePackage class="h-6 w-6"></svg>
                </div>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                      Nexus Warehouse Packing List
                    </h2>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase border border-indigo-500/30 tracking-wider">
                      Signoff Note
                    </span>
                  </div>
                  <p class="text-xs text-zinc-400 mt-0.5">Official Physical Dispatch & Dock Signoff Manifest</p>
                </div>
              </div>

              <!-- Right: Order Reference, Date & Non-overlapping Close Button -->
              <div class="flex items-center gap-3 shrink-0">
                <div class="text-right">
                  <div class="inline-flex items-center font-mono text-xs font-black text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2.5 py-1 rounded-lg shadow-sm">
                    #NX-{{ ord.id.slice(0, 8).toUpperCase() }}
                  </div>
                  <div class="text-[11px] text-zinc-400 mt-0.5">
                    Issued: {{ ord.createdAt | date: 'mediumDate' }}
                  </div>
                </div>

                <button
                  type="button"
                  (click)="close.emit()"
                  class="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition cursor-pointer print:hidden"
                  title="Close"
                >
                  <svg lucideX class="h-5 w-5"></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 📱 72-Hour Inspection & Delivery QR Code Section -->
          <div class="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-zinc-900/90 to-zinc-950 p-5 mb-5 shadow-xl shadow-indigo-950/20 backdrop-blur-sm">
            <!-- Background subtle glow -->
            <div class="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl"></div>

            <div class="flex flex-col sm:flex-row items-center gap-5">
              <!-- Rendered QR Code -->
              <div class="shrink-0 bg-white p-3 rounded-2xl border-2 border-white/40 shadow-xl shadow-black/40 flex flex-col items-center">
                @if (qrCodeDataUrl()) {
                  <img
                    [src]="qrCodeDataUrl()"
                    alt="Warehouse Delivery Signoff QR Code"
                    class="h-32 w-32 object-contain"
                  />
                  <span class="mt-1 text-[9px] font-mono font-bold tracking-widest text-zinc-700 uppercase">
                    Scan with camera
                  </span>
                } @else {
                  <div class="h-32 w-32 flex items-center justify-center text-zinc-800 font-mono text-xs">
                    Generating…
                  </div>
                }
              </div>

              <!-- QR Instructions & Token Copy -->
              <div class="flex-1 w-full text-center sm:text-left">
                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <span class="inline-flex items-center gap-1.5 text-xs font-black uppercase text-indigo-200 bg-indigo-500/25 px-2.5 py-1 rounded-lg border border-indigo-400/30 shadow-sm">
                    <svg lucideQrCode class="h-3.5 w-3.5 text-indigo-300"></svg>
                    <span>Dock Delivery Signoff QR</span>
                  </span>
                  <span class="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    <svg lucideShieldCheck class="h-3.5 w-3.5"></svg>
                    <span>Triggers 72h Inspection SLA</span>
                  </span>
                </div>

                <p class="text-xs text-zinc-300 leading-relaxed">
                  Scan this QR code using any smartphone camera, tablet, or warehouse webcam upon delivery arrival.
                  Scanning verifies physical arrival and starts the <strong class="text-white">72-Hour Inspection Window</strong>.
                </p>

                <!-- Token Display & Actions Bar -->
                <div class="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <div class="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 shadow-inner">
                    <span class="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold">Token:</span>
                    <span class="font-mono text-xs font-black text-indigo-300 tracking-wide select-all">
                      {{ displayToken() }}
                    </span>
                  </div>

                  <button
                    type="button"
                    (click)="copyCode()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition cursor-pointer active:scale-95 print:hidden"
                    title="Copy signoff token"
                  >
                    @if (copied()) {
                      <svg lucideCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                      <span class="text-emerald-400 font-bold">Copied</span>
                    } @else {
                      <svg lucideCopy class="h-3.5 w-3.5 text-zinc-400"></svg>
                      <span>Copy</span>
                    }
                  </button>

                  <button
                    type="button"
                    (click)="testScanNow()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95 print:hidden sm:ml-auto"
                    title="Simulate scanning this delivery QR code now"
                  >
                    <svg lucideScanLine class="h-3.5 w-3.5"></svg>
                    <span>Test Scan Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Logistics & Consignee Summary -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
            <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Carrier Dispatch</span>
              <div class="font-bold text-white flex items-center gap-2">
                <svg lucideTruck class="h-4 w-4 text-emerald-400"></svg>
                <span>{{ ord.carrier || 'Nexus Priority Freight' }}</span>
              </div>
              <div class="text-[11px] font-mono text-indigo-300 mt-1">
                Tracking: {{ ord.trackingNumber || 'Pending Courier Scan' }}
              </div>
            </div>

            <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Consignee Receiving Bay</span>
              <div class="font-bold text-white truncate">
                {{ ord.customerEmail || 'Enterprise Consignee' }}
              </div>
              <div class="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Status: <strong class="text-zinc-200">{{ ord.status }}</strong></span>
                <span>•</span>
                <span>{{ ord.items.length }} {{ ord.items.length === 1 ? 'Manifest Item' : 'Manifest Items' }}</span>
              </div>
            </div>
          </div>

          <!-- Manifest Items Table -->
          <div class="border border-zinc-800/80 rounded-xl overflow-hidden mb-5">
            <div class="bg-zinc-900/90 px-4 py-2.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between border-b border-zinc-800/80">
              <span>Item & SKU</span>
              <div class="flex items-center gap-8">
                <span>Supplier</span>
                <span>Qty</span>
              </div>
            </div>
            <div class="divide-y divide-zinc-800/60 bg-zinc-950/40 text-xs">
              @for (item of ord.items; track item.id) {
                <div class="px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-900/30 transition">
                  <div class="min-w-0">
                    <p class="font-semibold text-white truncate">{{ item.productTitle }}</p>
                    <p class="text-[10px] font-mono text-zinc-500">SKU-{{ item.productId.slice(0, 8).toUpperCase() }}</p>
                  </div>
                  <div class="flex items-center gap-8 shrink-0 text-right">
                    <span class="text-zinc-400 text-[11px]">{{ item.storeName || 'Verified Vendor' }}</span>
                    <span class="font-bold font-mono text-white text-sm bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800 shadow-sm">
                      {{ item.quantity }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Modal Actions (Print, Download, Close) -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 print:hidden">
            <div class="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>Nexus B2B Supply Chain Protocol • SafeTrade Escrow</span>
            </div>

            <div class="flex items-center gap-2.5">
              <button
                type="button"
                (click)="printSlip()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/90 px-4 py-2 text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-700 active:scale-95 transition cursor-pointer shadow-sm"
              >
                <svg lucidePrinter class="h-4 w-4 text-indigo-400"></svg>
                <span>Print Packing Slip</span>
              </button>

              <button
                type="button"
                (click)="downloadPdf.emit()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-4 py-2 text-xs font-bold text-white active:scale-95 transition cursor-pointer shadow-lg shadow-indigo-600/25"
              >
                <svg lucideDownload class="h-4 w-4"></svg>
                <span>Download PDF Waybill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @media print {
      body * {
        visibility: hidden;
      }
      #printable-packing-slip, #printable-packing-slip * {
        visibility: visible;
      }
      #printable-packing-slip {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 20px;
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
      }
    }
  `],
})
export class PackingSlipModalComponent implements OnInit {
  private readonly toast = inject(ToastService);

  readonly order = input.required<OrderView>();
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly downloadPdf = new EventEmitter<void>();
  @Output() readonly scanCodeRequested = new EventEmitter<string>();

  readonly qrCodeDataUrl = signal<string>('');
  readonly copied = signal(false);

  ngOnInit() {
    this.generateQrCode();
  }

  displayToken(): string {
    const o = this.order();
    if (!o) return '';
    return o.deliveryQrToken || `NX-DLV-${o.id.substring(0, 8).toUpperCase()}`;
  }

  private async generateQrCode() {
    const o = this.order();
    if (!o) return;

    const token = this.displayToken();
    const payload = JSON.stringify({
      type: 'NEXUS_DELIVERY_SIGNOFF',
      orderId: o.id,
      token,
      carrier: o.carrier,
      trackingNumber: o.trackingNumber,
      amount: o.totalAmount,
    });

    try {
      const url = await QRCode.toDataURL(payload, {
        width: 256,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      this.qrCodeDataUrl.set(url);
    } catch {
      // Fallback: direct token URL
      try {
        const fallbackUrl = await QRCode.toDataURL(`NEXUS-DELIVERY:${o.id}:${token}`);
        this.qrCodeDataUrl.set(fallbackUrl);
      } catch {}
    }
  }

  copyCode() {
    const token = this.displayToken();
    navigator.clipboard.writeText(token).then(() => {
      this.copied.set(true);
      this.toast.success('Signoff code copied to clipboard');
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  testScanNow() {
    const token = this.displayToken();
    this.close.emit();
    this.scanCodeRequested.emit(token);
  }

  printSlip() {
    window.print();
  }
}
