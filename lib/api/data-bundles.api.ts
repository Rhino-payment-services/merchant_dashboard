import apiClient from './client';
import type { BatchStatus, RowStatus } from '@/lib/utils/data-bundles';

export interface DataBundleAccess {
  merchantCode: string;
  isOwner: boolean;
  isSystemAdministrator: boolean;
  permissions: {
    canUploadDataBundles: boolean;
    canApproveDataBundles: boolean;
    canViewDataBundleReports: boolean;
    canManageDataBundleUsers: boolean;
    canRetryDataBundles: boolean;
  };
  can: {
    upload: boolean;
    approve: boolean;
    view: boolean;
    reports: boolean;
    retry: boolean;
    manageUsers: boolean;
  };
}

export interface DataBundleProduct {
  id: string;
  bundleCode: string;
  displayName: string;
  network: string;
  productName: string;
  quantity: number;
  unit: string;
  validity: string;
  /** Voice minutes included (Lyca), e.g. 1000 or "Unlimited". */
  minutes: number | string | null;
  price: string;
  currency: string;
}

export interface PersonRef {
  id: string;
  name: string | null;
}

export interface DataBundleBatch {
  id: string;
  batchNumber: string;
  status: BatchStatus;
  fileName: string | null;
  description: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  totalAmount: string;
  successAmount: string;
  currency: string;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  maker: PersonRef;
  checker: PersonRef | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  actions: {
    canSubmit: boolean;
    canDiscard: boolean;
    canApprove: boolean;
    canReject: boolean;
    canRetry: boolean;
  };
}

export interface DataBundleAuditEntry {
  id: string;
  action: string;
  actor: PersonRef | null;
  fromStatus: BatchStatus | null;
  toStatus: BatchStatus | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface DataBundleBatchDetail extends DataBundleBatch {
  bulkTransactionIds: string[];
  audit: DataBundleAuditEntry[];
}

export interface DataBundleRow {
  id: string;
  batchId: string;
  batchNumber: string;
  rowNumber: number;
  phoneNumber: string | null;
  network: string | null;
  bundleCode: string | null;
  bundleInput: string | null;
  productName: string | null;
  quantity: number | string | null;
  unit: string | null;
  validity: string | null;
  unitPrice: string | null;
  clientReference: string | null;
  recipientNote: string | null;
  status: RowStatus;
  validationErrors: string[] | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  failureReason: string | null;
  transactionReference: string | null;
  transactionId: string | null;
  providerReference: string | null;
  providerStatus: string | null;
  retryable: boolean;
  canRetry: boolean;
}

export interface RetryHistoryEntry {
  id: string;
  batchId: string;
  batchNumber: string;
  rowId: string;
  rowNumber: number;
  phoneNumber: string | null;
  bundleCode: string | null;
  attemptNo: number;
  reference: string;
  status: RowStatus;
  providerStatus: string | null;
  providerReference: string | null;
  failureReason: string | null;
  triggeredBy: PersonRef;
  createdAt: string;
  completedAt: string | null;
}

export interface Paged<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface UploadPreviewRow {
  rowNumber: number;
  phoneNumber: string | null;
  network: string | null;
  bundleCode: string | null;
  bundleName: string | null;
  quantity: number | string;
  unit: string;
  validity: string;
  unitPrice: string | null;
  clientReference: string | null;
  recipientNote: string | null;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors: string[];
}

export interface UploadResult {
  batch: { id: string; batchNumber: string; status: BatchStatus };
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    totalAmount: string;
    currency: string;
  };
  rows: UploadPreviewRow[];
}

export interface SingleBundlePayload {
  phoneNumber: string;
  /** Bundle code from the products list. */
  bundle: string;
  network?: 'MTN' | 'AIRTEL' | 'LYCA';
  note?: string;
  description?: string;
}

export interface SingleBundleResult {
  batch: { id: string; batchNumber: string; status: BatchStatus };
  row: UploadPreviewRow;
}

export interface DataBundleSummary {
  batches: {
    total: number;
    draft: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    processing: number;
    completed: number;
    partiallyCompleted: number;
    failed: number;
  };
  recipients: {
    delivered: number;
    failed: number;
    needsReconciliation: number;
    inProgress: number;
  };
  value: { approved: string; pendingApproval: string; delivered: string; currency: string };
  recentBatches: DataBundleBatch[];
}

export interface DataBundleTeamMember {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  isSelf: boolean;
  isSystemAdministrator: boolean;
  permissions: DataBundleAccess['permissions'];
}

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type ExportReport = 'batches' | 'recipients' | 'failed' | 'retries';

function clean<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
}

export const dataBundlesApi = {
  async getAccess(): Promise<DataBundleAccess> {
    return (await apiClient.get('/data-bundles/access')).data;
  },
  async listProducts(): Promise<DataBundleProduct[]> {
    return (await apiClient.get('/data-bundles/products')).data;
  },
  async downloadTemplate(): Promise<Blob> {
    return (await apiClient.get('/data-bundles/template', { responseType: 'blob' })).data;
  },
  async uploadBatch(
    file: File,
    options: { description?: string; bundleMtn?: string; bundleAirtel?: string; bundleLyca?: string },
    onProgress?: (percent: number) => void,
  ): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    if (options.description) form.append('description', options.description);
    if (options.bundleMtn) form.append('bundleMtn', options.bundleMtn);
    if (options.bundleAirtel) form.append('bundleAirtel', options.bundleAirtel);
    if (options.bundleLyca) form.append('bundleLyca', options.bundleLyca);
    const res = await apiClient.post('/data-bundles/batches/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return res.data;
  },
  async createSingle(payload: SingleBundlePayload): Promise<SingleBundleResult> {
    return (await apiClient.post('/data-bundles/single', payload)).data;
  },
  async listBatches(params: ListParams): Promise<Paged<DataBundleBatch>> {
    return (await apiClient.get('/data-bundles/batches', { params: clean(params) })).data;
  },
  async getBatch(id: string): Promise<DataBundleBatchDetail> {
    return (await apiClient.get(`/data-bundles/batches/${id}`)).data;
  },
  async listRows(id: string, params: ListParams): Promise<Paged<DataBundleRow>> {
    return (await apiClient.get(`/data-bundles/batches/${id}/rows`, { params: clean(params) })).data;
  },
  async submitBatch(id: string) {
    return (await apiClient.post(`/data-bundles/batches/${id}/submit`)).data;
  },
  async approveBatch(id: string, comment?: string) {
    return (await apiClient.post(`/data-bundles/batches/${id}/approve`, { comment })).data;
  },
  async rejectBatch(id: string, reason: string) {
    return (await apiClient.post(`/data-bundles/batches/${id}/reject`, { reason })).data;
  },
  async discardBatch(id: string) {
    return (await apiClient.delete(`/data-bundles/batches/${id}`)).data;
  },
  async retry(
    batchId: string,
    body: { rowIds?: string[]; all?: boolean },
  ): Promise<{ retried: number; skipped: Array<{ rowId: string; rowNumber?: number; reason: string }> }> {
    return (await apiClient.post(`/data-bundles/batches/${batchId}/retry`, body)).data;
  },
  async failedRecords(
    params: ListParams & { batchId?: string; retryableOnly?: boolean },
  ): Promise<Paged<DataBundleRow>> {
    return (await apiClient.get('/data-bundles/failed-records', { params: clean(params) })).data;
  },
  async summary(params: { from?: string; to?: string } = {}): Promise<DataBundleSummary> {
    return (await apiClient.get('/data-bundles/reports/summary', { params: clean(params) })).data;
  },
  async retryHistory(params: ListParams): Promise<Paged<RetryHistoryEntry>> {
    return (await apiClient.get('/data-bundles/reports/retry-history', { params: clean(params) })).data;
  },
  async exportReport(
    params: ListParams & { report: ExportReport; format: 'xlsx' | 'csv'; batchId?: string },
  ): Promise<Blob> {
    return (
      await apiClient.get('/data-bundles/reports/export', {
        params: clean(params),
        responseType: 'blob',
        timeout: 120_000,
      })
    ).data;
  },
  async listTeam(): Promise<{ members: DataBundleTeamMember[] }> {
    return (await apiClient.get('/data-bundles/team')).data;
  },
  async updateTeamPermissions(
    memberId: string,
    permissions: Partial<DataBundleAccess['permissions']>,
  ) {
    return (await apiClient.patch(`/data-bundles/team/${memberId}/permissions`, permissions)).data;
  },
};

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
