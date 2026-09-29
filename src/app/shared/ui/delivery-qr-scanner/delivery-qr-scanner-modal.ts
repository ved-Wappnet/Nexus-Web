import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  input,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderView } from '@core/models';
import { OrderService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCamera,
  LucideSwitchCamera,
  LucideZap,
  LucideZapOff,
  LucideKeyboard,
  LucideX,
  LucideCheckCircle2,
  LucideScanLine,
  LucideAlertCircle,
  LucideSparkles,
} from '@lucide/angular';
import jsQR from 'jsqr';

@Component({
  selector: 'app-delivery-qr-scanner-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideCamera,
    LucideSwitchCamera,
    LucideZap,
    LucideZapOff,
    LucideKeyboard,
    LucideX,
    LucideCheckCircle2,
    LucideScanLine,
    LucideAlertCircle,
    LucideSparkles,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      (click)="onClose()"
    >
      <div
        class="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-5 sm:p-6 text-zinc-100 shadow-2xl my-6"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 mb-4 border-b border-zinc-800/80 pb-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <svg lucideScanLine class="h-6 w-6"></svg>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Warehouse Delivery Scanner
                </h2>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase border border-cyan-500/30 tracking-wider">
                  Live
                </span>
              </div>
              <p class="text-xs text-zinc-400 mt-0.5">Scan packing list QR code to verify dock arrival & start 72h SLA</p>
            </div>
          </div>

          <button
            type="button"
            (click)="onClose()"
            class="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition cursor-pointer shrink-0"
            title="Close Scanner"
          >
            <svg lucideX class="h-5 w-5"></svg>
          </button>
        </div>

        <!-- Mode Switcher: Live Camera vs Manual Code Entry -->
        <div class="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 mb-4">
          <button
            type="button"
            (click)="setMode('CAMERA')"
            class="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer"
            [class]="mode() === 'CAMERA' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'"
          >
            <svg lucideCamera class="h-3.5 w-3.5"></svg>
            <span>Live Camera Scanner</span>
          </button>
          <button
            type="button"
            (click)="setMode('MANUAL')"
            class="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer"
            [class]="mode() === 'MANUAL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'"
          >
            <svg lucideKeyboard class="h-3.5 w-3.5"></svg>
            <span>Manual Code Entry</span>
          </button>
        </div>

        <!-- Success Result Overlay -->
        @if (verifiedResult(); as res) {
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 text-center my-3 animate-fade-in"
               [class]="res.alreadyActive ? 'border-blue-500/40 bg-blue-950/20' : ''">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full border mb-3"
                 [class]="res.alreadyActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'">
              @if (res.alreadyActive) {
                <svg lucideAlertCircle class="h-8 w-8"></svg>
              } @else {
                <svg lucideCheckCircle2 class="h-8 w-8"></svg>
              }
            </div>
            <h3 class="text-base font-extrabold text-white">
              {{ res.alreadyActive ? 'Already Verified!' : 'Delivery Verified Successfully!' }}
            </h3>
            <p class="text-xs mt-1" [class]="res.alreadyActive ? 'text-blue-300' : 'text-emerald-300'">
              {{ res.message }}
            </p>

            <div class="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 my-3 text-left space-y-1.5 font-mono text-xs">
              <div class="flex justify-between text-zinc-400">
                <span>Order Ref:</span>
                <strong class="text-white">#NX-{{ res.order?.id?.slice(0, 8)?.toUpperCase() }}</strong>
              </div>
              <div class="flex justify-between text-zinc-400">
                <span>Status:</span>
                <span class="text-emerald-400 font-bold">DELIVERED</span>
              </div>
              <div class="flex justify-between text-zinc-400">
                <span>72H SLA Window:</span>
                <span class="text-cyan-300 font-bold">ACTIVE (Ticking Down)</span>
              </div>
            </div>

            <button
              type="button"
              (click)="onCompleteSuccess()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 active:scale-95 transition cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              <svg lucideSparkles class="h-4 w-4"></svg>
              <span>View Order & 72H Countdown</span>
            </button>
          </div>
        } @else {
          <!-- LIVE CAMERA MODE -->
          @if (mode() === 'CAMERA') {
            <div class="relative w-full aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center shadow-inner">
              <!-- Video Element for MediaStream -->
              <video
                #videoElement
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover"
                (loadedmetadata)="onVideoMetadataLoaded()"
              ></video>

              <!-- Offscreen Canvas for Frame Extraction -->
              <canvas #canvasElement class="hidden"></canvas>

              <!-- Viewfinder HUD Overlay -->
              <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <!-- Reticle Frame -->
                <div class="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35)]">
                  <!-- Corner Accents -->
                  <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-300 rounded-tl-lg"></div>
                  <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-300 rounded-tr-lg"></div>
                  <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-300 rounded-bl-lg"></div>
                  <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-300 rounded-br-lg"></div>

                  <!-- Laser Sweep Animation -->
                  @if (isScanning() && !isProcessing()) {
                    <div class="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-laser"></div>
                  }
                </div>

                <!-- Guidance message -->
                <div class="mt-4 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-700/60 text-[11px] font-mono text-zinc-300 shadow">
                  @if (isProcessing()) {
                    <span class="text-cyan-300 font-bold animate-pulse">Verifying code with server…</span>
                  } @else if (cameraError()) {
                    <span class="text-rose-400 font-bold">{{ cameraError() }}</span>
                  } @else {
                    Align Packing Slip QR Code inside frame
                  }
                </div>
              </div>

              <!-- Camera Controls Toolbar -->
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                <button
                  type="button"
                  (click)="flipCamera()"
                  class="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 backdrop-blur-md transition cursor-pointer"
                  title="Switch Front/Rear Camera"
                >
                  <svg lucideSwitchCamera class="h-4 w-4"></svg>
                </button>

                @if (hasTorchSupport()) {
                  <button
                    type="button"
                    (click)="toggleTorch()"
                    class="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 backdrop-blur-md transition cursor-pointer"
                    [class.text-amber-300]="torchOn()"
                    title="Toggle Flashlight"
                  >
                    @if (torchOn()) {
                      <svg lucideZap class="h-4 w-4 text-amber-400"></svg>
                    } @else {
                      <svg lucideZapOff class="h-4 w-4"></svg>
                    }
                  </button>
                }
              </div>
            </div>

            @if (cameraError()) {
              <div class="my-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                <svg lucideAlertCircle class="h-4 w-4 shrink-0 text-rose-400 mt-0.5"></svg>
                <div>
                  <p class="font-bold">Camera Access Issue</p>
                  <p class="text-[11px] text-rose-300/80 mt-0.5">{{ cameraError() }} You can switch to the Manual Code Entry tab above.</p>
                </div>
              </div>
            }
          } @else {
            <!-- MANUAL ENTRY MODE -->
            <div class="space-y-4 my-2">
              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Delivery Signoff Code or Raw QR Payload
                </label>
                <div class="relative">
                  <input
                    type="text"
                    [(ngModel)]="manualCode"
                    placeholder="e.g. NX-DLV-8B4F2A-9E10 or paste JSON payload"
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-2.5 px-3.5 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    (keydown.enter)="submitManualCode()"
                  />
                </div>
                <p class="text-[10px] text-zinc-500 mt-1">
                  You can find this alphanumeric code printed on the official Warehouse Packing List.
                </p>
              </div>

              <!-- Quick Submit Button -->
              <button
                type="button"
                [disabled]="!manualCode.trim() || isProcessing()"
                (click)="submitManualCode()"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 active:scale-95 transition cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                @if (isProcessing()) {
                  <span>Verifying…</span>
                } @else {
                  <svg lucideCheckCircle2 class="h-4 w-4"></svg>
                  <span>Verify Delivery & Start 72h SLA</span>
                }
              </button>

              <!-- Quick Test Order Suggestions -->
              @if (presetOrders().length > 0) {
                <div class="pt-3 border-t border-zinc-800">
                  <span class="text-[11px] font-bold uppercase text-zinc-400 block mb-2">
                    Quick-Fill Test Orders (Dock Arrivals)
                  </span>
                  <div class="space-y-1.5 max-h-36 overflow-y-auto">
                    @for (testOrd of presetOrders(); track testOrd.id) {
                      <button
                        type="button"
                        (click)="selectPresetOrder(testOrd)"
                        class="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 text-left transition cursor-pointer text-xs"
                      >
                        <div class="truncate">
                          <span class="font-mono font-bold text-white">#NX-{{ testOrd.id.slice(0, 8).toUpperCase() }}</span>
                          <span class="text-zinc-400 text-[11px] ml-1.5">({{ testOrd.status }})</span>
                        </div>
                        <span class="text-[10px] text-indigo-400 font-mono font-semibold shrink-0">
                          Click to Fill
                        </span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes laser {
      0% { top: 0%; opacity: 0.8; }
      50% { top: 96%; opacity: 1; }
      100% { top: 0%; opacity: 0.8; }
    }
    .animate-laser {
      animation: laser 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `],
})
export class DeliveryQrScannerModalComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly prefillCode = input<string>('');
  readonly activeOrders = input<OrderView[]>([]);
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly deliveryVerified = new EventEmitter<OrderView>();

  readonly mode = signal<'CAMERA' | 'MANUAL'>('CAMERA');
  readonly isScanning = signal(false);
  readonly isProcessing = signal(false);
  readonly cameraError = signal<string | null>(null);
  readonly hasTorchSupport = signal(false);
  readonly torchOn = signal(false);
  readonly verifiedResult = signal<any | null>(null);

  manualCode = '';
  private mediaStream: MediaStream | null = null;
  private currentFacingMode: 'environment' | 'user' = 'environment';
  private animationFrameId: number | null = null;

  ngOnInit() {
    if (this.prefillCode()) {
      this.manualCode = this.prefillCode();
      this.setMode('MANUAL');
    } else {
      this.startCamera();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  presetOrders(): OrderView[] {
    return this.activeOrders().filter(
      (o) => o.status !== 'CANCELLED' && o.inspectionStatus !== 'PASSED',
    );
  }

  selectPresetOrder(o: OrderView) {
    this.manualCode = o.deliveryQrToken || `NX-DLV-${o.id.substring(0, 8).toUpperCase()}`;
  }

  setMode(newMode: 'CAMERA' | 'MANUAL') {
    this.mode.set(newMode);
    if (newMode === 'CAMERA') {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  async startCamera() {
    this.cameraError.set(null);
    this.stopCamera();

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      this.mediaStream = stream;
      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = stream;
      }

      // Check torch capabilities
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && 'torch' in capabilities) {
        this.hasTorchSupport.set(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      this.cameraError.set(err?.message || 'Could not access camera. Please allow camera permissions.');
    }
  }

  stopCamera() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isScanning.set(false);
  }

  flipCamera() {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  }

  async toggleTorch() {
    if (!this.mediaStream) return;
    const track = this.mediaStream.getVideoTracks()[0];
    if (!track) return;
    const next = !this.torchOn();
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      this.torchOn.set(next);
    } catch {}
  }

  onVideoMetadataLoaded() {
    this.isScanning.set(true);
    this.requestScanFrame();
  }

  private requestScanFrame() {
    if (!this.mediaStream || this.isProcessing() || this.mode() !== 'CAMERA') return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.scanCurrentFrame();
    });
  }

  private async scanCurrentFrame() {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      this.requestScanFrame();
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.requestScanFrame();
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 1. Try BarcodeDetector if natively supported
    let scannedText: string | null = null;
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          scannedText = barcodes[0].rawValue;
        }
      } catch {}
    }

    // 2. Fallback to jsQR decoder
    if (!scannedText) {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          scannedText = code.data;
        }
      } catch {}
    }

    if (scannedText) {
      this.playBeepSound();
      this.processScannedCode(scannedText);
    } else {
      this.requestScanFrame();
    }
  }

  private playBeepSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 chime
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  }

  private processScannedCode(code: string) {
    if (this.isProcessing()) return;
    this.isProcessing.set(true);
    this.stopCamera();

    this.orderService.verifyDeliveryQr({ qrCodeOrToken: code }).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        this.verifiedResult.set(res);
        if (res.alreadyActive) {
          this.toast.info(res.message || 'Already verified.');
        } else {
          this.toast.success(res.message || 'Delivery signoff verified! 72-Hour Inspection SLA started.');
        }
      },
      error: (err) => {
        this.isProcessing.set(false);
        const msg = err?.error?.message || 'Invalid or unrecognized QR code';
        this.toast.error(msg);
        // Restart camera if in camera mode
        if (this.mode() === 'CAMERA') {
          setTimeout(() => this.startCamera(), 1500);
        }
      },
    });
  }

  submitManualCode() {
    if (!this.manualCode.trim()) return;
    this.processScannedCode(this.manualCode.trim());
  }

  onCompleteSuccess() {
    const res = this.verifiedResult();
    if (res?.order) {
      this.deliveryVerified.emit(res.order);
    }
    this.close.emit();
  }

  onClose() {
    this.stopCamera();
    this.close.emit();
  }
}
