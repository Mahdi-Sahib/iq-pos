import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Receipt, 
  CreditCard, 
  FileText, 
  DollarSign, 
  ShieldAlert, 
  Check, 
  X,
  History,
  Phone,
  ArrowRightLeft
} from 'lucide-react';
import { PosState } from '../infrastructure/posStore.ts';
import { Customer } from '../domain/types.ts';
import { FinancialLedger } from '../domain/financial.ts';

interface CustomerLedgerProps {
  state: PosState;
  settleCustomerDebt: (customerId: string, amountCents: number, method: 'cash' | 'card') => void;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({
  state,
  settleCustomerDebt,
}) => {
  const isAr = state.lang === 'ar';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(state.customers[0]?.id || '');
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');
  const [settleMethod, setSettleMethod] = useState<'cash' | 'card'>('cash');

  const filteredCustomers = useMemo(() => {
    return state.customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.phone.includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    });
  }, [state.customers, searchQuery]);

  const activeCustomer = useMemo(() => {
    return state.customers.find(c => c.id === selectedCustomerId) || state.customers[0];
  }, [state.customers, selectedCustomerId]);

  // Derived ledger statements for the active customer
  const customerAccountKey = `1110-Accounts-Receivable-${activeCustomer?.id}`;
  const customerLedgerEntries = useMemo(() => {
    return state.ledgerEntries.filter(
      entry => entry.debitAccount === customerAccountKey || entry.creditAccount === customerAccountKey
    );
  }, [state.ledgerEntries, customerAccountKey]);

  // Total receivables across all customers
  const totalReceivablesCents = useMemo(() => {
    return state.customers.reduce((sum, c) => sum + c.currentBalanceCents, 0);
  }, [state.customers]);

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const amount = parseFloat(settleAmountInput);
    if (!amount || amount <= 0) return;

    settleCustomerDebt(activeCustomer.id, Math.round(amount * 100), settleMethod);
    setIsSettleModalOpen(false);
    setSettleAmountInput('');
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-hidden bg-slate-950 text-slate-100 flex flex-col space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>{isAr ? 'حسابات العملاء والذمم المدينة (A/R)' : 'Customers & Accounts Receivable'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'إدارة الحدود الائتمانية، كشوف الحساب المشتقة من قيود اليومية، وتحصيل الديون'
              : 'Credit limit enforcement, immutable ledger derived statements, and debt collections'}
          </p>
        </div>

        {/* Global Debt Stat Tile */}
        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div>
            <span className="text-[11px] text-slate-400 block">
              {isAr ? 'إجمالي الذمم المدينة القائمة' : 'Total Outstanding Receivables'}
            </span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {(totalReceivablesCents / 100).toFixed(2)} {state.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Main split view: Customers List (Left) & Ledger Details (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">
        {/* Customer Directory */}
        <div className="w-full lg:w-80 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {/* Search Header */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث عن عميل...' : 'Search customers...'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg ps-9 pe-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Customer Item List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredCustomers.map(cust => {
              const isSelected = cust.id === activeCustomer?.id;
              const hasDebt = cust.currentBalanceCents > 0;

              return (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`w-full p-3 rounded-xl text-start transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border border-emerald-500/60 shadow-sm'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {cust.code}
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">
                      {cust.loyaltyPoints} {isAr ? 'نقطة' : 'pts'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white truncate">
                    {isAr ? cust.nameAr : cust.nameEn}
                  </h4>

                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span className="truncate">{cust.phone}</span>
                    <span className={`font-mono font-bold ${hasDebt ? 'text-amber-400' : 'text-slate-500'}`}>
                      {(cust.currentBalanceCents / 100).toFixed(2)} {state.currency}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Customer Statement & Ledger Details */}
        {activeCustomer ? (
          <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {/* Customer Statement Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {isAr ? activeCustomer.nameAr : activeCustomer.nameEn}
                  </h3>
                  <span className="font-mono text-xs text-slate-400">
                    ({activeCustomer.code})
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {activeCustomer.phone}
                  </span>
                  {activeCustomer.taxNumber && (
                    <span>
                      {isAr ? 'الرقم الضريبي:' : 'VAT:'} {activeCustomer.taxNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Debt Balances & Settle Button */}
              <div className="flex items-center gap-4">
                <div className="text-end">
                  <span className="text-xs text-slate-400 block">
                    {isAr ? 'الرصيد القائم المستحق' : 'Outstanding Balance'}
                  </span>
                  <span className={`text-xl font-bold font-mono ${
                    activeCustomer.currentBalanceCents > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {(activeCustomer.currentBalanceCents / 100).toFixed(2)} {state.currency}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {isAr ? 'الحد الائتماني:' : 'Credit Limit:'} {(activeCustomer.creditLimitCents / 100).toFixed(2)} {state.currency}
                  </span>
                </div>

                <button
                  disabled={activeCustomer.currentBalanceCents <= 0}
                  onClick={() => {
                    setSettleAmountInput((activeCustomer.currentBalanceCents / 100).toFixed(2));
                    setIsSettleModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/60"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{isAr ? 'سداد وتحصيل دفعة' : 'Receive Payment'}</span>
                </button>
              </div>
            </div>

            {/* General Ledger Table for this Customer */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'كشف حساب الأستاذ المالي (Double-Entry Ledger)' : 'General Ledger Account Statement'}</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  GL: {customerAccountKey}
                </span>
              </div>

              {customerLedgerEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {isAr 
                    ? 'لا توجد حركات مالية مسجلة بعد لهذا العميل' 
                    : 'No ledger transactions recorded yet for this customer account'}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 text-start">{isAr ? 'التاريخ والوقت' : 'Date / Time'}</th>
                        <th className="p-2.5 text-start">{isAr ? 'رقم القيد' : 'Entry #'}</th>
                        <th className="p-2.5 text-start">{isAr ? 'البيان' : 'Description'}</th>
                        <th className="p-2.5 text-end text-amber-300">{isAr ? 'مدين (+دين)' : 'Debit (+Debt)'}</th>
                        <th className="p-2.5 text-end text-emerald-300">{isAr ? 'دائن (-سداد)' : 'Credit (-Payment)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {customerLedgerEntries.map(entry => {
                        const isDebit = entry.debitAccount === customerAccountKey;
                        return (
                          <tr key={entry.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-2.5 text-slate-400">
                              {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 text-slate-300">{entry.entryNumber}</td>
                            <td className="p-2.5 font-sans text-slate-200">{entry.description}</td>
                            <td className="p-2.5 text-end font-bold text-amber-400">
                              {isDebit ? `${(entry.amountCents / 100).toFixed(2)} ${state.currency}` : '—'}
                            </td>
                            <td className="p-2.5 text-end font-bold text-emerald-400">
                              {!isDebit ? `${(entry.amountCents / 100).toFixed(2)} ${state.currency}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Settle Debt Modal */}
      {isSettleModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSettleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-white text-base">
              {isAr ? 'سداد وتحصيل دفعة من العميل' : 'Customer Debt Collection'}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">{isAr ? 'الرصيد المستحق حالياً:' : 'Current Debt:'}</span>
              <span className="font-mono text-amber-400 font-bold">
                {(activeCustomer.currentBalanceCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'المبلغ المسدد:' : 'Payment Amount:'} ({state.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={settleAmountInput}
                onChange={(e) => setSettleAmountInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'طريقة الاستلام:' : 'Payment Method:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod('cash')}
                  className={`p-2 rounded-lg text-xs font-semibold border ${
                    settleMethod === 'cash'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {isAr ? 'نقد (درج الكاشير)' : 'Cash (Till)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSettleMethod('card')}
                  className={`p-2 rounded-lg text-xs font-semibold border ${
                    settleMethod === 'card'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {isAr ? 'حساب بنكي / شبكة' : 'Bank / Card'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'إصدار سند قبض' : 'Confirm Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
