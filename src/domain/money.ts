/**
 * ApexPOS Enterprise - Money Value Object
 * 
 * Financial Invariant 1:
 * Never use Floating Point arithmetic for monetary amounts.
 * All amounts are strictly managed as integers (cents / minor currency units).
 */

import { CurrencyCode, MoneyValue } from './types.ts';

export class Money implements MoneyValue {
  readonly cents: number;
  readonly currency: CurrencyCode;

  constructor(cents: number, currency: CurrencyCode = 'SAR') {
    if (!Number.isInteger(cents)) {
      throw new Error(`Financial Invariant Violation: Money amount must be an integer (received: ${cents})`);
    }
    this.cents = cents;
    this.currency = currency;
  }

  static fromMajor(major: number, currency: CurrencyCode = 'SAR'): Money {
    // Round to avoid float precision issues during input parsing
    return new Money(Math.round(major * 100), currency);
  }

  static zero(currency: CurrencyCode = 'SAR'): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }

  calculateTax(taxRatePercent: number): Money {
    if (taxRatePercent < 0) {
      throw new Error('Tax rate cannot be negative');
    }
    // Banker's / standard retail round half-up: (cents * rate) / 100
    const taxCents = Math.round((this.cents * taxRatePercent) / 100);
    return new Money(taxCents, this.currency);
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.cents === other.cents;
  }

  toMajor(): number {
    return this.cents / 100;
  }

  format(locale: 'ar' | 'en' = 'en'): string {
    const major = this.toMajor();
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);

    const symbols: Record<CurrencyCode, { en: string; ar: string }> = {
      SAR: { en: 'SAR', ar: 'ر.س' },
      USD: { en: '$', ar: '$' },
      AED: { en: 'AED', ar: 'د.إ' },
      EUR: { en: '€', ar: '€' },
    };

    const sym = symbols[this.currency][locale];
    return locale === 'ar' ? `${formatted} ${sym}` : `${sym} ${formatted}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency Mismatch: Cannot operate on ${this.currency} and ${other.currency}`);
    }
  }
}
