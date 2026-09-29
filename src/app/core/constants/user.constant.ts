/** System roles stored on the user record. */
export enum UserRoles {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  SUBADMIN = 'SUBADMIN',
  ADMIN = 'ADMIN',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

/** Account type chosen at registration (maps to UserRoles on the backend). */
export enum AccountTypes {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

export const ACCOUNT_TYPE_OPTIONS = [
  {
    value: AccountTypes.CUSTOMER,
    label: 'Customer',
    description: 'Browse the catalog and place wholesale or direct orders.',
  },
  {
    value: AccountTypes.VENDOR,
    label: 'Vendor',
    description: 'List products as a supplier. New SKUs need approval.',
  },
  {
    value: AccountTypes.DELIVERY_PARTNER,
    label: 'Delivery Partner',
    description: 'Provide localized delivery, fleet dispatch, and logistics fulfillment.',
  },
] as const;

/** Maps registration account type → persisted user role. */
export function roleFromAccountType(accountType: AccountTypes): UserRoles {
  if (accountType === AccountTypes.VENDOR) return UserRoles.SUPPLIER;
  if (accountType === AccountTypes.DELIVERY_PARTNER) return UserRoles.DELIVERY_PARTNER;
  return UserRoles.CUSTOMER;
}

export const ALL_USER_ROLES: UserRoles[] = [
  UserRoles.CUSTOMER,
  UserRoles.SUPPLIER,
  UserRoles.SUBADMIN,
  UserRoles.ADMIN,
  UserRoles.DELIVERY_PARTNER,
];
