import React from 'react';
import { 
  ShoppingBag, 
  Clock, 
  Boxes, 
  Users, 
  Database, 
  Cpu, 
  BookOpen, 
  Wifi, 
  WifiOff, 
  Languages, 
  DollarSign, 
  ShieldCheck, 
  CreditCard,
  KeyRound
} from 'lucide-react';
import { AppTab, PosState } from '../infrastructure/posStore.ts';
import { INITIAL_USERS } from '../data/seedData.ts';
import { UserSession, CurrencyCode } from '../domain/types.ts';

interface HeaderBarProps {
  state: PosState;
  setTab: (tab: AppTab) => void;
  toggleLanguage: () => void;
  setCurrency: (currency: CurrencyCode) => void;
  toggleNetwork: () => void;
  switchUser: (user: UserSession) => void;
  kickDrawer: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  setTab,
  toggleLanguage,
  setCurrency,
  toggleNetwork,
  switchUser,
  kickDrawer,
}) => {
  const isAr = state.lang === 'ar';
  const pendingOutboxCount = state.outbox.filter(e => e.status === 'pending').length;

  const tabs: Array<{ id: AppTab; labelAr: string; labelEn: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'pos', labelAr: 'نقطة البيع', labelEn: 'POS Register', icon: <ShoppingBag className="w-4 h-4" />, shortcut: 'F1' },
    { id: 'shifts', labelAr: 'الوردية والصندوق', labelEn: 'Shifts & Till', icon: <Clock className="w-4 h-4" />, shortcut: 'F2' },
    { id: 'inventory', labelAr: 'المخزون والمنتجات', labelEn: 'Inventory', icon: <Boxes className="w-4 h-4" />, shortcut: 'F3' },
    { id: 'customers', labelAr: 'العملاء والذمم', labelEn: 'Customers & Ledger', icon: <Users className="w-4 h-4" />, shortcut: 'F4' },
    { id: 'outbox', labelAr: 'صندوق المزامنة Outbox', labelEn: 'Outbox Sync', icon: <Database className="w-4 h-4" />, shortcut: 'F5' },
    { id: 'hardware', labelAr: 'عتاد الكاشير HAL', labelEn: 'Hardware HAL', icon: <Cpu className="w-4 h-4" />, shortcut: 'F6' },
    { id: 'architecture', labelAr: 'المعمارية والمواصفات', labelEn: 'Architecture Specs', icon: <BookOpen className="w-4 h-4" />, shortcut: 'F10' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Top utility row */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/60 text-xs">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm tracking-wider shadow-inner">
            AP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-sm">
                {isAr ? 'أبيكس بوس إنتربرايز' : 'ApexPOS Enterprise'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                {isAr ? 'محلي دون إنترنت (Offline-First)' : 'Offline-First Engine'}
              </span>
            </div>
          </div>
        </div>

        {/* Shift status snippet */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-slate-900 rounded-md border border-slate-800">
          <span className="text-slate-400">
            {isAr ? 'الوردية الحالية:' : 'Active Shift:'}
          </span>
          <span className="font-mono text-emerald-400 font-medium">
            {state.activeShift.shiftNumber}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">
            {state.activeShift.cashierName}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            {isAr ? 'النقد المتوقع:' : 'Expected Cash:'}
          </span>
          <span className="font-mono text-white font-semibold">
            {(state.activeShift.expectedCashCents / 100).toFixed(2)} {state.currency}
          </span>
        </div>

        {/* Controls & Quick Toggles */}
        <div className="flex items-center gap-2">
          {/* Outbox Sync Status Badge */}
          <button
            onClick={() => setTab('outbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              pendingOutboxCount > 0
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
            title={isAr ? 'حالة طابور المزامنة' : 'Outbox Queue Status'}
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isAr ? `المزامنة: ${pendingOutboxCount} معلق` : `Outbox: ${pendingOutboxCount} Pending`}
            </span>
          </button>

          {/* Network Simulator Toggle */}
          <button
            onClick={toggleNetwork}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              state.isOnline
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/70'
            }`}
            title={isAr ? 'تبديل محاكاة اتصال الشبكة' : 'Toggle Network Simulation'}
          >
            {state.isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'متصل (Online)' : 'Online (LAN Host)'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>{isAr ? 'منفصل (Offline Mode)' : 'Offline Mode'}</span>
              </>
            )}
          </button>

          {/* Open Cash Drawer Button */}
          <button
            onClick={kickDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
            title={isAr ? 'فتح درج النقد يدويًا (F7)' : 'Kick Cash Drawer (F7)'}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isAr ? 'فتح الدرج' : 'Open Drawer'}</span>
          </button>

          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-900 rounded-md border border-slate-800 p-0.5">
            {(['SAR', 'USD', 'AED'] as CurrencyCode[]).map(curr => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  state.currency === curr
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
            title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'English' : 'عربي (RTL)'}</span>
          </button>

          {/* User Profile Selector */}
          <div className="relative">
            <select
              value={state.currentUser.id}
              onChange={(e) => {
                const found = INITIAL_USERS.find(u => u.id === e.target.value);
                if (found) switchUser(found);
              }}
              className="bg-slate-900 text-slate-200 text-xs border border-slate-700 rounded-md px-2 py-1 focus:outline-none focus:border-emerald-500"
            >
              {INITIAL_USERS.map(user => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="px-4 flex items-center justify-between overflow-x-auto gap-1">
        <nav className="flex items-center gap-1 py-1.5" role="tablist">
          {tabs.map(tab => {
            const isActive = state.currentTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
                  {tab.shortcut}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Terminal Info */}
        <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
          <span>TERMINAL: {state.currentUser.terminalId}</span>
          <span>•</span>
          <span>BRANCH: {state.currentUser.branchId}</span>
        </div>
      </div>
    </header>
  );
};
