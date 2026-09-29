import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateReviewDto, ProductReview } from '@core/models';
import { ProductService } from '@core/services/product.service';
import { ToastService } from '@core/services/toast.service';
import { LucideCheckCircle2, LucideShieldCheck, LucideStar, LucideX } from '@lucide/angular';
import { StarRating } from '@shared/ui/star-rating/star-rating';

@Component({
  selector: 'app-review-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, StarRating, LucideX, LucideShieldCheck, LucideCheckCircle2, LucideStar],
  templateUrl: './review-modal.html',
})
export class ReviewModal {
  readonly open = input.required<boolean>();
  readonly productId = input.required<string>();
  readonly productTitle = input.required<string>();
  readonly existingReview = input<ProductReview | null>(null);
  readonly isVerifiedBuyer = input<boolean>(false);

  readonly closed = output<void>();
  readonly saved = output<ProductReview>();

  private readonly api = inject(ProductService);
  private readonly toast = inject(ToastService);

  readonly rating = signal<number>(5);
  readonly title = signal<string>('');
  readonly comment = signal<string>('');
  readonly submitting = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.open()) {
        const rev = this.existingReview();
        if (rev) {
          this.rating.set(rev.rating || 5);
          this.title.set(rev.title || '');
          this.comment.set(rev.comment || '');
        } else {
          this.rating.set(5);
          this.title.set('');
          this.comment.set('');
        }
        this.errorMsg.set(null);
      }
    });
  }

  getRatingText(score: number): string {
    switch (score) {
      case 5:
        return 'Exceptional — Exceeded all expectations!';
      case 4:
        return 'Very Good — High quality & recommended.';
      case 3:
        return 'Average — Met basic expectations.';
      case 2:
        return 'Below Expectations — Several issues.';
      case 1:
        return 'Disappointing — Not recommended.';
      default:
        return 'Select a rating';
    }
  }

  onRatingChange(stars: number) {
    this.rating.set(stars);
  }

  submit() {
    const commentVal = this.comment().trim();
    if (!commentVal) {
      this.errorMsg.set('Please write a brief comment describing your experience.');
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);

    const dto: CreateReviewDto = {
      rating: this.rating(),
      title: this.title().trim() || undefined,
      comment: commentVal,
    };

    this.api.submitReview(this.productId(), dto).subscribe({
      next: (review) => {
        this.submitting.set(false);
        this.toast.success(
          this.existingReview() ? 'Your review has been updated!' : 'Thank you! Your review was submitted successfully.',
        );
        this.saved.emit(review);
        this.close();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message || 'Failed to submit review. Please try again.');
      },
    });
  }

  close() {
    this.closed.emit();
  }
}
