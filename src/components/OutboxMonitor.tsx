import React, { useState } from 'react';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  X,
  Share2,
  Server,
  Layers
} from 'lucide-react';
import { PosState } from '../infrastructure/posStore.ts';
import { OutboxEvent } from '../domain/types.ts';

interface OutboxMonitorProps {
  state: PosState;
  toggleNetwork: () => void;
}

export const OutboxMonitor: React.FC<OutboxMonitorProps> = ({
  state,
  toggleNetwork,
}) => {
  const isAr = state.lang === 'ar';
  const [selectedEvent, setSelectedEvent] = useState<OutboxEvent | null>(null);

  const pendingEvents = state.outbox.filter(e => e.status === 'pending');
  const syncedEvents = state.outbox.filter(e => e.status === 'synced');

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-950 text-slate-100 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <span>{isAr ? 'صندوق الأحداث والمزامنة (Transactional Outbox)' : 'Transactional Outbox & Sync Hub'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'ضمان حفظ الأحداث المالية محلياً ضمن نفس معاملة SQLite، ومزامنتها لاحقاً بمعرّفات UUIDv7 ومفاتيح تكرار آمنة (Idempotency)' 
              : 'Ensures transactional atomicity between local SQLite business records and asynchronous cloud/LAN sync'}
          </p>
        </div>

        {/* Network & Sync Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleNetwork}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-2 ${
              state.isOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                : 'bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900'
            }`}
          >
            {state.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>
              {state.isOnline 
                ? (isAr ? 'الشبكة متصلة (Online)' : 'Connected to Network') 
                : (isAr ? 'وضع عدم الاتصال (Offline)' : 'Offline Emulation Active')}
            </span>
          </button>
        </div>
      </div>

      {/* Outbox Mechanism Architecture Diagram Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
        <div className="font-semibold text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>{isAr ? 'مبدأ المعاملة المحلية المزدوجة (Single Atomic Transaction)' : 'Dual Atomic Transaction Principle'}</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          {isAr
            ? 'عند إجراء عملية بيع، يتم حفظ الفاتورة وقيد اليومية المحاسبي وحدث الـ Outbox معاً في معاملة SQLite واحدة (BEGIN ... COMMIT). في حال انقطاع الكهرباء أو تعطل التطبيق، لا يمكن بأي حال من الأحوال إنشاء فاتورة دون حدث مزامنتها المقابل.'
            : 'During checkout, the order, double-entry ledger lines, and outbox event are persisted inside the same SQLite transaction. A transaction is either 100% committed or fully rolled back via WAL recovery.'}
        </p>
      </div>

      {/* Outbox KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? 'أحداث قيد الانتظار (Pending Outbox)' : 'Pending Outbox Queue'}
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center gap-2">
            <span>{pendingEvents.length}</span>
            {pendingEvents.length > 0 && <Clock className="w-5 h-5 animate-spin text-amber-400" />}
          </div>
          <span className="text-[10px] text-slate-500">
            {state.isOnline ? (isAr ? 'تتم المزامنة تلقائياً' : 'Syncing automatically') : (isAr ? 'محفوظ محلياً فقط' : 'Buffered locally')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? 'الأحداث المتزامنة (Synced Events)' : 'Successfully Synced Events'}
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {syncedEvents.length}
          </div>
          <span className="text-[10px] text-slate-500">
            {isAr ? 'مؤكدة الوصول للسحابة / Host' : 'Delivered to Host / Cloud'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? 'نوع المعرفات المستخدمة' : 'Identifier Standard'}
          </span>
          <div className="text-lg font-bold font-mono text-sky-400 mt-1">
            RFC 9562 UUIDv7
          </div>
          <span className="text-[10px] text-slate-500">
            {isAr ? 'مرتب زمنياً لمنع تصادم الفروع' : 'Time-ordered & index localized'}
          </span>
        </div>
      </div>

      {/* Outbox Events Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
            {isAr ? 'سجل أحداث Outbox (Events Feed)' : 'Transactional Outbox Log'}
          </h3>
          <span className="text-xs text-slate-400">
            {state.outbox.length} {isAr ? 'حدث مسجل' : 'events total'}
          </span>
        </div>

        {state.outbox.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {isAr ? 'لا توجد أحداث في صندوق المزامنة حالياً' : 'No outbox events in queue'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'معرف الحدث (UUIDv7)' : 'Event ID (UUIDv7)'}</th>
                  <th className="p-3 text-start">{isAr ? 'نوع الكيان' : 'Aggregate'}</th>
                  <th className="p-3 text-start">{isAr ? 'نوع الحدث' : 'Event Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'مفتاح عدم التكرار (Idempotency)' : 'Idempotency Key'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'عرض الحزمة' : 'Payload'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {state.outbox.map(evt => (
                  <tr key={evt.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 text-slate-300 font-bold">{evt.id}</td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {evt.aggregateType}
                      </span>
                    </td>
                    <td className="p-3 text-emerald-400 font-semibold">{evt.eventType}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{evt.idempotencyKey}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        evt.status === 'synced'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title={isAr ? 'فحص حزمة JSON' : 'Inspect JSON Payload'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm font-mono">
                  {selectedEvent.eventType} ({selectedEvent.aggregateType} #{selectedEvent.aggregateId})
                </h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  ID: {selectedEvent.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-slate-950/90 font-mono text-xs text-emerald-400">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedEvent.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
