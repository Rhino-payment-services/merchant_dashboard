import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQueries } from '@tanstack/react-query'
import { getChildMerchants } from '@/lib/api/super-merchant.api'

export interface AccessibleMerchant {
  id: string
  merchantCode: string
  businessTradeName: string
  isActive?: boolean
  isVerified?: boolean
  isSuperMerchant?: boolean
  isOwnAccount: boolean
  isChildMerchant: boolean
}

type SessionMerchant = {
  id: string
  merchantCode: string
  businessTradeName: string
  isActive?: boolean
  isVerified?: boolean
  isSuperMerchant?: boolean
}

function normalizeMerchantCode(code: string | null | undefined): string {
  return String(code || '').trim()
}

export function merchantCodesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeMerchantCode(a)
  const right = normalizeMerchantCode(b)
  if (!left || !right) return false
  return left === right || left === right.padStart(4, '0') || right === left.padStart(4, '0')
}

export function useAccessibleMerchants() {
  const { data: session } = useSession()
  const sessionMerchants: SessionMerchant[] = (session?.user as { merchants?: SessionMerchant[] })?.merchants ?? []

  const superMerchantIds = useMemo(
    () => sessionMerchants.filter((m) => m.isSuperMerchant).map((m) => m.id),
    [sessionMerchants],
  )

  const childQueries = useQueries({
    queries: superMerchantIds.map((superMerchantId) => ({
      queryKey: ['super-merchant', 'child-merchants', superMerchantId],
      queryFn: () => getChildMerchants(superMerchantId),
      enabled: Boolean(superMerchantId),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const merchants = useMemo(() => {
    const owned: AccessibleMerchant[] = sessionMerchants.map((m) => ({
      id: m.id,
      merchantCode: m.merchantCode,
      businessTradeName: m.businessTradeName,
      isActive: m.isActive,
      isVerified: m.isVerified,
      isSuperMerchant: m.isSuperMerchant ?? false,
      isOwnAccount: true,
      isChildMerchant: false,
    }))

    const ownedIds = new Set(owned.map((m) => m.id))
    const childMerchants = childQueries.flatMap((query) => query.data?.childMerchants ?? [])

    const children: AccessibleMerchant[] = childMerchants
      .filter((child) => !ownedIds.has(child.id))
      .map((child) => ({
        id: child.id,
        merchantCode: child.merchantCode,
        businessTradeName: child.businessTradeName,
        isActive: child.isActive,
        isVerified: child.isVerified,
        isSuperMerchant: false,
        isOwnAccount: false,
        isChildMerchant: true,
      }))

    const uniqueChildren = Array.from(
      new Map(children.map((child) => [child.id, child])).values(),
    )

    return [...owned, ...uniqueChildren]
  }, [sessionMerchants, childQueries])

  const loadingChildren = childQueries.some((query) => query.isLoading)

  return {
    merchants,
    loadingChildren,
    hasSuperMerchantAccount: superMerchantIds.length > 0,
  }
}
