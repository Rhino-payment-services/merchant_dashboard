'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import {
  BATCH_STATUS_META,
  ROW_STATUS_META,
  type BatchStatus,
  type RowStatus,
} from '@/lib/utils/data-bundles';

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const meta = BATCH_STATUS_META[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function RowStatusBadge({ status }: { status: RowStatus }) {
  const meta = ROW_STATUS_META[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'text-gray-900',
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-600">{label}</p>
            <p className={`text-2xl font-bold truncate ${tone}`}>{value}</p>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
          </div>
          {Icon && <Icon className="h-8 w-8 text-gray-300 shrink-0" />}
        </div>
      </CardContent>
    </Card>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 text-sm text-gray-600">
      <span>
        Showing {from} to {to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyBlock({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="font-medium text-gray-900">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
