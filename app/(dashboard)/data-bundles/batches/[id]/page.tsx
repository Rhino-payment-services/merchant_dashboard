'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Download, Loader2, RotateCcw, Send, Trash2 } from 'lucide-react';
import { dataBundlesApi, saveBlob } from '@/lib/api/data-bundles.api';
import {
  useDataBundleBatch,
  useDataBundleRows,
  useDiscardBatch,
  useRetryRecords,
  useSubmitBatch,
} from '@/lib/hooks/useDataBundles';
import {
  apiErrorMessage,
  formatDateTime,
  formatUgx,
  ROW_STATUS_META,
  type RowStatus,
} from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from '../../_components/DataBundleAccessContext';
import { ReviewBatchDialog } from '../../_components/ReviewBatchDialog';
import {
  BatchStatusBadge,
  LoadingBlock,
  Pagination,
  RowStatusBadge,
  SearchInput,
  StatCard,
  useDebounced,
} from '../../_components/shared';

const AUDIT_LABELS: Record<string, string> = {
  UPLOADED: 'Uploaded and validated',
  SUBMITTED: 'Submitted for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PROCESSING_STARTED: 'Delivery started',
  EXECUTION_FAILED: 'Could not queue delivery',
  COMPLETED: 'Delivery finished',
  RETRY_REQUESTED: 'Retry requested',
};

export default function DataBundleBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const access = useDataBundleAccessContext();
  const [rowStatus, setRowStatus] = useState<'ALL' | RowStatus>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounced(search);

  const { data: batch, isLoading, error } = useDataBundleBatch(id);
  const rows = useDataBundleRows(id, {
    page,
    limit: 25,
    search: debouncedSearch,
    status: rowStatus === 'ALL' ? undefined : rowStatus,
  });
  const submit = useSubmitBatch();
  const discard = useDiscardBatch();
  const retry = useRetryRecords();

  if (isLoading) return <LoadingBlock />;
  if (error || !batch) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-600">
          {apiErrorMessage(error, 'Batch not found')}
        </CardContent>
      </Card>
    );
  }

  const exportRecipients = async () => {
    try {
      setExporting(true);
      const blob = await dataBundlesApi.exportReport({
        report: 'recipients',
        format: 'xlsx',
        batchId: batch.id,
      });
      saveBlob(blob, `data-bundles-${batch.batchNumber}-recipients.xlsx`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{batch.batchNumber}</h2>
              <BatchStatusBadge status={batch.status} />
            </div>
            <p className="text-sm text-gray-500">
              {batch.fileName}
              {batch.description ? ` · ${batch.description}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {batch.actions.canSubmit && (
            <Button
              onClick={() => submit.mutate(batch.id)}
              disabled={submit.isPending || batch.validRows === 0}
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit for Approval
            </Button>
          )}
          {batch.actions.canDiscard && (
            <Button
              variant="outline"
              disabled={discard.isPending}
              onClick={async () => {
                await discard.mutateAsync(batch.id);
                router.push('/data-bundles/batches');
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Discard draft
            </Button>
          )}
          {batch.actions.canApprove && (
            <Button onClick={() => setReviewOpen(true)}>Review & approve</Button>
          )}
          {batch.actions.canRetry && (
            <Button
              variant="outline"
              disabled={retry.isPending}
              onClick={() => retry.mutate({ batchId: batch.id, all: true })}
            >
              {retry.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Retry all failed
            </Button>
          )}
          {access.can.reports && (
            <Button variant="outline" onClick={exportRecipients} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          )}
        </div>
      </div>

      {batch.status === 'PENDING_APPROVAL' && batch.maker.id && !batch.actions.canApprove && access.can.approve && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          You uploaded this batch, so another checker must approve or reject it.
        </p>
      )}
      {batch.status === 'REJECTED' && batch.rejectionReason && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Rejected by {batch.checker?.name ?? 'checker'}: {batch.rejectionReason}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recipients" value={batch.validRows} hint={`${batch.totalRows} rows in file`} />
        <StatCard label="Total value" value={formatUgx(batch.totalAmount)} tone="text-blue-600" />
        <StatCard
          label="Delivered"
          value={batch.successCount}
          tone="text-green-600"
          hint={formatUgx(batch.successAmount)}
        />
        <StatCard
          label="Failed / pending"
          value={`${batch.failedCount} / ${batch.pendingCount}`}
          tone="text-red-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Detail label="Maker" value={batch.maker.name} />
          <Detail label="Uploaded" value={formatDateTime(batch.createdAt)} />
          <Detail label="Submitted" value={formatDateTime(batch.submittedAt)} />
          <Detail label="Checker" value={batch.checker?.name} />
          <Detail
            label={batch.rejectedAt ? 'Rejected' : 'Approved'}
            value={formatDateTime(batch.rejectedAt ?? batch.approvedAt)}
          />
          <Detail label="Completed" value={formatDateTime(batch.completedAt)} />
          <Detail label="Invalid / duplicate rows" value={`${batch.invalidRows} / ${batch.duplicateRows}`} />
          <Detail
            label="Bulk references"
            value={batch.bulkTransactionIds.length ? batch.bulkTransactionIds.join(', ') : '—'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Recipients</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Phone, reference, bundle"
            />
            <Select
              value={rowStatus}
              onValueChange={(v) => {
                setRowStatus(v as 'ALL' | RowStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {(Object.keys(ROW_STATUS_META) as RowStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ROW_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {rows.isLoading || !rows.data ? (
            <LoadingBlock />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Bundle</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction ref</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.data.items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.phoneNumber}</TableCell>
                        <TableCell>
                          {r.bundleCode ?? r.bundleInput}
                          {r.unit && (
                            <div className="text-xs text-gray-500">
                              {r.quantity}
                              {r.unit} / {r.validity}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {r.unitPrice ? formatUgx(r.unitPrice) : '—'}
                        </TableCell>
                        <TableCell>
                          <RowStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-xs">{r.transactionReference ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          {r.providerStatus ?? '—'}
                          {r.providerReference && (
                            <div className="text-gray-500">{r.providerReference}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.attemptCount}</TableCell>
                        <TableCell className="text-xs text-red-600 min-w-[180px]">
                          {r.failureReason ?? (r.validationErrors ?? []).join('; ')}
                        </TableCell>
                        <TableCell>
                          {r.canRetry && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retry.isPending}
                              onClick={() => retry.mutate({ batchId: batch.id, rowIds: [r.id] })}
                            >
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={rows.data.pagination.page}
                totalPages={rows.data.pagination.totalPages}
                total={rows.data.pagination.total}
                limit={rows.data.pagination.limit}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {batch.audit.map((a) => (
              <li key={a.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 text-sm">
                <span className="text-gray-500 sm:w-44 shrink-0">{formatDateTime(a.createdAt)}</span>
                <span>
                  <span className="font-medium">{AUDIT_LABELS[a.action] ?? a.action}</span>
                  {a.actor?.name && <span className="text-gray-600"> by {a.actor.name}</span>}
                  {typeof a.details?.reason === 'string' && (
                    <span className="text-gray-600"> · {a.details.reason}</span>
                  )}
                  {typeof a.details?.comment === 'string' && a.details.comment && (
                    <span className="text-gray-600"> · {a.details.comment}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="pt-4">
            <Link href="/data-bundles/batches" className="text-sm text-primary hover:underline">
              Back to batches
            </Link>
          </div>
        </CardContent>
      </Card>

      <ReviewBatchDialog batch={batch} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium break-words">{value || '—'}</p>
    </div>
  );
}
