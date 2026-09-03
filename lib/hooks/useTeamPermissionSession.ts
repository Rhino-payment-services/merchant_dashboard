'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/app/(dashboard)/UserProfileProvider';
import { buildUserPermissionSession, type UserSession } from '@/lib/utils/permissions';

export function useTeamPermissionSession(): UserSession {
  const { profile } = useUserProfile();
  const { data: session } = useSession();
  const viewingChildMerchantId =
    (session?.user as { viewingChildMerchantId?: string | null })?.viewingChildMerchantId ??
    null;

  return useMemo(
    () =>
      buildUserPermissionSession({
        profile: profile as Parameters<typeof buildUserPermissionSession>[0]['profile'],
        viewingChildMerchantId,
      }),
    [profile, viewingChildMerchantId],
  );
}
