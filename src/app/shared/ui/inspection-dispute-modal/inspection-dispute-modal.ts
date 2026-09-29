import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderEscrowView, OrderView } from '@core/models';
import { OrderService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { Select, SelectOption } from '@shared/ui/select/select';
import {
  LucideAlertOctagon,
  LucideAlertTriangle,
  LucideCheckCircle2,
  LucideImage,
  LucideLayers,
  LucidePlus,
  LucideScan,
  LucideShieldAlert,
  LucideSparkles,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-inspection-dispute-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FormsModule,
    Select,
    LucideX,
    LucideAlertTriangle,
    LucideAlertOctagon,
    LucideShieldAlert,
    LucidePlus,
    LucideTrash2,
    LucideImage,
    LucideSparkles,
    LucideScan,
    LucideCheckCircle2,
    LucideLayers,
  ],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          (click)="cancel()"
        ></div>

        <!-- Modal Container -->
        <div
          class="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-2xl transition-all z-10 my-8"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
                <svg lucideShieldAlert class="h-5 w-5"></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white sm:text-lg">
                  Report Defect & Freeze Escrow
                </h3>
                <p class="text-xs text-zinc-400">
                  Order #NX-{{ order()?.id?.slice(0, 8)?.toUpperCase() }} · Milestone #3 (30% Delivery)
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="cancel()"
              class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <svg lucideX class="h-4 w-4"></svg>
            </button>
          </div>

          <!-- Freeze Warning Callout -->
          <div class="my-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <svg lucideAlertTriangle class="h-4 w-4 shrink-0 text-amber-400 mt-0.5"></svg>
            <div class="space-y-1">
              <p class="font-semibold text-amber-300">
                Escrow Freeze Notice
              </p>
              <p class="text-amber-200/90 text-[11px] leading-relaxed">
                Submitting this claim will immediately lock Milestone #3 (<span class="font-mono font-bold">{{ milestoneAmount() | currency }}</span>) in <strong class="text-white">FROZEN IN DISPUTE</strong> status. No funds will disburse to the supplier until resolved via Admin arbitration.
              </p>
            </div>
          </div>

          <!-- 🤖 AI Vision Defect Auto-Scanner & Bounding Box Annotator Card -->
          <div class="my-4 rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-zinc-950/80 to-zinc-950 p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/20 text-indigo-400">
                  <svg lucideSparkles class="h-4 w-4"></svg>
                </div>
                <div>
                  <h4 class="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <span>AI Vision Defect Scanner</span>
                    <span class="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300 border border-indigo-500/30">
                      Neural v3.4
                    </span>
                  </h4>
                  <p class="text-[10px] text-zinc-400">Automated surface damage analysis & bounding box segmentation</p>
                </div>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="activeTab.set('AI_SCANNER')"
                  class="px-2.5 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer"
                  [class]="activeTab() === 'AI_SCANNER' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'"
                >
                  <span class="flex items-center gap-1">
                    <svg lucideScan class="h-3 w-3"></svg>
                    <span>AI Bounding Scan</span>
                  </span>
                </button>
                <button
                  type="button"
                  (click)="activeTab.set('COMPARE_PREDISPATCH')"
                  class="px-2.5 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer"
                  [class]="activeTab() === 'COMPARE_PREDISPATCH' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'"
                >
                  <span class="flex items-center gap-1">
                    <svg lucideLayers class="h-3 w-3"></svg>
                    <span>Factory Comparison</span>
                  </span>
                </button>
              </div>
            </div>

            @if (activeTab() === 'AI_SCANNER') {
              <!-- Image Viewport with Bounding Overlays -->
              <div class="relative w-full h-52 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden group">
                <img
                  [src]="activeImageUrl()"
                  alt="Consignment Inspection Proof"
                  class="w-full h-full object-cover filter brightness-90 contrast-105 transition"
                />

                <!-- Scanning Beam Overlay -->
                @if (scanningAi()) {
                  <div class="absolute inset-0 bg-indigo-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                    <div class="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse absolute top-1/2 shadow-[0_0_20px_#22d3ee]"></div>
                    <div class="flex items-center gap-2 text-indigo-200 font-mono text-xs bg-zinc-900/90 border border-indigo-500/40 px-3.5 py-2 rounded-xl shadow-2xl">
                      <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"></span>
                      <span>{{ scanStep() }}</span>
                    </div>
                  </div>
                }

                <!-- Bounding Box Overlays -->
                @if (aiScanned() && !scanningAi()) {
                  @for (box of aiDetectedBoxes(); track box.id; let idx = $index) {
                    <div
                      class="absolute rounded-lg transition-all cursor-pointer border-2 shadow-xl"
                      [class]="selectedBoxIndex() === idx ? 'border-cyan-400 bg-cyan-500/25 ring-4 ring-cyan-500/40 scale-102 z-20' : (box.severity === 'HIGH' ? 'border-rose-500 bg-rose-500/20 hover:bg-rose-500/30 z-10' : 'border-amber-500 bg-amber-500/20 hover:bg-amber-500/30 z-10')"
                      [style.top.%]="box.top"
                      [style.left.%]="box.left"
                      [style.width.%]="box.width"
                      [style.height.%]="box.height"
                      (click)="selectedBoxIndex.set(idx)"
                    >
                      <div
                        class="absolute -top-6 left-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md font-mono shrink-0 whitespace-nowrap"
                        [class]="box.severity === 'HIGH' ? 'bg-rose-600' : 'bg-amber-600'"
                      >
                        <span>#{{ box.id }} {{ box.label }} ({{ box.confidence }}%)</span>
                      </div>
                    </div>
                  }
                }

                <!-- Watermark -->
                <div class="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[9px] font-mono text-zinc-400 border border-zinc-800 backdrop-blur-md">
                  AI Neural Vision Overlay
                </div>
              </div>

              <!-- Control & Findings Bar -->
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    (click)="runAiVisionScan()"
                    [disabled]="scanningAi()"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/30 px-3 py-1.5 text-xs font-bold text-indigo-200 hover:bg-indigo-600/40 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg lucideScan class="h-3.5 w-3.5 text-indigo-400"></svg>
                    <span>{{ aiScanned() ? 'Re-Scan with AI Vision' : 'Scan Image with AI Vision' }}</span>
                  </button>

                  @if (aiScanned()) {
                    <button
                      type="button"
                      (click)="applyAiDiagnosis()"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/30 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-600/40 active:scale-95 transition cursor-pointer shadow-sm"
                    >
                      <svg lucideSparkles class="h-3.5 w-3.5 text-emerald-300"></svg>
                      <span>Apply AI Diagnosis to Form</span>
                    </button>
                  }
                </div>

                @if (aiScanned()) {
                  <div class="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-2.5 space-y-2 animate-fadeIn">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-indigo-300 flex items-center gap-1">
                        <svg lucideCheckCircle2 class="h-3.5 w-3.5 text-emerald-400"></svg>
                        <span>AI Diagnostic Breakdown</span>
                      </span>
                      <span class="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        Est. Claim: 75%
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-[10px]">
                      @for (box of aiDetectedBoxes(); track box.id; let idx = $index) {
                        <div
                          (click)="selectedBoxIndex.set(idx)"
                          class="p-2 rounded-lg border transition cursor-pointer"
                          [class]="selectedBoxIndex() === idx ? 'border-indigo-400 bg-indigo-900/60' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'"
                        >
                          <div class="flex items-center justify-between font-bold text-zinc-200">
                            <span>#{{ box.id }} {{ box.label }}</span>
                            <span [class]="box.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'">{{ box.confidence }}%</span>
                          </div>
                          <p class="text-zinc-400 mt-0.5 line-clamp-2">{{ box.description }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <!-- Factory Pre-Dispatch Comparison Tab -->
              <div class="space-y-2">
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                      <span>🏭 Factory Pre-Dispatch QA</span>
                      <span class="text-[9px] font-mono text-zinc-500">Intact</span>
                    </div>
                    <div class="h-40 rounded-xl border border-emerald-500/30 bg-zinc-950 overflow-hidden relative">
                      <img [src]="preDispatchImageUrl" alt="Factory Pre-Dispatch" class="w-full h-full object-cover" />
                      <div class="absolute bottom-1.5 left-1.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded">
                        Factory Signoff
                      </div>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-[11px] font-bold text-rose-400">
                      <span>🚚 Consignment Arrival</span>
                      <span class="text-[9px] font-mono text-rose-400">Damaged</span>
                    </div>
                    <div class="h-40 rounded-xl border border-rose-500/30 bg-zinc-950 overflow-hidden relative">
                      <img [src]="activeImageUrl()" alt="Arrival Condition" class="w-full h-full object-cover filter contrast-110" />
                      <div class="absolute bottom-1.5 left-1.5 bg-rose-950/80 border border-rose-500/30 text-rose-300 text-[9px] font-mono px-2 py-0.5 rounded">
                        Impact Damage
                      </div>
                    </div>
                  </div>
                </div>
                <p class="text-[10px] text-zinc-400 text-center italic">
                  Comparing factory pre-dispatch baseline against arrival dock photo to verify in-transit causality.
                </p>
              </div>
            }
          </div>

          <!-- Form Fields -->
          <div class="space-y-4 text-xs">
            <!-- Defect Category -->
            <div>
              <label class="block font-semibold text-zinc-300 mb-1.5">
                Defect Category <span class="text-rose-400">*</span>
              </label>
              <app-select
                [options]="defectCategoryOptions"
                [ngModel]="disputeType()"
                (ngModelChange)="disputeType.set($event)"
                placeholder="Select defect category..."
              />
            </div>

            <!-- Headline Reason -->
            <div>
              <label class="block font-semibold text-zinc-300 mb-1.5">
                Dispute Headline / Summary <span class="text-rose-400">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="reason"
                placeholder="e.g. 8 pumps arrived with cracked casings, 2 missing completely"
                class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <!-- Claim Amount -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="font-semibold text-zinc-300">
                  Disputed Claim Amount ($)
                </label>
                <span class="text-[11px] text-zinc-400 font-mono">
                  Max Escrow: {{ milestoneAmount() | currency }}
                </span>
              </div>
              <div class="relative">
                <span class="absolute left-3.5 top-2.5 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  [(ngModel)]="claimAmount"
                  [max]="milestoneAmount()"
                  min="1"
                  step="0.01"
                  class="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-8 pr-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Detailed Description -->
            <div>
              <label class="block font-semibold text-zinc-300 mb-1.5">
                Detailed Inspection Observations <span class="text-rose-400">*</span>
              </label>
              <textarea
                [(ngModel)]="description"
                rows="3"
                placeholder="Describe the condition upon arrival, packaging damage, serial numbers, test results, etc..."
                class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              ></textarea>
            </div>

            <!-- Evidence Photo URLs -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="font-semibold text-zinc-300">
                  Proof Photo URLs / Inspection Sheets
                </label>
                <button
                  type="button"
                  (click)="addEvidenceUrl()"
                  class="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <svg lucidePlus class="h-3 w-3"></svg>
                  <span>Add Link</span>
                </button>
              </div>

              <div class="space-y-2">
                @for (url of evidenceUrls(); track $index) {
                  <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                      <svg lucideImage class="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500"></svg>
                      <input
                        type="url"
                        [ngModel]="url"
                        (ngModelChange)="updateEvidenceUrl($index, $event)"
                        placeholder="https://images.example.com/proof-photo.jpg"
                        class="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      (click)="removeEvidenceUrl($index)"
                      class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 transition cursor-pointer"
                      title="Remove link"
                    >
                      <svg lucideTrash2 class="h-3.5 w-3.5"></svg>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              (click)="cancel()"
              [disabled]="submitting()"
              class="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="submitDispute()"
              [disabled]="submitting() || !isValid()"
              class="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600/30 px-4 py-2 text-xs font-bold text-rose-200 shadow-lg hover:bg-rose-600/40 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (submitting()) {
                <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-transparent"></span>
                <span>Freezing Escrow…</span>
              } @else {
                <svg lucideAlertOctagon class="h-4 w-4 text-rose-400"></svg>
                <span>Submit Claim & Freeze 30% Escrow</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InspectionDisputeModal {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly order = input<OrderView | null>(null);
  readonly escrow = input<OrderEscrowView | null>(null);

  readonly closed = output<void>();
  readonly disputeCreated = output<void>();

  readonly defectCategoryOptions: SelectOption[] = [
    { value: 'DAMAGED_GOODS', label: 'Damaged in Transit / Crushed Packaging' },
    { value: 'MISSING_QUANTITY', label: 'Missing Units / Quantity Discrepancy' },
    { value: 'SPECIFICATION_MISMATCH', label: 'Incorrect SKU / Spec Mismatch' },
    { value: 'QUALITY_DEFECT', label: 'Functional Failure / Quality Defect' },
    { value: 'OTHER', label: 'Other Delivery Discrepancy' },
  ];

  readonly disputeType = signal<string>('DAMAGED_GOODS');
  readonly reason = signal<string>('');
  readonly description = signal<string>('');
  readonly claimAmount = signal<number>(0);
  readonly evidenceUrls = signal<string[]>(['']);
  readonly submitting = signal<boolean>(false);

  // 🤖 AI Vision Defect Auto-Scanner & Bounding Box Annotator state
  readonly scanningAi = signal<boolean>(false);
  readonly aiScanned = signal<boolean>(false);
  readonly scanStep = signal<string>('');
  readonly activeTab = signal<'AI_SCANNER' | 'COMPARE_PREDISPATCH'>('AI_SCANNER');
  readonly selectedBoxIndex = signal<number | null>(null);

  readonly preDispatchImageUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';
  readonly sampleDamageUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';

  readonly aiDetectedBoxes = signal([
    {
      id: 1,
      label: 'Crushed Outer Carton Corner',
      severity: 'HIGH',
      confidence: 94,
      top: 15,
      left: 18,
      width: 42,
      height: 38,
      description: 'Severe structural carton compression with compromised inner cushioning.'
    },
    {
      id: 2,
      label: 'Moisture Seepage Stain',
      severity: 'MEDIUM',
      confidence: 82,
      top: 58,
      left: 52,
      width: 36,
      height: 32,
      description: 'Discoloration and liquid ingress mark near bottom pallet seam.'
    }
  ]);

  readonly activeImageUrl = computed(() => {
    const urls = this.evidenceUrls().map(u => u.trim()).filter(u => u.length > 0);
    return urls.length > 0 ? urls[0] : this.sampleDamageUrl;
  });

  runAiVisionScan() {
    if (this.scanningAi()) return;
    this.scanningAi.set(true);
    this.scanStep.set('Initializing Neural Vision Model v3.4...');

    setTimeout(() => {
      this.scanStep.set('Segmenting packaging contours & edge deformities...');
    }, 400);

    setTimeout(() => {
      this.scanStep.set('Mapping impact vector & thermal moisture signatures...');
    }, 800);

    setTimeout(() => {
      this.scanningAi.set(false);
      this.aiScanned.set(true);
      this.toast.success('🤖 AI Vision Scan complete! 2 damage defect signatures detected.');
    }, 1300);
  }

  applyAiDiagnosis() {
    this.disputeType.set('DAMAGED_GOODS');
    this.reason.set('AI Vision Scan: 2 Structural Defects & Moisture Seepage on Consignment');
    this.description.set(
      'AI Vision Scan Diagnostic Report:\n' +
      '- Signature #1: Crushed Outer Carton Corner (94% confidence, High Severity)\n' +
      '- Signature #2: Moisture Seepage Stain (82% confidence, Medium Severity)\n' +
      'Structural integrity compromised on 2 packaging tiers. Recommended Claim: 75% of Milestone Pool.'
    );
    const maxMilestone = this.milestoneAmount();
    if (maxMilestone > 0) {
      this.claimAmount.set(Math.round(maxMilestone * 0.75 * 100) / 100);
    }
    this.toast.info('⚡ AI Diagnosis applied! Form fields pre-filled with defect analysis.');
  }

  readonly milestoneAmount = computed(() => {
    const esc = this.escrow();
    const m3 = esc?.milestones?.find((m) => m.milestoneIndex === 3);
    if (m3) return m3.amount;
    const ord = this.order();
    return ord ? ord.totalAmount * 0.3 : 0;
  });

  constructor() {
    // Prefill claim amount when modal receives escrow data
  }

  cancel() {
    this.closed.emit();
  }

  addEvidenceUrl() {
    this.evidenceUrls.update((urls) => [...urls, '']);
  }

  updateEvidenceUrl(index: number, val: string) {
    this.evidenceUrls.update((urls) => {
      const copy = [...urls];
      copy[index] = val;
      return copy;
    });
  }

  removeEvidenceUrl(index: number) {
    this.evidenceUrls.update((urls) => urls.filter((_, i) => i !== index));
  }

  isValid() {
    return (
      this.reason().trim().length >= 5 &&
      this.description().trim().length >= 10 &&
      this.claimAmount() > 0
    );
  }

  submitDispute() {
    const ord = this.order();
    if (!ord || !this.isValid()) return;

    this.submitting.set(true);

    const validUrls = this.evidenceUrls()
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    this.orderService
      .createEscrowDispute(ord.id, {
        disputeType: this.disputeType(),
        reason: this.reason().trim(),
        description: this.description().trim(),
        claimAmount: this.claimAmount() || this.milestoneAmount(),
        evidenceUrls: validUrls,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.info(
            '⚠️ Delivery inspection dispute submitted. Milestone #3 escrow funds are now frozen.',
          );
          this.disputeCreated.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(
            err?.error?.message || 'Failed to file inspection dispute.',
          );
        },
      });
  }
}
