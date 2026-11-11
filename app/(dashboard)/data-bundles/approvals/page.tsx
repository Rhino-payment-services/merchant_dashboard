'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessDenied } from '@/app/components/AccessDenied';
import type { DataBundleBatch } from '@/lib/api/data-bundles.api';
import { useDataBundleBatches } from '@/lib/hooks/useDataBundles';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';
import { BatchesTable } from '../_components/BatchesTable';
import { ReviewBatchDialog } from '../_components/ReviewBatchDialog';
import { LoadingBlock, Pagination } from '../_components/shared';

export default function DataBundleApprovalsPage() {
  const access = useDataBundleAccessContext();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DataBundleBatch | null>(null);
  const { data, isLoading } = useDataBundleBatches(
    { page, limit: 20, status: 'PENDING_APPROVAL' },
    access.can.approve,
  );

  if (!access.can.approve) {
    return <AccessDenied description="You do not have permission to approve airtime and bundle batches." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending approvals</CardTitle>
        <CardDescription>
          Batches you uploaded cannot be approved by you; another checker must review them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <>
            <BatchesTable
              batches={data.items}
              showResults={false}
              actions={(b) =>
                b.actions.canApprove ? (
                  <Button size="sm" onClick={() => setSelected(b)}>
                    Review
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500">Your upload</span>
                )
              }
            />
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={data.pagination.limit}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
      <ReviewBatchDialog
        batch={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </Card>
  );
}
