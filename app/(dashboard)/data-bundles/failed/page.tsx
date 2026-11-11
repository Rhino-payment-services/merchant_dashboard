'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, RotateCcw } from 'lucide-react';
import { useDataBundleBatches, useFailedRecords, useRetryRecords } from '@/lib/hooks/useDataBundles';
import { formatDateTime, productTypeOf } from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';
import {
  Pagination,
  ProductTypeBadge,
  Refetching,
  RowStatusBadge,
  SearchInput,
  EmptyBlock,
  TableSkeleton,
  rowProductText,
  useDebounced,
  type SkeletonColumn,
} from '../_components/shared';

export default function DataBundleFailedRecordsPage() {
  const access = useDataBundleAccessContext();
  const [search, setSearch] = useState('');
  const [batchId, setBatchId] = useState<string>('ALL');
  const [retryableOnly, setRetryableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounced(search);
  const retry = useRetryRecords();

  const batches = useDataBundleBatches({
    page: 1,
    limit: 100,
    status: 'PROCESSING,COMPLETED,PARTIALLY_COMPLETED,FAILED',
  });
  const { data, isLoading, isPlaceholderData } = useFailedRecords({
    page,
    limit: 25,
    search: debouncedSearch,
    batchId: batchId === 'ALL' ? undefined : batchId,
    retryableOnly: retryableOnly || undefined,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const selectable = items.filter((r) => r.canRetry);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const retrySelected = async () => {
    const byBatch = new Map<string, string[]>();
    for (const row of items) {
      if (selected.has(row.id)) {
        byBatch.set(row.batchId, [...(byBatch.get(row.batchId) ?? []), row.id]);
      }
    }
    for (const [id, rowIds] of byBatch) {
      await retry.mutateAsync({ batchId: id, rowIds });
    }
    setSelected(new Set());
  };

  const selectedBatch = batches.data?.items.find((b) => b.id === batchId);

  const skeletonColumns: SkeletonColumn[] = [
    ...(access.can.retry ? [{ kind: 'checkbox' } as const] : []),
    { label: 'Phone' },
    { label: 'Type', kind: 'badge' },
    { label: 'Airtime / Bundle', twoLine: true },
    { label: 'Batch', twoLine: true },
    { label: 'Transaction ref' },
    { label: 'Failure reason' },
    { label: 'Provider status' },
    { label: 'Attempts', align: 'right' },
    { label: 'Last attempt' },
    { label: 'Retryable', kind: 'badge' },
    ...(access.can.retry ? [{ kind: 'button' } as const] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed records</CardTitle>
        <CardDescription>
          Only failed records that never reached the provider and were not charged can be retried.
          Delivered or in-progress records are never sent again. Records marked “Needs
          reconciliation” must be checked with support first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Phone, reference, bundle"
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select
              value={batchId}
              onValueChange={(v) => {
                setBatchId(v);
                setPage(1);
                setSelected(new Set());
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All batches</SelectItem>
                {(batches.data?.items ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchNumber} ({b.failedCount} failed)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={retryableOnly}
                onChange={(e) => {
                  setRetryableOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Retryable only
            </label>
          </div>
        </div>

        {access.can.retry && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={selected.size === 0 || retry.isPending}
              onClick={retrySelected}
            >
              {retry.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Retry selected ({selected.size})
            </Button>
            {selectedBatch && (
              <Button
                variant="outline"
                disabled={retry.isPending}
                onClick={() => retry.mutate({ batchId: selectedBatch.id, all: true })}
              >
                Retry all retryable in {selectedBatch.batchNumber}
              </Button>
            )}
          </div>
        )}

        {isLoading || !data ? (
          <TableSkeleton columns={skeletonColumns} label="Loading failed records…" />
        ) : items.length === 0 ? (
          <EmptyBlock title="No failed records" description="Everything has been delivered or is still in progress." />
        ) : (
          <Refetching active={isPlaceholderData}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {access.can.retry && (
                      <TableHead className="w-8">
                        <input
                          type="checkbox"
                          aria-label="Select all retryable"
                          checked={allSelected}
                          disabled={selectable.length === 0}
                          onChange={() =>
                            setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))
                          }
                        />
                      </TableHead>
                    )}
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Airtime / Bundle</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Transaction ref</TableHead>
                    <TableHead>Failure reason</TableHead>
                    <TableHead>Provider status</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Last attempt</TableHead>
                    <TableHead>Retryable</TableHead>
                    {access.can.retry && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      {access.can.retry && (
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select row ${r.rowNumber}`}
                            disabled={!r.canRetry}
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap">{r.phoneNumber}</TableCell>
                      <TableCell>
                        <ProductTypeBadge type={r.productType} />
                      </TableCell>
                      <TableCell>
                        {rowProductText(r)}
                        {productTypeOf(r) === 'DATA_BUNDLE' && (
                          <div className="text-xs text-gray-500">
                            {r.quantity}
                            {r.unit} / {r.validity}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/data-bundles/batches/${r.batchId}`} className="text-primary hover:underline">
                          {r.batchNumber}
                        </Link>
                        <div className="text-xs text-gray-500">Row {r.rowNumber}</div>
                      </TableCell>
                      <TableCell className="text-xs">{r.transactionReference ?? '—'}</TableCell>
                      <TableCell className="text-xs text-red-600 min-w-[200px]">{r.failureReason ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.providerStatus ?? '—'}</TableCell>
                      <TableCell className="text-right">{r.attemptCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(r.lastAttemptAt)}</TableCell>
                      <TableCell>
                        {r.retryable ? (
                          <span className="text-green-700 text-xs font-medium">Yes</span>
                        ) : (
                          <RowStatusBadge status={r.status} />
                        )}
                      </TableCell>
                      {access.can.retry && (
                        <TableCell>
                          {r.canRetry && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retry.isPending}
                              onClick={() => retry.mutate({ batchId: r.batchId, rowIds: [r.id] })}
                            >
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={data.pagination.limit}
              onPageChange={(p) => {
                setPage(p);
                setSelected(new Set());
              }}
            />
          </Refetching>
        )}
      </CardContent>
    </Card>
  );
}
