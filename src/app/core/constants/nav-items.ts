import { ALL_USER_ROLES, UserRoles } from '@core/constants/user.constant';
import { UserRole } from '@core/models';

export interface NavItem {
  label: string;
  path: string;
  icon: 'home' | 'grid' | 'box' | 'heart' | 'receipt' | 'tag' | 'truck' | 'shield';
  roles: UserRole[];
}

/** Standard roles for B2B e-commerce store operations (buyers, vendors, admins). */
export const COMMERCE_ROLES: UserRole[] = [
  UserRoles.CUSTOMER,
  UserRoles.SUPPLIER,
  UserRoles.SUBADMIN,
  UserRoles.ADMIN,
];

/** Roles that manage merchandise, pricing, or catalog. */
export const MERCHANT_ROLES: UserRole[] = [
  UserRoles.SUPPLIER,
  UserRoles.SUBADMIN,
  UserRoles.ADMIN,
];

/** Roles with administrative oversight. */
export const ADMIN_ROLES: UserRole[] = [
  UserRoles.ADMIN,
  UserRoles.SUBADMIN,
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'home',
    roles: COMMERCE_ROLES,
  },
  {
    label: 'Products',
    path: '/products',
    icon: 'grid',
    roles: COMMERCE_ROLES,
  },
  {
    label: 'Manage Products',
    path: '/products/manage',
    icon: 'box',
    roles: MERCHANT_ROLES,
  },
  {
    label: 'Categories',
    path: '/categories',
    icon: 'tag',
    roles: ADMIN_ROLES,
  },
  {
    label: 'Wishlist',
    path: '/wishlist',
    icon: 'heart',
    roles: [UserRoles.CUSTOMER],
  },
  {
    label: 'Price Watchlist',
    path: '/watchlist',
    icon: 'tag',
    roles: MERCHANT_ROLES,
  },
  {
    label: 'Orders',
    path: '/orders',
    icon: 'receipt',
    roles: COMMERCE_ROLES,
  },
  {
    label: 'Finance & Payouts',
    path: '/payouts',
    icon: 'receipt',
    roles: MERCHANT_ROLES,
  },
  {
    label: 'Cargo Disputes',
    path: '/inspection-dispute',
    icon: 'box',
    roles: COMMERCE_ROLES,
  },
  {
    label: 'Vendor RFQs',
    path: '/quotes',
    icon: 'receipt',
    roles: COMMERCE_ROLES,
  },
  {
    label: 'Support Tickets',
    path: '/tickets',
    icon: 'receipt',
    roles: [...ALL_USER_ROLES],
  },
  {
    label: 'Audit Logs',
    path: '/audits',
    icon: 'receipt',
    roles: ADMIN_ROLES,
  },
  {
    label: 'Delivery Portal',
    path: '/delivery-partner',
    icon: 'truck',
    roles: [UserRoles.DELIVERY_PARTNER],
  },
  {
    label: 'Fleet Verification',
    path: '/admin/delivery-partners',
    icon: 'shield',
    roles: ADMIN_ROLES,
  },
];

