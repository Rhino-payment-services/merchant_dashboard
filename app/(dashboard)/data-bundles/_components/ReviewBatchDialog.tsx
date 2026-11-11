'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { DataBundleBatch } from '@/lib/api/data-bundles.api';
import { useApproveBatch, useDataBundleRows, useRejectBatch } from '@/lib/hooks/useDataBundles';
import { formatDateTime, formatUgx, productTypeOf } from '@/lib/utils/data-bundles';
import {
  Pagination,
  ProductTypeBadge,
  TableRowsSkeleton,
  batchMixText,
  rowProductText,
  type SkeletonColumn,
} from './shared';

const ROW_SKELETON_COLUMNS: SkeletonColumn[] = [
  {},
  {},
  { twoLine: true },
  { align: 'right' },
  {},
  {},
];

export function ReviewBatchDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: DataBundleBatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [page, setPage] = useState(1);
  const approve = useApproveBatch();
  const reject = useRejectBatch();
  const rows = useDataBundleRows(open && batch ? batch.id : undefined, {
    page,
    limit: 10,
    status: 'VALID',
  });

  const close = (next: boolean) => {
    if (!next) {
      setMode('review');
      setReason('');
      setComment('');
      setPage(1);
    }
    onOpenChange(next);
  };

  if (!batch) return null;
  const busy = approve.isPending || reject.isPending;

  const onApprove = async () => {
    await approve.mutateAsync({ id: batch.id, comment: comment.trim() || undefined });
    close(false);
  };
  const onReject = async () => {
    await reject.mutateAsync({ id: batch.id, reason: reason.trim() });
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review batch {batch.batchNumber}</DialogTitle>
          <DialogDescription>
            Check the totals and recipients. Approving sends the airtime and bundles immediately and
            debits the disbursement wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <p className="text-gray-500">Recipients</p>
            <p className="text-lg font-semibold">{batch.validRows}</p>
            {batchMixText(batch) && <p className="text-xs text-gray-500">{batchMixText(batch)}</p>}
          </div>
          <div className="rounded-md border p-3">
            <p className="text-gray-500">Total value</p>
            <p className="text-lg font-semibold">{formatUgx(batch.totalAmount)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-gray-500">Maker</p>
            <p className="font-medium truncate">{batch.maker.name ?? '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-gray-500">Submitted</p>
            <p className="font-medium">{formatDateTime(batch.submittedAt)}</p>
          </div>
        </div>
        {(batch.invalidRows > 0 || batch.duplicateRows > 0) && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">
            {batch.invalidRows} invalid and {batch.duplicateRows} duplicate row(s) were excluded and
            will not be sent.
          </p>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Airtime / Bundle</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Name / Note</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-busy={rows.isLoading || undefined}>
              {rows.isLoading && <TableRowsSkeleton columns={ROW_SKELETON_COLUMNS} rows={5} />}
              {(rows.data?.items ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.rowNumber}</TableCell>
                  <TableCell>{r.phoneNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProductTypeBadge type={r.productType} />
                      <span>{rowProductText(r)}</span>
                    </div>
                    {productTypeOf(r) === 'DATA_BUNDLE' && (
                      <div className="text-xs text-gray-500">
                        {r.quantity}
                        {r.unit} / {r.validity}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatUgx(r.unitPrice)}</TableCell>
                  <TableCell className="text-xs">{r.recipientNote ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.clientReference}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.data && (
            <Pagination
              page={rows.data.pagination.page}
              totalPages={rows.data.pagination.totalPages}
              total={rows.data.pagination.total}
              limit={rows.data.pagination.limit}
              onPageChange={setPage}
            />
          )}
        </div>

        {mode === 'review' ? (
          <div className="space-y-1">
            <Label htmlFor="approve-comment">Comment (optional)</Label>
            <Textarea
              id="approve-comment"
              value={comment}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              maxLength={500}
              placeholder="Explain why this batch is rejected"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode === 'review' ? (
            <>
              <Button variant="outline" onClick={() => setMode('reject')} disabled={busy}>
                Reject
              </Button>
              <Button onClick={onApprove} disabled={busy}>
                {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve & send {formatUgx(batch.totalAmount)}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode('review')} disabled={busy}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={onReject}
                disabled={busy || reason.trim().length < 3}
              >
                {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm rejection
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
