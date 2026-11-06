/**
 * ApexPOS Enterprise - Financial Ledger & Invariants
 * 
 * Rules:
 * 1. Double entry invariants: Sum of Debits must strictly equal Sum of Credits.
 * 2. Immutable documents: Never delete or mutate posted accounting records.
 * 3. Correction & Reversals: Any correction requires an explicit reversal entry.
 * 4. Balance Derivation: Customer debts are derived from the journal entries.
 */

import { GeneralLedgerEntry, LedgerEntryType } from './types.ts';

export interface JournalLine {
  account: string;
  debitCents: number;
  creditCents: number;
}

export class FinancialLedger {
  /**
   * Asserts that a double entry set is balanced.
   */
  static validateDoubleEntry(lines: JournalLine[]): boolean {
    const totalDebit = lines.reduce((sum, line) => sum + line.debitCents, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.creditCents, 0);

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Financial Invariant Violation: Unbalanced transaction! Total Debits (${totalDebit}) != Total Credits (${totalCredit})`
      );
    }
    return true;
  }

  /**
   * Generates a pair of double-entry ledger records for a Sale transaction.
   * e.g. Cash Sale:
   * Debit: Cash / Bank (Asset +)
   * Credit: Sales Revenue (Revenue +)
   * Credit: VAT Payable (Liability +)
   */
  static createSaleEntries(params: {
    orderId: string;
    invoiceNumber: string;
    timestamp: number;
    cashCents: number;
    cardCents: number;
    creditCents: number;
    subtotalCents: number;
    taxCents: number;
    customerId?: string;
  }): GeneralLedgerEntry[] {
    const entries: GeneralLedgerEntry[] = [];
    const baseEntryNumber = `GL-${params.invoiceNumber}`;
    let subIndex = 1;

    // Debits (Assets or Receivables)
    if (params.cashCents > 0) {
      entries.push({
        id: `${params.orderId}-cash`,
        entryNumber: `${baseEntryNumber}-${subIndex++}`,
        timestamp: params.timestamp,
        type: 'sale',
        referenceId: params.orderId,
        description: `Cash received for ${params.invoiceNumber}`,
        debitAccount: '1010-Cash-On-Hand',
        creditAccount: '4010-Sales-Revenue',
        amountCents: params.cashCents,
      });
    }

    if (params.cardCents > 0) {
      entries.push({
        id: `${params.orderId}-card`,
        entryNumber: `${baseEntryNumber}-${subIndex++}`,
        timestamp: params.timestamp,
        type: 'sale',
        referenceId: params.orderId,
        description: `Card payment for ${params.invoiceNumber}`,
        debitAccount: '1020-Bank-Account',
        creditAccount: '4010-Sales-Revenue',
        amountCents: params.cardCents,
      });
    }

    if (params.creditCents > 0) {
      entries.push({
        id: `${params.orderId}-credit`,
        entryNumber: `${baseEntryNumber}-${subIndex++}`,
        timestamp: params.timestamp,
        type: 'sale',
        referenceId: params.orderId,
        description: `Customer credit debt for ${params.invoiceNumber}`,
        debitAccount: `1110-Accounts-Receivable-${params.customerId || 'General'}`,
        creditAccount: '4010-Sales-Revenue',
        amountCents: params.creditCents,
      });
    }

    // Verify balance invariant
    const totalPaid = params.cashCents + params.cardCents + params.creditCents;
    const totalExpected = params.subtotalCents + params.taxCents;
    if (totalPaid !== totalExpected) {
      throw new Error(`Payment mismatch: Total payment (${totalPaid}) does not equal order total (${totalExpected})`);
    }

    return entries;
  }

  /**
   * Creates an exact reversal entry for an existing entry.
   */
  static createReversal(original: GeneralLedgerEntry, reversalReason: string, timestamp: number): GeneralLedgerEntry {
    return {
      id: `rev-${original.id}-${timestamp}`,
      entryNumber: `REV-${original.entryNumber}`,
      timestamp,
      type: 'sale_return',
      referenceId: original.referenceId,
      description: `REVERSAL: ${reversalReason} [Original: ${original.description}]`,
      // Invert accounts to reverse debit & credit
      debitAccount: original.creditAccount,
      creditAccount: original.debitAccount,
      amountCents: original.amountCents,
    };
  }

  /**
   * Derives customer balance from accounting entries.
   * Debits to customer accounts increase debt; Credits (payments) reduce debt.
   */
  static calculateCustomerBalance(customerId: string, entries: GeneralLedgerEntry[]): number {
    const customerAccount = `1110-Accounts-Receivable-${customerId}`;
    let balance = 0;

    for (const entry of entries) {
      if (entry.debitAccount === customerAccount) {
        balance += entry.amountCents;
      }
      if (entry.creditAccount === customerAccount) {
        balance -= entry.amountCents;
      }
    }
    return balance;
  }
}
