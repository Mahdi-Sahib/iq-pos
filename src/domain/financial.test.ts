import test from 'node:test';
import assert from 'node:assert/strict';
import { Money } from './money.ts';
import { FinancialLedger } from './financial.ts';
import { CartEngine } from './cart.ts';
import { ShiftEngine } from './shift.ts';
import { generateUUIDv7, OutboxEngine } from './outbox.ts';

test('Financial Invariant 1: Money stores integers and avoids floating point issues', () => {
  const m1 = new Money(10); // 0.10
  const m2 = new Money(20); // 0.20
  const sum = m1.add(m2);

  assert.equal(sum.cents, 30);
  assert.equal(sum.toMajor(), 0.3);

  // 15% VAT on 100.00 SAR (10000 cents) = 15.00 SAR (1500 cents)
  const base = new Money(10000, 'SAR');
  const tax = base.calculateTax(15);
  assert.equal(tax.cents, 1500);

  // Formatting
  assert.ok(base.format('en').includes('SAR') || base.format('en').includes('100.00'));
  assert.ok(base.format('ar').includes('ر.س') || base.format('ar').includes('100.00'));
});

test('Financial Invariant 2: Double entry validation strictly enforces Debits == Credits', () => {
  // Balanced transaction
  const balanced = [
    { account: '1010-Cash', debitCents: 5000, creditCents: 0 },
    { account: '4010-Revenue', debitCents: 0, creditCents: 5000 },
  ];
  assert.equal(FinancialLedger.validateDoubleEntry(balanced), true);

  // Unbalanced transaction should throw
  const unbalanced = [
    { account: '1010-Cash', debitCents: 5000, creditCents: 0 },
    { account: '4010-Revenue', debitCents: 0, creditCents: 4500 },
  ];
  assert.throws(() => FinancialLedger.validateDoubleEntry(unbalanced), /Financial Invariant Violation/);
});

test('Financial Invariant 3: Customer debt ledger balance is derived accurately from journals', () => {
  const entries = FinancialLedger.createSaleEntries({
    orderId: 'ord-1001',
    invoiceNumber: 'INV-2026-001',
    timestamp: Date.now(),
    cashCents: 2000,
    cardCents: 0,
    creditCents: 8000, // 80.00 debt
    subtotalCents: 8696,
    taxCents: 1304, // Total 10000 cents
    customerId: 'cust-42',
  });

  const balance = FinancialLedger.calculateCustomerBalance('cust-42', entries);
  assert.equal(balance, 8000); // Customer owes 80.00
});

test('CartEngine computes taxes, totals, and validates payment splits', () => {
  const item = CartEngine.createItem({
    id: 'cart-1',
    productId: 'prod-1',
    nameEn: 'Espresso Beans 1kg',
    nameAr: 'حبوب إسبريسو 1 كغ',
    barcode: '6281001234567',
    unitPriceCents: 10000, // 100.00 SAR
    quantity: 2,
    discountCents: 2000, // 20.00 SAR discount -> Subtotal 180.00 SAR (18000 cents)
    taxRatePercent: 15,
  });

  assert.equal(item.subtotalCents, 18000);
  assert.equal(item.taxCents, 2700); // 15% of 18000
  assert.equal(item.totalCents, 20700);

  // Payment validation
  const validation = CartEngine.validatePayments(20700, [
    { method: 'cash', amountCents: 10700 },
    { method: 'card', amountCents: 10000 },
  ]);

  assert.equal(validation.isValid, true);
  assert.equal(validation.changeGivenCents, 0);
});

test('ShiftEngine correctly tracks cash float, sales, drops, and discrepancy', () => {
  const shift = ShiftEngine.createNewShift({
    id: 'shift-1',
    shiftNumber: 'SH-001',
    cashierId: 'usr-1',
    cashierName: 'Ahmad Cashier',
    terminalId: 'POS-01',
    openingFloatCents: 50000, // 500.00 SAR
  });

  assert.equal(shift.expectedCashCents, 50000);

  // Record a cash sale of 150.00 SAR and card sale of 200.00 SAR
  const afterSale = ShiftEngine.recordSale(shift, {
    cashCents: 15000,
    cardCents: 20000,
    creditCents: 0,
    walletCents: 0,
  });

  assert.equal(afterSale.expectedCashCents, 65000); // 500 + 150

  // Cash drop to safe (cash out 400.00 SAR)
  const afterDrop = ShiftEngine.recordCashMovement(afterSale, 'out', 40000);
  assert.equal(afterDrop.expectedCashCents, 25000); // 650 - 400 = 250.00

  // Close shift with counted cash 250.00 (Zero discrepancy)
  const closedShift = ShiftEngine.closeShift(afterDrop, 25000);
  assert.equal(closedShift.status, 'closed');
  assert.equal(closedShift.discrepancyCents, 0);

  // If counted cash was 245.00 (5.00 shortage)
  const shortageShift = ShiftEngine.closeShift(afterDrop, 24500);
  assert.equal(shortageShift.discrepancyCents, -500);
});

test('OutboxEngine generates valid UUIDv7 and idempotency key', () => {
  const uuid = generateUUIDv7();
  assert.equal(uuid.length, 36);
  assert.equal(uuid.charAt(14), '7'); // version 7 check

  const event = OutboxEngine.createEvent({
    aggregateType: 'Order',
    aggregateId: 'ord-999',
    eventType: 'OrderCompleted',
    payload: { totalCents: 5000 },
  });

  assert.equal(event.status, 'pending');
  assert.ok(event.idempotencyKey.includes('ord-999'));
});
