'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AccessibleMerchant,
  merchantCodesMatch,
  useAccessibleMerchants,
} from '@/lib/hooks/useAccessibleMerchants'

export interface ChildMerchantContext {
  childMerchantId: string | null
  childMerchantCode: string | null
  childMerchantName: string | null
  isViewingChild: boolean
  isContextReady: boolean
  clearChildContext: () => Promise<void>
}

function resolveChildFromMerchants(
  merchants: AccessibleMerchant[],
  childMerchantId: string | null | undefined,
  merchantCode: string | null | undefined,
): Pick<ChildMerchantContext, 'childMerchantId' | 'childMerchantCode' | 'childMerchantName'> {
  if (childMerchantId) {
    const byId = merchants.find((m) => m.id === childMerchantId)
    if (byId?.isChildMerchant) {
      return {
        childMerchantId: byId.id,
        childMerchantCode: byId.merchantCode,
        childMerchantName: byId.businessTradeName,
      }
    }
  }

  if (merchantCode) {
    const byCode = merchants.find(
      (m) => m.isChildMerchant && merchantCodesMatch(m.merchantCode, merchantCode),
    )
    if (byCode) {
      return {
        childMerchantId: byCode.id,
        childMerchantCode: byCode.merchantCode,
        childMerchantName: byCode.businessTradeName,
      }
    }
  }

  return {
    childMerchantId: null,
    childMerchantCode: null,
    childMerchantName: null,
  }
}

export function useChildMerchantContext(): ChildMerchantContext {
  const { data: session, update: updateSession } = useSession()
  const queryClient = useQueryClient()
  const { merchants, loadingChildren } = useAccessibleMerchants()
  const [urlContext, setUrlContext] = useState<{
    merchantId: string | null
    merchantCode: string | null
  }>({ merchantId: null, merchantCode: null })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setUrlContext({
      merchantId: params.get('merchantId'),
      merchantCode: params.get('merchantCode'),
    })
  }, [])

  const sessionMerchantCode = (session?.user as { merchantCode?: string })?.merchantCode ?? null
  const viewingChildMerchantId =
    (session?.user as { viewingChildMerchantId?: string | null })?.viewingChildMerchantId ?? null
  const viewingChildMerchantName =
    (session?.user as { viewingChildMerchantName?: string | null })?.viewingChildMerchantName ?? null

  const resolved = useMemo(() => {
    if (urlContext.merchantId && urlContext.merchantCode) {
      const fromUrl = resolveChildFromMerchants(
        merchants,
        urlContext.merchantId,
        urlContext.merchantCode,
      )
      if (fromUrl.childMerchantId) {
        return fromUrl
      }
      return {
        childMerchantId: urlContext.merchantId,
        childMerchantCode: urlContext.merchantCode,
        childMerchantName: urlContext.merchantCode,
      }
    }

    if (viewingChildMerchantId) {
      const fromList = resolveChildFromMerchants(
        merchants,
        viewingChildMerchantId,
        sessionMerchantCode,
      )
      if (fromList.childMerchantId) {
        return fromList
      }
      return {
        childMerchantId: viewingChildMerchantId,
        childMerchantCode: sessionMerchantCode,
        childMerchantName: viewingChildMerchantName || sessionMerchantCode,
      }
    }

    return resolveChildFromMerchants(merchants, null, sessionMerchantCode)
  }, [
    merchants,
    sessionMerchantCode,
    urlContext,
    viewingChildMerchantId,
    viewingChildMerchantName,
  ])

  const isViewingChild = Boolean(viewingChildMerchantId || resolved.childMerchantId)
  const isContextReady =
    !viewingChildMerchantId || Boolean(resolved.childMerchantId) || !loadingChildren

  const clearChildContext = useCallback(async () => {
    const superMerchant = merchants.find((m) => m.isSuperMerchant && m.isOwnAccount)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('merchantId')
      url.searchParams.delete('merchantCode')
      window.history.replaceState({}, '', url.toString())
      setUrlContext({ merchantId: null, merchantCode: null })
    }

    if (superMerchant) {
      await updateSession({
        merchantCode: superMerchant.merchantCode,
        viewingChildMerchantId: null,
        viewingChildMerchantName: null,
      })
    } else {
      await updateSession({
        viewingChildMerchantId: null,
        viewingChildMerchantName: null,
      })
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ])
  }, [merchants, queryClient, updateSession])

  return {
    ...resolved,
    isViewingChild,
    isContextReady,
    clearChildContext,
  }
}

export async function switchAccessibleMerchant(
  updateSession: (data: Record<string, string | null>) => Promise<unknown>,
  merchant: AccessibleMerchant,
) {
  await updateSession({
    merchantCode: merchant.merchantCode,
    viewingChildMerchantId: merchant.isChildMerchant ? merchant.id : null,
    viewingChildMerchantName: merchant.isChildMerchant ? merchant.businessTradeName : null,
  })
}
