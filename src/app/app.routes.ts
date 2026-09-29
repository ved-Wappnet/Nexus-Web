import { Routes } from '@angular/router';
import { UserRoles } from '@core/constants/user.constant';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';
import { roleGuard } from '@core/guards/role.guard';

const COMMERCE_ROLES = [UserRoles.CUSTOMER, UserRoles.SUPPLIER, UserRoles.SUBADMIN, UserRoles.ADMIN];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing-page').then((m) => m.LandingPage),
    data: { breadcrumb: 'Home' },
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
    data: { breadcrumb: 'Auth' },
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'products/manage',
        canActivate: [roleGuard([UserRoles.SUPPLIER, UserRoles.SUBADMIN, UserRoles.ADMIN])],
        loadComponent: () => import('./features/products/manage/product-manage').then((m) => m.ProductManage),
        data: { breadcrumb: 'Manage products' },
      },
      {
        path: 'categories',
        canActivate: [roleGuard([UserRoles.ADMIN, UserRoles.SUBADMIN])],
        loadComponent: () => import('./features/categories/categories').then((m) => m.Categories),
        data: { breadcrumb: 'Categories' },
      },
      {
        path: 'products/:slug',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () => import('./features/products/detail/product-detail').then((m) => m.ProductDetail),
        data: { breadcrumb: 'Product' },
      },
      {
        path: 'products',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () => import('./features/products/catalog/product-catalog').then((m) => m.ProductCatalog),
        data: { breadcrumb: 'Products' },
      },
      {
        path: 'wishlist',
        canActivate: [roleGuard([UserRoles.CUSTOMER])],
        loadComponent: () => import('./features/wishlist/wishlist').then((m) => m.Wishlist),
        data: { breadcrumb: 'Wishlist' },
      },
      {
        path: 'watchlist',
        canActivate: [roleGuard([UserRoles.SUPPLIER, UserRoles.SUBADMIN, UserRoles.ADMIN])],
        loadComponent: () => import('./features/watchlist/price-watchlist').then((m) => m.PriceWatchlist),
        data: { breadcrumb: 'Price Watchlist' },
      },
      {
        path: 'quotes',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () => import('./features/rfq/rfq-list').then((m) => m.RfqList),
        data: { breadcrumb: 'Vendor RFQ Quotes' },
      },
      {
        path: 'orders',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () => import('./features/orders/order-list').then((m) => m.OrderList),
        data: { breadcrumb: 'Orders' },
      },
      {
        path: 'payouts',
        canActivate: [roleGuard([UserRoles.SUPPLIER, UserRoles.ADMIN, UserRoles.SUBADMIN])],
        loadComponent: () => import('./features/payouts/payout-list').then((m) => m.PayoutListComponent),
        data: { breadcrumb: 'Finance & Payouts' },
      },
      {
        path: 'inspection-dispute/:orderId',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () =>
          import('./features/inspection-dispute/inspection-dispute-page').then(
            (m) => m.InspectionDisputePage
          ),
        data: { breadcrumb: 'Inspection & Defect Disputes' },
      },
      {
        path: 'inspection-dispute',
        canActivate: [roleGuard(COMMERCE_ROLES)],
        loadComponent: () =>
          import('./features/inspection-dispute/inspection-dispute-page').then(
            (m) => m.InspectionDisputePage
          ),
        data: { breadcrumb: 'Inspection & Defect Disputes' },
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/tickets/ticket-list').then((m) => m.TicketList),
        data: { breadcrumb: 'Support Tickets' },
      },
      {
        path: 'audits',
        canActivate: [roleGuard([UserRoles.ADMIN, UserRoles.SUBADMIN])],
        loadComponent: () => import('./features/audits/audit-list').then((m) => m.AuditList),
        data: { breadcrumb: 'Audit Logs' },
      },
      {
        path: 'delivery-partner',
        canActivate: [roleGuard([UserRoles.DELIVERY_PARTNER, UserRoles.ADMIN])],
        loadComponent: () =>
          import('./features/delivery-partner/delivery-partner-portal').then(
            (m) => m.DeliveryPartnerPortalComponent,
          ),
        data: { breadcrumb: 'Delivery Fleet Portal' },
      },
      {
        path: 'admin/delivery-partners',
        canActivate: [roleGuard([UserRoles.ADMIN, UserRoles.SUBADMIN])],
        loadComponent: () =>
          import('./features/admin/delivery-partners/admin-delivery-partners').then(
            (m) => m.AdminDeliveryPartnersComponent,
          ),
        data: { breadcrumb: 'Fleet Verification' },
      },
      {
        path: 'checkout/:orderId',
        canActivate: [roleGuard([UserRoles.CUSTOMER])],
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.CheckoutPage),
        data: { breadcrumb: 'Checkout' },
      },
      {
        path: 'checkout',
        canActivate: [roleGuard([UserRoles.CUSTOMER])],
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.CheckoutPage),
        data: { breadcrumb: 'Checkout' },
      },
      {
        path: 'payment/status',
        canActivate: [roleGuard([UserRoles.CUSTOMER])],
        loadComponent: () => import('./features/payment-status/payment-status').then((m) => m.PaymentStatus),
        data: { breadcrumb: 'Payment Status' },
      },
      {
        path: 'payment/success',
        canActivate: [roleGuard([UserRoles.CUSTOMER])],
        loadComponent: () => import('./features/payment-status/payment-status').then((m) => m.PaymentStatus),
        data: { breadcrumb: 'Payment Success' },
      },
      {
        path: 'payment/cancel',
        canActivate: [roleGuard([UserRoles.CUSTOMER])],
        loadComponent: () => import('./features/payment-status/payment-status').then((m) => m.PaymentStatus),
        data: { breadcrumb: 'Payment Cancelled' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
