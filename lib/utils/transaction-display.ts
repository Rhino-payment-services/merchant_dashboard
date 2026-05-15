/**
 * Shared transaction display helpers for merchant portal.
 */

export const CARD_PAYMENT_LABEL = 'Card Payment';

export type TransactionLike = {
  type?: string;
  channel?: string;
  reference?: string;
  metadata?: Record<string, unknown> | null;
};

export function isCardPaymentTransaction(txn: TransactionLike | null | undefined): boolean {
  if (!txn) return false;
  const meta = txn.metadata ?? {};
  const channel = txn.channel ?? (meta.channel as string | undefined);
  return (
    channel === 'CARD' ||
    meta.paymentMethod === 'CARD' ||
    meta.paymentMethod === CARD_PAYMENT_LABEL ||
    meta.isCardTransaction === true ||
    (typeof txn.type === 'string' && txn.type.includes('CARD'))
  );
}

export function isEventLedgerTransaction(txn: TransactionLike | null | undefined): boolean {
  const meta = txn?.metadata ?? {};
  return Boolean(meta.merchantEventOrderId || meta.merchantEventOrderReference);
}

/** Human-readable transaction type for tables, modals, and receipts. */
export function getTransactionTypeDisplay(txn: TransactionLike | null | undefined): string {
  if (!txn) return 'N/A';

  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const ref = String(txn.reference ?? '');

  if (meta.merchantEventOrderId || meta.merchantEventOrderReference) {
    return 'Event Ticket Payment';
  }

  if (
    txn.type === 'WALLET_TO_WALLET' &&
    (meta.sweepToDisbursement ||
      meta.sweepFromCollection ||
      (ref && ref.startsWith('SWEEP_')))
  ) {
    return 'Liquidate';
  }

  if (isCardPaymentTransaction(txn)) {
    return CARD_PAYMENT_LABEL;
  }

  const typeMap: Record<string, string> = {
    WALLET_TO_WALLET: 'P2P Transfer',
    MNO_TO_WALLET: 'Receive from Mobile Money',
    WALLET_TO_MNO: 'Send to Mobile Money',
    MERCHANT_TO_WALLET: 'Receive from Merchant',
    MERCHANT_TO_INTERNAL_WALLET: 'Receive from Merchant',
    WALLET_TO_MERCHANT: 'Payment from Customer',
    WALLET_TO_INTERNAL_MERCHANT: 'Payment from Customer',
    WALLET_TO_EXTERNAL_MERCHANT: 'Payment from Customer',
    MERCHANT_WITHDRAWAL: 'Merchant Withdrawal',
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    CARD_TO_WALLET: CARD_PAYMENT_LABEL,
  };

  return typeMap[txn.type ?? ''] || txn.type || 'N/A';
}
