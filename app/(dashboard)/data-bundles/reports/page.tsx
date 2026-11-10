'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Download, Loader2 } from 'lucide-react';
import { AccessDenied } from '@/app/components/AccessDenied';
import { dataBundlesApi, saveBlob, type ExportReport } from '@/lib/api/data-bundles.api';
import {
  useDataBundleBatches,
  useDataBundleSummary,
  useFailedRecords,
  useRetryHistory,
} from '@/lib/hooks/useDataBundles';
import {
  apiErrorMessage,
  BATCH_STATUS_META,
  formatDateTime,
  formatUgx,
  type BatchStatus,
} from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';
import { BatchesTable } from '../_components/BatchesTable';
import {
  EmptyBlock,
  LoadingBlock,
  Pagination,
  RowStatusBadge,
  SearchInput,
  StatCard,
  useDebounced,
} from '../_components/shared';

type TabId = 'batches' | 'recipients' | 'retries';

/**
 * Finance view. Read-only: approval and retry actions live on their own pages
 * and are only shown there to users holding those permissions.
 */
export default function DataBundleReportsPage() {
  const access = useDataBundleAccessContext();
  const [tab, setTab] = useState<TabId>('batches');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | BatchStatus>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<string | null>(null);
  const debouncedSearch = useDebounced(search);
  const enabled = access.can.reports;

  const filters = {
    search: debouncedSearch,
    from: from || undefined,
    to: to || undefined,
  };
  const summary = useDataBundleSummary({ from: filters.from, to: filters.to }, enabled);
  const batches = useDataBundleBatches(
    { ...filters, page, limit: 20, status: status === 'ALL' ? undefined : status },
    enabled && tab === 'batches',
  );
  const failed = useFailedRecords({ ...filters, page, limit: 20 }, enabled && tab === 'recipients');
  const retries = useRetryHistory({ ...filters, page, limit: 20 }, enabled && tab === 'retries');

  if (!enabled) {
    return <AccessDenied description="You do not have permission to view data bundle reports." />;
  }

  const doExport = async (report: ExportReport, format: 'xlsx' | 'csv') => {
    try {
      setExporting(`${report}-${format}`);
      const blob = await dataBundlesApi.exportReport({
        report,
        format,
        ...filters,
        status: report === 'batches' && status !== 'ALL' ? status : undefined,
      });
      saveBlob(blob, `data-bundles-${report}-${new Date().toISOString().slice(0, 10)}.${format}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Export failed'));
    } finally {
      setExporting(null);
    }
  };

  const exportReport: ExportReport =
    tab === 'batches' ? 'batches' : tab === 'recipients' ? 'failed' : 'retries';
  const s = summary.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500" htmlFor="report-from">From</label>
              <Input id="report-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500" htmlFor="report-to">To</label>
              <Input id="report-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['xlsx', 'csv'] as const).map((format) => (
              <Button
                key={format}
                variant="outline"
                disabled={!!exporting}
                onClick={() => doExport(exportReport, format)}
              >
                {exporting === `${exportReport}-${format}` ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export {format === 'xlsx' ? 'Excel' : 'CSV'}
              </Button>
            ))}
            <Button variant="outline" disabled={!!exporting} onClick={() => doExport('recipients', 'xlsx')}>
              <Download className="h-4 w-4 mr-2" /> All recipients (Excel)
            </Button>
          </div>
        </CardContent>
      </Card>

      {!s ? (
        <LoadingBlock />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total batches" value={s.batches.total} />
          <StatCard label="Pending approval" value={s.batches.pendingApproval} tone="text-amber-600" />
          <StatCard label="Approved / rejected" value={`${s.batches.approved} / ${s.batches.rejected}`} />
          <StatCard label="Processing" value={s.batches.processing} tone="text-blue-600" />
          <StatCard label="Completed" value={s.batches.completed} tone="text-green-600" />
          <StatCard label="Partially completed" value={s.batches.partiallyCompleted} tone="text-amber-600" />
          <StatCard label="Failed batches" value={s.batches.failed} tone="text-red-600" />
          <StatCard
            label="Total bundle value"
            value={formatUgx(s.value.approved)}
            hint={`Delivered ${formatUgx(s.value.delivered)}`}
            tone="text-blue-600"
          />
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabId);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="batches">Batches & uploads</TabsTrigger>
          <TabsTrigger value="recipients">Failed recipients</TabsTrigger>
          <TabsTrigger value="retries">Retry history</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">
              {tab === 'batches' ? 'Upload history' : tab === 'recipients' ? 'Failed recipients' : 'Retry history'}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
              {tab === 'batches' && (
                <Select value={status} onValueChange={(v) => { setStatus(v as 'ALL' | BatchStatus); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {(Object.keys(BATCH_STATUS_META) as BatchStatus[]).map((st) => (
                      <SelectItem key={st} value={st}>{BATCH_STATUS_META[st].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="batches" className="mt-0">
              {batches.isLoading || !batches.data ? (
                <LoadingBlock />
              ) : (
                <>
                  <BatchesTable batches={batches.data.items} />
                  <Pagination {...batches.data.pagination} onPageChange={setPage} />
                </>
              )}
            </TabsContent>

            <TabsContent value="recipients" className="mt-0">
              {failed.isLoading || !failed.data ? (
                <LoadingBlock />
              ) : failed.data.items.length === 0 ? (
                <EmptyBlock title="No failed recipients" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Bundle</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Transaction ref</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead className="text-right">Attempts</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failed.data.items.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.batchNumber}</TableCell>
                            <TableCell>{r.phoneNumber}</TableCell>
                            <TableCell>{r.bundleCode}</TableCell>
                            <TableCell><RowStatusBadge status={r.status} /></TableCell>
                            <TableCell className="text-xs">{r.transactionReference ?? '—'}</TableCell>
                            <TableCell className="text-xs">{r.providerStatus ?? '—'}</TableCell>
                            <TableCell className="text-right">{r.attemptCount}</TableCell>
                            <TableCell className="text-xs text-red-600">{r.failureReason ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination {...failed.data.pagination} onPageChange={setPage} />
                </>
              )}
            </TabsContent>

            <TabsContent value="retries" className="mt-0">
              {retries.isLoading || !retries.data ? (
                <LoadingBlock />
              ) : retries.data.items.length === 0 ? (
                <EmptyBlock title="No retries yet" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>When</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Attempt</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Retried by</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retries.data.items.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="whitespace-nowrap text-xs">{formatDateTime(a.createdAt)}</TableCell>
                            <TableCell>{a.batchNumber}</TableCell>
                            <TableCell>{a.phoneNumber}</TableCell>
                            <TableCell>#{a.attemptNo}</TableCell>
                            <TableCell className="text-xs">{a.reference}</TableCell>
                            <TableCell><RowStatusBadge status={a.status} /></TableCell>
                            <TableCell>{a.triggeredBy.name ?? '—'}</TableCell>
                            <TableCell className="text-xs text-red-600">{a.failureReason ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination {...retries.data.pagination} onPageChange={setPage} />
                </>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
