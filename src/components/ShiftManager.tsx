import React, { useState } from 'react';
import { 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  FileCheck2, 
  AlertTriangle, 
  DollarSign, 
  Printer, 
  Plus, 
  Check, 
  X,
  CreditCard,
  Banknote,
  Receipt
} from 'lucide-react';
import { PosState } from '../infrastructure/posStore.ts';
import { ShiftEngine } from '../domain/shift.ts';
import { HardwareAbstractionLayer } from '../infrastructure/hardwareHal.ts';

interface ShiftManagerProps {
  state: PosState;
  recordShiftCashMovement: (type: 'in' | 'out', amountCents: number, reason: string) => void;
  closeCurrentShift: (countedCashCents: number, notes?: string) => void;
  openNewShift: (openingFloatCents: number) => void;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  state,
  recordShiftCashMovement,
  closeCurrentShift,
  openNewShift,
}) => {
  const isAr = state.lang === 'ar';
  const shift = state.activeShift;
  const isShiftOpen = shift.status === 'open';

  // Modals
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('out');
  const [movementAmountInput, setMovementAmountInput] = useState<string>('');
  const [movementReasonInput, setMovementReasonInput] = useState<string>('');

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState<boolean>(false);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [openingFloatInput, setOpeningFloatInput] = useState<string>('500.00');

  const [showZReportPreview, setShowZReportPreview] = useState<boolean>(false);

  const expectedCashCents = ShiftEngine.calculateExpectedCash(shift);
  const countedCashCents = Math.round((parseFloat(countedCashInput) || 0) * 100);
  const calculatedDiscrepancyCents = countedCashCents - expectedCashCents;

  const handleCashMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movementAmountInput);
    if (!amount || amount <= 0 || !movementReasonInput.trim()) return;

    recordShiftCashMovement(movementType, Math.round(amount * 100), movementReasonInput.trim());
    setIsCashMovementModalOpen(false);
    setMovementAmountInput('');
    setMovementReasonInput('');
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCashInput) return;
    closeCurrentShift(countedCashCents, closeNotesInput.trim());
    setIsCloseShiftModalOpen(false);
    setShowZReportPreview(true);
  };

  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const floatVal = parseFloat(openingFloatInput) || 0;
    openNewShift(Math.round(floatVal * 100));
    setIsOpenShiftModalOpen(false);
  };

  const handlePrintXReport = () => {
    HardwareAbstractionLayer.printThermalReceipt({
      storeName: 'APEX ARTISAN ROASTERY',
      storeTaxNumber: 'VAT 310123456700003',
      invoiceNumber: `X-REPORT-${shift.shiftNumber}`,
      date: new Date().toLocaleString(),
      cashierName: shift.cashierName,
      items: [
        { name: 'Opening Float', qty: 1, unitPrice: (shift.openingFloatCents / 100).toFixed(2), total: (shift.openingFloatCents / 100).toFixed(2) },
        { name: 'Cash Sales', qty: 1, unitPrice: (shift.cashSalesCents / 100).toFixed(2), total: (shift.cashSalesCents / 100).toFixed(2) },
        { name: 'Card Sales', qty: 1, unitPrice: (shift.cardSalesCents / 100).toFixed(2), total: (shift.cardSalesCents / 100).toFixed(2) },
      ],
      subtotal: (shift.cashSalesCents / 100).toFixed(2),
      tax: '0.00',
      discount: '0.00',
      total: (shift.expectedCashCents / 100).toFixed(2),
      payments: [{ method: 'EXPECTED CASH', amount: (shift.expectedCashCents / 100).toFixed(2) }],
      change: '0.00',
      qrPayload: `XREPORT|${shift.shiftNumber}|${shift.expectedCashCents}`,
    });
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-950 text-slate-100 space-y-6">
      {/* Shift Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            isShiftOpen 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
              : 'bg-rose-950 text-rose-400 border border-rose-800'
          }`}>
            {isShiftOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {isAr ? 'الوردية رقم:' : 'Shift Session:'} {shift.shiftNumber}
              </h2>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                isShiftOpen ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
              }`}>
                {shift.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'الكاشير المسؤول:' : 'Cashier in Charge:'}{' '}
              <span className="text-white font-medium">{shift.cashierName}</span> •{' '}
              {isAr ? 'فُتحت في:' : 'Opened at:'}{' '}
              <span className="font-mono">{new Date(shift.openedAt).toLocaleTimeString()}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isShiftOpen ? (
            <>
              <button
                onClick={handlePrintXReport}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'تقرير X الفوري' : 'Print X-Report'}</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('out');
                  setIsCashMovementModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'سحب نقدي (مصروف)' : 'Cash Out / Payout'}</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('in');
                  setIsCashMovementModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'إيداع نقدي' : 'Cash In / Drop'}</span>
              </button>

              <button
                onClick={() => {
                  setCountedCashInput((expectedCashCents / 100).toFixed(2));
                  setIsCloseShiftModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>{isAr ? 'إغلاق الوردية (Z-Report)' : 'End Shift (Z-Report)'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'فتح وردية جديدة' : 'Open New Shift'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            {isAr ? 'الرصيد الافتتاحي (Float)' : 'Opening Float'}
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {(shift.openingFloatCents / 100).toFixed(2)} {state.currency}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            {isAr ? 'مبيعات النقد (Cash Sales)' : 'Cash Sales'}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            +{(shift.cashSalesCents / 100).toFixed(2)} {state.currency}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            {isAr ? 'مبيعات الشبكة والبطاقات' : 'Card / POS Sales'}
          </div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {(shift.cardSalesCents / 100).toFixed(2)} {state.currency}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            {isAr ? 'مبيعات الآجل (Customer Debt)' : 'Credit / Debt Sales'}
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {(shift.creditSalesCents / 100).toFixed(2)} {state.currency}
          </div>
        </div>
      </div>

      {/* Cash Movement & Drawer Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-slate-200">
            {isAr ? 'حركات الصندوق النقدية' : 'Cash Drawer Adjustments'}
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">{isAr ? 'الإيداعات النقدية (+)' : 'Cash In (+)'}</span>
              <span className="font-mono text-emerald-400">
                +{(shift.cashInCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">{isAr ? 'المسحوبات والمصروفات (-)' : 'Cash Out (-)'}</span>
              <span className="font-mono text-rose-400">
                -{(shift.cashOutCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">{isAr ? 'المرتجعات النقدية (-)' : 'Cash Refunds (-)'}</span>
              <span className="font-mono text-rose-400">
                -{(shift.cashRefundsCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Expected vs Counted */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              {isAr ? 'النقد الفعلي المتوقع بالدرج' : 'Expected Drawer Cash'}
            </h4>
            <Banknote className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400">
            {(expectedCashCents / 100).toFixed(2)} {state.currency}
          </div>
          <p className="text-[11px] text-slate-400">
            {isAr 
              ? 'المعادلة: الرصيد الافتتاحي + مبيعات الكاش + الإيداعات - المصروفات' 
              : 'Formula: Opening Float + Cash Sales + Cash Drops - Cash Payouts'}
          </p>
        </div>

        {/* Discrepancy Tile if closed */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <h4 className="text-sm font-bold text-slate-200">
            {isAr ? 'نتيجة الجرد المالي' : 'Audit & Discrepancy Status'}
          </h4>
          {shift.status === 'closed' ? (
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                {isAr ? 'النقد المعدود فعلياً:' : 'Counted Physical Cash:'}{' '}
                <span className="font-mono text-white font-bold">
                  {((shift.countedCashCents ?? 0) / 100).toFixed(2)} {state.currency}
                </span>
              </div>
              <div className={`text-xl font-bold font-mono ${
                (shift.discrepancyCents ?? 0) === 0
                  ? 'text-emerald-400'
                  : (shift.discrepancyCents ?? 0) > 0
                  ? 'text-sky-400'
                  : 'text-rose-400'
              }`}>
                {(shift.discrepancyCents ?? 0) === 0
                  ? (isAr ? 'مطابق تماماً (0.00)' : 'Perfect Match (0.00)')
                  : (shift.discrepancyCents ?? 0) > 0
                  ? `+${((shift.discrepancyCents ?? 0) / 100).toFixed(2)} ${state.currency} (${isAr ? 'فائض' : 'Surplus'})`
                  : `${((shift.discrepancyCents ?? 0) / 100).toFixed(2)} ${state.currency} (${isAr ? 'عجز' : 'Shortage'})`}
              </div>
              {shift.notes && (
                <p className="text-xs text-slate-400 italic mt-2">
                  "{shift.notes}"
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 pt-2">
              {isAr 
                ? 'الوردية قيد التشغيل حالياً. سيتم تسجيل العجز أو الفائض عند الإغلاق وإصدار Z-Report.' 
                : 'Shift active. Count and discrepancy will be finalized during closeout.'}
            </p>
          )}
        </div>
      </div>

      {/* Cash Movement Modal */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCashMovementSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-white text-base">
              {movementType === 'in' 
                ? (isAr ? 'إيداع نقدي في الصندوق (Cash In)' : 'Cash In / Deposit') 
                : (isAr ? 'سحب نقدي من الصندوق (Cash Out / Expense)' : 'Cash Out / Payout')}
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'المبلغ المطلوب:' : 'Amount:'} ({state.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={movementAmountInput}
                onChange={(e) => setMovementAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'البيان / سبب الحركة:' : 'Reason / Description:'}
              </label>
              <input
                type="text"
                required
                value={movementReasonInput}
                onChange={(e) => setMovementReasonInput(e.target.value)}
                placeholder={isAr ? 'مثال: شراء مستلزمات نظافة طارئة' : 'e.g. Emergency store supplies'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCashMovementModalOpen(false)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'حفظ الحركة' : 'Confirm Movement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCloseShiftSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-white text-base">
              {isAr ? 'إغلاق الوردية وإصدار تقرير Z-Report' : 'Close Shift & Generate Z-Report'}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between text-xs">
              <span className="text-slate-400">{isAr ? 'النقد المتوقع في الدرج:' : 'Expected Cash in Drawer:'}</span>
              <span className="font-mono text-emerald-400 font-bold">
                {(expectedCashCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'النقد المعدود فعلياً بالدرج:' : 'Counted Physical Cash in Drawer:'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={countedCashInput}
                onChange={(e) => setCountedCashInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Live discrepancy indicator */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between text-xs items-center">
              <span className="text-slate-400">{isAr ? 'الفارق المالي (العجز / الفائض):' : 'Calculated Discrepancy:'}</span>
              <span className={`font-mono font-bold text-sm ${
                calculatedDiscrepancyCents === 0
                  ? 'text-emerald-400'
                  : calculatedDiscrepancyCents > 0
                  ? 'text-sky-400'
                  : 'text-rose-400'
              }`}>
                {calculatedDiscrepancyCents === 0
                  ? (isAr ? 'مطابق تماماً (0.00)' : 'Balanced (0.00)')
                  : (calculatedDiscrepancyCents / 100).toFixed(2) + ` ${state.currency}`}
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'ملاحظات المشرف / الإغلاق:' : 'Manager Notes / Audit Comments:'}
              </label>
              <textarea
                value={closeNotesInput}
                onChange={(e) => setCloseNotesInput(e.target.value)}
                placeholder={isAr ? 'أي ملاحظات عن الوردية أو الفروقات...' : 'Any comments regarding drawer discrepancy...'}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'اعتماد الإغلاق وطباعة Z-Report' : 'Confirm Close & Print Z-Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Open New Shift Modal */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleOpenShiftSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-white text-base">
              {isAr ? 'افتتاح وردية جديدة' : 'Open New Shift Session'}
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'رصيد العهدة الافتتاحي (Opening Float):' : 'Opening Float Amount:'} ({state.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={openingFloatInput}
                onChange={(e) => setOpeningFloatInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'افتتاح الوردية' : 'Open Shift'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
