import { CommonModule, CurrencyPipe } from '@angular/common';
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
import { ProductView } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { PriceAlertService } from '@core/services/price-alert.service';
import { PriceAlertType } from '@core/services/product.service';
import {
  LucideBell,
  LucideBellOff,
  LucideCheck,
  LucideCheckCircle2,
  LucideLoader2,
  LucideMail,
  LucidePercent,
  LucideShieldCheck,
  LucideSparkles,
  LucideTarget,
  LucideTrendingDown,
  LucideX,
  LucideZap,
} from '@lucide/angular';

@Component({
  selector: 'app-price-alert-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    FormsModule,
    LucideTrendingDown,
    LucideBellOff,
    LucideBell,
    LucideSparkles,
    LucideX,
    LucideTarget,
    LucideZap,
    LucideMail,
    LucideLoader2,
  ],
  template: `
    @if (modalVisible()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in"
        (click)="onBackdropClick($event)"
      >
        <!-- Modal Card -->
        <div
          class="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-zinc-950 p-6 sm:p-7 shadow-2xl shadow-indigo-950/60 backdrop-blur-2xl transition-all"
        >
          <!-- Ambient decorative light glow -->
          <div class="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-600/15 blur-3xl"></div>

          <!-- Close Button -->
          <button
            type="button"
            (click)="closeModal()"
            class="absolute top-5 right-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-400 hover:border-zinc-700 hover:text-white transition cursor-pointer z-10"
          >
            <svg lucideX class="h-4 w-4"></svg>
          </button>

          <!-- Header -->
          <div class="relative z-10 flex items-center gap-3.5">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-400 shadow-inner">
              <svg lucideBell class="h-6 w-6 animate-pulse"></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-extrabold text-white tracking-tight">Price Watch Alert</h3>
                <span class="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  Smart AI Monitor
                </span>
              </div>
              <p class="text-xs text-zinc-400 mt-0.5">We'll notify you the moment the price drops or beats competitors</p>
            </div>
          </div>

          <!-- Product Details Summary -->
          @if (activeProduct(); as p) {
            <div class="relative z-10 mt-5 flex items-center gap-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              @if (p.images && p.images.length > 0 && p.images[0].url) {
                <img [src]="p.images[0].url" [alt]="p.title" class="h-14 w-14 rounded-xl object-cover border border-zinc-800 shrink-0" />
              } @else {
                <div class="h-14 w-14 rounded-xl bg-zinc-800 flex items-center justify-center text-xs text-zinc-600 shrink-0">No Image</div>
              }
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 truncate">{{ p.storeName || 'Nexus Direct' }}</p>
                <h4 class="text-sm font-semibold text-zinc-100 truncate">{{ p.title }}</h4>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-bold text-emerald-400">Current Price: {{ p.price | currency }}</span>
                  <span class="text-[10px] text-zinc-500 font-medium">In Stock: {{ p.stockQuantity }} units</span>
                </div>
              </div>
            </div>

            <!-- Trigger Type Selector -->
            <div class="relative z-10 mt-5">
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                Select Alert Trigger Condition
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  (click)="alertType.set('BELOW_TARGET')"
                  class="rounded-2xl border p-2.5 text-left transition flex flex-col justify-between gap-1.5 cursor-pointer"
                  [class]="
                    alertType() === 'BELOW_TARGET'
                      ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-600/20'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  "
                >
                  <div class="flex items-center justify-between">
                    <svg lucideTarget class="h-4 w-4" [class.text-indigo-400]="alertType() === 'BELOW_TARGET'"></svg>
                    @if (alertType() === 'BELOW_TARGET') {
                      <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                    }
                  </div>
                  <div>
                    <p class="text-xs font-bold">Target Price</p>
                    <p class="text-[10px] opacity-75">Specific budget threshold</p>
                  </div>
                </button>

                <button
                  type="button"
                  (click)="alertType.set('ANY_DROP')"
                  class="rounded-2xl border p-2.5 text-left transition flex flex-col justify-between gap-1.5 cursor-pointer"
                  [class]="
                    alertType() === 'ANY_DROP'
                      ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-600/20'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  "
                >
                  <div class="flex items-center justify-between">
                    <svg lucideTrendingDown class="h-4 w-4" [class.text-indigo-400]="alertType() === 'ANY_DROP'"></svg>
                    @if (alertType() === 'ANY_DROP') {
                      <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                    }
                  </div>
                  <div>
                    <p class="text-xs font-bold">Any Drop</p>
                    <p class="text-[10px] opacity-75">Any discount by vendor</p>
                  </div>
                </button>

                <button
                  type="button"
                  (click)="alertType.set('COMPETITOR_BEAT')"
                  class="rounded-2xl border p-2.5 text-left transition flex flex-col justify-between gap-1.5 cursor-pointer"
                  [class]="
                    alertType() === 'COMPETITOR_BEAT'
                      ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-600/20'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  "
                >
                  <div class="flex items-center justify-between">
                    <svg lucideZap class="h-4 w-4" [class.text-indigo-400]="alertType() === 'COMPETITOR_BEAT'"></svg>
                    @if (alertType() === 'COMPETITOR_BEAT') {
                      <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                    }
                  </div>
                  <div>
                    <p class="text-xs font-bold">Beat Market</p>
                    <p class="text-[10px] opacity-75">vs Amazon & Flipkart</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Configuration body based on trigger type -->
            @if (alertType() === 'BELOW_TARGET') {
              <!-- Discount Presets -->
              <div class="relative z-10 mt-5">
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Quick Discount Presets
                </label>
                <div class="grid grid-cols-4 gap-2">
                  @for (preset of presets; track preset.pct) {
                    <button
                      type="button"
                      (click)="applyPreset(preset.pct)"
                      class="rounded-xl border py-2 text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                      [class]="
                        selectedPresetPct() === preset.pct
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                      "
                    >
                      <span>-{{ preset.pct }}%</span>
                      <span class="text-[10px] opacity-80 font-mono">{{ calculatePresetPrice(preset.pct) | currency }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Target Price Slider & Input -->
              <div class="relative z-10 mt-5 space-y-3">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-300">Target Trigger Price</span>
                  <span class="font-mono text-indigo-400 text-sm font-black">{{ targetPrice() | currency }}</span>
                </div>

                <input
                  type="range"
                  [min]="minPrice()"
                  [max]="p.price"
                  step="1"
                  [value]="targetPrice()"
                  (input)="onSliderChange($any($event.target).value)"
                  class="w-full h-2 rounded-lg bg-zinc-800 accent-indigo-500 cursor-pointer"
                />

                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-500 font-mono font-medium">Custom Target: $</span>
                  <input
                    type="number"
                    [min]="1"
                    [max]="p.price"
                    [value]="targetPrice()"
                    (input)="onNumberChange($any($event.target).value)"
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-mono font-bold text-zinc-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <!-- Savings Callout -->
                <div class="rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <svg lucideSparkles class="h-3.5 w-3.5 text-emerald-400"></svg>
                    <span>Expected Savings:</span>
                  </div>
                  <span class="font-mono font-extrabold text-emerald-400">
                    {{ savingsAmount() | currency }} ({{ savingsPercent() }}% OFF)
                  </span>
                </div>
              </div>
            }

            @if (alertType() === 'ANY_DROP') {
              <div class="relative z-10 mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                <div class="flex items-start gap-3">
                  <svg lucideTrendingDown class="h-5 w-5 text-indigo-400 shrink-0 mt-0.5"></svg>
                  <div>
                    <h5 class="text-xs font-bold text-white">Instant Flash Drop Notification</h5>
                    <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
                      You will receive an immediate notification and email as soon as the vendor discounts this product below its current price of <strong class="text-emerald-400">{{ p.price | currency }}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            }

            @if (alertType() === 'COMPETITOR_BEAT') {
              <div class="relative z-10 mt-5 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Notify When Nexus Beats Amazon/Flipkart By:
                </label>
                <div class="grid grid-cols-4 gap-2">
                  @for (m of [5, 10, 15, 20]; track m) {
                    <button
                      type="button"
                      (click)="competitorMargin.set(m)"
                      class="rounded-xl border py-2 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      [class]="
                        competitorMargin() === m
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                      "
                    >
                      ≥ {{ m }}% Cheaper
                    </button>
                  }
                </div>
                <p class="text-[11px] text-zinc-400 leading-relaxed">
                  Our system will continuously track Amazon and Flipkart live prices. You'll get an alert when Nexus offers a wholesale price advantage of at least {{ competitorMargin() }}%.
                </p>
              </div>
            }

            <!-- Notification Email Input -->
            <div class="relative z-10 mt-5 space-y-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Notification Email Address
              </label>
              <div class="relative flex items-center">
                <svg lucideMail class="absolute left-3.5 h-4 w-4 text-zinc-500"></svg>
                <input
                  type="email"
                  [ngModel]="notificationEmail()"
                  (ngModelChange)="notificationEmail.set($event)"
                  placeholder="Enter email to receive price drop alerts..."
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-10 pr-3.5 py-2.5 text-xs font-medium text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="relative z-10 mt-6 flex items-center gap-3">
              @if (hasActiveAlert()) {
                <button
                  type="button"
                  (click)="removeAlert()"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs font-bold text-rose-300 transition hover:bg-rose-900/50 cursor-pointer"
                >
                  <svg lucideBellOff class="h-4 w-4"></svg>
                  <span>Cancel Watch</span>
                </button>
              }

              <button
                type="button"
                (click)="saveAlert()"
                [disabled]="isSaving() || !isEmailValid()"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-xs font-bold text-white transition hover:from-indigo-500 hover:to-indigo-400 shadow-xl shadow-indigo-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isSaving()) {
                  <svg lucideLoader2 class="h-4 w-4 animate-spin"></svg>
                  <span>Setting Alert...</span>
                } @else {
                  <svg lucideBell class="h-4 w-4"></svg>
                  <span>{{ hasActiveAlert() ? 'Update Price Alert' : 'Activate Price Watch' }}</span>
                }
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class PriceAlertModal {
  readonly product = input<ProductView | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly close = output<void>();

  private readonly priceAlertService = inject(PriceAlertService);
  private readonly auth = inject(AuthService);

  readonly activeProduct = computed(
    () => this.product() || this.priceAlertService.activeModalProduct(),
  );
  readonly modalVisible = computed(
    () => this.isOpen() || !!this.priceAlertService.activeModalProduct(),
  );

  readonly alertType = signal<PriceAlertType>('BELOW_TARGET');
  readonly targetPrice = signal<number>(0);
  readonly selectedPresetPct = signal<number | null>(15);
  readonly competitorMargin = signal<number>(10);
  readonly notificationEmail = signal<string>('');
  readonly isSaving = computed(() => this.priceAlertService.isSaving());

  readonly presets = [{ pct: 10 }, { pct: 15 }, { pct: 20 }, { pct: 25 }];

  constructor() {
    effect(() => {
      const p = this.activeProduct();
      if (p && this.modalVisible()) {
        const existing = this.priceAlertService.getAlert(p.id);
        if (existing) {
          if (existing.alertType) this.alertType.set(existing.alertType);
          if (existing.targetPrice) this.targetPrice.set(existing.targetPrice);
          if (existing.competitorMarginPercent)
            this.competitorMargin.set(existing.competitorMarginPercent);
          if (existing.email) this.notificationEmail.set(existing.email);
        } else {
          this.applyPreset(15);
          const userEmail = this.auth.currentUser()?.email;
          if (userEmail) {
            this.notificationEmail.set(userEmail);
          }
        }
      }
    });
  }

  readonly isEmailValid = computed(() => {
    const email = this.notificationEmail().trim();
    return email.length > 3 && email.includes('@') && email.includes('.');
  });

  readonly minPrice = computed(() => {
    const p = this.activeProduct();
    return p ? Math.max(1, Math.round(p.price * 0.4)) : 1;
  });

  readonly hasActiveAlert = computed(() => {
    const p = this.activeProduct();
    return p ? this.priceAlertService.hasAlert(p.id) : false;
  });

  readonly savingsAmount = computed(() => {
    const p = this.activeProduct();
    if (!p) return 0;
    return Math.max(0, p.price - this.targetPrice());
  });

  readonly savingsPercent = computed(() => {
    const p = this.activeProduct();
    if (!p || p.price === 0) return 0;
    return Math.round(((p.price - this.targetPrice()) / p.price) * 100);
  });

  calculatePresetPrice(pct: number): number {
    const p = this.activeProduct();
    if (!p) return 0;
    return Math.round(p.price * (1 - pct / 100));
  }

  applyPreset(pct: number) {
    this.selectedPresetPct.set(pct);
    const calculated = this.calculatePresetPrice(pct);
    this.targetPrice.set(calculated);
  }

  onSliderChange(val: string) {
    const parsed = Number(val);
    if (!isNaN(parsed)) {
      this.targetPrice.set(parsed);
      this.selectedPresetPct.set(null);
    }
  }

  onNumberChange(val: string) {
    const parsed = Number(val);
    const p = this.activeProduct();
    if (!isNaN(parsed) && p) {
      const clamped = Math.max(1, Math.min(p.price, parsed));
      this.targetPrice.set(clamped);
      this.selectedPresetPct.set(null);
    }
  }

  saveAlert() {
    const p = this.activeProduct();
    if (p && this.isEmailValid()) {
      this.priceAlertService.setAlert(
        p,
        {
          email: this.notificationEmail().trim(),
          alertType: this.alertType(),
          targetPrice:
            this.alertType() === 'BELOW_TARGET' ? this.targetPrice() : undefined,
          competitorMarginPercent:
            this.alertType() === 'COMPETITOR_BEAT'
              ? this.competitorMargin()
              : undefined,
        },
        () => {
          this.closeModal();
        },
      );
    }
  }

  removeAlert() {
    const p = this.activeProduct();
    if (p) {
      this.priceAlertService.removeAlert(p.id);
      this.closeModal();
    }
  }

  closeModal() {
    this.priceAlertService.closeModal();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.closeModal();
    }
  }
}
