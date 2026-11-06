import React, { useState } from 'react';
import { 
  Cpu, 
  Barcode, 
  Printer, 
  KeyRound, 
  Tv, 
  Scale, 
  Volume2, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { PosState } from '../infrastructure/posStore.ts';
import { HardwareAbstractionLayer, hardwareSounds } from '../infrastructure/hardwareHal.ts';

interface HardwareSimulatorProps {
  state: PosState;
  kickDrawer: () => void;
}

export const HardwareSimulator: React.FC<HardwareSimulatorProps> = ({
  state,
  kickDrawer,
}) => {
  const isAr = state.lang === 'ar';
  const [vfdLine1, setVfdLine1] = useState<string>('WELCOME TO APEXPOS');
  const [vfdLine2, setVfdLine2] = useState<string>('TOTAL: 0.00 SAR');
  const [scaleWeightKg, setScaleWeightKg] = useState<string>('1.250');
  const [scannerTestBarcode, setScannerTestBarcode] = useState<string>('6281001234567');
  const [lastHardwareLog, setLastHardwareLog] = useState<string>('HAL Ready. All local device ports listening.');

  const handleTestBeep = () => {
    hardwareSounds.playScannerBeep();
    setLastHardwareLog(`[BARCODE SCANNER] Dispatched Good-Read Audio Chirp (2600Hz, 45ms) for barcode: ${scannerTestBarcode}`);
  };

  const handleTestPrinter = () => {
    HardwareAbstractionLayer.printThermalReceipt({
      storeName: 'APEX TEST RECEIPT',
      storeTaxNumber: 'VAT 310123456700003',
      invoiceNumber: 'DIAG-2026-TEST',
      date: new Date().toLocaleString(),
      cashierName: state.currentUser.fullName,
      items: [
        { name: 'Self-Test Print Feed', qty: 1, unitPrice: '0.00', total: '0.00' },
      ],
      subtotal: '0.00',
      tax: '0.00',
      discount: '0.00',
      total: '0.00',
      payments: [{ method: 'TEST', amount: '0.00' }],
      change: '0.00',
      qrPayload: 'APEXPOS_TEST',
    });
    setLastHardwareLog('[THERMAL PRINTER] ESC/POS Command 0x1B 0x40 transmitted. 384 bytes printed.');
  };

  const handleKickDrawerTest = () => {
    kickDrawer();
    setLastHardwareLog('[CASH DRAWER] Solenoid pulse (24V, 50ms) fired via ESC/POS 0x1B 0x70 0x00 0x19 0xFA');
  };

  const handleUpdateVfd = (e: React.FormEvent) => {
    e.preventDefault();
    HardwareAbstractionLayer.updateCustomerDisplay(vfdLine1, vfdLine2);
    setLastHardwareLog(`[CUSTOMER VFD] Updated 2x20 Display Buffer: "${vfdLine1}" / "${vfdLine2}"`);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <span>{isAr ? 'طبقة تجريد العتاد والملحقات (Hardware Abstraction Layer)' : 'Hardware Abstraction Layer (HAL) Simulator'}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isAr 
            ? 'اختبار ومحاكاة أجهزة الكاشير المحلية: طابعة الإيصالات الحرارية، قارئ الباركود، درج النقد، وشاشة العميل (VFD)' 
            : 'Interactive testing bench for retail desktop hardware peripherals and OPOS / ESC-POS drivers'}
        </p>
      </div>

      {/* Grid of Hardware Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Device 1: Barcode Scanner */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {isAr ? 'قارئ الباركود (Barcode Scanner)' : 'Laser Barcode Scanner'}
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">USB HID / Serial COM3</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              CONNECTED
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isAr 
              ? 'محاكاة نغمة التأكيد الصوتية (Acoustic Chime) وتمرير الباركود مباشرة لمحرك البيع' 
              : 'Simulates hardware audio verification chirp (2600Hz) and fast keybuffer dispatch'}
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={scannerTestBarcode}
              onChange={(e) => setScannerTestBarcode(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
            />
            <button
              onClick={handleTestBeep}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'تجربة النغمة' : 'Test Beep'}</span>
            </button>
          </div>
        </div>

        {/* Device 2: Thermal Printer */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {isAr ? 'طابعة الإيصالات الحرارية (ESC/POS)' : '80mm Thermal Receipt Printer'}
                </h3>
                <span className="text-[10px] text-sky-400 font-mono">Epson TM-T88VI (ESC/POS)</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              READY
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isAr 
              ? 'محاكاة أمر الطباعة الحرارية وتقطيع الورق مع الصوت الميكانيكي لحركة المحرك' 
              : 'Emulates byte-stream ESC/POS raster print & paper guillotine cut with audio feed sound'}
          </p>

          <button
            onClick={handleTestPrinter}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>{isAr ? 'إرسال صفحة اختبار حرارية' : 'Send Test Print Feed'}</span>
          </button>
        </div>

        {/* Device 3: Cash Drawer */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {isAr ? 'درج النقدية (Cash Drawer)' : 'Electronic Cash Drawer'}
                </h3>
                <span className="text-[10px] text-amber-400 font-mono">RJ11 Solenoid Kick Port (24V)</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              state.cashDrawerOpen ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
            }`}>
              {state.cashDrawerOpen ? (isAr ? 'مفتوح (POPPED)' : 'OPEN / POPPED') : (isAr ? 'مغلق (CLOSED)' : 'CLOSED')}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isAr 
              ? 'إرسال نبضة إلكترونية لفتح الدرج آلياً عند انتهاء العمليات النقدية مع صوت Ka-Ching واقعي' 
              : 'Sends 50ms solenoid release pulse upon cash tender completion with realistic mechanical bell chime'}
          </p>

          <button
            onClick={handleKickDrawerTest}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'نبضة فتح الدرج يدوياً (F7)' : 'Trigger Drawer Kick (F7)'}</span>
          </button>
        </div>

        {/* Device 4: Customer Facing Pole Display (VFD) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {isAr ? 'شاشة العميل (Pole Display VFD)' : 'Customer VFD Pole Display'}
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">2x20 Character Fluorescent</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              ACTIVE
            </span>
          </div>

          {/* VFD Visual Screen Box */}
          <div className="p-3 bg-black rounded-lg border-2 border-emerald-900 font-mono text-emerald-400 text-sm tracking-widest shadow-inner space-y-1">
            <div className="truncate">{vfdLine1.padEnd(20)}</div>
            <div className="truncate">{vfdLine2.padEnd(20)}</div>
          </div>

          <form onSubmit={handleUpdateVfd} className="flex gap-2">
            <input
              type="text"
              value={vfdLine1}
              onChange={(e) => setVfdLine1(e.target.value)}
              maxLength={20}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
            >
              {isAr ? 'تحديث' : 'Update'}
            </button>
          </form>
        </div>
      </div>

      {/* Hardware Bus Activity Terminal */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
          {isAr ? 'سجل أحداث وقنوات العتاد (HAL Bus Logs)' : 'HAL Hardware Bus Event Monitor'}
        </h4>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400">
          {lastHardwareLog}
        </div>
      </div>
    </div>
  );
};
