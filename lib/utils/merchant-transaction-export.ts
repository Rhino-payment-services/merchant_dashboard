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
import { formatStatementPeriodLabel } from '@/lib/date-picker-utils';

const EXPORT_PAGE_SIZE = 100;

export type MerchantExportViewerContext = {
  merchantName: string;
  phone?: string;
  merchantCode?: string;
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
    const row: Record<string, unknown> = {
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
    if (txn.balanceAfter != null && Number.isFinite(Number(txn.balanceAfter))) {
      row['Balance After (UGX)'] = Number(txn.balanceAfter);
    }
    return row;
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

export type MerchantStatementSummary = {
  openingBalance: number;
  totalNetCredit: number;
  totalNetDebit: number;
  closingBalance: number;
  transactionFees: number;
  successfulCount: number;
  currency?: string;
};

export function merchantStatementCoverRows(
  viewer: MerchantExportViewerContext,
  period: { startDate: string; endDate: string },
  statement: MerchantStatementSummary,
  generatedAt = new Date(),
): Record<string, unknown>[] {
  const currency = statement.currency || 'UGX';
  const formatMoney = (value: number) =>
    `${currency} ${Number(value || 0).toLocaleString()}`;
  const periodLabel = formatStatementPeriodLabel(period.startDate, period.endDate);

  return [
    {
      Metric: 'Merchant',
      Value: viewer.merchantName,
      Note: viewer.merchantCode ? `Code ${viewer.merchantCode}` : '',
    },
    {
      Metric: 'Statement period',
      Value: periodLabel,
      Note: 'Inclusive dates',
    },
    {
      Metric: 'Generated at',
      Value: generatedAt.toLocaleString('en-UG'),
      Note: '',
    },
    {
      Metric: 'Opening balance',
      Value: statement.openingBalance,
      Note: formatMoney(statement.openingBalance),
    },
    {
      Metric: 'Amount deposited',
      Value: statement.totalNetCredit,
      Note: `Total net credit · ${formatMoney(statement.totalNetCredit)}`,
    },
    {
      Metric: 'Amount spent',
      Value: statement.totalNetDebit,
      Note: `Total net debit · ${formatMoney(statement.totalNetDebit)}`,
    },
    {
      Metric: 'Closing balance',
      Value: statement.closingBalance,
      Note: formatMoney(statement.closingBalance),
    },
    {
      Metric: 'Transaction fees',
      Value: statement.transactionFees,
      Note: `Fees charged on transactions in this period · ${formatMoney(statement.transactionFees)}`,
    },
    {
      Metric: 'Successful transactions',
      Value: statement.successfulCount,
      Note: 'Wallet-impacting payments in this period (excludes internal sweeps)',
    },
  ];
}

export function merchantStatementCsvPreamble(
  viewer: MerchantExportViewerContext,
  period: { startDate: string; endDate: string },
  statement: MerchantStatementSummary,
): string {
  const rows = merchantStatementCoverRows(viewer, period, statement);
  const lines = rows.map(
    (row) =>
      `${escapeCsvCell(row.Metric)},${escapeCsvCell(row.Value)},${escapeCsvCell(row.Note)}`,
  );
  return `${lines.join('\n')}\n\n`;
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
  startDate?: string;
  endDate?: string;
  /** True when no dates were chosen. */
  unbounded: boolean;
};

/**
 * Resolve inclusive export range.
 * - Explicit day / from / to when provided.
 * - If nothing is set, returns unbounded (do not silently default to today).
 * - Returns null only when from is after to.
 */
export function resolveExportDateRange(options: {
  day?: string;
  from?: string;
  to?: string;
}): ResolvedExportDateRange | null {
  const day = options.day?.trim();
  if (day) {
    return { startDate: day, endDate: day, unbounded: false };
  }
  const from = options.from?.trim();
  const to = options.to?.trim();
  if (from && !to) {
    return { startDate: from, endDate: from, unbounded: false };
  }
  if (from && to) {
    if (from > to) {
      return null;
    }
    return { startDate: from, endDate: to, unbounded: false };
  }
  return { unbounded: true };
}
