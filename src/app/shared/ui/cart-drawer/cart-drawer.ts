import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CartService } from '@core/services/cart.service';
import { OrderService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import {
  LucideArrowRight,
  LucideCreditCard,
  LucideFileText,
  LucideMinus,
  LucidePlus,
  LucideShield,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideSparkles,
  LucideTag,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { ProFormaQuoteService } from '@core/services/proforma-quote.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NexusCurrencyPipe,
    LucideShoppingBag,
    LucideX,
    LucideTrash2,
    LucidePlus,
    LucideMinus,
    LucideArrowRight,
    LucideShield,
    LucideShieldCheck,
    LucideCreditCard,
    LucideTag,
    LucideSparkles,
    LucideFileText,
  ],
  templateUrl: './cart-drawer.html',
})
export class CartDrawer {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  readonly proformaService = inject(ProFormaQuoteService);
  readonly UserRoles = UserRoles;
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly isCheckingOut = signal(false);
  readonly promoInput = signal('');

  downloadProForma() {
    this.proformaService.downloadCartProForma();
  }

  applyPromo() {
    const val = this.promoInput().trim();
    if (!val) return;
    this.cart.applyCoupon(val, () => this.promoInput.set(''));
  }

  getProductImage(product: any): string {
    return (
      product.images?.find((img: any) => img.isPrimary)?.url ??
      product.images?.[0]?.url ??
      '/brand/nexus-icon-64.png'
    );
  }

  proceedToCheckout() {
    const items = this.cart.items();
    if (items.length === 0 || this.isCheckingOut()) return;

    this.isCheckingOut.set(true);

    const orderPayload = {
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
    };

    this.orderService.create(orderPayload).subscribe({
      next: (order) => {
        this.isCheckingOut.set(false);
        this.cart.clear();
        this.cart.close();
        void this.router.navigate(['/checkout', order.id]);
      },
      error: (err) => {
        this.isCheckingOut.set(false);
        const msg = err?.error?.message;
        this.toast.error(
          typeof msg === 'string'
            ? msg
            : 'Unable to create order. Please verify stock.',
        );
      },
    });
  }
}
