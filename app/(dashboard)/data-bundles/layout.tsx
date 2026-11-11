'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useDataBundleAccess } from '@/lib/hooks/useDataBundles';
import { apiErrorMessage } from '@/lib/utils/data-bundles';
import type { DataBundleAccess } from '@/lib/api/data-bundles.api';
import { DataBundleAccessProvider } from './_components/DataBundleAccessContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonRegion, StatGridSkeleton } from './_components/shared';

type Tab = {
  href: string;
  label: string;
  visible: (can: DataBundleAccess['can']) => boolean;
};

const TABS: Tab[] = [
  { href: '/data-bundles', label: 'Overview', visible: (c) => c.view },
  { href: '/data-bundles/upload', label: 'New Upload', visible: (c) => c.upload },
  { href: '/data-bundles/single', label: 'Buy for One', visible: (c) => c.upload },
  { href: '/data-bundles/batches', label: 'Batches', visible: (c) => c.view },
  { href: '/data-bundles/approvals', label: 'Approvals', visible: (c) => c.approve },
  { href: '/data-bundles/failed', label: 'Failed Records', visible: (c) => c.view },
  { href: '/data-bundles/reports', label: 'Reports', visible: (c) => c.reports },
  { href: '/data-bundles/team', label: 'Roles', visible: (c) => c.manageUsers },
];

function ModuleHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Airtime &amp; Bundles</h1>
      <p className="text-gray-600 mt-1 text-sm sm:text-base">
        Send airtime and mobile data bundles. Buying for one person is instant; bulk uploads
        go to a checker for approval.
      </p>
    </div>
  );
}

function AccessCheckSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 sm:py-8">
      <ModuleHeader />
      <SkeletonRegion label="Checking access…">
        <div className="mb-6 flex gap-4 border-b pb-2.5 overflow-hidden">
          {['w-16', 'w-20', 'w-20', 'w-14', 'w-20', 'w-24'].map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w} shrink-0`} />
          ))}
        </div>
        <StatGridSkeleton count={4} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />
      </SkeletonRegion>
    </div>
  );
}

/**
 * Gate for the whole module. The backend confirms the merchant feature flag and
 * the caller's data bundle permissions; every endpoint enforces them again.
 */
export default function DataBundlesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const { data: session, status } = useSession();
  const accessQuery = useDataBundleAccess(status === 'authenticated');

  if (status === 'loading' || (status === 'authenticated' && accessQuery.isLoading)) {
    return <AccessCheckSkeleton />;
  }
  if (!session || accessQuery.isError || !accessQuery.data) {
    return (
      <AccessDenied
        title="Airtime & Bundles unavailable"
        description={apiErrorMessage(
          accessQuery.error,
          'Airtime & Bundles is not available for your account.',
        )}
      />
    );
  }

  const access = accessQuery.data;
  const tabs = TABS.filter((t) => t.visible(access.can));
  if (tabs.length === 0) {
    return (
      <AccessDenied
        title="Airtime & Bundles unavailable"
        description="You do not have an airtime and bundles role for this merchant."
      />
    );
  }
  const isActive = (href: string) =>
    href === '/data-bundles' ? pathname === href : pathname.startsWith(href);

  return (
    <DataBundleAccessProvider value={access}>
      <div className="container mx-auto py-6 px-4 sm:py-8">
        <ModuleHeader />
        <nav className="mb-6 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1 border-b min-w-max">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  isActive(tab.href)
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </div>
    </DataBundleAccessProvider>
  );
}
