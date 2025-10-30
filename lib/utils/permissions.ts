/**
 * Permission utilities for checking user capabilities
 */

export interface UserPermissions {
  canViewBalance?: boolean;
  canViewTransactions?: boolean;
  canInitiatePayments?: boolean;
  canApprovePayments?: boolean;
  canManageTeam?: boolean;
}

export interface UserSession {
  role?: string;
  userType?: string;
  userData?: UserPermissions;
  isWalletOwner?: boolean; // NEW: Flag to indicate original wallet owner
}

/**
 * Check if user can approve payroll
 */
export function canApprovePayroll(user: UserSession): boolean {
  const { role, userData, isWalletOwner } = user;

  // Original wallet owner (merchant subscriber): Full access
  // The person who created the account has no WalletTeamMember record
  // but they OWN the wallet (Wallet.userId === user.id)
  if (isWalletOwner === true) return true;

  // OWNER: Full access to everything (for team members with OWNER role)
  if (role === 'OWNER') return true;

  // ADMIN: Can manage team and approve payments
  if (role === 'ADMIN') return true;

  // Team members with explicit approval permission
  if (userData?.canApprovePayments) return true;

  return false;
}

/**
 * Check if user can initiate payments
 */
export function canInitiatePayments(user: UserSession): boolean {
  const { role, userData, isWalletOwner } = user;

  // Original wallet owner: Full access
  if (isWalletOwner === true) return true;

  // OWNER and ADMIN have full payment access
  if (role === 'OWNER' || role === 'ADMIN') return true;

  // ACCOUNTANT can initiate payments
  if (role === 'ACCOUNTANT') return true;

  // Team members with explicit permission
  if (userData?.canInitiatePayments) return true;

  return false;
}

/**
 * Check if user can view transactions
 */
export function canViewTransactions(user: UserSession): boolean {
  const { role, userData, isWalletOwner } = user;

  // Original wallet owner: Full access
  if (isWalletOwner === true) return true;

  // OWNER, ADMIN, ACCOUNTANT have transaction access
  if (role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT') return true;

  // Team members with explicit permission
  if (userData?.canViewTransactions) return true;

  return false;
}

/**
 * Check if user can manage team
 */
export function canManageTeam(user: UserSession): boolean {
  const { role, userData, isWalletOwner } = user;

  // Original wallet owner: Full access
  if (isWalletOwner === true) return true;

  // OWNER and ADMIN can manage team
  if (role === 'OWNER' || role === 'ADMIN') return true;

  // Team members with explicit permission
  if (userData?.canManageTeam) return true;

  return false;
}

/**
 * Get all user permissions based on role and explicit permissions
 */
export function getUserPermissions(user: UserSession): UserPermissions {
  const permissions: UserPermissions = { ...user.userData };

  // Original wallet owner has full permissions
  if (user.isWalletOwner === true) {
    permissions.canViewBalance = true;
    permissions.canViewTransactions = true;
    permissions.canInitiatePayments = true;
    permissions.canApprovePayments = true;
    permissions.canManageTeam = true;
    return permissions;
  }

  // Apply role-based permissions for team members
  switch (user.role) {
    case 'OWNER':
      permissions.canViewBalance = true;
      permissions.canViewTransactions = true;
      permissions.canInitiatePayments = true;
      permissions.canApprovePayments = true;
      permissions.canManageTeam = true;
      break;

    case 'ADMIN':
      permissions.canViewBalance = true;
      permissions.canViewTransactions = true;
      permissions.canInitiatePayments = true;
      permissions.canApprovePayments = true;
      permissions.canManageTeam = true;
      break;

    case 'ACCOUNTANT':
      permissions.canViewBalance = true;
      permissions.canViewTransactions = true;
      permissions.canInitiatePayments = true;
      // Note: ACCOUNTANT cannot approve payments by default
      break;

    case 'MEMBER':
      permissions.canViewBalance = true;
      permissions.canViewTransactions = true;
      // Note: MEMBER cannot initiate or approve payments by default
      break;

    case 'VIEWER':
      permissions.canViewBalance = true;
      permissions.canViewTransactions = true;
      // Note: VIEWER has read-only access
      break;
  }

  return permissions;
}
