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
}

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
};

export function getDefaultPermissionsForRole(
  role: string,
): Required<UserPermissions> {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return { ...FULL_OWNER_PERMISSIONS };
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
};
