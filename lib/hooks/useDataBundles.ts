import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  dataBundlesApi,
  type DataBundleAccess,
  type ListParams,
  type SingleBundlePayload,
} from '../api/data-bundles.api';
import { apiErrorMessage } from '../utils/data-bundles';

function useMerchantCode(): string {
  const { data: session } = useSession();
  return String((session?.user as { merchantCode?: string })?.merchantCode ?? '');
}

export const dataBundleKeys = {
  all: (m: string) => ['data-bundles', m] as const,
  access: (m: string) => ['data-bundles', m, 'access'] as const,
  products: (m: string) => ['data-bundles', m, 'products'] as const,
  summary: (m: string, p: object) => ['data-bundles', m, 'summary', p] as const,
  batches: (m: string, p: object) => ['data-bundles', m, 'batches', p] as const,
  batch: (m: string, id: string) => ['data-bundles', m, 'batch', id] as const,
  rows: (m: string, id: string, p: object) => ['data-bundles', m, 'rows', id, p] as const,
  failed: (m: string, p: object) => ['data-bundles', m, 'failed', p] as const,
  retries: (m: string, p: object) => ['data-bundles', m, 'retries', p] as const,
  team: (m: string) => ['data-bundles', m, 'team'] as const,
};

export function useDataBundleAccess(enabled = true) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.access(m),
    queryFn: dataBundlesApi.getAccess,
    enabled: enabled && !!m,
    staleTime: 60_000,
    retry: false,
  });
}

export function useDataBundleProducts(enabled = true) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.products(m),
    queryFn: dataBundlesApi.listProducts,
    enabled: enabled && !!m,
    staleTime: 5 * 60_000,
  });
}

export function useDataBundleSummary(params: { from?: string; to?: string } = {}, enabled = true) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.summary(m, params),
    queryFn: () => dataBundlesApi.summary(params),
    enabled: enabled && !!m,
    staleTime: 15_000,
  });
}

export function useDataBundleBatches(params: ListParams, enabled = true) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.batches(m, params),
    queryFn: () => dataBundlesApi.listBatches(params),
    enabled: enabled && !!m,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useDataBundleBatch(id: string | undefined) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.batch(m, id ?? ''),
    queryFn: () => dataBundlesApi.getBatch(id as string),
    enabled: !!m && !!id,
    staleTime: 5_000,
    // Keep polling while the batch is being delivered.
    refetchInterval: (query) =>
      ['APPROVED', 'PROCESSING'].includes(String(query.state.data?.status)) ? 10_000 : false,
  });
}

export function useDataBundleRows(id: string | undefined, params: ListParams) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.rows(m, id ?? '', params),
    queryFn: () => dataBundlesApi.listRows(id as string, params),
    enabled: !!m && !!id,
    staleTime: 5_000,
    placeholderData: (prev) => prev,
  });
}

export function useFailedRecords(
  params: ListParams & { batchId?: string; retryableOnly?: boolean },
  enabled = true,
) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.failed(m, params),
    queryFn: () => dataBundlesApi.failedRecords(params),
    enabled: enabled && !!m,
    staleTime: 5_000,
    placeholderData: (prev) => prev,
  });
}

export function useRetryHistory(params: ListParams, enabled = true) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.retries(m, params),
    queryFn: () => dataBundlesApi.retryHistory(params),
    enabled: enabled && !!m,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useDataBundleTeam(enabled = true) {
  const m = useMerchantCode();
  return useQuery({
    queryKey: dataBundleKeys.team(m),
    queryFn: dataBundlesApi.listTeam,
    enabled: enabled && !!m,
    staleTime: 15_000,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  const m = useMerchantCode();
  return () => queryClient.invalidateQueries({ queryKey: dataBundleKeys.all(m) });
}

export function useSubmitBatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => dataBundlesApi.submitBatch(id),
    onSuccess: () => {
      toast.success('Batch submitted for approval');
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to submit batch')),
  });
}

/** Errors are left to the caller so the form can show them inline. */
export function useCreateSingleBundle() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (payload: SingleBundlePayload) => dataBundlesApi.createSingle(payload),
    onSuccess: () => {
      toast.success('Bundle submitted for approval');
      invalidate();
    },
  });
}

export function useApproveBatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      dataBundlesApi.approveBatch(id, comment),
    onSuccess: (res: { alreadyProcessed?: boolean }) => {
      toast.success(
        res?.alreadyProcessed
          ? 'This batch was already approved'
          : 'Batch approved. Bundles are being delivered.',
      );
      invalidate();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to approve batch'));
      invalidate();
    },
  });
}

export function useRejectBatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      dataBundlesApi.rejectBatch(id, reason),
    onSuccess: () => {
      toast.success('Batch rejected');
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to reject batch')),
  });
}

export function useDiscardBatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => dataBundlesApi.discardBatch(id),
    onSuccess: () => {
      toast.success('Draft discarded');
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to discard draft')),
  });
}

export function useRetryRecords() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ batchId, rowIds, all }: { batchId: string; rowIds?: string[]; all?: boolean }) =>
      dataBundlesApi.retry(batchId, { rowIds, all }),
    onSuccess: (res) => {
      if (res.retried > 0) {
        toast.success(
          `${res.retried} record(s) queued for retry${res.skipped.length ? `, ${res.skipped.length} skipped` : ''}`,
        );
      } else {
        toast.warning(res.skipped[0]?.reason || 'No records were eligible for retry');
      }
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to retry records')),
  });
}

export function useUpdateDataBundlePermissions() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({
      memberId,
      permissions,
    }: {
      memberId: string;
      permissions: Partial<DataBundleAccess['permissions']>;
    }) => dataBundlesApi.updateTeamPermissions(memberId, permissions),
    onSuccess: () => {
      toast.success('Data bundle permissions updated');
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update permissions')),
  });
}
