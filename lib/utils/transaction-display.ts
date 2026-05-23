/**
 * Shared transaction display helpers for merchant portal.
 */

export const CARD_PAYMENT_LABEL = 'Card Payment';

/** Payer label when the sender is not KYC-validated (MNO / card collection, etc.). */
export const UNVALIDATED_EXTERNAL_PAYER_LABEL = 'Customer';

export type TransactionLike = {
  type?: string;
  channel?: string;
  reference?: string;
  description?: string;
  amount?: number;
  fee?: number;
  netAmount?: number;
  currency?: string;
  direction?: string;
  counterpartyId?: string;
  counterpartyUser?: {
    phone?: string;
    displayName?: string;
    profile?: { firstName?: string; lastName?: string };
    merchants?: Array<{ businessTradeName?: string; merchantCode?: string }>;
  } | null;
  metadata?: Record<string, unknown> | null;
};

export type MerchantViewerContext = {
  merchantName: string;
  phone?: string;
};

const FROM_MERCHANT_DESC_PATTERN =
  /^(?:payment|transfer)\s+from\s+/i;

/** Auto-generated backend descriptions like "WALLET_TO_MNO transaction". */
const TECHNICAL_DESCRIPTION_PATTERN = /^[A-Z][A-Z0-9_]*\s+transaction$/i;

export function isTechnicalTransactionDescription(text: string): boolean {
  return TECHNICAL_DESCRIPTION_PATTERN.test(String(text || '').trim());
}

export function formatMoneyAmount(amount: number, currency = 'UGX'): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const hasFraction = Math.abs(n % 1) > 1e-9;
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency || 'UGX',
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Total fee/charges debited on this transaction (merchant-visible). */
export function getTransactionFeeAmount(txn: TransactionLike | null | undefined): number {
  if (!txn) return 0;

  const fee = Number(txn.fee);
  if (Number.isFinite(fee) && fee !== 0) {
    return fee;
  }

  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const breakdown = meta.feeBreakdown as Record<string, unknown> | undefined;
  if (breakdown?.totalFee !== undefined && breakdown?.totalFee !== null) {
    const total = Number(breakdown.totalFee);
    if (Number.isFinite(total)) return total;
  }

  const collectionBreakdown = meta.collectionFeeBreakdown as
    | { externalFee?: number }
    | undefined;
  if (collectionBreakdown?.externalFee != null) {
    const external = Number(collectionBreakdown.externalFee);
    if (Number.isFinite(external) && external > 0) return external;
  }

  if (meta.gatewayPartnerFee != null) {
    const partnerFee = Number(meta.gatewayPartnerFee);
    if (Number.isFinite(partnerFee) && partnerFee > 0) return partnerFee;
  }

  const revenue = meta.revenue as { amount?: number } | undefined;
  if (revenue?.amount != null) {
    const rev = Number(revenue.amount);
    if (Number.isFinite(rev) && rev > 0) return rev;
  }

  return Number.isFinite(fee) ? fee : 0;
}

/** Phone on file for an external payer (MoMo / card collection). */
export function getExternalPayerPhone(
  txn: TransactionLike | null | undefined,
): string {
  if (!txn) return '';
  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const counterpartyInfo = meta.counterpartyInfo as { phone?: string } | undefined;
  return String(
    meta.phoneNumber ||
      meta.customerPhone ||
      meta.msisdn ||
      meta.senderPhone ||
      counterpartyInfo?.phone ||
      txn.counterpartyUser?.phone ||
      '',
  ).trim();
}

/**
 * Incoming payment from mobile money, card, or event checkout — payer identity is not verified.
 */
export function isUnvalidatedExternalPayerCredit(
  txn: TransactionLike | null | undefined,
): boolean {
  if (!txn || String(txn.direction ?? '').toUpperCase() !== 'CREDIT') {
    return false;
  }
  if (isCreditFromMerchant(txn)) return false;

  const type = String(txn.type ?? '');
  if (
    type === 'MNO_TO_WALLET' ||
    type === 'WALLET_TOPUP_PULL' ||
    type.includes('MNO_TO_WALLET')
  ) {
    return true;
  }
  if (isEventLedgerTransaction(txn)) return true;
  if (isCardPaymentTransaction(txn)) return true;

  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  if (
    meta.channel === 'CARD' ||
    meta.paymentMethod === 'CARD' ||
    meta.isCardTransaction === true
  ) {
    return true;
  }

  return false;
}

/**
 * Amount credited to or debited from the merchant wallet after fees.
 * CREDIT: net landed in wallet. DEBIT: total debited (amount + fees).
 */
export function getTransactionNetAmount(
  txn: TransactionLike | null | undefined,
): number {
  if (!txn) return 0;

  const amount = Number(txn.amount) || 0;
  const direction = String(txn.direction ?? '').toUpperCase();
  const fee = getTransactionFeeAmount(txn);
  const netField = Number(txn.netAmount);

  if (direction === 'DEBIT') {
    if (Number.isFinite(netField) && netField > amount) return netField;
    return amount + fee;
  }

  if (Number.isFinite(netField) && netField > 0) {
    return netField;
  }
  if (fee > 0 && amount > fee) {
    return amount - fee;
  }
  return amount;
}

export function formatTransactionNetAmount(
  txn: TransactionLike | null | undefined,
): string {
  if (!txn) return '—';
  return formatMoneyAmount(
    getTransactionNetAmount(txn),
    String(txn.currency || 'UGX'),
  );
}

/** CREDIT from another merchant (not a subscriber/MNO payer). */
export function isCreditFromMerchant(txn: TransactionLike | null | undefined): boolean {
  if (!txn || String(txn.direction ?? '').toUpperCase() !== 'CREDIT') {
    return false;
  }
  const type = String(txn.type ?? '');
  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  if (type.includes('MERCHANT_TO')) return true;
  if (
    type === 'WALLET_TO_MERCHANT' ||
    type === 'WALLET_TO_INTERNAL_MERCHANT' ||
    type === 'WALLET_TO_EXTERNAL_MERCHANT'
  ) {
    if (meta.senderType === 'MERCHANT') return true;
    if (meta.senderMerchantName || meta.senderMerchantCode) return true;
  }
  if (meta.senderType === 'MERCHANT') return true;
  const merchants = txn.counterpartyUser?.merchants;
  return Array.isArray(merchants) && merchants.length > 0;
}

/** Sending merchant business name when this wallet received funds from a merchant. */
export function resolveSendingMerchantName(
  txn: TransactionLike | null | undefined,
): string | null {
  if (!txn) return null;
  const meta = (txn.metadata ?? {}) as Record<string, unknown>;

  const merchantRecord = txn.counterpartyUser?.merchants?.[0];
  if (merchantRecord) {
    const name = String(
      merchantRecord.businessTradeName || merchantRecord.merchantCode || '',
    ).trim();
    if (name) return name;
  }

  const cpDisplay = String(txn.counterpartyUser?.displayName ?? '').trim();
  if (cpDisplay) return cpDisplay;

  for (const key of [
    'senderName',
    'merchantName',
    'senderMerchantName',
    'counterpartyMerchantName',
  ]) {
    const v = String(meta[key] ?? '').trim();
    if (v) return v;
  }

  const counterpartyInfo = meta.counterpartyInfo as { name?: string } | undefined;
  if (counterpartyInfo?.name) {
    return String(counterpartyInfo.name).trim();
  }

  return null;
}

/** Narration / payment note from the sender (merchant portal or API). */
export function isSweepTransaction(txn: TransactionLike | null | undefined): boolean {
  if (!txn) return false;
  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const ref = String(txn.reference ?? '');
  return Boolean(
    meta.sweepToDisbursement ||
      meta.sweepFromCollection ||
      meta.internalWalletTransfer ||
      (ref && ref.startsWith('SWEEP_')),
  );
}

function resolveSweepBusinessName(
  txn: TransactionLike,
  viewer: MerchantViewerContext,
): string {
  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const fromMeta = String(meta.merchantName || '').trim();
  if (fromMeta) return fromMeta;
  return viewer.merchantName;
}

export function getTransactionNarration(
  txn: TransactionLike | null | undefined,
): string | null {
  if (!txn) return null;
  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const ref = String(txn.reference ?? '').trim();

  const sources = [
    meta.narration,
    meta.note,
    meta.paymentNote,
    meta.payoutReason,
    meta.description,
    txn.description,
  ];

  for (const raw of sources) {
    const text = String(raw ?? '').trim();
    if (!text || (ref && text === ref)) continue;
    if (isTechnicalTransactionDescription(text)) continue;
    if (FROM_MERCHANT_DESC_PATTERN.test(text)) continue;
    return text;
  }

  return null;
}

export function getTransactionSenderParty(
  txn: TransactionLike | null | undefined,
  viewer: MerchantViewerContext,
): { name: string; contact: string } {
  if (!txn) return { name: '—', contact: '' };

  const meta = (txn.metadata ?? {}) as Record<string, unknown>;

  if (isSweepTransaction(txn)) {
    const business = resolveSweepBusinessName(txn, viewer);
    const direction = String(txn.direction ?? '').toUpperCase();
    if (direction === 'DEBIT') {
      return { name: business, contact: '' };
    }
    const debitWallet = String(meta.debitWalletType || 'Collection').trim();
    return { name: `${debitWallet} wallet`, contact: '' };
  }

  if (txn.type === 'DEPOSIT' && meta.fundedByAdmin) {
    return {
      name: String(meta.adminName || 'Admin User'),
      contact: String(meta.adminPhone || meta.adminEmail || 'Admin'),
    };
  }

  if (String(txn.direction ?? '').toUpperCase() === 'DEBIT') {
    return { name: viewer.merchantName, contact: viewer.phone || '' };
  }

  if (isCreditFromMerchant(txn)) {
    const merchantSender = resolveSendingMerchantName(txn);
    if (merchantSender) {
      return {
        name: merchantSender,
        contact: String(
          meta.merchantCode ||
            meta.senderPhone ||
            txn.counterpartyUser?.phone ||
            '',
        ).trim(),
      };
    }
  }

  if (isUnvalidatedExternalPayerCredit(txn)) {
    return {
      name: UNVALIDATED_EXTERNAL_PAYER_LABEL,
      contact: getExternalPayerPhone(txn),
    };
  }

  const cp = txn.counterpartyUser;
  if (txn.type === 'WALLET_TO_WALLET' || txn.counterpartyId || cp) {
    const senderName =
      (cp?.profile?.firstName && cp?.profile?.lastName
        ? `${cp.profile.firstName} ${cp.profile.lastName}`
        : null) ||
      String(meta.senderName || meta.userName || '').trim() ||
      (cp
        ? null
        : String(
            (meta.counterpartyInfo as { name?: string })?.name || '',
          ).trim()) ||
      cp?.phone ||
      txn.counterpartyId ||
      'RukaPay User';
    return {
      name: String(senderName),
      contact: String(cp?.phone || txn.counterpartyId || ''),
    };
  }

  const counterpartyInfo = meta.counterpartyInfo as {
    name?: string;
    phone?: string;
    accountNumber?: string;
  };
  if (counterpartyInfo?.name) {
    if (isUnvalidatedExternalPayerCredit(txn)) {
      return {
        name: UNVALIDATED_EXTERNAL_PAYER_LABEL,
        contact: getExternalPayerPhone(txn),
      };
    }
    return {
      name: String(counterpartyInfo.name),
      contact: String(
        counterpartyInfo.phone || counterpartyInfo.accountNumber || '',
      ),
    };
  }

  return {
    name: String(meta.userName || meta.phoneNumber || 'External'),
    contact: String(meta.phoneNumber || meta.accountNumber || ''),
  };
}

export function getTransactionReceiverParty(
  txn: TransactionLike | null | undefined,
  viewer: MerchantViewerContext,
): { name: string; contact: string } {
  if (!txn) return { name: '—', contact: '' };

  const meta = (txn.metadata ?? {}) as Record<string, unknown>;

  if (isSweepTransaction(txn)) {
    const business = resolveSweepBusinessName(txn, viewer);
    const direction = String(txn.direction ?? '').toUpperCase();
    if (direction === 'CREDIT') {
      return { name: business, contact: '' };
    }
    const creditWallet = String(meta.creditWalletType || 'Disbursement').trim();
    return { name: `${creditWallet} wallet`, contact: '' };
  }

  const preferredRecipientName = (): string | null => {
    const fromMetadata = [
      meta.recipientName,
      meta.receiverName,
      (meta.counterpartyInfo as { name?: string } | undefined)?.name,
      meta.userName,
      meta.accountName,
      meta.customerName,
    ]
      .map((v) => String(v ?? '').trim())
      .find((v) => v.length > 0);
    if (fromMetadata) return fromMetadata;
    if (txn.counterpartyUser?.profile?.firstName && txn.counterpartyUser?.profile?.lastName) {
      return `${txn.counterpartyUser.profile.firstName} ${txn.counterpartyUser.profile.lastName}`.trim();
    }
    return null;
  };

  if (txn.type === 'DEPOSIT' && meta.fundedByAdmin) {
    return { name: viewer.merchantName, contact: viewer.phone || '' };
  }

  if (String(txn.direction ?? '').toUpperCase() === 'CREDIT') {
    return { name: viewer.merchantName, contact: viewer.phone || '' };
  }

  const preferred = preferredRecipientName();
  if (
    txn.type === 'MERCHANT_TO_WALLET' ||
    txn.type === 'MERCHANT_TO_INTERNAL_WALLET'
  ) {
    return {
      name: preferred || 'RukaPay User',
      contact: String(
        meta.recipientPhone ||
          meta.recipientPhoneNumber ||
          txn.counterpartyUser?.phone ||
          '',
      ),
    };
  }
  if (
    txn.type === 'WALLET_TO_MNO' ||
    (meta.mnoProvider && meta.phoneNumber)
  ) {
    return {
      name: preferred || `${meta.mnoProvider || 'Mobile'} Money`,
      contact: String(meta.phoneNumber || ''),
    };
  }
  if (txn.type === 'WALLET_TO_WALLET' || txn.counterpartyId || txn.counterpartyUser) {
    return {
      name: preferred || 'RukaPay User',
      contact: String(txn.counterpartyUser?.phone || txn.counterpartyId || ''),
    };
  }
  if (meta.phoneNumber) {
    return {
      name: preferred || 'Mobile Money User',
      contact: String(meta.phoneNumber || ''),
    };
  }
  if (
    txn.type === 'WALLET_TO_MERCHANT' ||
    txn.type === 'WALLET_TO_INTERNAL_MERCHANT' ||
    String(txn.type ?? '').includes('MERCHANT')
  ) {
    return {
      name: preferred || String(meta.merchantName || 'Merchant'),
      contact: String(meta.merchantCode || meta.accountNumber || ''),
    };
  }
  if (meta.counterpartyInfo) {
    const info = meta.counterpartyInfo as { name?: string; phone?: string; accountNumber?: string };
    return {
      name: preferred || String(info.name || 'Recipient'),
      contact: String(info.phone || info.accountNumber || ''),
    };
  }
  return {
    name: preferred || 'Recipient',
    contact: String(meta.phoneNumber || meta.accountNumber || ''),
  };
}

/** Formatted charges column for statements (fee paid on the transaction). */
export function formatTransactionCharges(txn: TransactionLike | null | undefined): string {
  const amount = getTransactionFeeAmount(txn);
  if (!amount) return '—';
  const meta = (txn?.metadata ?? {}) as Record<string, unknown>;
  const revenue = meta.revenue as { currency?: string } | undefined;
  const currency = String(txn?.currency || revenue?.currency || 'UGX');
  return formatMoneyAmount(amount, currency);
}

/**
 * Customer-facing description — never raw mode codes like WALLET_TO_MNO transaction.
 */
export function getTransactionDescriptionDisplay(
  txn: TransactionLike | null | undefined,
): string {
  if (!txn) return '—';

  const meta = (txn.metadata ?? {}) as Record<string, unknown>;
  const ref = String(txn.reference ?? '').trim();

  if (isEventLedgerTransaction(txn)) {
    const orderRef = String(meta.merchantEventOrderReference || '').trim();
    return orderRef ? `Event ticket payment (${orderRef})` : 'Event ticket payment';
  }

  if (isCreditFromMerchant(txn)) {
    const narration = getTransactionNarration(txn);
    if (narration) return narration;
    const fromMerchant = resolveSendingMerchantName(txn);
    if (fromMerchant) return `Payment from ${fromMerchant}`;
    return 'Receive from Merchant';
  }

  const narration = getTransactionNarration(txn);
  if (narration) return narration;

  const phone = String(
    meta.phoneNumber || meta.customerPhone || meta.msisdn || '',
  ).trim();

  switch (txn.type) {
    case 'MNO_TO_WALLET':
    case 'WALLET_TOPUP_PULL':
      return phone ? `Payment received from ${phone}` : 'Payment received from mobile money';
    case 'WALLET_TO_MNO':
      return phone ? `Sent to ${phone}` : 'Sent to mobile money';
    case 'WALLET_TO_BANK': {
      const account = String(
        meta.accountNumber || meta.bankAccountNumber || '',
      ).trim();
      return account ? `Bank transfer to ${account}` : 'Bank transfer';
    }
    case 'UTILITIES':
    case 'BILL_PAYMENT':
      return String(meta.utilityProvider || meta.billType || 'Bill payment');
    case 'DEPOSIT':
      if (meta.fundedByAdmin) return 'Funds added by RukaPay admin';
      return 'Wallet deposit';
    case 'WITHDRAWAL':
      return 'Wallet withdrawal';
    default:
      break;
  }

  const typeLabel = getTransactionTypeDisplay(txn);
  return typeLabel === txn.type ? 'Transaction' : typeLabel;
}

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

  if (txn.type === 'WALLET_TO_WALLET' && isSweepTransaction(txn)) {
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
    WALLET_TO_BANK: 'Bank Transfer',
    WALLET_TOPUP_PULL: 'Receive from Mobile Money',
    BILL_PAYMENT: 'Bill Payment',
    UTILITIES: 'Bill Payment',
  };

  const rawType = txn.type ?? '';
  if (typeMap[rawType]) return typeMap[rawType];
  if (isTechnicalTransactionDescription(`${rawType} transaction`)) {
    return 'Transaction';
  }
  return rawType.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
