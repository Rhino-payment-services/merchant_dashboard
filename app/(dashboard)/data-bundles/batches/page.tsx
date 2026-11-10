'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataBundleBatches } from '@/lib/hooks/useDataBundles';
import { BATCH_STATUS_META, type BatchStatus } from '@/lib/utils/data-bundles';
import { BatchesTable } from '../_components/BatchesTable';
import { LoadingBlock, Pagination, SearchInput, useDebounced } from '../_components/shared';

const PAGE_SIZE = 20;

export default function DataBundleBatchesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | BatchStatus>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const { data, isLoading } = useDataBundleBatches({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Batch number or file name"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as 'ALL' | BatchStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {(Object.keys(BATCH_STATUS_META) as BatchStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {BATCH_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-40"
            />
            <Input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-40"
            />
          </div>
        </div>
        {isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <>
            <BatchesTable batches={data.items} />
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
    </Card>
  );
}
