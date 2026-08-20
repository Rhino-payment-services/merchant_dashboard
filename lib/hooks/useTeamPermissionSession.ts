'use client';

import { useMemo } from 'react';
import { useUserProfile } from '@/app/(dashboard)/UserProfileProvider';
import type { UserSession } from '@/lib/utils/permissions';

export function useTeamPermissionSession(): UserSession {
  const { profile } = useUserProfile();
  return useMemo(
    () => ({
      role: (profile as any)?.role,
      isWalletOwner: !!(profile as any)?.isWalletOwner,
      userData: (profile as any)?.walletPermissions,
    }),
    [profile],
  );
}
