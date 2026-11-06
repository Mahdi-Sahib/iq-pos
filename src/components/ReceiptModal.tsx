import React from 'react';
import { Printer, X, QrCode } from 'lucide-react';
import { ThermalReceiptPayload } from '../infrastructure/hardwareHal.ts';

interface ReceiptModalProps {
  receipt: ThermalReceiptPayload | null;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  onClose,
  lang,
}) => {
  if (!receipt) return null;
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Controls */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'معاينة الإيصال الحراري (80mm)' : '80mm Thermal Receipt Preview'}</span>
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Realistic White Thermal Paper */}
        <div className="flex-1 p-5 overflow-y-auto bg-white text-slate-950 font-mono text-xs select-text shadow-inner">
          <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
            <h2 className="font-extrabold text-sm tracking-wider uppercase">
              {receipt.storeName}
            </h2>
            <p className="text-[10px] text-slate-600">{receipt.storeTaxNumber}</p>
            <p className="text-[10px] text-slate-600 font-bold">{receipt.invoiceNumber}</p>
            <p className="text-[10px] text-slate-500">{receipt.date}</p>
            <p className="text-[10px] text-slate-700">
              CASHIER: {receipt.cashierName}
            </p>
            {receipt.customerName && (
              <p className="text-[10px] text-slate-700 font-bold">
                CUSTOMER: {receipt.customerName}
              </p>
            )}
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5">
            <div className="flex justify-between font-bold text-[10px] text-slate-700 border-b border-slate-300 pb-1">
              <span>ITEM</span>
              <span>QTY x PRICE</span>
              <span className="text-end">TOTAL</span>
            </div>
            {receipt.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] leading-tight">
                <div className="flex-1 min-w-0 pe-2">
                  <div className="truncate font-semibold">{item.name}</div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    {item.qty} @ {item.unitPrice}
                  </div>
                </div>
                <div className="font-bold text-end">{item.total}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>{receipt.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (15%):</span>
              <span>{receipt.tax}</span>
            </div>
            {receipt.discount !== '0.00' && (
              <div className="flex justify-between text-slate-700">
                <span>DISCOUNT:</span>
                <span>-{receipt.discount}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-300 text-black">
              <span>TOTAL DUE:</span>
              <span>{receipt.total}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
            {receipt.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>PAID ({p.method}):</span>
                <span className="font-bold">{p.amount}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold">
              <span>CHANGE GIVEN:</span>
              <span>{receipt.change}</span>
            </div>
          </div>

          {/* Simulated ZATCA QR Code */}
          <div className="pt-4 flex flex-col items-center justify-center text-center space-y-1.5">
            <div className="w-24 h-24 p-1.5 bg-slate-100 border border-slate-400 flex items-center justify-center">
              <QrCode className="w-20 h-20 text-slate-900" />
            </div>
            <span className="text-[9px] text-slate-500 tracking-wider">
              ZATCA COMPLIANT QR CODE
            </span>
            <p className="text-[10px] font-bold text-slate-800 pt-1">
              *** THANK YOU FOR YOUR VISIT ***
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
