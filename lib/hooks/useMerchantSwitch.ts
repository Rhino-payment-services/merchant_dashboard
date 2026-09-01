'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AccessibleMerchant } from '@/lib/hooks/useAccessibleMerchants'
import { switchAccessibleMerchant } from '@/lib/hooks/useChildMerchantContext'

export function useMerchantSwitch() {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const queryClient = useQueryClient()
  const [switching, setSwitching] = useState(false)

  const switchMerchant = useCallback(
    async (merchant: AccessibleMerchant, redirectTo = '/') => {
      if (switching) return false

      setSwitching(true)
      try {
        await switchAccessibleMerchant(updateSession, merchant)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['super-merchant'] }),
          queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        ])
        router.push(redirectTo)
        return true
      } catch {
        toast.error('Failed to switch company')
        return false
      } finally {
        setSwitching(false)
      }
    },
    [queryClient, router, switching, updateSession],
  )

  return { switchMerchant, switching }
}