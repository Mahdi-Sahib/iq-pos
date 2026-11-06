/**
 * ApexPOS Enterprise - Cart Management & Pricing Engine
 * 
 * Rules:
 * - Integer calculations exclusively.
 * - Tax calculated precisely per line item.
 * - Quantities must be positive numbers.
 * - Split payments must equal order total with change calculation.
 */

import { CartItem, PaymentSplit } from './types.ts';
import { Money } from './money.ts';

export interface CartCalculationResult {
  items: CartItem[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
}

export class CartEngine {
  static createItem(params: {
    id: string;
    productId: string;
    variantId?: string;
    nameEn: string;
    nameAr: string;
    barcode: string;
    unitPriceCents: number;
    quantity: number;
    discountCents?: number;
    taxRatePercent?: number;
  }): CartItem {
    if (params.quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    if (params.unitPriceCents < 0) {
      throw new Error('Unit price cannot be negative');
    }

    const discountCents = params.discountCents || 0;
    const taxRate = params.taxRatePercent ?? 15; // Standard 15% VAT

    const rawSubtotal = params.unitPriceCents * params.quantity;
    const subtotalCents = Math.max(0, rawSubtotal - discountCents);
    const subtotalMoney = new Money(subtotalCents);
    const taxMoney = subtotalMoney.calculateTax(taxRate);
    const totalCents = subtotalCents + taxMoney.cents;

    return {
      id: params.id,
      productId: params.productId,
      variantId: params.variantId,
      nameEn: params.nameEn,
      nameAr: params.nameAr,
      barcode: params.barcode,
      unitPriceCents: params.unitPriceCents,
      quantity: params.quantity,
      discountCents,
      taxRatePercent: taxRate,
      subtotalCents,
      taxCents: taxMoney.cents,
      totalCents,
    };
  }

  static recalculate(items: CartItem[], orderDiscountCents = 0): CartCalculationResult {
    let subtotalCents = 0;
    let taxCents = 0;
    let itemCount = 0;

    for (const item of items) {
      subtotalCents += item.subtotalCents;
      taxCents += item.taxCents;
      itemCount += item.quantity;
    }

    const totalBeforeOrderDiscount = subtotalCents + taxCents;
    const totalCents = Math.max(0, totalBeforeOrderDiscount - orderDiscountCents);

    return {
      items,
      subtotalCents,
      discountCents: orderDiscountCents,
      taxCents,
      totalCents,
      itemCount,
    };
  }

  static validatePayments(totalCents: number, splits: PaymentSplit[]): {
    isValid: boolean;
    paidCents: number;
    changeGivenCents: number;
    remainingCents: number;
    error?: string;
  } {
    const paidCents = splits.reduce((sum, s) => sum + s.amountCents, 0);

    if (paidCents < totalCents) {
      return {
        isValid: false,
        paidCents,
        changeGivenCents: 0,
        remainingCents: totalCents - paidCents,
        error: `Insufficient payment: Remaining ${totalCents - paidCents} cents`,
      };
    }

    const change = paidCents - totalCents;
    // Check that change is only given from cash payments
    const cashSplit = splits.find(s => s.method === 'cash');
    const cashAmount = cashSplit ? cashSplit.amountCents : 0;

    if (change > 0 && cashAmount < change) {
      return {
        isValid: false,
        paidCents,
        changeGivenCents: 0,
        remainingCents: 0,
        error: `Change of ${change} cents exceeds available cash payment of ${cashAmount} cents`,
      };
    }

    return {
      isValid: true,
      paidCents,
      changeGivenCents: change,
      remainingCents: 0,
    };
  }
}
