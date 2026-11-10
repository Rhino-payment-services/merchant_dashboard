import {
  canAccessDataBundles,
  type UserSession,
} from '@/lib/utils/permissions';

/** Sidebar + route gate: merchant feature on, not liquidation-only, and any data bundle permission. */
export function isDataBundlesAvailable(input: {
  featureDataBundleDistribution: boolean;
  liquidationOnlyMode: boolean;
  userSession: UserSession;
}): boolean {
  return (
    input.featureDataBundleDistribution &&
    !input.liquidationOnlyMode &&
    canAccessDataBundles(input.userSession)
  );
}

/** Reads the feature flag from the live profile first, then the session merchant. */
export function readDataBundleFeature(
  liveMerchant: { featureDataBundleDistribution?: boolean } | null | undefined,
  sessionMerchant: { featureDataBundleDistribution?: boolean } | null | undefined,
): boolean {
  return (
    (liveMerchant?.featureDataBundleDistribution ??
      sessionMerchant?.featureDataBundleDistribution) === true
  );
}

export type BatchStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED';

export type RowStatus =
  | 'VALID'
  | 'INVALID'
  | 'DUPLICATE'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'NEEDS_RECONCILIATION';

type BadgeVariant = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export const BATCH_STATUS_META: Record<BatchStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  PENDING_APPROVAL: { label: 'Pending approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'info' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  PROCESSING: { label: 'Processing', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  PARTIALLY_COMPLETED: { label: 'Partially completed', variant: 'warning' },
  FAILED: { label: 'Failed', variant: 'danger' },
};

export const ROW_STATUS_META: Record<RowStatus, { label: string; variant: BadgeVariant }> = {
  VALID: { label: 'Valid', variant: 'success' },
  INVALID: { label: 'Invalid', variant: 'danger' },
  DUPLICATE: { label: 'Duplicate', variant: 'warning' },
  QUEUED: { label: 'Queued', variant: 'neutral' },
  PROCESSING: { label: 'Processing', variant: 'info' },
  SUCCESS: { label: 'Delivered', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
  NEEDS_RECONCILIATION: { label: 'Needs reconciliation', variant: 'warning' },
};

export function formatUgx(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `UGX ${Number.isFinite(n) ? n.toLocaleString('en-UG', { maximumFractionDigits: 0 }) : '0'}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
}

export type UploadSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
};

/** Submit for Approval is only possible when at least one valid record exists. */
export function canSubmitUpload(summary: UploadSummary | null | undefined): boolean {
  return !!summary && summary.validRows > 0;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Client-side pre-check; the server re-validates everything. */
export function precheckUploadFile(file: { name: string; size: number }): string | null {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return 'Only .xlsx Excel files are supported. Download the template to get started.';
  }
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return 'The file is larger than 5 MB.';
  return null;
}

/** Extracts a readable message from an axios error response. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const message = data?.message;
  if (Array.isArray(message) && message.length) return message.join('. ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
