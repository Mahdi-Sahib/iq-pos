/**
 * ApexPOS Enterprise - Cashier Shift Domain Logic
 * 
 * Rules:
 * Expected Cash in Drawer =
 *   Opening Float
 *   + Cash Sales
 *   + Cash In (Drops / Collections)
 *   - Cash Out (Expenses / Payouts)
 *   - Cash Refunds
 * 
 * Discrepancy = Counted Cash - Expected Cash
 * (Positive = Surplus / Over, Negative = Shortage)
 */

import { Shift } from './types.ts';

export class ShiftEngine {
  static createNewShift(params: {
    id: string;
    shiftNumber: string;
    cashierId: string;
    cashierName: string;
    terminalId: string;
    openingFloatCents: number;
    openedAt?: number;
  }): Shift {
    if (params.openingFloatCents < 0) {
      throw new Error('Opening float cannot be negative');
    }

    return {
      id: params.id,
      shiftNumber: params.shiftNumber,
      cashierId: params.cashierId,
      cashierName: params.cashierName,
      terminalId: params.terminalId,
      openedAt: params.openedAt || Date.now(),
      openingFloatCents: params.openingFloatCents,
      cashSalesCents: 0,
      cardSalesCents: 0,
      creditSalesCents: 0,
      walletSalesCents: 0,
      cashInCents: 0,
      cashOutCents: 0,
      cashRefundsCents: 0,
      expectedCashCents: params.openingFloatCents,
      status: 'open',
    };
  }

  static calculateExpectedCash(shift: Shift): number {
    return (
      shift.openingFloatCents +
      shift.cashSalesCents +
      shift.cashInCents -
      shift.cashOutCents -
      shift.cashRefundsCents
    );
  }

  static recordSale(shift: Shift, payments: { cashCents: number; cardCents: number; creditCents: number; walletCents: number }): Shift {
    if (shift.status !== 'open') {
      throw new Error('Cannot record sales on a closed shift');
    }

    const cashSalesCents = shift.cashSalesCents + payments.cashCents;
    const cardSalesCents = shift.cardSalesCents + payments.cardCents;
    const creditSalesCents = shift.creditSalesCents + payments.creditCents;
    const walletSalesCents = shift.walletSalesCents + payments.walletCents;

    const expectedCashCents = 
      shift.openingFloatCents +
      cashSalesCents +
      shift.cashInCents -
      shift.cashOutCents -
      shift.cashRefundsCents;

    return {
      ...shift,
      cashSalesCents,
      cardSalesCents,
      creditSalesCents,
      walletSalesCents,
      expectedCashCents,
    };
  }

  static recordCashMovement(shift: Shift, type: 'in' | 'out', amountCents: number): Shift {
    if (shift.status !== 'open') {
      throw new Error('Cannot record cash movement on a closed shift');
    }
    if (amountCents <= 0) {
      throw new Error('Cash movement amount must be positive');
    }

    const cashInCents = type === 'in' ? shift.cashInCents + amountCents : shift.cashInCents;
    const cashOutCents = type === 'out' ? shift.cashOutCents + amountCents : shift.cashOutCents;

    const expectedCashCents = 
      shift.openingFloatCents +
      shift.cashSalesCents +
      cashInCents -
      cashOutCents -
      shift.cashRefundsCents;

    return {
      ...shift,
      cashInCents,
      cashOutCents,
      expectedCashCents,
    };
  }

  static closeShift(shift: Shift, countedCashCents: number, notes?: string, closedAt?: number): Shift {
    if (shift.status !== 'open') {
      throw new Error('Shift is already closed');
    }
    if (countedCashCents < 0) {
      throw new Error('Counted cash cannot be negative');
    }

    const expectedCash = this.calculateExpectedCash(shift);
    const discrepancyCents = countedCashCents - expectedCash;

    return {
      ...shift,
      expectedCashCents: expectedCash,
      countedCashCents,
      discrepancyCents,
      closedAt: closedAt || Date.now(),
      status: 'closed',
      notes,
    };
  }
}
