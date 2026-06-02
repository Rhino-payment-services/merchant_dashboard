import {
  getMyTransactions,
  Transaction,
  TransactionFilter,
} from '@/lib/api/transactions.api';
import {
  formatTransactionCharges,
  formatTransactionNetAmount,
  getTransactionReceiverParty,
  getTransactionSenderParty,
  getTransactionTypeDisplay,
} from '@/lib/utils/transaction-display';

const EXPORT_PAGE_SIZE = 100;

export type MerchantExportViewerContext = {
  merchantName: string;
  phone?: string;
};

export async function fetchAllBusinessTransactions(
  filter: Omit<TransactionFilter, 'page' | 'limit'>,
  childMerchantId?: string,
  merchantCode?: string | null,
): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getMyTransactions(
      { ...filter, page, limit: EXPORT_PAGE_SIZE },
      childMerchantId,
      merchantCode,
    );
    const batch = response.transactions || [];
    all.push(...batch);
    totalPages = Math.max(1, response.pagination?.totalPages || 1);
    if (batch.length < EXPORT_PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return all;
}

export function merchantTransactionsToExportRows(
  transactions: Transaction[],
  viewer: MerchantExportViewerContext,
): Record<string, unknown>[] {
  return transactions.map((txn) => {
    const sender = getTransactionSenderParty(txn, viewer);
    const receiver = getTransactionReceiverParty(txn, viewer);
    const createdAt = new Date(txn.createdAt);
    return {
      'Transaction ID': txn.reference || txn.id || '',
      Date: createdAt.toLocaleDateString('en-UG'),
      Time: createdAt.toLocaleTimeString('en-UG'),
      Type: getTransactionTypeDisplay(txn),
      Direction: txn.direction || '',
      Sender: sender.name,
      Receiver: receiver.name,
      'Receiver Number': receiver.contact || 'N/A',
      'Amount (UGX)': Number(txn.amount || 0),
      Charges: formatTransactionCharges(txn),
      'Net (UGX)': formatTransactionNetAmount(txn),
      Status: txn.status || '',
      Reference: txn.reference || '',
      Description: txn.description || '',
    };
  });
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function merchantTransactionsToCsv(
  rows: Record<string, unknown>[],
): string {
  if (rows.length === 0) {
    return 'Transaction ID,Date,Time,Type,Direction,Sender,Receiver,Receiver Number,Amount (UGX),Charges,Net (UGX),Status,Reference,Description\n';
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];
  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function sanitizeMerchantFilenamePart(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 48) || 'merchant';
}

/** Local calendar date as YYYY-MM-DD (matches HTML date inputs). */
export function todayIsoDateLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

export type ResolvedExportDateRange = {
  startDate: string;
  endDate: string;
  /** True when no dates were chosen and today was used. */
  defaultedToToday: boolean;
};

/**
 * Resolve inclusive export range.
 * - Explicit day / from / to when provided.
 * - If nothing is set, defaults to **today** (daily export without picking a date).
 * - Returns null only when from is after to.
 */
export function resolveExportDateRange(options: {
  day?: string;
  from?: string;
  to?: string;
}): ResolvedExportDateRange | null {
  const day = options.day?.trim();
  if (day) {
    return { startDate: day, endDate: day, defaultedToToday: false };
  }
  const from = options.from?.trim();
  const to = options.to?.trim();
  if (from && !to) {
    return { startDate: from, endDate: from, defaultedToToday: false };
  }
  if (from && to) {
    if (from > to) {
      return null;
    }
    return { startDate: from, endDate: to, defaultedToToday: false };
  }
  const today = todayIsoDateLocal();
  return { startDate: today, endDate: today, defaultedToToday: true };
}
