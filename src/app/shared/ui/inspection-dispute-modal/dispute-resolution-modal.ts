import { CurrencyPipe, DatePipe } from '@angular/common';
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
import { EscrowDisputeView, OrderEscrowView, OrderView } from '@core/models';
import { OrderService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCheck,
  LucideExternalLink,
  LucideGavel,
  LucideImage,
  LucideScale,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-dispute-resolution-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    LucideX,
    LucideScale,
    LucideGavel,
    LucideExternalLink,
    LucideImage,
    LucideCheck,
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
          class="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-2xl transition-all z-10 my-4"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <svg lucideScale class="h-5 w-5"></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white sm:text-lg">
                  Arbitrate Delivery Dispute
                </h3>
                <p class="text-xs text-zinc-400">
                  Order #NX-{{ order()?.id?.slice(0, 8)?.toUpperCase() }} · Milestone #3 Escrow Settlement
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

          <!-- Dispute Details Review -->
          @if (dispute(); as disp) {
            <div class="my-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold">
                  {{ disp.disputeType }}
                </span>
                <span class="text-zinc-500 text-[11px]">
                  Filed on {{ disp.createdAt | date:'medium' }}
                </span>
              </div>

              <div>
                <h4 class="font-bold text-zinc-100 text-sm">
                  {{ disp.reason }}
                </h4>
                <p class="mt-1 text-zinc-400 text-xs leading-relaxed">
                  {{ disp.description }}
                </p>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <span class="text-zinc-400">Claimed Disputed Amount:</span>
                <span class="font-mono font-bold text-white text-sm">
                  {{ disp.claimAmount | currency }}
                </span>
              </div>

              @if (disp.evidenceUrls && disp.evidenceUrls.length > 0) {
                <div class="pt-2 border-t border-zinc-800/80">
                  <span class="block text-[11px] font-semibold text-zinc-400 mb-1.5">Submitted Evidence Proofs:</span>
                  <div class="flex flex-wrap gap-2">
                    @for (url of disp.evidenceUrls; track url) {
                      <a
                        [href]="url"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 hover:border-zinc-600 transition"
                      >
                        <svg lucideImage class="h-3 w-3"></svg>
                        <span>View Evidence</span>
                        <svg lucideExternalLink class="h-2.5 w-2.5 opacity-60"></svg>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Resolution Strategy Selector -->
          <div class="space-y-3 text-xs">
            <label class="block font-semibold text-zinc-200">
              Arbitration Settlement Action <span class="text-rose-400">*</span>
            </label>

            <div class="grid gap-2.5 sm:grid-cols-3">
              <!-- Full Refund Option -->
              <button
                type="button"
                (click)="selectResolutionType('REFUND_BUYER')"
                class="rounded-xl border p-3 text-left transition cursor-pointer flex flex-col justify-between gap-2"
                [class]="resolutionType() === 'REFUND_BUYER' ? 'border-rose-500 bg-rose-500/10 text-white' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs">100% Refund</span>
                    @if (resolutionType() === 'REFUND_BUYER') {
                      <svg lucideCheck class="h-3.5 w-3.5 text-rose-400"></svg>
                    }
                  </div>
                  <p class="mt-1 text-[10px] text-zinc-400">
                    Return full 30% milestone to buyer.
                  </p>
                </div>
                <span class="font-mono text-xs font-bold text-rose-300">
                  {{ milestoneAmount() | currency }} to Buyer
                </span>
              </button>

              <!-- Split Settlement Option -->
              <button
                type="button"
                (click)="selectResolutionType('SPLIT_SETTLEMENT')"
                class="rounded-xl border p-3 text-left transition cursor-pointer flex flex-col justify-between gap-2"
                [class]="resolutionType() === 'SPLIT_SETTLEMENT' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs">Split Payout (50/50 Default)</span>
                    @if (resolutionType() === 'SPLIT_SETTLEMENT') {
                      <svg lucideCheck class="h-3.5 w-3.5 text-amber-400"></svg>
                    }
                  </div>
                  <p class="mt-1 text-[10px] text-zinc-400">
                    Partial refund to buyer, remainder to supplier.
                  </p>
                </div>
                <span class="font-mono text-xs font-bold text-amber-300">
                  Custom Split Ratio
                </span>
              </button>

              <!-- Release to Supplier Option -->
              <button
                type="button"
                (click)="selectResolutionType('RELEASE_TO_SUPPLIER')"
                class="rounded-xl border p-3 text-left transition cursor-pointer flex flex-col justify-between gap-2"
                [class]="resolutionType() === 'RELEASE_TO_SUPPLIER' ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs">Release Escrow</span>
                    @if (resolutionType() === 'RELEASE_TO_SUPPLIER') {
                      <svg lucideCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                    }
                  </div>
                  <p class="mt-1 text-[10px] text-zinc-400">
                    Dismiss claim or replacements confirmed.
                  </p>
                </div>
                <span class="font-mono text-xs font-bold text-emerald-300">
                  {{ milestoneAmount() | currency }} to Supplier
                </span>
              </button>
            </div>

            <!-- Dynamic Selection Explanatory Information Card for Admin -->
            @switch (resolutionType()) {
              @case ('REFUND_BUYER') {
                <div class="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 space-y-1 text-xs text-rose-200 animate-fadeIn">
                  <div class="flex items-center justify-between font-extrabold text-rose-300">
                    <span class="flex items-center gap-1.5">
                      <svg lucideScale class="h-4 w-4 text-rose-400"></svg>
                      <span>Selected: 100% Full Buyer Refund</span>
                    </span>
                    <span class="font-mono text-xs bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                      Buyer: {{ milestoneAmount() | currency }} | Supplier: $0.00
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-300 leading-relaxed">
                    <strong>Admin Impact Summary:</strong> The entire Milestone #3 escrow pool (<strong class="font-mono text-white">{{ milestoneAmount() | currency }}</strong>) will be returned to the buyer's payment method. No payout will be sent to the supplier for this milestone.
                  </p>
                </div>
              }
              @case ('SPLIT_SETTLEMENT') {
                <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-1 text-xs text-amber-200 animate-fadeIn">
                  <div class="flex items-center justify-between font-extrabold text-amber-300">
                    <span class="flex items-center gap-1.5">
                      <svg lucideScale class="h-4 w-4 text-amber-400"></svg>
                      <span>Selected: Custom Negotiated Split Payout (50/50 Initialized)</span>
                    </span>
                    <span class="font-mono text-xs bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                      Buyer: {{ splitBuyerAmount() | currency }} | Supplier: {{ splitSupplierAmount() | currency }}
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-300 leading-relaxed">
                    <strong>Admin Impact Summary:</strong> Compensates the buyer <strong class="font-mono text-rose-300">{{ splitBuyerAmount() | currency }}</strong> for defect claims, while disbursing <strong class="font-mono text-emerald-300">{{ splitSupplierAmount() | currency }}</strong> to the supplier for undamaged units. You can adjust the split inputs below at any time.
                  </p>
                </div>
              }
              @case ('RELEASE_TO_SUPPLIER') {
                <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-1 text-xs text-emerald-200 animate-fadeIn">
                  <div class="flex items-center justify-between font-extrabold text-emerald-300">
                    <span class="flex items-center gap-1.5">
                      <svg lucideScale class="h-4 w-4 text-emerald-400"></svg>
                      <span>Selected: Full Escrow Release to Supplier</span>
                    </span>
                    <span class="font-mono text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      Supplier: {{ milestoneAmount() | currency }} | Buyer: $0.00
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-300 leading-relaxed">
                    <strong>Admin Impact Summary:</strong> Dismisses buyer defect claim (or confirms replacements delivered). The full Milestone #3 pool (<strong class="font-mono text-white">{{ milestoneAmount() | currency }}</strong>) will be released directly to the supplier's bank vault.
                  </p>
                </div>
              }
            }

            <!-- Custom Split Inputs (if SPLIT_SETTLEMENT) -->
            @if (resolutionType() === 'SPLIT_SETTLEMENT') {
              <div class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
                <div class="flex items-center justify-between text-xs font-bold text-amber-300 pb-1 border-b border-amber-500/20">
                  <span>Custom Split Ratio Controls</span>
                  <button
                    type="button"
                    (click)="initFiftyFiftySplit()"
                    class="text-[10px] font-mono bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer"
                  >
                    Reset 50/50 Split
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-zinc-300 mb-1">
                      Refund to Buyer ($)
                    </label>
                    <input
                      type="number"
                      [ngModel]="splitBuyerAmount()"
                      (ngModelChange)="onBuyerAmountChange($event)"
                      [max]="milestoneAmount()"
                      min="0"
                      step="0.01"
                      class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="block font-semibold text-zinc-300 mb-1">
                      Disburse to Supplier ($)
                    </label>
                    <input
                      type="number"
                      [ngModel]="splitSupplierAmount()"
                      (ngModelChange)="onSupplierAmountChange($event)"
                      [max]="milestoneAmount()"
                      min="0"
                      step="0.01"
                      class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Total Milestone Pool:</span>
                  <span class="font-mono font-bold text-white">{{ milestoneAmount() | currency }}</span>
                </div>
              </div>
            }

            <!-- Arbitration Notes -->
            <div>
              <label class="block font-semibold text-zinc-300 mb-1.5">
                Official Settlement Rationale & Terms <span class="text-rose-400">*</span>
              </label>
              <textarea
                [ngModel]="resolutionNotes()"
                (ngModelChange)="resolutionNotes.set($event)"
                name="resolutionNotes"
                rows="3"
                placeholder="Explain the settlement decision, agreed compensation, and audit notes..."
                class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              ></textarea>
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
              (click)="executeSettlement()"
              [disabled]="submitting() || !isValid()"
              class="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-600/30 px-4 py-2 text-xs font-bold text-amber-200 shadow-lg hover:bg-amber-600/40 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (submitting()) {
                <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent"></span>
                <span>Executing Settlement…</span>
              } @else {
                <svg lucideGavel class="h-4 w-4 text-amber-400"></svg>
                <span>Execute Arbitration Ruling</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DisputeResolutionModal {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly order = input<OrderView | null>(null);
  readonly escrow = input<OrderEscrowView | null>(null);
  readonly dispute = input<EscrowDisputeView | null>(null);

  readonly closed = output<void>();
  readonly resolved = output<void>();

  readonly resolutionType = signal<'REFUND_BUYER' | 'SPLIT_SETTLEMENT' | 'RELEASE_TO_SUPPLIER'>('SPLIT_SETTLEMENT');
  readonly splitBuyerAmount = signal<number>(0);
  readonly splitSupplierAmount = signal<number>(0);
  readonly resolutionNotes = signal<string>('');
  readonly submitting = signal<boolean>(false);

  readonly milestoneAmount = computed(() => {
    const esc = this.escrow();
    const m3 = esc?.milestones?.find((m) => m.milestoneIndex === 3);
    if (m3) return m3.amount;
    const ord = this.order();
    return ord ? ord.totalAmount * 0.3 : 0;
  });

  constructor() {
    effect(() => {
      const total = this.milestoneAmount();
      if (total > 0 && this.splitBuyerAmount() === 0 && this.splitSupplierAmount() === 0) {
        this.initFiftyFiftySplit();
      }
    });
  }

  initFiftyFiftySplit() {
    const total = this.milestoneAmount();
    const half = Math.round((total / 2) * 100) / 100;
    this.splitBuyerAmount.set(half);
    this.splitSupplierAmount.set(Math.round((total - half) * 100) / 100);
  }

  selectResolutionType(type: 'REFUND_BUYER' | 'SPLIT_SETTLEMENT' | 'RELEASE_TO_SUPPLIER') {
    this.resolutionType.set(type);
    if (type === 'SPLIT_SETTLEMENT') {
      this.initFiftyFiftySplit();
    }
  }

  cancel() {
    this.closed.emit();
  }

  onBuyerAmountChange(val: number) {
    const buyer = Math.max(0, Math.min(this.milestoneAmount(), Number(val) || 0));
    this.splitBuyerAmount.set(buyer);
    this.splitSupplierAmount.set(Math.round((this.milestoneAmount() - buyer) * 100) / 100);
  }

  onSupplierAmountChange(val: number) {
    const supp = Math.max(0, Math.min(this.milestoneAmount(), Number(val) || 0));
    this.splitSupplierAmount.set(supp);
    this.splitBuyerAmount.set(Math.round((this.milestoneAmount() - supp) * 100) / 100);
  }

  isValid() {
    return this.resolutionNotes().trim().length >= 10;
  }

  executeSettlement() {
    const ord = this.order();
    const disp = this.dispute();
    if (!ord || !disp || !this.isValid()) return;

    this.submitting.set(true);

    let refunded = 0;
    let released = 0;
    const totalM3 = this.milestoneAmount();

    if (this.resolutionType() === 'REFUND_BUYER') {
      refunded = totalM3;
      released = 0;
    } else if (this.resolutionType() === 'RELEASE_TO_SUPPLIER') {
      refunded = 0;
      released = totalM3;
    } else {
      refunded = this.splitBuyerAmount();
      released = this.splitSupplierAmount();
    }

    this.orderService
      .resolveEscrowDispute(ord.id, disp.id, {
        resolutionType: this.resolutionType(),
        refundedAmount: refunded,
        releasedAmount: released,
        resolutionNotes: this.resolutionNotes().trim(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(
            '⚖️ Escrow dispute successfully settled and funds disbursed.',
          );
          this.resolved.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(
            err?.error?.message || 'Failed to execute dispute settlement.',
          );
        },
      });
  }
}
