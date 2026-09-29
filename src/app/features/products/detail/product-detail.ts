import { DatePipe, DecimalPipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProductReview, ProductStatuses, ProductView, ReviewSummary, SupplierTrustScore, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CartService } from '@core/services/cart.service';
import { CatalogService, OrderService } from '@core/services/catalog.service';
import { ProductService } from '@core/services/product.service';
import { PaymentService } from '@core/services/payment.service';
import { ToastService } from '@core/services/toast.service';
import { CompareService } from '@core/services/compare.service';
import { PriceAlertService } from '@core/services/price-alert.service';
import { RfqService } from '@core/services/rfq.service';
import {
  LucideArrowLeft,
  LucideAward,
  LucideBuilding2,
  LucideCheck,
  LucideCheckCircle2,
  LucideColumns3,
  LucideCreditCard,
  LucideFilter,
  LucideHeart,
  LucideLock,
  LucideMessageSquare,
  LucideMinus,
  LucidePlus,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideSparkles,
  LucideStar,
  LucideThumbsUp,
  LucideTrendingDown,
  LucideTruck,
} from '@lucide/angular';
import { Badge } from '@shared/ui/badge/badge';
import { Loader } from '@shared/ui/loader/loader';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import { LiveStockBadge } from '@shared/ui/live-stock-badge/live-stock-badge';
import { StarRating } from '@shared/ui/star-rating/star-rating';
import { ReviewModal } from './review-modal';
import { Product360Studio } from './components/product-360-studio';

@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Product360Studio,
    NexusCurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    Badge,
    Loader,
    LabelFormatPipe,
    LucideArrowLeft,
    LucideHeart,
    LucideColumns3,
    LucideCheck,
    LucideTrendingDown,
    LucideBuilding2,
    LiveStockBadge,
    LucideCreditCard,
    LucideLock,
    LucideShieldCheck,
    LucideTruck,
    LucidePlus,
    LucideMinus,
    LucideShoppingBag,
    LucideStar,
    LucideAward,
    LucideMessageSquare,
    LucideFilter,
    LucideThumbsUp,
    LucideSparkles,
    StarRating,
    ReviewModal,
  ],
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  readonly slug = input.required<string>();
  private readonly api = inject(ProductService);
  private readonly catalog = inject(CatalogService);
  private readonly orders = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly cart = inject(CartService);
  readonly compare = inject(CompareService);
  readonly priceAlert = inject(PriceAlertService);
  readonly rfqService = inject(RfqService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;
  readonly ProductStatuses = ProductStatuses;

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/products');
    }
  }

  readonly isAlertModalOpen = signal(false);

  readonly product = signal<ProductView | null>(null);
  readonly missing = signal(false);
  readonly attrs = signal<[string, string | number | boolean][]>([]);
  readonly quantity = signal(1);
  readonly buying = signal(false);
  readonly savingWishlist = signal(false);
  readonly isWishlisted = signal(false);
  readonly selectedImageUrl = signal<string | null>(null);
  
  readonly similarProducts = signal<ProductView[]>([]);

  // Reviews & Supplier Trust Signals
  readonly reviewSummary = signal<ReviewSummary | null>(null);
  readonly aiReviewSummary = signal<string | null>(null);
  readonly aiReviewLoading = signal<boolean>(false);
  readonly reviews = signal<ProductReview[]>([]);
  readonly totalReviews = signal<number>(0);
  readonly reviewsLoading = signal<boolean>(false);
  readonly selectedRatingFilter = signal<number | null>(null);
  readonly verifiedOnlyFilter = signal<boolean>(false);
  readonly supplierTrust = signal<SupplierTrustScore | null>(null);
  readonly reviewModalOpen = signal<boolean>(false);

  readonly inCart = computed(() => {
    const p = this.product();
    if (!p) return false;
    return this.cart.items().some((item) => item.product.id === p.id);
  });

  readonly cartQuantity = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return this.cart.items().find((item) => item.product.id === p.id)?.quantity ?? 0;
  });

  readonly canBuy = computed(() => {
    const p = this.product();
    return (
      this.auth.role() === UserRoles.CUSTOMER &&
      !!p &&
      p.status === ProductStatuses.APPROVED &&
      p.stockQuantity > 0
    );
  });

  readonly lineTotal = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return p.price * this.quantity();
  });

  readonly displayImage = computed(() => {
    const selected = this.selectedImageUrl();
    if (selected) return selected;
    const p = this.product();
    return p?.images.find((i) => i.isPrimary)?.url ?? p?.images[0]?.url;
  });

  constructor() {
    // Two-way synchronization: when cart quantity changes (e.g. from cart drawer), reflect in detail stepper
    effect(() => {
      const p = this.product();
      if (!p) return;
      const cartItem = this.cart.items().find((i) => i.product.id === p.id);
      if (cartItem) {
        if (this.quantity() !== cartItem.quantity) {
          this.quantity.set(cartItem.quantity);
        }
      }
    });

    effect(() => {
      const slug = this.slug();
      this.missing.set(false);
      this.product.set(null);
      this.quantity.set(1);
      this.selectedImageUrl.set(null);
      this.isWishlisted.set(false);
      this.reviewSummary.set(null);
      this.aiReviewSummary.set(null);
      this.reviews.set([]);
      this.totalReviews.set(0);
      this.supplierTrust.set(null);

      this.api.bySlug(slug).subscribe({
        next: (p) => {
          this.product.set(p);
          this.attrs.set(Object.entries(p.attributes || {}));

          // Sync initial quantity with cart if already present
          const inCartItem = this.cart.items().find((i) => i.product.id === p.id);
          this.quantity.set(inCartItem ? inCartItem.quantity : 1);

          // Load Reviews & Trust Score
          this.loadReviewSummary(p.id);
          this.loadReviews(p.id);
          if (p.supplierId) {
            this.loadSupplierTrust(p.supplierId);
          }

          // Load Similar Products
          this.api.getSimilarProducts(p.id).subscribe({
            next: (similars) => this.similarProducts.set(similars),
            error: () => this.similarProducts.set([])
          });

          if (this.auth.role() === UserRoles.CUSTOMER) {
            this.catalog.wishlist().subscribe({
              next: (items) => {
                this.isWishlisted.set(items.some((i) => i.id === p.id));
              },
              error: () => {},
            });
          }
        },
        error: () => this.missing.set(true),
      });
    });
  }

  loadReviewSummary(productId: string) {
    this.api.getReviewSummary(productId).subscribe({
      next: (summary) => this.reviewSummary.set(summary),
      error: () => {},
    });
    
    this.aiReviewLoading.set(true);
    this.api.getAiReviewSummary(productId).subscribe({
      next: (res) => {
        this.aiReviewSummary.set(res.summary);
        this.aiReviewLoading.set(false);
      },
      error: () => {
        this.aiReviewSummary.set("AI Summary currently unavailable.");
        this.aiReviewLoading.set(false);
      }
    });
  }

  loadReviews(productId: string) {
    this.reviewsLoading.set(true);
    const filterStar = this.selectedRatingFilter() ?? undefined;
    const verified = this.verifiedOnlyFilter();

    this.api.getReviews(productId, { rating: filterStar, verifiedOnly: verified, page: 1, pageSize: 20 }).subscribe({
      next: (res) => {
        this.reviews.set(res.items);
        this.totalReviews.set(res.total);
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.reviewsLoading.set(false);
      },
    });
  }

  loadSupplierTrust(supplierId: string) {
    this.api.getSupplierTrustScore(supplierId).subscribe({
      next: (trust) => this.supplierTrust.set(trust),
      error: () => {},
    });
  }

  setRatingFilter(star: number | null) {
    if (this.selectedRatingFilter() === star) {
      this.selectedRatingFilter.set(null);
    } else {
      this.selectedRatingFilter.set(star);
    }
    const p = this.product();
    if (p) this.loadReviews(p.id);
  }

  toggleVerifiedFilter() {
    this.verifiedOnlyFilter.update((v) => !v);
    const p = this.product();
    if (p) this.loadReviews(p.id);
  }

  clearFilters() {
    this.selectedRatingFilter.set(null);
    this.verifiedOnlyFilter.set(false);
    const p = this.product();
    if (p) this.loadReviews(p.id);
  }

  openReviewModal() {
    if (!this.auth.role()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/products/slug/${this.slug()}` } });
      return;
    }
    this.reviewModalOpen.set(true);
  }

  onReviewSaved(review: ProductReview) {
    const p = this.product();
    if (!p) return;
    this.loadReviewSummary(p.id);
    this.loadReviews(p.id);
    if (p.supplierId) {
      this.loadSupplierTrust(p.supplierId);
    }
  }

  scrollToReviews() {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getReviewerInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  selectImage(url: string) {
    this.selectedImageUrl.set(url);
  }

  save() {
    const p = this.product();
    if (!p || this.savingWishlist()) return;

    this.savingWishlist.set(true);
    this.catalog.toggleWishlist(p.id).subscribe({
      next: (items) => {
        const inList = Array.isArray(items) && items.some((i) => i.id === p.id);
        this.isWishlisted.set(inList);
        this.savingWishlist.set(false);
        this.toast.success(inList ? 'Saved to Wishlist!' : 'Removed from Wishlist');
      },
      error: () => {
        this.savingWishlist.set(false);
        this.toast.error('Failed to update wishlist');
      },
    });
  }

  toggleCompare() {
    const p = this.product();
    if (!p) return;
    this.compare.toggle(p);
  }

  incrementQuantity() {
    const p = this.product();
    if (!p) return;
    if (this.quantity() < p.stockQuantity) {
      const newQty = this.quantity() + 1;
      this.quantity.set(newQty);
      if (this.inCart()) {
        this.cart.updateQuantity(p.id, newQty);
      }
    }
  }

  decrementQuantity() {
    const p = this.product();
    if (this.quantity() > 1) {
      const newQty = this.quantity() - 1;
      this.quantity.set(newQty);
      if (p && this.inCart()) {
        this.cart.updateQuantity(p.id, newQty);
      }
    }
  }

  setQuantity(value: string) {
    const p = this.product();
    const parsed = Number(value);
    if (!p || !Number.isFinite(parsed)) return;
    const newQty = Math.max(1, Math.min(p.stockQuantity, Math.floor(parsed)));
    this.quantity.set(newQty);
    if (this.inCart()) {
      this.cart.updateQuantity(p.id, newQty);
    }
  }

  buyNow() {
    const p = this.product();
    if (!p || !this.canBuy() || this.buying()) return;

    this.buying.set(true);
    this.orders.create(p.id, this.quantity()).subscribe({
      next: (res: any) => {
        const amount = p.price * this.quantity();
        const orderId = res?.id || '';

        this.buying.set(false);
        void this.router.navigate(['/checkout', orderId]);
      },
      error: (err) => {
        this.buying.set(false);
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Unable to place order');
      },
    });
  }

  addToCart() {
    const p = this.product();
    if (!p) return;
    if (this.inCart()) {
      this.cart.updateQuantity(p.id, this.quantity());
      this.toast.success(`Updated "${p.title}" quantity in cart (${this.quantity()})`);
    } else {
      this.cart.addItem(p, this.quantity());
    }
  }
}
