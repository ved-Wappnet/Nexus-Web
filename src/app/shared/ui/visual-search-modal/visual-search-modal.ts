import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualSearchService } from '@core/services/visual-search.service';
import {
  LucideAlertCircle,
  LucideArrowRight,
  LucideCamera,
  LucideCheckCircle2,
  LucideRotateCcw,
  LucideSparkles,
  LucideTag,
  LucideUploadCloud,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-visual-search-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    FormsModule,
    LucideCamera,
    LucideUploadCloud,
    LucideSparkles,
    LucideX,
    LucideArrowRight,
    LucideRotateCcw,
    LucideTag,
    LucideAlertCircle,
    LucideCheckCircle2,
  ],
  template: `
    @if (visualSearch.isOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in"
        (click)="onBackdropClick($event)"
      >
        <!-- Modal Card -->
        <div
          class="relative flex flex-col max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-2xl transition-all"
          (click)="$event.stopPropagation()"
        >
          <!-- Ambient Accent Glow -->
          <div class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-600/10 blur-3xl"></div>
          <div class="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-sky-600/10 blur-3xl"></div>

          <!-- Header -->
          <div class="relative z-10 flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <svg lucideCamera class="h-5 w-5"></svg>
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-zinc-100">AI Visual Image Search</h2>
                  <span class="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                    <svg lucideSparkles class="h-3 w-3 text-indigo-400"></svg>
                    Vector Vision
                  </span>
                </div>
                <p class="text-xs text-zinc-400 mt-0.5">
                  Upload or drop any product photo from Amazon, Flipkart, or Instagram to find wholesale inventory.
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="close()"
              class="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition cursor-pointer"
            >
              <svg lucideX class="h-4 w-4"></svg>
            </button>
          </div>

          <!-- Modal Scrollable Body -->
          <div class="relative z-10 flex-1 overflow-y-auto py-5 space-y-5">
            <!-- 1. Scanning State (In Progress) -->
            @if (visualSearch.isSearching()) {
              <div class="flex flex-col items-center justify-center py-10 space-y-4">
                <!-- Image Preview with Scanning Laser -->
                <div class="relative h-48 w-48 overflow-hidden rounded-2xl border border-indigo-500/40 bg-zinc-900 shadow-xl shadow-indigo-950/50">
                  @if (visualSearch.previewImage()) {
                    <img
                      [src]="visualSearch.previewImage()"
                      alt="Analyzing photo"
                      class="h-full w-full object-cover"
                    />
                  } @else {
                    <div class="flex h-full w-full items-center justify-center text-zinc-600">
                      <svg lucideCamera class="h-12 w-12"></svg>
                    </div>
                  }
                  <!-- Scanning Laser Bar -->
                  <div class="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1] animate-pulse-subtle top-1/2 -translate-y-1/2"></div>
                </div>

                <div class="text-center space-y-1">
                  <div class="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-200">
                    <span class="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
                    <span>Extracting Visual Features & Vector Embeddings...</span>
                  </div>
                  <p class="text-xs text-zinc-400">
                    Comparing shape, contours, taxonomy & colorways against verified catalog products.
                  </p>
                </div>
              </div>
            }

            <!-- 2. Results State (Success) -->
            @else if (visualSearch.results(); as res) {
              <!-- Detected Visual Summary Badge -->
              <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    @if (visualSearch.previewImage()) {
                      <img
                        [src]="visualSearch.previewImage()"
                        alt="Scanned product"
                        class="h-14 w-14 rounded-xl border border-zinc-700/80 object-cover shrink-0"
                      />
                    }
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-bold text-zinc-100">{{ res.detectedTitle }}</span>
                        <span class="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                          {{ res.detectedCategory }}
                        </span>
                      </div>
                      <div class="flex flex-wrap items-center gap-1.5 mt-2">
                        @for (tag of res.visualKeywords; track tag) {
                          <span class="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                            <svg lucideTag class="h-2.5 w-2.5 text-zinc-500"></svg>
                            {{ tag }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <span class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 self-start sm:self-center">
                    <svg lucideCheckCircle2 class="h-3.5 w-3.5"></svg>
                    {{ res.totalMatches }} Matches Found
                  </span>
                </div>
              </div>

              <!-- Matched Catalog Products List -->
              <div class="space-y-3">
                <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Direct Catalog Matches</h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (match of res.results; track match.product.id) {
                    <div class="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 hover:border-indigo-500/40 hover:bg-zinc-900/90 transition shadow-sm">
                      <div class="flex items-start gap-3">
                        <!-- Product thumbnail -->
                        <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                          <img
                            [src]="match.product.images[0]?.url || '/brand/nexus-icon-64.png'"
                            [alt]="match.product.title"
                            class="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        </div>

                        <!-- Product details -->
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-1">
                            <span class="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                              {{ match.product.categoryName }}
                            </span>
                            <!-- Match percentage badge -->
                            <span
                              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                              [class.bg-emerald-500/10]="match.matchScore >= 90"
                              [class.text-emerald-400]="match.matchScore >= 90"
                              [class.border-emerald-500/30]="match.matchScore >= 90"
                              [class.bg-sky-500/10]="match.matchScore < 90"
                              [class.text-sky-400]="match.matchScore < 90"
                              [class.border-sky-500/30]="match.matchScore < 90"
                            >
                              {{ match.matchScore }}% Match
                            </span>
                          </div>

                          <h4 class="mt-1 text-xs font-bold text-zinc-100 truncate group-hover:text-indigo-300 transition">
                            {{ match.product.title }}
                          </h4>

                          <p class="mt-1 text-xs font-black text-white">
                            {{ match.product.price | currency }}
                          </p>
                        </div>
                      </div>

                      <!-- Matched Attributes Pills -->
                      @if (match.matchedAttributes.length > 0) {
                        <div class="mt-2.5 flex flex-wrap gap-1 border-t border-zinc-800/80 pt-2">
                          @for (attr of match.matchedAttributes; track attr) {
                            <span class="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                              {{ attr }}
                            </span>
                          }
                        </div>
                      }

                      <!-- Action Button -->
                      <button
                        type="button"
                        (click)="viewProduct(match.product.slug)"
                        class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-1.5 text-xs font-semibold text-white transition cursor-pointer shadow-sm shadow-indigo-600/20"
                      >
                        <span>View Product</span>
                        <svg lucideArrowRight class="h-3 w-3"></svg>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- 3. Upload & Dropzone State (Default) -->
            @else {
              <!-- Drag and drop zone -->
              <div
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
                class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center transition cursor-pointer hover:border-indigo-500/70 hover:bg-zinc-900/70"
                [class.border-indigo-500]="isDragging()"
                [class.bg-indigo-500-5]="isDragging()"
              >
                <input
                  #fileInput
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  class="hidden"
                  (change)="onFileSelected($event)"
                />

                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mb-3">
                  <svg lucideUploadCloud class="h-6 w-6"></svg>
                </span>

                <p class="text-sm font-bold text-zinc-100">
                  Drop product photo here, or <span class="text-indigo-400 hover:underline">browse files</span>
                </p>
                <p class="mt-1 text-xs text-zinc-400">
                  Supports PNG, JPG, WEBP screenshots & photos up to 10MB
                </p>
              </div>

              <!-- Quick Demo Testing Presets -->
              <div class="space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  ⚡ Try Instant Demo Product Photos
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    (click)="testPreset('headphones')"
                    class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5 text-left hover:border-zinc-700 hover:bg-zinc-800/80 transition cursor-pointer"
                  >
                    <span class="text-lg">🎧</span>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-zinc-200 truncate">Headphones</p>
                      <p class="text-[10px] text-zinc-500">Audio / Over-ear</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    (click)="testPreset('laptop')"
                    class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5 text-left hover:border-zinc-700 hover:bg-zinc-800/80 transition cursor-pointer"
                  >
                    <span class="text-lg">💻</span>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-zinc-200 truncate">Dell XPS Laptop</p>
                      <p class="text-[10px] text-zinc-500">Computers</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    (click)="testPreset('phone')"
                    class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5 text-left hover:border-zinc-700 hover:bg-zinc-800/80 transition cursor-pointer"
                  >
                    <span class="text-lg">📱</span>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-zinc-200 truncate">Galaxy / Pixel</p>
                      <p class="text-[10px] text-zinc-500">Smartphones</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    (click)="testPreset('fashion')"
                    class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5 text-left hover:border-zinc-700 hover:bg-zinc-800/80 transition cursor-pointer"
                  >
                    <span class="text-lg">🧥</span>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-zinc-200 truncate">Denim / Hoodie</p>
                      <p class="text-[10px] text-zinc-500">Apparel</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Optional Hint / Keywords Input -->
              <div class="space-y-1.5">
                <label for="visual-hint" class="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Optional Search Context / Brand Notes
                </label>
                <div class="relative">
                  <input
                    id="visual-hint"
                    [(ngModel)]="hintText"
                    placeholder="e.g. Wireless, Noise-Cancelling, OLED Screen, Space Gray..."
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-3.5 pr-24 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    (click)="searchWithHint()"
                    [disabled]="!hintText.trim()"
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-40"
                  >
                    Search
                  </button>
                </div>
              </div>

              <!-- Error Alert -->
              @if (visualSearch.error()) {
                <div class="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <svg lucideAlertCircle class="h-4 w-4 shrink-0"></svg>
                  <span>{{ visualSearch.error() }}</span>
                </div>
              }
            }
          </div>

          <!-- Modal Footer -->
          <div class="relative z-10 flex items-center justify-between border-t border-zinc-800/80 pt-4">
            @if (visualSearch.results()) {
              <button
                type="button"
                (click)="visualSearch.reset()"
                class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
              >
                <svg lucideRotateCcw class="h-3.5 w-3.5"></svg>
                <span>Scan Another Image</span>
              </button>
            } @else {
              <div class="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <svg lucideSparkles class="h-3 w-3 text-indigo-400"></svg>
                <span>Multi-vector visual embeddings active</span>
              </div>
            }

            <button
              type="button"
              (click)="close()"
              class="rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class VisualSearchModalComponent {
  readonly visualSearch = inject(VisualSearchService);
  private readonly router = inject(Router);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly isDragging = signal(false);
  hintText = '';

  close() {
    this.visualSearch.close();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.visualSearch.searchByFile(files[0], this.hintText);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.visualSearch.searchByFile(input.files[0], this.hintText);
    }
  }

  testPreset(preset: 'headphones' | 'laptop' | 'phone' | 'fashion') {
    const presetMap = {
      headphones: {
        imageUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1788258170/nexus/products/noise-cancelling-headphones.jpg',
        hint: 'Noise cancelling wireless headphones black',
      },
      laptop: {
        imageUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1788258147/nexus/products/dell-xps-15.jpg',
        hint: 'Dell XPS 15 laptop computer',
      },
      phone: {
        imageUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1788258144/nexus/products/google-pixel-10.jpg',
        hint: 'Google Pixel 10 smartphone android',
      },
      fashion: {
        imageUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1788258156/nexus/products/womens-denim-jacket.jpg',
        hint: "Women's denim jacket casual fashion",
      },
    };

    const choice = presetMap[preset];
    this.visualSearch.searchByPayload(choice);
  }

  searchWithHint() {
    if (!this.hintText.trim()) return;
    this.visualSearch.searchByPayload({ hint: this.hintText });
  }

  viewProduct(slug: string) {
    this.close();
    this.router.navigate(['/products', slug]);
  }
}
