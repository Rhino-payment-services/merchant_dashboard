/** Fields stored on the NextAuth JWT for each merchant. Keep this small — the JWT is a cookie. */
export type SlimSessionMerchant = {
  id: string
  merchantCode: string
  businessTradeName: string
  isActive?: boolean
  isVerified?: boolean
  isSuperMerchant: boolean
  isOwnAccount: boolean
  featureBulkPayments: boolean
  featureLiquidation: boolean
  featurePayroll: boolean
  featurePayrollApprovals: boolean
  featurePinLogin: boolean
  liquidationOnlyMode: boolean
}

export function isSessionMerchantOwnAccount(
  merchant: { isOwnAccount?: boolean } | null | undefined,
): boolean {
  // Owner-only features require an explicit true from login. Missing/false = not owner.
  return merchant?.isOwnAccount === true
}

export function slimSessionMerchant(merchant: Record<string, unknown>): SlimSessionMerchant {
  return {
    id: String(merchant.id ?? ''),
    merchantCode: String(merchant.merchantCode ?? ''),
    businessTradeName: String(merchant.businessTradeName ?? ''),
    isActive: merchant.isActive === true,
    isVerified: merchant.isVerified === true,
    isSuperMerchant: merchant.isSuperMerchant === true,
    isOwnAccount: merchant.isOwnAccount === true,
    featureBulkPayments: merchant.featureBulkPayments === true,
    featureLiquidation: merchant.featureLiquidation === true,
    featurePayroll: merchant.featurePayroll === true,
    featurePayrollApprovals: merchant.featurePayrollApprovals === true,
    featurePinLogin: merchant.featurePinLogin === true,
    liquidationOnlyMode: merchant.liquidationOnlyMode === true,
  }
}

export function slimSessionMerchants(merchants: unknown): SlimSessionMerchant[] {
  if (!Array.isArray(merchants)) return []
  return merchants
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(slimSessionMerchant)
}

type ProfileSlice = {
  firstName?: string
  lastName?: string
  middleName?: string | null
}

/** JWT user blob: auth flags + name. Do not copy merchants (already on the token). */
export function slimSessionUser(user: Record<string, unknown> | null | undefined) {
  if (!user) return null
  const profile = user.profile as ProfileSlice | null | undefined
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    userType: user.userType,
    subscriberType: user.subscriberType,
    merchantCode: user.merchantCode,
    hasPassword: user.hasPassword,
    hasPendingMerchant: user.hasPendingMerchant,
    mustChangePassword: user.mustChangePassword || user.isFirstLogin || false,
    isFirstLogin: user.isFirstLogin || false,
    mustSetupMerchantPortalPin: user.mustSetupMerchantPortalPin || false,
    merchantPortalPinSet: user.merchantPortalPinSet || false,
    pinLoginEnabled: user.pinLoginEnabled || false,
    profile: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          middleName: profile.middleName ?? null,
        }
      : null,
  }
}
