import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Paginated, ProductView } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CompareService } from '@core/services/compare.service';
import { ProductService } from '@core/services/product.service';
import { ToastService } from '@core/services/toast.service';
import { ProductCard } from '@shared/ui/product-card/product-card';
import {
  LucideArrowRight,
  LucideCamera,
  LucideChevronDown,
  LucideChevronRight,
  LucideClock,
  LucideCpu,
  LucideFlame,
  LucideGrid,
  LucideHeadphones,
  LucideHelpCircle,
  LucideLaptop,
  LucideLock,
  LucideMapPin,
  LucidePackage,
  LucidePercent,
  LucideSearch,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideSliders,
  LucideSmartphone,
  LucideStar,
  LucideStore,
  LucideTruck,
  LucideUser,
  LucideWatch,
  LucideZap,
} from '@lucide/angular';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    RouterLink,
    ProductCard,
    LucideArrowRight,
    LucideShieldCheck,
    LucideZap,
    LucideSearch,
    LucideSliders,
    LucideLock,
    LucidePackage,
    LucideShoppingBag,
    LucideLaptop,
    LucideSmartphone,
    LucideCpu,
    LucideStore,
    LucideTruck,
    LucideClock,
    LucideHeadphones,
    LucideWatch,
    LucideCamera,
    LucideFlame,
    LucideStar,
    LucideChevronRight,
    LucideChevronDown,
    LucideUser,
    LucideGrid,
    LucidePercent,
    LucideHelpCircle,
    LucideMapPin,
  ],
  templateUrl: './landing-page.html',
})
export class LandingPage {
  readonly auth = inject(AuthService);
  readonly compare = inject(CompareService);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isCategoryMenuOpen = signal<boolean>(false);
  readonly selectedSearchCategory = signal<string>('All Categories');
  readonly activeHeroSlide = signal<number>(0);
  readonly activeDealFilter = signal<string>('all');
  readonly compareCategory = signal<'phone' | 'laptop' | 'audio'>('phone');
  readonly featuredProducts = signal<ProductView[]>([]);
  readonly searchInput = signal<string>('');

  // Realtime Flash Deal Timer Signals
  readonly timerHours = signal<number>(4);
  readonly timerMinutes = signal<number>(18);
  readonly timerSeconds = signal<number>(42);

  readonly popularTags = ['Snapdragon 8 Gen 3', 'M3 Max', 'OLED Displays', 'Noise Cancelling', '4K Cam', 'RTX 4090'];

  readonly megaCategories = [
    { name: 'Smartphones & Accessories', count: '1,240 Items', route: '/products' },
    { name: 'Laptops & Workstations', count: '890 Items', route: '/products' },
    { name: 'Audio & Studio Sound', count: '650 Items', route: '/products' },
    { name: 'Smart Watches & Wearables', count: '420 Items', route: '/products' },
    { name: 'Cameras & Video Gear', count: '310 Items', route: '/products' },
  ];

  readonly categories = [
    { name: 'Smartphones', icon: 'smartphone', count: '1,240+ Items', growth: '+18% this week' },
    { name: 'Laptops & PCs', icon: 'laptop', count: '890+ Items', growth: '+24% this week' },
    { name: 'Audio & Sound', icon: 'headphones', count: '650+ Items', growth: '+12% this week' },
    { name: 'Smart Watches', icon: 'watch', count: '420+ Items', growth: '+15% this week' },
    { name: 'Cameras & Gear', icon: 'camera', count: '310+ Items', growth: '+9% this week' },
  ];

  readonly flashDeals = [
    {
      id: 'deal-1',
      title: 'Nexus Pro Max 5G Flagship',
      subtitle: '200MP Triple Sensor · 16GB RAM · 5000mAh',
      store: 'Nexus Official Direct',
      price: 1199,
      originalPrice: 1499,
      discount: '20% OFF',
      savings: 'SAVE $300',
      soldPercent: 84,
      stockLeft: 12,
      rating: 4.9,
      reviewsCount: 1240,
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
      category: 'smartphones',
    },
    {
      id: 'deal-2',
      title: 'Nexus Book Pro 16" M3 Max',
      subtitle: '16-Core CPU · 64GB RAM · 16.2" Mini-LED',
      store: 'Nexus Enterprise',
      price: 2399,
      originalPrice: 2899,
      discount: '17% OFF',
      savings: 'SAVE $500',
      soldPercent: 68,
      stockLeft: 8,
      rating: 5.0,
      reviewsCount: 890,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      category: 'laptops',
    },
    {
      id: 'deal-3',
      title: 'Nexus Studio Sound Pro ANC',
      subtitle: 'Spatial Audio · -45dB ANC · 40h Playtime',
      store: 'Nexus Audio Labs',
      price: 349,
      originalPrice: 499,
      discount: '30% OFF',
      savings: 'SAVE $150',
      soldPercent: 92,
      stockLeft: 4,
      rating: 4.9,
      reviewsCount: 650,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      category: 'audio',
    },
    {
      id: 'deal-4',
      title: 'Apex Acoustic Master X',
      subtitle: 'Lossless Audio · aptX · Qualcomm QCC5181',
      store: 'TechCraft Supplier',
      price: 279,
      originalPrice: 399,
      discount: '30% OFF',
      savings: 'SAVE $120',
      soldPercent: 76,
      stockLeft: 15,
      rating: 4.7,
      reviewsCount: 420,
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
      category: 'audio',
    },
  ];

  readonly suppliers = [
    { name: 'Nexus Official Direct', badge: 'PLATINUM', rating: '5.0', sales: '14.2k Orders', icon: 'store', verified: true },
    { name: 'TechCraft Supplier', badge: 'VERIFIED', rating: '4.9', sales: '3.8k Orders', icon: 'shield', verified: true },
    { name: 'Apex Horizon Global', badge: 'VERIFIED', rating: '4.8', sales: '2.4k Orders', icon: 'zap', verified: true },
    { name: 'Zenith Studio Enterprise', badge: 'VERIFIED', rating: '4.9', sales: '1.9k Orders', icon: 'package', verified: true },
  ];

  readonly testimonials = [
    {
      quote: 'Nexus transformed our supply chain. We order direct from verified manufacturers with zero escrow risk.',
      author: 'Alex Vance',
      title: 'CTO, Horizon Tech Labs',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    {
      quote: 'Sub-100ms attribute matrix allows our team to compare complex specs side-by-side in real time.',
      author: 'Sarah Lin',
      title: 'Head of Hardware Procurement',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
    },
    {
      quote: 'As a platinum vendor, Nexus provides automated inventory syncing and instant escrow release payouts.',
      author: 'Marcus Brody',
      title: 'VP Sales, TechCraft Global',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
  ];

  // Spec comparison data
  readonly phoneA = {
    title: 'Nexus Pro Max 5G Flagship',
    price: 1199,
    store: 'Nexus Official',
    display: '6.8" 120Hz LTPO OLED (2600 nits)',
    processor: 'Snapdragon 8 Gen 3 (4nm)',
    ram: '16GB LPDDR5X',
    battery: '5000 mAh · 80W Fast Charge',
    camera: '200MP Triple OIS Sensor',
    rating: '4.9 ★',
  };

  readonly phoneB = {
    title: 'Apex Horizon Ultra',
    price: 999,
    store: 'TechCraft Supplier',
    display: '6.7" 90Hz AMOLED (1800 nits)',
    processor: 'Dimensity 9200+',
    ram: '12GB LPDDR5',
    battery: '4800 mAh · 65W Fast Charge',
    camera: '108MP Quad Sensor',
    rating: '4.7 ★',
  };

  readonly laptopA = {
    title: 'Nexus Book Pro 16" M3',
    price: 2399,
    store: 'Nexus Enterprise',
    display: '16.2" 160Hz Mini-LED Liquid X',
    processor: 'Apple M3 Max / 16-Core CPU',
    ram: '64GB Unified Memory',
    battery: '99.9 Wh · 18h Battery Life',
    camera: '1080p Studio Cam',
    rating: '5.0 ★',
  };

  readonly laptopB = {
    title: 'Zenith Blade Studio 15',
    price: 1899,
    store: 'Zenith Tech Supplier',
    display: '15.6" 120Hz OLED Touch',
    processor: 'Intel Core Ultra 7 155H',
    ram: '32GB LPDDR5X',
    battery: '75 Wh · 12h Battery Life',
    camera: '1080p AI Vision',
    rating: '4.6 ★',
  };

  readonly audioA = {
    title: 'Nexus Studio Sound Pro',
    price: 349,
    store: 'Nexus Audio Labs',
    display: 'Spatial Audio + ANC (-45dB)',
    processor: 'Nexus H2 Audio Chip',
    ram: 'Bluetooth 5.4 + LE Audio',
    battery: '40 Hours Playtime · Fast Charge',
    camera: '6-Mic Beamforming System',
    rating: '4.9 ★',
  };

  readonly audioB = {
    title: 'Apex Acoustic Master X',
    price: 279,
    store: 'TechCraft Supplier',
    display: 'Hybrid ANC (-38dB)',
    processor: 'Qualcomm QCC5181',
    ram: 'Bluetooth 5.3 + aptX Lossless',
    battery: '30 Hours Playtime',
    camera: '4-Mic Environmental Noise Cancellation',
    rating: '4.7 ★',
  };

  readonly stats = [
    { value: '$14.8M+', label: 'GMV Processed' },
    { value: '450+', label: 'Verified Vendors' },
    { value: '52,000+', label: 'Products Listed' },
    { value: '< 45ms', label: 'Search Latency' },
  ];

  constructor() {
    this.productService.list({ page: 1, pageSize: 8 }).subscribe({
      next: (res: Paginated<ProductView>) => this.featuredProducts.set(res.items || []),
      error: () => {},
    });

    // Auto rotate hero carousel every 5 seconds
    const slideTimer = setInterval(() => {
      this.activeHeroSlide.set((this.activeHeroSlide() + 1) % 3);
    }, 5000);

    // Live countdown timer
    const interval = setInterval(() => {
      let sec = this.timerSeconds() - 1;
      let min = this.timerMinutes();
      let hr = this.timerHours();

      if (sec < 0) {
        sec = 59;
        min -= 1;
        if (min < 0) {
          min = 59;
          hr -= 1;
          if (hr < 0) {
            hr = 23;
          }
        }
      }
      this.timerSeconds.set(sec);
      this.timerMinutes.set(min);
      this.timerHours.set(hr);
    }, 1000);

    this.destroyRef.onDestroy(() => {
      clearInterval(slideTimer);
      clearInterval(interval);
    });
  }

  get filteredDeals() {
    const cat = this.activeDealFilter();
    if (cat === 'all') return this.flashDeals;
    return this.flashDeals.filter((d) => d.category === cat);
  }

  onSearchSubmit(event: Event) {
    event.preventDefault();
    const query = this.searchInput().trim();
    if (query) {
      this.router.navigate(['/products'], { queryParams: { q: query } });
    } else {
      this.router.navigate(['/products']);
    }
  }

  setSearchTag(tag: string) {
    this.searchInput.set(tag);
    this.router.navigate(['/products'], { queryParams: { q: tag } });
  }

  padTwo(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }
}


