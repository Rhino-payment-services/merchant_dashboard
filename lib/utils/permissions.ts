/**
 * Permission utilities for merchant dashboard team members.
 * Stored WalletTeamMember booleans win; wallet owners bypass all checks.
 */

export interface UserPermissions {
  canViewBalance?: boolean;
  canViewTransactions?: boolean;
  canViewReports?: boolean;
  canCollectPayments?: boolean;
  canInitiatePayments?: boolean;
  canLiquidate?: boolean;
  canApprovePayments?: boolean;
  canManagePayroll?: boolean;
  canManageEvents?: boolean;
  canManageTeam?: boolean;
  canManageSettings?: boolean;
  canUploadDataBundles?: boolean;
  canApproveDataBundles?: boolean;
  canViewDataBundleReports?: boolean;
  canManageDataBundleUsers?: boolean;
  canRetryDataBundles?: boolean;
}

export const DATA_BUNDLE_PERMISSION_KEYS = [
  'canUploadDataBundles',
  'canApproveDataBundles',
  'canViewDataBundleReports',
  'canManageDataBundleUsers',
  'canRetryDataBundles',
] as const satisfies ReadonlyArray<keyof UserPermissions>;

export type DataBundlePermissionKey = (typeof DATA_BUNDLE_PERMISSION_KEYS)[number];

/** Data-bundle grants are always explicit; no role gets them by default. */
const NO_DATA_BUNDLE_PERMISSIONS: Record<DataBundlePermissionKey, false> = {
  canUploadDataBundles: false,
  canApproveDataBundles: false,
  canViewDataBundleReports: false,
  canManageDataBundleUsers: false,
  canRetryDataBundles: false,
};

export interface UserSession {
  role?: string;
  userType?: string;
  userData?: UserPermissions;
  isWalletOwner?: boolean;
}

export const FULL_OWNER_PERMISSIONS: Required<UserPermissions> = {
  canViewBalance: true,
  canViewTransactions: true,
  canViewReports: true,
  canCollectPayments: true,
  canInitiatePayments: true,
  canLiquidate: true,
  canApprovePayments: true,
  canManagePayroll: true,
  canManageEvents: true,
  canManageTeam: true,
  canManageSettings: true,
  canUploadDataBundles: true,
  canApproveDataBundles: true,
  canViewDataBundleReports: true,
  canManageDataBundleUsers: true,
  canRetryDataBundles: true,
};

export function getDefaultPermissionsForRole(
  role: string,
): Required<UserPermissions> {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return { ...FULL_OWNER_PERMISSIONS, ...NO_DATA_BUNDLE_PERMISSIONS };
    case 'ACCOUNTANT':
      return {
        canViewBalance: true,
        canViewTransactions: true,
        canViewReports: true,
        canCollectPayments: false,
        canInitiatePayments: true,
        canLiquidate: false,
        canApprovePayments: false,
        canManagePayroll: true,
        canManageEvents: false,
        canManageTeam: false,
        canManageSettings: false,
        ...NO_DATA_BUNDLE_PERMISSIONS,
      };
    case 'MEMBER':
    case 'VIEWER':
    default:
      return {
        canViewBalance: true,
        canViewTransactions: true,
        canViewReports: true,
        canCollectPayments: false,
        canInitiatePayments: false,
        canLiquidate: false,
        canApprovePayments: false,
        canManagePayroll: false,
        canManageEvents: false,
        canManageTeam: false,
        canManageSettings: false,
        ...NO_DATA_BUNDLE_PERMISSIONS,
      };
  }
}

function hasFlag(
  user: UserSession,
  key: keyof UserPermissions,
): boolean {
  if (user.isWalletOwner === true) return true;
  // Prefer explicit stored boolean (including false)
  if (user.userData && key in user.userData && user.userData[key] !== undefined) {
    return !!user.userData[key];
  }
  return false;
}

export function canViewBalance(user: UserSession): boolean {
  return hasFlag(user, 'canViewBalance');
}

export function canViewTransactions(user: UserSession): boolean {
  return hasFlag(user, 'canViewTransactions');
}

export function canViewReports(user: UserSession): boolean {
  return hasFlag(user, 'canViewReports');
}

export function canCollectPayments(user: UserSession): boolean {
  return hasFlag(user, 'canCollectPayments');
}

export function canInitiatePayments(user: UserSession): boolean {
  return hasFlag(user, 'canInitiatePayments');
}

export function canLiquidate(user: UserSession): boolean {
  return hasFlag(user, 'canLiquidate');
}

export function canApprovePayments(user: UserSession): boolean {
  return hasFlag(user, 'canApprovePayments');
}

/** @deprecated use canApprovePayments — kept for payroll pages */
export function canApprovePayroll(user: UserSession): boolean {
  return canApprovePayments(user);
}

export function canManagePayroll(user: UserSession): boolean {
  return hasFlag(user, 'canManagePayroll');
}

export function canManageEvents(user: UserSession): boolean {
  return hasFlag(user, 'canManageEvents');
}

export function canManageTeam(user: UserSession): boolean {
  return hasFlag(user, 'canManageTeam');
}

export function canManageSettings(user: UserSession): boolean {
  return hasFlag(user, 'canManageSettings');
}

/**
 * A team member (never the owner) holding canManageDataBundleUsers manages data
 * bundle users only and may never act as Maker or Checker.
 */
export function isDataBundleSystemAdministrator(user: UserSession): boolean {
  return user.isWalletOwner !== true && hasFlag(user, 'canManageDataBundleUsers');
}

export function canUploadDataBundles(user: UserSession): boolean {
  return !isDataBundleSystemAdministrator(user) && hasFlag(user, 'canUploadDataBundles');
}

export function canApproveDataBundles(user: UserSession): boolean {
  return !isDataBundleSystemAdministrator(user) && hasFlag(user, 'canApproveDataBundles');
}

export function canRetryDataBundles(user: UserSession): boolean {
  return !isDataBundleSystemAdministrator(user) && hasFlag(user, 'canRetryDataBundles');
}

export function canViewDataBundleReports(user: UserSession): boolean {
  return hasFlag(user, 'canViewDataBundleReports');
}

export function canManageDataBundleUsers(user: UserSession): boolean {
  return hasFlag(user, 'canManageDataBundleUsers');
}

/** Can see batches, failed records and the overview. */
export function canViewDataBundles(user: UserSession): boolean {
  return (
    canUploadDataBundles(user) ||
    canApproveDataBundles(user) ||
    canRetryDataBundles(user) ||
    canViewDataBundleReports(user)
  );
}

/** Has any data bundle permission (sidebar visibility). */
export function canAccessDataBundles(user: UserSession): boolean {
  return canViewDataBundles(user) || canManageDataBundleUsers(user);
}

export function getUserPermissions(user: UserSession): UserPermissions {
  if (user.isWalletOwner === true) {
    return { ...FULL_OWNER_PERMISSIONS };
  }
  return {
    ...getDefaultPermissionsForRole(user.role || 'VIEWER'),
    ...user.userData,
  };
}

export function buildUserPermissionSession(input: {
  profile?: {
    role?: string;
    isWalletOwner?: boolean;
    walletPermissions?: UserPermissions;
    isSuperMerchantViewingChild?: boolean;
  } | null;
  viewingChildMerchantId?: string | null;
}): UserSession {
  const { profile, viewingChildMerchantId } = input;
  if (viewingChildMerchantId || profile?.isSuperMerchantViewingChild) {
    return {
      role: 'OWNER',
      isWalletOwner: false,
      userData: { ...FULL_OWNER_PERMISSIONS },
    };
  }
  return {
    role: profile?.role,
    isWalletOwner: !!profile?.isWalletOwner,
    userData: profile?.walletPermissions,
  };
}

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  canViewBalance: 'View balance',
  canViewTransactions: 'View transactions',
  canViewReports: 'View reports',
  canCollectPayments: 'Collect payments (Request / QR)',
  canInitiatePayments: 'Initiate payments',
  canLiquidate: 'Liquidate',
  canApprovePayments: 'Approve payroll',
  canManagePayroll: 'Manage payroll',
  canManageEvents: 'Manage events',
  canManageTeam: 'Manage team',
  canManageSettings: 'Manage settings / KYC',
  canUploadDataBundles: 'Data Bundles: Maker (upload & submit)',
  canApproveDataBundles: 'Data Bundles: Checker (approve / reject)',
  canViewDataBundleReports: 'Data Bundles: Finance (view reports)',
  canManageDataBundleUsers: 'Data Bundles: System Administrator (users only)',
  canRetryDataBundles: 'Data Bundles: Retry failed records',
};

export const DATA_BUNDLE_ROLE_SEPARATION_MESSAGE =
  'A Data Bundles System Administrator cannot also upload, approve or retry batches.';

/** Mirrors the backend rule for team-member permission edits. */
export function violatesDataBundleRoleSeparation(perms: UserPermissions): boolean {
  return (
    !!perms.canManageDataBundleUsers &&
    !!(perms.canUploadDataBundles || perms.canApproveDataBundles || perms.canRetryDataBundles)
  );
}
