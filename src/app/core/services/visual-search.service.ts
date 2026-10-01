import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProductView } from '../models';

export interface VisualSearchResultItem {
  product: ProductView;
  matchScore: number;
  matchLabel: string;
  matchedAttributes: string[];
}

export interface VisualSearchResponse {
  success: boolean;
  detectedTitle: string;
  detectedCategory: string;
  visualKeywords: string[];
  imageUrl?: string;
  totalMatches: number;
  results: VisualSearchResultItem[];
}

@Injectable({
  providedIn: 'root',
})
export class VisualSearchService {
  private readonly http = inject(HttpClient);

  readonly isOpen = signal(false);
  readonly isSearching = signal(false);
  readonly results = signal<VisualSearchResponse | null>(null);
  readonly previewImage = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  open(preloadedUrl?: string) {
    this.isOpen.set(true);
    if (preloadedUrl) {
      this.previewImage.set(preloadedUrl);
      this.searchByPayload({ imageUrl: preloadedUrl });
    }
  }

  close() {
    this.isOpen.set(false);
  }

  reset() {
    this.results.set(null);
    this.previewImage.set(null);
    this.error.set(null);
    this.isSearching.set(false);
  }

  searchByFile(file: File, hint?: string) {
    this.isSearching.set(true);
    this.error.set(null);

    // Create local preview instantly
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);
    if (hint) {
      formData.append('hint', hint);
    }

    this.http
      .post<VisualSearchResponse>(`${environment.apiUrl}/products/visual-search`, formData)
      .subscribe({
        next: (res) => {
          this.results.set(res);
          this.isSearching.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to analyze image. Please try again.');
          this.isSearching.set(false);
        },
      });
  }

  searchByPayload(payload: { imageUrl?: string; imageBase64?: string; hint?: string }) {
    this.isSearching.set(true);
    this.error.set(null);

    if (payload.imageUrl) {
      this.previewImage.set(payload.imageUrl);
    } else if (payload.imageBase64) {
      this.previewImage.set(payload.imageBase64);
    }

    this.http
      .post<VisualSearchResponse>(`${environment.apiUrl}/products/visual-search`, payload)
      .subscribe({
        next: (res) => {
          this.results.set(res);
          this.isSearching.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Visual search failed. Please try another image.');
          this.isSearching.set(false);
        },
      });
  }
}
