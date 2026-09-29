import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '@shared/ui/modal/modal';
import { ToastService } from '@core/services/toast.service';
import { PaymentService } from '@core/services/payment.service';
import {
  LucideCheckCircle2,
  LucideCreditCard,
  LucideLock,
  LucideShield,
  LucideShieldCheck,
  LucideSparkles,
} from '@lucide/angular';

@Component({
  selector: 'app-checkout-modal',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    Modal,
    LucideCreditCard,
    LucideLock,
    LucideShieldCheck,
    LucideShield,
    LucideSparkles,
    LucideCheckCircle2,
  ],
  templateUrl: './checkout-modal.html',
})
export class CheckoutModal {
  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly toast = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly title = input<string>('Complete Stripe Checkout');
  readonly itemTitle = input<string>('');
  readonly amount = input<number>(0);
  readonly platformFee = input<number>(0);
  readonly rfqId = input<string | undefined>(undefined);
  readonly orderId = input<string | undefined>(undefined);

  @Output() closed = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<void>();

  readonly isProcessing = signal(false);
  readonly isPaid = signal(false);
  readonly paymentPlan = signal<'FULL' | 'ESCROW'>('ESCROW');

  readonly isWholesaleEligible = computed(() => Number(this.amount()) >= 5000);
  readonly upfrontAmount = computed(() => Math.round(Number(this.amount()) * 0.30 * 100) / 100);
  readonly inTransitAmount = computed(() => Math.round(Number(this.amount()) * 0.40 * 100) / 100);
  readonly deliveryAmount = computed(
    () => Math.round((Number(this.amount()) - this.upfrontAmount() - this.inTransitAmount()) * 100) / 100,
  );
  readonly chargeAmount = computed(() =>
    this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW'
      ? this.upfrontAmount()
      : Number(this.amount()),
  );

  readonly cardForm = this.fb.group({
    cardholderName: this.fb.nonNullable.control('Global Enterprise Procurement', Validators.required),
    cardNumber: this.fb.nonNullable.control('4242 4242 4242 4242', [Validators.required, Validators.minLength(16)]),
    expiry: this.fb.nonNullable.control('12/28', Validators.required),
    cvc: this.fb.nonNullable.control('123', [Validators.required, Validators.minLength(3)]),
    zipCode: this.fb.nonNullable.control('10001', Validators.required),
  });

  fillTestCard() {
    this.cardForm.patchValue({
      cardholderName: 'Enterprise Test Buyer',
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/28',
      cvc: '424',
      zipCode: '90210',
    });
    this.toast.info('Autofilled Stripe Test Card (4242 4242...)');
  }

  processPayment() {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      this.toast.error('Please enter valid payment details.');
      return;
    }

    this.isProcessing.set(true);
    const amountToCharge = this.chargeAmount();

    this.paymentService
      .createPaymentIntent({
        rfqId: this.rfqId(),
        orderId: this.orderId(),
        amount: amountToCharge,
      })
      .subscribe({
        next: (intentRes) => {
          // Confirm payment
          this.paymentService
            .confirmPayment({
              rfqId: this.rfqId(),
              orderId: this.orderId(),
              paymentIntentId: intentRes.intentId,
              paymentMethod: 'pm_card_visa',
              paymentMode: this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW' ? 'MILESTONE_ESCROW' : 'FULL_UPFRONT',
            })
            .subscribe({
              next: (res) => {
                this.isProcessing.set(false);
                this.isPaid.set(true);
                if (this.isWholesaleEligible() && this.paymentPlan() === 'ESCROW') {
                  this.toast.success(
                    `30% Upfront Deposit ($${amountToCharge.toFixed(2)}) authorized! 70% held in Escrow.`,
                  );
                } else {
                  this.toast.success(res.message || 'Payment processed successfully!');
                }
                setTimeout(() => {
                  this.paymentSuccess.emit();
                  this.closeModal();
                }, 1600);
              },
              error: (err) => {
                this.isProcessing.set(false);
                const msg = err?.error?.message;
                this.toast.error(typeof msg === 'string' ? msg : 'Payment confirmation failed');
              },
            });
        },
        error: (err) => {
          this.isProcessing.set(false);
          const msg = err?.error?.message;
          this.toast.error(typeof msg === 'string' ? msg : 'Unable to create Stripe session');
        },
      });
  }

  readonly isRedirectingStripe = signal(false);

  payViaStripeHosted() {
    if (this.isRedirectingStripe() || this.isProcessing()) return;
    this.isRedirectingStripe.set(true);
    const amountToCharge = this.chargeAmount();
    this.paymentService
      .createCheckoutSession({
        orderId: this.orderId(),
        rfqId: this.rfqId(),
        itemTitle: this.itemTitle() || 'Nexus Wholesale Contract',
        amount: amountToCharge,
        successUrl: `${window.location.origin}/payment/status?type=success&orderId=${this.orderId() || ''}`,
        cancelUrl: `${window.location.origin}/payment/status?type=cancel&orderId=${this.orderId() || ''}`,
      })
      .subscribe({
        next: (payRes) => {
          if (payRes.url) {
            window.location.href = payRes.url;
          } else {
            this.isRedirectingStripe.set(false);
            this.toast.info('Stripe test mode: please complete payment using the card form above.');
          }
        },
        error: () => {
          this.isRedirectingStripe.set(false);
          this.toast.error('Unable to initialize external Stripe checkout. Please use in-app checkout.');
        },
      });
  }

  closeModal() {
    this.isPaid.set(false);
    this.isProcessing.set(false);
    this.isRedirectingStripe.set(false);
    this.closed.emit();
  }
}
