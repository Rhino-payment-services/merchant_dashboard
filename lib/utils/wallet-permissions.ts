export interface UserPermissions {
  canViewBalance?: boolean
  canViewTransactions?: boolean
  canInitiatePayments?: boolean
  canApprovePayments?: boolean
  canManageTeam?: boolean
  canCheckInEventTickets?: boolean
  canViewEventStats?: boolean
  canManageEvents?: boolean
}

const PERM_KEYS: (keyof UserPermissions)[] = [
  'canViewBalance',
  'canViewTransactions',
  'canInitiatePayments',
  'canApprovePayments',
  'canManageTeam',
  'canCheckInEventTickets',
  'canViewEventStats',
  'canManageEvents',
]

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
}

function readKey(obj: Record<string, unknown>, key: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  if (key in obj) return obj[key]
  const snake = toSnake(key)
  if (snake in obj) return obj[snake]
  return undefined
}

/** Pull permission flags from one plain object (camelCase or snake_case). */
export function pickPermissionsFromObject(source: unknown): Partial<UserPermissions> {
  if (!source || typeof source !== 'object') return {}
  const o = source as Record<string, unknown>
  const out: Partial<UserPermissions> = {}
  for (const k of PERM_KEYS) {
    const v = readKey(o, k as string)
    if (v !== undefined && v !== null) {
      out[k] = Boolean(v)
    }
  }
  return out
}

/** Merge later buckets over earlier ones (last non-undefined wins). */
export function mergePermissionBuckets(buckets: unknown[]): UserPermissions {
  const out: UserPermissions = {}
  for (const b of buckets) {
    const partial = pickPermissionsFromObject(b)
    for (const k of PERM_KEYS) {
      if (partial[k] !== undefined) {
        out[k] = partial[k]
      }
    }
  }
  return out
}

/**
 * Effective wallet-team flags for the logged-in user.
 * Handles multiple API shapes: wallet.permissions, nested teamMember, login userData, snake_case.
 */
export function getEffectiveWalletPermissions(
  profile: {
    walletPermissions?: unknown
    businessWallet?: Record<string, unknown> | null
  } | null,
  sessionUserData?: unknown
): UserPermissions {
  const w = profile?.businessWallet
  return mergePermissionBuckets([
    profile?.walletPermissions,
    w?.permissions,
    w?.teamMemberPermissions,
    w?.walletTeamMember,
    w?.teamMember,
    (sessionUserData as Record<string, unknown> | undefined)?.permissions,
    (sessionUserData as Record<string, unknown> | undefined)?.walletTeamMember,
    sessionUserData,
  ])
}
