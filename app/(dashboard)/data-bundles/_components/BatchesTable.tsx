'use client';

import React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DataBundleBatch } from '@/lib/api/data-bundles.api';
import { formatDateTime, formatUgx } from '@/lib/utils/data-bundles';
import { BatchStatusBadge, EmptyBlock } from './shared';

export function BatchesTable({
  batches,
  showResults = true,
  actions,
}: {
  batches: DataBundleBatch[];
  showResults?: boolean;
  actions?: (batch: DataBundleBatch) => React.ReactNode;
}) {
  if (batches.length === 0) {
    return <EmptyBlock title="No batches found" description="Try changing the filters." />;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Recipients</TableHead>
            <TableHead className="text-right">Value</TableHead>
            {showResults && <TableHead className="text-right">Delivered / Failed</TableHead>}
            <TableHead>Maker</TableHead>
            <TableHead>Checker</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Approved</TableHead>
            {actions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <Link
                  href={`/data-bundles/batches/${b.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {b.batchNumber}
                </Link>
                {b.fileName && <div className="text-xs text-gray-500 truncate max-w-[180px]">{b.fileName}</div>}
              </TableCell>
              <TableCell>
                <BatchStatusBadge status={b.status} />
              </TableCell>
              <TableCell className="text-right">{b.validRows}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{formatUgx(b.totalAmount)}</TableCell>
              {showResults && (
                <TableCell className="text-right whitespace-nowrap">
                  <span className="text-green-600">{b.successCount}</span>
                  {' / '}
                  <span className="text-red-600">{b.failedCount}</span>
                  {b.pendingCount > 0 && <span className="text-gray-500"> ({b.pendingCount} pending)</span>}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap">{b.maker.name ?? '—'}</TableCell>
              <TableCell className="whitespace-nowrap">{b.checker?.name ?? '—'}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDateTime(b.createdAt)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDateTime(b.approvedAt)}</TableCell>
              {actions && <TableCell className="text-right whitespace-nowrap">{actions(b)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
