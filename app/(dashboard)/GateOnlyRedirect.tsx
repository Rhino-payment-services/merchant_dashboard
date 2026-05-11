"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUserProfile } from "./UserProfileProvider";
import { isGateOnlyStaffUser } from "@/lib/utils/permissions";

/**
 * Gate-only team members may only use gate check-in routes:
 * - /gate/*
 * - /events/:eventId/check-in (QR deep-link)
 * plus password change.
 */
export function GateOnlyRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useUserProfile();
  const { data: session } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!isGateOnlyStaffUser(profile, session)) return;

    const qrCheckInRoute = /^\/events\/[^/]+\/check-in$/.test(pathname);
    const allowed =
      pathname.startsWith("/gate") ||
      qrCheckInRoute ||
      pathname.startsWith("/auth/change-password");

    if (!allowed) {
      router.replace("/gate/events");
    }
  }, [loading, profile, session, pathname, router]);

  return null;
}
