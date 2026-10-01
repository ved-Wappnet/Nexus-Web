import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NAV_ITEMS, NavItem } from '@core/constants/nav-items';
import { UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CartService } from '@core/services/cart.service';
import { NotificationService } from '@core/services/notification.service';
import { PriceAlertService } from '@core/services/price-alert.service';
import { RfqService } from '@core/services/rfq.service';
import { RfqChatService } from '@core/services/rfq-chat.service';
import { TicketChatService } from '@core/services/ticket-chat.service';
import { VisualSearchService } from '@core/services/visual-search.service';
import {
  LucideBell,
  LucideCamera,
  LucideChevronRight,
  LucideFileText,
  LucideFolderTree,
  LucideHeart,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMenu,
  LucideMessageSquare,
  LucidePackage,
  LucideReceipt,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideStore,
  LucideTag,
  LucideTrendingDown,
  LucideTruck,
  LucideQrCode,
  LucideRadar,
  LucideX,
} from '@lucide/angular';
import { Badge, roleTone } from '@shared/ui/badge/badge';
import { CartDrawer } from '@shared/ui/cart-drawer/cart-drawer';
import { CompareDock } from '@shared/ui/compare-dock/compare-dock';
import { CompareMatrixModal } from '@shared/ui/compare-matrix-modal/compare-matrix-modal';
import { CurrencySelectorComponent } from '@shared/ui/currency-selector/currency-selector';
import { NotificationPanelComponent } from '@shared/ui/notification-panel/notification-panel';
import { RfqModal } from '@shared/ui/rfq-modal/rfq-modal';
import { OrderSocketService } from '@core/services/order-socket.service';
import { AudioTelemetryService } from '@core/services/audio-telemetry.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterOutlet,
    Badge,
    CartDrawer,
    CurrencySelectorComponent,
    NotificationPanelComponent,
    LucideBell,
    LucideCamera,
    LucideMenu,
    LucideChevronRight,
    LucideLogOut,
    LucideTrendingDown,
    LucideShoppingBag,
    LucideMessageSquare,
    LucideX,
    LucideLayoutDashboard,
    LucideStore,
    LucidePackage,
    LucideFolderTree,
    LucideHeart,
    LucideReceipt,
    LucideFileText,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideTag,
    LucideTruck,
    LucideQrCode,
    LucideRadar,
    CompareDock,
    CompareMatrixModal,
    RfqModal,
  ],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly notificationService = inject(NotificationService);
  readonly priceAlert = inject(PriceAlertService);
  readonly rfqService = inject(RfqService);
  readonly rfqChat = inject(RfqChatService);
  readonly ticketChat = inject(TicketChatService);
  readonly orderSocket = inject(OrderSocketService);
  readonly audioTelemetry = inject(AudioTelemetryService);
  readonly visualSearch = inject(VisualSearchService);
  private readonly router = inject(Router);



  protected readonly mobileOpen = signal(false);
  protected readonly menuOpen = signal(false);
  readonly roleTone = roleTone;
  readonly UserRoles = UserRoles;

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  readonly nav = computed(() => {
    const role = this.auth.role();
    return NAV_ITEMS.filter((item) => (role ? item.roles.includes(role) : false));
  });

  readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.router.routerState.root;
        const parts: string[] = ['Home'];
        while (route.firstChild) {
          route = route.firstChild;
          const crumb = route.snapshot?.data?.['breadcrumb'] as string | undefined;
          if (crumb) parts.push(crumb);
        }
        return parts;
      }),
    ),
    { initialValue: ['Home'] },
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.mobileOpen.set(false);
        this.menuOpen.set(false);
      });
  }

  isNavActive(item: NavItem): boolean {
    const url = this.url();
    if (item.path === '/products') {
      return url === '/products' || (url.startsWith('/products/') && !url.startsWith('/products/manage'));
    }
    if (item.path === '/dashboard') {
      return url === '/dashboard' || (url === '/' && this.auth.role() !== UserRoles.DELIVERY_PARTNER);
    }
    if (item.path === '/delivery-partner') {
      return url === '/delivery-partner' || (url === '/' && this.auth.role() === UserRoles.DELIVERY_PARTNER);
    }
    return url === item.path || url.startsWith(`${item.path}/`);
  }

  formatRole(role: string | null | undefined): string {
    if (!role) return '';
    switch (role) {
      case UserRoles.DELIVERY_PARTNER:
        return 'Delivery Partner';
      case UserRoles.ADMIN:
        return 'Administrator';
      case UserRoles.SUBADMIN:
        return 'Sub-Admin';
      case UserRoles.SUPPLIER:
        return 'Supplier';
      case UserRoles.CUSTOMER:
        return 'Customer';
      default:
        return role.replace(/_/g, ' ');
    }
  }

  initials(): string {
    const user = this.auth.currentUser();
    if (user?.role === UserRoles.ADMIN || user?.role === UserRoles.SUBADMIN) {
      return 'A';
    }
    const name = user?.name?.trim();
    if (name) {
      if (/admin/i.test(name)) return 'A';
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        if (parts[0].toLowerCase() === 'nexus') return parts[1][0].toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 1).toUpperCase();
    }
    const email = user?.email ?? 'u';
    if (/admin/i.test(email)) return 'A';
    return email.slice(0, 1).toUpperCase();
  }

  toggleMobile() {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  onViewNotification(ticketId: string) {
    this.ticketChat.viewTicketFromToast(ticketId);
    this.router.navigate(['/tickets'], { queryParams: { ticketId } });
  }

  onViewRfqNotification(rfqId: string) {
    this.rfqChat.dismissToast();
    void this.router.navigate(['/quotes'], { queryParams: { quoteId: rfqId } });
  }

  onScanDockQr(orderId: string) {
    this.orderSocket.dismissDockArrivalAlert();
    void this.router.navigate(['/orders'], { queryParams: { qrOrder: orderId } });
  }
}

