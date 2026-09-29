import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderView } from '@core/models';
import { OrderService } from '@core/services/catalog.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideShieldCheck,
  LucideShieldAlert,
  LucideLock,
  LucideCheck,
  LucideX,
  LucideAlertCircle,
  LucideLoader2,
} from '@lucide/angular';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  percent: number;
  formatted: string;
}

@Component({
  selector: 'app-inspection-countdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideLock,
    LucideCheck,
    LucideX,
    LucideAlertCircle,
    LucideLoader2,
  ],
  template: `
    @let ord = order();
    @if (ord) {
      <div
        class="rounded-xl border transition-all p-3.5 sm:p-4 text-xs"
        [class]="containerClass()"
      >
        <!-- Top Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/60">
          <div class="flex items-center gap-2 min-w-0">
            @if (isDisputed()) {
              <span class="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span class="font-extrabold text-rose-300 uppercase tracking-wide">Inspection Frozen (Dispute Open)</span>
            } @else if (isPassedOrReleased()) {
              <span class="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span class="font-extrabold text-emerald-300 uppercase tracking-wide">72H Inspection Passed • Escrow Released</span>
            } @else if (isActive()) {
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span class="font-extrabold text-cyan-300 uppercase tracking-wide">72-Hour Inspection Window Active</span>
            } @else {
              <span class="flex h-2.5 w-2.5 rounded-full bg-zinc-600"></span>
              <span class="font-extrabold text-zinc-400 uppercase tracking-wide">72-Hour Inspection SLA Pending Delivery Signoff</span>
            }
          </div>

          <!-- Escrow Protection Badge -->
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700/60 text-[11px] font-mono font-semibold text-zinc-300">
            <svg lucideLock class="h-3 w-3 text-indigo-400"></svg>
            <span>Escrow Protected: {{ (ord.totalAmount * 0.3) | currency }}</span>
          </div>
        </div>

        <!-- Live Ticker & Progress Visualizer -->
        @if (isActive()) {
          <div class="my-3">
            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <span class="text-zinc-400 font-medium">Automatic Supplier Payout In:</span>
              <div class="font-mono text-sm sm:text-base font-extrabold text-white flex items-center gap-1">
                <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-cyan-500/40 text-cyan-300 shadow-sm">
                  {{ pad(countdown().hours) }}h
                </span>
                <span class="text-zinc-500">:</span>
                <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-cyan-500/40 text-cyan-300 shadow-sm">
                  {{ pad(countdown().minutes) }}m
                </span>
                <span class="text-zinc-500">:</span>
                <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-cyan-500/40 text-cyan-300 shadow-sm">
                  {{ pad(countdown().seconds) }}s
                </span>
              </div>
            </div>

            <!-- Segmented Progress Bar -->
            <div class="w-full bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
              <div
                class="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-1000 shadow-sm shadow-cyan-500/50"
                [style.width.%]="countdown().percent"
              ></div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1.5">
              <span>Dock Scan Verified</span>
              <span>72h Auto-Release SLA ({{ countdown().percent | number: '1.0-0' }}% elapsed)</span>
            </div>
          </div>
        }

        <!-- Explanatory Microcopy -->
        <p class="text-[11px] text-zinc-300/90 leading-relaxed mt-2.5">
          @if (isDisputed()) {
            Inspection is on hold. Funds remain securely frozen in escrow until administrative arbitration settles the claim.
          } @else if (isPassedOrReleased()) {
            All items passed buyer physical inspection or 72-hour window elapsed without defects reported. Final 30% escrow funds have been disbursed to the supplier.
          } @else if (isActive()) {
            Buyer has <strong>72 hours</strong> from dock signoff to inspect packaging and verify quality. If no defects are reported before the timer expires, escrow funds are automatically authorized for release to the supplier.
          } @else {
            Upon physical delivery arrival, scan the packing list QR code to verify goods and initiate your 72-hour inspection protection window.
          }
        </p>

        <!-- Action Buttons (Visible for Buyer / Admin only) -->
        @if (isActive()) {
          @if (isBuyerOrAdmin()) {
            <div class="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/60">
              <button
                type="button"
                (click)="openConfirmModal()"
                [disabled]="isSubmitting()"
                class="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
                title="Accept goods and immediately release remaining 30% escrow funds"
              >
                <svg lucideShieldCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                <span>Accept & Release Now</span>
              </button>

              <a
                [routerLink]="['/inspection-dispute', ord.id]"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
                title="File defect report and freeze escrow funds"
              >
                <svg lucideShieldAlert class="h-3.5 w-3.5 text-rose-400"></svg>
                <span>Report Defect / Dispute</span>
              </a>
            </div>
          } @else {
            <div class="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/60 text-[11px] text-zinc-400">
              <svg lucideLock class="h-3.5 w-3.5 text-indigo-400 shrink-0"></svg>
              <span>Awaiting buyer physical inspection signoff or 72-hour timer expiry to disburse final 30% escrow payout.</span>
            </div>
          }
        }
      </div>

      <!-- Modern In-App Escrow Release Confirmation Modal -->
      @if (showConfirmModal()) {
        <div
          class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          (click)="closeConfirmModal()"
        >
          <div
            class="relative w-full max-w-md rounded-2xl border border-emerald-500/40 bg-zinc-950 p-6 shadow-2xl shadow-emerald-950/50 text-zinc-100 my-6 animate-in zoom-in-95 duration-200"
            (click)="$event.stopPropagation()"
          >
            <!-- Header Icon & Title -->
            <div class="flex items-start gap-3.5 mb-4">
              <div class="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <svg lucideShieldCheck class="h-6 w-6"></svg>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-bold text-white tracking-tight">Confirm Goods Acceptance</h3>
                <p class="text-xs text-zinc-400 mt-0.5">Disburse Final 30% Escrow to Supplier</p>
              </div>
              <button
                type="button"
                (click)="closeConfirmModal()"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              >
                <svg lucideX class="h-4 w-4"></svg>
              </button>
            </div>

            <!-- Content Body -->
            <div class="space-y-3.5 mb-6 text-xs leading-relaxed text-zinc-300">
              <p>
                Are you satisfied with the delivered items? Confirming delivery completes the inspection process and unlocks the protected escrow balance.
              </p>

              <!-- Escrow Summary Card -->
              <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3.5 space-y-2">
                <div class="flex items-center justify-between text-zinc-400">
                  <span>Order Total:</span>
                  <span class="font-mono font-medium text-zinc-200">{{ ord.totalAmount | currency }}</span>
                </div>
                <div class="flex items-center justify-between text-zinc-400">
                  <span>Milestone #3 Payout (30%):</span>
                  <span class="font-mono font-bold text-emerald-400 text-sm">{{ (ord.totalAmount * 0.3) | currency }}</span>
                </div>
                <div class="pt-2 border-t border-zinc-800 flex items-center gap-2 text-[11px] text-zinc-400">
                  <svg lucideAlertCircle class="h-3.5 w-3.5 shrink-0 text-amber-400"></svg>
                  <span>This fund disbursement cannot be reversed once authorized.</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2.5">
              <button
                type="button"
                (click)="closeConfirmModal()"
                [disabled]="isSubmitting()"
                class="rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="executeReleaseEscrow()"
                [disabled]="isSubmitting()"
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                @if (isSubmitting()) {
                  <svg lucideLoader2 class="h-3.5 w-3.5 animate-spin"></svg>
                  <span>Authorizing...</span>
                } @else {
                  <svg lucideCheck class="h-3.5 w-3.5"></svg>
                  <span>Yes, Release Escrow</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class InspectionCountdownComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly order = input.required<OrderView>();
  @Output() readonly escrowReleased = new EventEmitter<void>();

  readonly isBuyerOrAdmin = computed(() => {
    const role = this.authService.role();
    return role === 'CUSTOMER' || role === 'ADMIN';
  });

  readonly showConfirmModal = signal(false);
  readonly isSubmitting = signal(false);
  readonly countdown = signal<CountdownParts>({
    hours: 72,
    minutes: 0,
    seconds: 0,
    totalSeconds: 72 * 3600,
    percent: 0,
    formatted: '72h 00m 00s',
  });

  ngOnInit() {
    this.updateCountdown();

    // Tick every second
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateCountdown();
      });
  }

  pad(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  isPassedOrReleased(): boolean {
    const o = this.order();
    if (!o) return false;
    if (o.inspectionStatus === 'PASSED') return true;
    // Also check if milestone 3 is already released
    const m3 = (o as any).milestones?.find((m: any) => m.milestoneIndex === 3);
    return m3?.status === 'RELEASED';
  }

  isDisputed(): boolean {
    const o = this.order();
    if (!o) return false;
    return o.inspectionStatus === 'DISPUTED';
  }

  isActive(): boolean {
    const o = this.order();
    if (!o) return false;
    if (this.isDisputed() || this.isPassedOrReleased()) return false;
    return o.inspectionStatus === 'ACTIVE' || Boolean(o.inspectionStartedAt);
  }

  containerClass(): string {
    if (this.isDisputed()) {
      return 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-zinc-950 to-zinc-950 text-rose-200';
    }
    if (this.isPassedOrReleased()) {
      return 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950 text-emerald-200';
    }
    if (this.isActive()) {
      return 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 via-zinc-950 to-zinc-950 text-cyan-200 shadow-lg shadow-cyan-950/20';
    }
    return 'border-zinc-800 bg-zinc-900/60 text-zinc-300';
  }

  private updateCountdown() {
    const ord = this.order();
    if (!ord || !this.isActive()) return;

    const now = Date.now();
    let expiresAtTime = 0;

    if (ord.inspectionExpiresAt) {
      expiresAtTime = new Date(ord.inspectionExpiresAt).getTime();
    } else if (ord.inspectionStartedAt) {
      expiresAtTime = new Date(ord.inspectionStartedAt).getTime() + 72 * 3600 * 1000;
    } else if (ord.deliveredAt) {
      expiresAtTime = new Date(ord.deliveredAt).getTime() + 72 * 3600 * 1000;
    }

    if (!expiresAtTime) return;

    const totalWindowMs = 72 * 3600 * 1000;
    const remainingMs = Math.max(0, expiresAtTime - now);
    const elapsedMs = totalWindowMs - remainingMs;
    const percent = Math.min(100, Math.max(0, (elapsedMs / totalWindowMs) * 100));

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.countdown.set({
      hours,
      minutes,
      seconds,
      totalSeconds,
      percent,
      formatted: `${hours}h ${this.pad(minutes)}m ${this.pad(seconds)}s`,
    });

    // If remainingMs reached 0 and not yet verified as passed, auto-check expiry with backend once
    if (remainingMs === 0 && !this.isPassedOrReleased() && !this.isSubmitting() && !this.hasCheckedExpiry) {
      this.autoCheckExpiry();
    }
  }

  private hasCheckedExpiry = false;

  private autoCheckExpiry() {
    const ord = this.order();
    if (!ord || this.isSubmitting() || this.hasCheckedExpiry) return;
    this.hasCheckedExpiry = true;
    this.isSubmitting.set(true);

    this.orderService.checkInspectionExpiry(ord.id).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.released) {
          this.toast.success('72-Hour Inspection Window expired. Escrow funds authorized for payout.');
          this.escrowReleased.emit();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  openConfirmModal() {
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    if (this.isSubmitting()) return;
    this.showConfirmModal.set(false);
  }

  executeReleaseEscrow() {
    const ord = this.order();
    if (!ord || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.orderService.releaseEscrowMilestone(ord.id, 3, 'Buyer physical inspection verified in person. Delivery accepted.').subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showConfirmModal.set(false);
        this.toast.success('Delivery accepted! Milestone #3 escrow funds released to supplier.');
        this.escrowReleased.emit();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'Failed to release escrow funds';
        this.toast.error(msg);
      },
    });
  }
}
