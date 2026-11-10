'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileSpreadsheet, Loader2, Send, Trash2, UploadCloud } from 'lucide-react';
import { AccessDenied } from '@/app/components/AccessDenied';
import { dataBundlesApi, saveBlob, type UploadResult } from '@/lib/api/data-bundles.api';
import { useDiscardBatch, useSubmitBatch } from '@/lib/hooks/useDataBundles';
import {
  apiErrorMessage,
  canSubmitUpload,
  formatUgx,
  precheckUploadFile,
} from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';
import { RowStatusBadge, StatCard } from '../_components/shared';

type Phase = 'idle' | 'uploading' | 'validating' | 'done';
type RowFilter = 'ALL' | 'VALID' | 'INVALID' | 'DUPLICATE';
const PREVIEW_PAGE_SIZE = 25;

export default function DataBundlesUploadPage() {
  const router = useRouter();
  const access = useDataBundleAccessContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [filter, setFilter] = useState<RowFilter>('ALL');
  const [previewPage, setPreviewPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const submit = useSubmitBatch();
  const discard = useDiscardBatch();

  const filteredRows = useMemo(
    () => (result?.rows ?? []).filter((r) => filter === 'ALL' || r.status === filter),
    [result, filter],
  );
  const previewRows = filteredRows.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE,
  );
  const previewPages = Math.max(1, Math.ceil(filteredRows.length / PREVIEW_PAGE_SIZE));

  if (!access.can.upload) {
    return <AccessDenied description="You do not have permission to upload data bundle batches." />;
  }

  const pickFile = (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    const problem = precheckUploadFile(picked);
    if (problem) {
      setError(problem);
      toast.error(problem);
      return;
    }
    setError(null);
    setResult(null);
    setFile(picked);
  };

  const downloadTemplate = async () => {
    try {
      setDownloading(true);
      saveBlob(await dataBundlesApi.downloadTemplate(), 'data-bundles-template.xlsx');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Failed to download the template'));
    } finally {
      setDownloading(false);
    }
  };

  const validate = async () => {
    if (!file) return;
    setError(null);
    setPhase('uploading');
    setProgress(0);
    try {
      const res = await dataBundlesApi.uploadBatch(file, description.trim() || undefined, (p) => {
        setProgress(p);
        if (p >= 100) setPhase('validating');
      });
      setResult(res);
      setFilter(res.summary.invalidRows + res.summary.duplicateRows > 0 ? 'ALL' : 'VALID');
      setPreviewPage(1);
      setPhase('done');
      if (res.summary.validRows === 0) {
        toast.error('No valid records found. Fix the errors and upload again.');
      } else {
        toast.success(`${res.summary.validRows} valid record(s) ready for approval`);
      }
    } catch (e) {
      const message = apiErrorMessage(e, 'Upload failed. Please check the file and try again.');
      setError(message);
      setPhase('idle');
      toast.error(message);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase('idle');
    setProgress(0);
    setDescription('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onSubmit = async () => {
    if (!result) return;
    await submit.mutateAsync(result.batch.id);
    router.push(`/data-bundles/batches/${result.batch.id}`);
  };

  const onDiscard = async () => {
    if (!result) return;
    await discard.mutateAsync(result.batch.id);
    reset();
  };

  const busy = phase === 'uploading' || phase === 'validating';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>Upload recipients</CardTitle>
            <CardDescription>
              Use the template. Prices come from the approved bundle catalogue; prices in the file
              are ignored. Validation does not send any bundles.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={downloadTemplate} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Choose Excel file"
            disabled={busy}
            onChange={(e) => pickFile(e.target.files)}
          />
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !busy) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!busy) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!busy) pickFile(e.dataTransfer.files);
            }}
            onClick={() => !busy && inputRef.current?.click()}
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 bg-muted/30',
              busy ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-primary/50',
            ].join(' ')}
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-green-600" />
                <p className="font-medium text-gray-900 break-all">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · click to change</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-gray-400" />
                <p className="font-medium text-gray-900">Drag and drop your Excel file here</p>
                <p className="text-xs text-gray-500">or click to browse · .xlsx only · up to 5 MB · 1,000 rows</p>
              </>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="batch-description">Description (optional)</Label>
            <Input
              id="batch-description"
              value={description}
              maxLength={255}
              disabled={busy || phase === 'done'}
              placeholder="e.g. November staff data allowance"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {busy && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{phase === 'uploading' ? 'Uploading…' : 'Validating records…'}</span>
                <span>{phase === 'uploading' ? `${progress}%` : ''}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full bg-primary transition-all ${phase === 'validating' ? 'animate-pulse w-full' : ''}`}
                  style={phase === 'uploading' ? { width: `${progress}%` } : undefined}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-wrap gap-2">
            {phase !== 'done' && (
              <Button onClick={validate} disabled={!file || busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Validate file
              </Button>
            )}
            {(file || result) && !busy && (
              <Button variant="ghost" onClick={result ? onDiscard : reset} disabled={discard.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                {result ? 'Discard draft' : 'Clear'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total rows" value={result.summary.totalRows} />
            <StatCard label="Valid" value={result.summary.validRows} tone="text-green-600" />
            <StatCard label="Invalid" value={result.summary.invalidRows} tone="text-red-600" />
            <StatCard label="Duplicates" value={result.summary.duplicateRows} tone="text-amber-600" />
            <StatCard label="Total value" value={formatUgx(result.summary.totalAmount)} tone="text-blue-600" />
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Preview · {result.batch.batchNumber}</CardTitle>
                <CardDescription>
                  Only valid rows are submitted. Invalid and duplicate rows are kept for reference.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'VALID', 'INVALID', 'DUPLICATE'] as RowFilter[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? 'default' : 'outline'}
                    onClick={() => {
                      setFilter(f);
                      setPreviewPage(1);
                    }}
                  >
                    {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Bundle</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r) => (
                      <TableRow key={r.rowNumber}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell>
                          <RowStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.phoneNumber}
                          {r.network && <div className="text-xs text-gray-500">{r.network}</div>}
                        </TableCell>
                        <TableCell>
                          {r.bundleCode ?? r.bundleName ?? '—'}
                          <div className="text-xs text-gray-500">
                            {r.quantity}
                            {r.unit} {r.validity && `/ ${r.validity}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {r.unitPrice ? formatUgx(r.unitPrice) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.clientReference ?? 'auto'}</TableCell>
                        <TableCell className="text-xs text-red-600 min-w-[200px]">
                          {r.errors.join('; ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredRows.length > PREVIEW_PAGE_SIZE && (
                <div className="flex items-center justify-end gap-2 pt-4 text-sm">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage(previewPage - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {previewPage} of {previewPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={previewPage >= previewPages}
                    onClick={() => setPreviewPage(previewPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">
              {canSubmitUpload(result.summary)
                ? `${result.summary.validRows} recipient(s) totalling ${formatUgx(result.summary.totalAmount)} will be sent to a checker for approval.`
                : 'There are no valid records to submit. Fix the errors in your file and upload it again.'}
            </p>
            <Button onClick={onSubmit} disabled={!canSubmitUpload(result.summary) || submit.isPending}>
              {submit.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit for Approval
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
