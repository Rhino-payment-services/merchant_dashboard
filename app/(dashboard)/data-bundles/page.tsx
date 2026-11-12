'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Phone,
  Send,
  Upload,
  Wallet,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useDataBundleSummary } from '@/lib/hooks/useDataBundles';
import { formatUgx } from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from './_components/DataBundleAccessContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BatchesTable, BatchesTableSkeleton } from './_components/BatchesTable';
import { SkeletonRegion, StatCard, StatGridSkeleton } from './_components/shared';

function OverviewSkeleton() {
  return (
    <SkeletonRegion label="Loading overview…" className="space-y-6">
      <StatGridSkeleton count={4} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" withHint />
      <StatGridSkeleton count={4} withIcon={false} />
      <StatGridSkeleton count={2} className="grid grid-cols-1 sm:grid-cols-2 gap-4" withHint />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent batches</CardTitle>
          <Skeleton className="h-4 w-14" />
        </CardHeader>
        <CardContent>
          <BatchesTableSkeleton rows={5} />
        </CardContent>
      </Card>
    </SkeletonRegion>
  );
}

export default function DataBundlesOverviewPage() {
  const router = useRouter();
  const access = useDataBundleAccessContext();
  const { data: summary, isLoading } = useDataBundleSummary({}, access.can.view);

  useEffect(() => {
    // System Administrators manage roles only.
    if (!access.can.view && access.can.manageUsers) {
      router.replace('/data-bundles/team');
    }
  }, [access, router]);

  if (!access.can.view) return null;
  if (isLoading || !summary) return <OverviewSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total batches" value={summary.batches.total} icon={Layers} />
        <StatCard
          label="Pending approval"
          value={summary.batches.pendingApproval}
          icon={Clock}
          tone="text-amber-600"
          hint={formatUgx(summary.value.pendingApproval)}
        />
        <StatCard
          label="Approved value"
          value={formatUgx(summary.value.approved)}
          icon={Wallet}
          tone="text-blue-600"
        />
        <StatCard
          label="Delivered value"
          value={formatUgx(summary.value.delivered)}
          icon={CheckCircle}
          tone="text-green-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recipients delivered" value={summary.recipients.delivered} tone="text-green-600" />
        <StatCard label="In progress" value={summary.recipients.inProgress} tone="text-blue-600" />
        <StatCard label="Failed (retryable)" value={summary.recipients.failed} icon={XCircle} tone="text-red-600" />
        <StatCard
          label="Needs reconciliation"
          value={summary.recipients.needsReconciliation}
          icon={AlertTriangle}
          tone="text-amber-600"
        />
      </div>

      {summary.byProduct && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Airtime delivered"
            value={formatUgx(summary.byProduct.airtime.deliveredValue)}
            icon={Phone}
            tone="text-green-600"
            hint={`${summary.byProduct.airtime.delivered} delivered · ${summary.byProduct.airtime.failed} failed`}
          />
          <StatCard
            label="Data bundles delivered"
            value={formatUgx(summary.byProduct.dataBundles.deliveredValue)}
            icon={Wifi}
            tone="text-green-600"
            hint={`${summary.byProduct.dataBundles.delivered} delivered · ${summary.byProduct.dataBundles.failed} failed`}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {access.can.upload && (
          <Button asChild>
            <Link href="/data-bundles/single">
              <Send className="h-4 w-4 mr-2" /> Buy for one
            </Link>
          </Button>
        )}
        {access.can.upload && (
          <Button variant="outline" asChild>
            <Link href="/data-bundles/upload">
              <Upload className="h-4 w-4 mr-2" /> New upload
            </Link>
          </Button>
        )}
        {access.can.approve && summary.batches.pendingApproval > 0 && (
          <Button variant="outline" asChild>
            <Link href="/data-bundles/approvals">
              Review {summary.batches.pendingApproval} pending approval(s)
            </Link>
          </Button>
        )}
        {summary.recipients.failed > 0 && (
          <Button variant="outline" asChild>
            <Link href="/data-bundles/failed">View failed records</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent batches</CardTitle>
          <Link href="/data-bundles/batches" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <BatchesTable batches={summary.recentBatches} />
        </CardContent>
      </Card>
    </div>
  );
}
