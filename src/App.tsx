/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { usePosStore, AppTab } from './infrastructure/posStore.ts';
import { HeaderBar } from './components/HeaderBar.tsx';
import { PosRegister } from './components/PosRegister.tsx';
import { ShiftManager } from './components/ShiftManager.tsx';
import { InventoryManager } from './components/InventoryManager.tsx';
import { CustomerLedger } from './components/CustomerLedger.tsx';
import { OutboxMonitor } from './components/OutboxMonitor.tsx';
import { HardwareSimulator } from './components/HardwareSimulator.tsx';
import { ArchitectureHub } from './components/ArchitectureHub.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { KeyRound } from 'lucide-react';

export default function App() {
  const {
    state,
    setTab,
    toggleLanguage,
    setCurrency,
    toggleNetwork,
    switchUser,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    applyOrderDiscount,
    selectCustomer,
    parkCurrentCart,
    retrieveParkedCart,
    kickDrawer,
    completeCheckout,
    recordShiftCashMovement,
    closeCurrentShift,
    openNewShift,
    settleCustomerDebt,
    adjustStock,
    addNewProduct,
    closeReceiptModal,
  } = usePosStore();

  const isAr = state.lang === 'ar';

  // Global hotkeys (F1 - F10)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

      if (e.key === 'F1') {
        e.preventDefault();
        setTab('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setTab('shifts');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setTab('inventory');
      } else if (e.key === 'F4' && !isInput) {
        e.preventDefault();
        setTab('customers');
      } else if (e.key === 'F5') {
        // Prevent browser page refresh if pressed without ctrl
        if (!e.ctrlKey) {
          e.preventDefault();
          setTab('outbox');
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setTab('hardware');
      } else if (e.key === 'F7') {
        e.preventDefault();
        kickDrawer();
      } else if (e.key === 'F10') {
        e.preventDefault();
        setTab('architecture');
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [setTab, kickDrawer]);

  return (
    <div 
      className="w-full h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Fixed Header with status & nav */}
      <HeaderBar
        state={state}
        setTab={setTab}
        toggleLanguage={toggleLanguage}
        setCurrency={setCurrency}
        toggleNetwork={toggleNetwork}
        switchUser={switchUser}
        kickDrawer={kickDrawer}
      />

      {/* Main Workspace View Container */}
      <main className="flex-1 flex overflow-hidden relative">
        {state.currentTab === 'pos' && (
          <PosRegister
            state={state}
            addToCart={addToCart}
            updateCartItemQuantity={updateCartItemQuantity}
            removeCartItem={removeCartItem}
            clearCart={clearCart}
            applyOrderDiscount={applyOrderDiscount}
            selectCustomer={selectCustomer}
            parkCurrentCart={parkCurrentCart}
            retrieveParkedCart={retrieveParkedCart}
            completeCheckout={completeCheckout}
          />
        )}

        {state.currentTab === 'shifts' && (
          <ShiftManager
            state={state}
            recordShiftCashMovement={recordShiftCashMovement}
            closeCurrentShift={closeCurrentShift}
            openNewShift={openNewShift}
          />
        )}

        {state.currentTab === 'inventory' && (
          <InventoryManager
            state={state}
            adjustStock={adjustStock}
            addNewProduct={addNewProduct}
          />
        )}

        {state.currentTab === 'customers' && (
          <CustomerLedger
            state={state}
            settleCustomerDebt={settleCustomerDebt}
          />
        )}

        {state.currentTab === 'outbox' && (
          <OutboxMonitor
            state={state}
            toggleNetwork={toggleNetwork}
          />
        )}

        {state.currentTab === 'hardware' && (
          <HardwareSimulator
            state={state}
            kickDrawer={kickDrawer}
          />
        )}

        {state.currentTab === 'architecture' && (
          <ArchitectureHub
            state={state}
          />
        )}
      </main>

      {/* Acoustic Drawer Pop Toast Overlay */}
      {state.cashDrawerOpen && (
        <div className="fixed bottom-6 start-6 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce">
          <KeyRound className="w-4 h-4 fill-current" />
          <span>{isAr ? 'تم فتح درج النقد (Solenoid Fired)' : 'Cash Drawer Solenoid Popped!'}</span>
        </div>
      )}

      {/* 80mm Thermal Receipt Modal */}
      <ReceiptModal
        receipt={state.lastReceipt}
        onClose={closeReceiptModal}
        lang={state.lang}
      />
    </div>
  );
}
