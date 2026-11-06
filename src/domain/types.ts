/**
 * ApexPOS Enterprise - Core Domain Types & Contracts
 * 
 * Invariant Rule: All monetary amounts are stored as integer minor units (cents / halalas).
 * 1 USD = 100 cents | 1 SAR = 100 halalas
 */

export type CurrencyCode = 'SAR' | 'USD' | 'AED' | 'EUR';

export interface MoneyValue {
  readonly cents: number; // Stored as integer
  readonly currency: CurrencyCode;
}

export type UserRole = 
  | 'owner'
  | 'administrator'
  | 'manager'
  | 'cashier'
  | 'accountant'
  | 'purchasing_officer'
  | 'inventory_officer'
  | 'delivery_officer'
  | 'auditor';

export interface UserSession {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly branchId: string;
  readonly terminalId: string;
  readonly token: string;
}

export interface ProductVariant {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly barcode: string;
  readonly priceCents: number;
  readonly costCents: number;
  readonly stockQuantity: number;
  readonly attributes: Record<string, string>; // e.g. { size: 'Large', color: 'Black' }
}

export interface Product {
  readonly id: string;
  readonly code: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly category: string;
  readonly brand?: string;
  readonly barcode: string;
  readonly unit: string;
  readonly priceCents: number; // Integer cents
  readonly costCents: number; // Integer cents (FIFO / Weighted Average)
  readonly taxRatePercent: number; // e.g. 15 for 15% VAT
  readonly currentStock: number;
  readonly minStockAlert: number;
  readonly isVariable: boolean;
  readonly variants?: ProductVariant[];
  readonly imageUrl?: string;
  readonly isBatchTracked?: boolean;
}

export interface Customer {
  readonly id: string;
  readonly code: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly phone: string;
  readonly taxNumber?: string;
  readonly creditLimitCents: number;
  readonly currentBalanceCents: number; // Positive = customer owes money (Receivable)
  readonly loyaltyPoints: number;
}

export type PaymentMethod = 
  | 'cash'
  | 'card'
  | 'customer_credit'
  | 'wallet'
  | 'transfer'
  | 'gift_card';

export interface PaymentSplit {
  readonly method: PaymentMethod;
  readonly amountCents: number;
  readonly reference?: string;
  readonly cardLastFour?: string;
  readonly authCode?: string;
}

export interface CartItem {
  readonly id: string;
  readonly productId: string;
  readonly variantId?: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly barcode: string;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly discountCents: number;
  readonly taxRatePercent: number;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
}

export interface CartHold {
  readonly id: string;
  readonly ticketNumber: string;
  readonly customerId?: string;
  readonly customerName?: string;
  readonly items: CartItem[];
  readonly note?: string;
  readonly createdAt: number;
}

export type OrderStatus = 'completed' | 'refunded' | 'voided' | 'held';

export interface Order {
  readonly id: string; // UUIDv7
  readonly invoiceNumber: string;
  readonly idempotencyKey: string;
  readonly shiftId: string;
  readonly cashierId: string;
  readonly cashierName: string;
  readonly branchId: string;
  readonly terminalId: string;
  readonly customerId?: string;
  readonly customerName?: string;
  readonly items: CartItem[];
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly payments: PaymentSplit[];
  readonly changeGivenCents: number;
  readonly status: OrderStatus;
  readonly createdAt: number;
  readonly isSyncPending: boolean;
  readonly outboxEventId?: string;
}

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  readonly id: string;
  readonly shiftNumber: string;
  readonly cashierId: string;
  readonly cashierName: string;
  readonly terminalId: string;
  readonly openedAt: number;
  readonly closedAt?: number;
  readonly openingFloatCents: number;
  readonly cashSalesCents: number;
  readonly cardSalesCents: number;
  readonly creditSalesCents: number;
  readonly walletSalesCents: number;
  readonly cashInCents: number; // Cash drops/receipts
  readonly cashOutCents: number; // Cash expenses/payouts
  readonly cashRefundsCents: number;
  readonly expectedCashCents: number;
  readonly countedCashCents?: number;
  readonly discrepancyCents?: number; // Counted - Expected
  readonly status: ShiftStatus;
  readonly notes?: string;
}

export type LedgerEntryType = 
  | 'sale' 
  | 'sale_return' 
  | 'customer_payment' 
  | 'supplier_invoice' 
  | 'supplier_payment' 
  | 'cash_drop' 
  | 'cash_payout'
  | 'opening_balance';

export interface GeneralLedgerEntry {
  readonly id: string;
  readonly entryNumber: string;
  readonly timestamp: number;
  readonly type: LedgerEntryType;
  readonly referenceId: string; // Document ID (Order, Payment, Shift)
  readonly description: string;
  readonly debitAccount: string;
  readonly creditAccount: string;
  readonly amountCents: number;
}

export interface OutboxEvent {
  readonly id: string; // UUIDv7
  readonly aggregateType: 'Order' | 'Payment' | 'Customer' | 'Shift' | 'Inventory';
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: number;
  readonly status: 'pending' | 'in_flight' | 'synced' | 'failed';
  readonly retryCount: number;
  readonly idempotencyKey: string;
}
