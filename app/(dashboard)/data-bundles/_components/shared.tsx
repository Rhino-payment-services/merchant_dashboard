'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BATCH_STATUS_META,
  PRODUCT_TYPE_META,
  ROW_STATUS_META,
  airtimeLabel,
  productTypeOf,
  type BatchStatus,
  type ProductType,
  type RowStatus,
} from '@/lib/utils/data-bundles';

export function ProductTypeBadge({ type }: { type?: ProductType | null }) {
  const meta = PRODUCT_TYPE_META[productTypeOf({ productType: type })];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/** e.g. "3 airtime · 2 data"; empty when the batch has no valid rows. */
export function batchMixText(batch: { airtimeRows?: number; bundleRows?: number }): string {
  const parts: string[] = [];
  if (batch.airtimeRows) parts.push(`${batch.airtimeRows} airtime`);
  if (batch.bundleRows) parts.push(`${batch.bundleRows} data`);
  return parts.join(' · ');
}

export function checkerText(batch: {
  checker: { name: string | null } | null;
  autoApproved?: boolean;
}): string {
  if (batch.checker?.name) return batch.checker.name;
  return batch.autoApproved ? 'Not required' : '—';
}

/** Airtime rows show the amount; data rows show the bundle name or code. */
export function rowProductText(row: {
  productType?: ProductType | null;
  unitPrice?: string | null;
  amountInput?: string | null;
  bundleName?: string | null;
  bundleCode?: string | null;
  bundleInput?: string | null;
}): string {
  if (productTypeOf(row) === 'AIRTIME') {
    if (row.unitPrice) return airtimeLabel(row.unitPrice);
    return row.amountInput ? `Airtime ${row.amountInput}` : 'Airtime';
  }
  return row.bundleName || row.bundleCode || row.bundleInput || '—';
}

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

/** Announces a loading region to assistive tech; the skeleton bars themselves are aria-hidden. */
export function SkeletonRegion({
  label = 'Loading…',
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function StatCardSkeleton({
  withIcon = true,
  withHint = false,
}: {
  withIcon?: boolean;
  withHint?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            {withHint && <Skeleton className="h-3 w-20" />}
          </div>
          {withIcon && <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatGridSkeleton({
  count,
  className = 'grid grid-cols-2 lg:grid-cols-4 gap-4',
  withIcon,
  withHint,
}: {
  count: number;
  className?: string;
  withIcon?: boolean;
  withHint?: boolean;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} withIcon={withIcon} withHint={withHint} />
      ))}
    </div>
  );
}

export type SkeletonColumn = {
  label?: string;
  align?: 'left' | 'right' | 'center';
  /** Two stacked bars, for cells with a sub-line (batch number + file, member + email). */
  twoLine?: boolean;
  kind?: 'text' | 'badge' | 'checkbox' | 'button';
};

// Varying bar widths keeps rows from looking like a uniform grid.
const CELL_WIDTHS = ['w-24', 'w-16', 'w-20', 'w-28', 'w-14', 'w-24', 'w-12', 'w-20'];

function toColumn(column: string | SkeletonColumn): SkeletonColumn {
  return typeof column === 'string' ? { label: column } : column;
}

function alignClass(align: SkeletonColumn['align']): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

function SkeletonCellContent({ column, seed }: { column: SkeletonColumn; seed: number }) {
  const justify =
    column.align === 'right' ? 'items-end' : column.align === 'center' ? 'items-center' : 'items-start';
  if (column.kind === 'checkbox') {
    return (
      <div className={cn('flex flex-col', justify)}>
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
    );
  }
  if (column.kind === 'badge') {
    return (
      <div className={cn('flex flex-col', justify)}>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    );
  }
  if (column.kind === 'button') {
    return (
      <div className={cn('flex flex-col', justify)}>
        <Skeleton className="h-8 w-16" />
      </div>
    );
  }
  return (
    <div className={cn('flex flex-col gap-1.5', justify)}>
      <Skeleton className={cn('h-4', CELL_WIDTHS[seed % CELL_WIDTHS.length])} />
      {column.twoLine && <Skeleton className="h-3 w-16 bg-gray-100" />}
    </div>
  );
}

/** Skeleton body rows, for tables whose header is already rendered. */
export function TableRowsSkeleton({
  columns,
  rows = 8,
}: {
  columns: Array<string | SkeletonColumn>;
  rows?: number;
}) {
  const cols = columns.map(toColumn);
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {cols.map((col, c) => (
            <TableCell key={c} className={cn('py-3', alignClass(col.align))}>
              <SkeletonCellContent column={col} seed={r + c * 3} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function TableSkeleton({
  columns,
  rows = 8,
  label = 'Loading records…',
  withPagination = true,
}: {
  columns: Array<string | SkeletonColumn>;
  rows?: number;
  label?: string;
  withPagination?: boolean;
}) {
  const cols = columns.map(toColumn);
  return (
    <SkeletonRegion label={label}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {cols.map((col, c) => (
                <TableHead key={c} className={alignClass(col.align)}>
                  {col.label ?? null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRowsSkeleton columns={cols} rows={rows} />
          </TableBody>
        </Table>
      </div>
      {withPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      )}
    </SkeletonRegion>
  );
}

export function DetailsSkeleton({ items }: { items: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20 bg-gray-100" />
          <Skeleton className={cn('h-4', CELL_WIDTHS[i % CELL_WIDTHS.length])} />
        </div>
      ))}
    </div>
  );
}

/** Thin indeterminate bar; always occupies its 2px so toggling it never shifts the table. */
export function RefetchBar({ active }: { active: boolean }) {
  return (
    <div className="relative h-0.5 w-full overflow-hidden rounded-full" aria-hidden="true">
      {active && <div className="refetch-bar absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary/60" />}
    </div>
  );
}

/** Keeps the previous page visible (dimmed) while the next page or filter result loads. */
export function Refetching({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div aria-busy={active || undefined} className="space-y-2">
      <RefetchBar active={active} />
      <div className={cn('transition-opacity duration-200', active && 'pointer-events-none opacity-60')}>
        {children}
      </div>
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
