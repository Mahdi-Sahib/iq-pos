/**
 * ApexPOS Enterprise - Unified Application State & Storage Coordinator
 * Orchestrates Domain Use Cases, Outbox Events, Ledger, and In-Memory/LocalStorage Persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Product, 
  Customer, 
  CartItem, 
  CartHold, 
  Order, 
  Shift, 
  PaymentSplit, 
  GeneralLedgerEntry, 
  OutboxEvent, 
  UserSession, 
  CurrencyCode 
} from '../domain/types.ts';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_SHIFT, 
  INITIAL_USERS 
} from '../data/seedData.ts';
import { CartEngine } from '../domain/cart.ts';
import { ShiftEngine } from '../domain/shift.ts';
import { FinancialLedger } from '../domain/financial.ts';
import { generateUUIDv7, OutboxEngine } from '../domain/outbox.ts';
import { HardwareAbstractionLayer, ThermalReceiptPayload, hardwareSounds } from './hardwareHal.ts';

const STORAGE_KEY = 'apex_pos_state_v1';

export type AppTab = 
  | 'pos' 
  | 'shifts' 
  | 'inventory' 
  | 'customers' 
  | 'outbox' 
  | 'hardware' 
  | 'architecture';

export interface PosState {
  currentTab: AppTab;
  lang: 'ar' | 'en';
  currency: CurrencyCode;
  isOnline: boolean;
  currentUser: UserSession;
  products: Product[];
  customers: Customer[];
  activeShift: Shift;
  cartItems: CartItem[];
  heldCarts: CartHold[];
  selectedCustomerId?: string;
  orderDiscountCents: number;
  orders: Order[];
  ledgerEntries: GeneralLedgerEntry[];
  outbox: OutboxEvent[];
  lastReceipt: ThermalReceiptPayload | null;
  cashDrawerOpen: boolean;
}

export function usePosStore() {
  const [state, setState] = useState<PosState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            // Ensure runtime state flags
            cashDrawerOpen: false,
            lastReceipt: null,
          };
        }
      } catch {
        // Fallback to fresh seed
      }
    }
    return {
      currentTab: 'pos',
      lang: 'ar',
      currency: 'SAR',
      isOnline: true,
      currentUser: INITIAL_USERS[0], // Cashier Ahmad
      products: INITIAL_PRODUCTS,
      customers: INITIAL_CUSTOMERS,
      activeShift: INITIAL_SHIFT,
      cartItems: [],
      heldCarts: [],
      selectedCustomerId: undefined,
      orderDiscountCents: 0,
      orders: [],
      ledgerEntries: [],
      outbox: [],
      lastReceipt: null,
      cashDrawerOpen: false,
    };
  });

  // Auto-sync state to localStorage (SQLite simulation persist)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        lastReceipt: null,
        cashDrawerOpen: false,
      }));
    } catch {
      // Storage quota or private browsing
    }
  }, [state]);

  // Update HTML direction and language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = state.lang;
      document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
      document.body.setAttribute('data-lang', state.lang);
    }
  }, [state.lang]);

  // Navigation tab switcher
  const setTab = useCallback((tab: AppTab) => {
    setState(s => ({ ...s, currentTab: tab }));
  }, []);

  // Language switcher
  const toggleLanguage = useCallback(() => {
    setState(s => ({
      ...s,
      lang: s.lang === 'ar' ? 'en' : 'ar',
    }));
  }, []);

  // Currency switcher
  const setCurrency = useCallback((currency: CurrencyCode) => {
    setState(s => ({ ...s, currency }));
  }, []);

  // Network toggle simulator
  const toggleNetwork = useCallback(() => {
    setState(s => {
      const nextOnline = !s.isOnline;
      // If going online, trigger flush of pending outbox events
      if (nextOnline && s.outbox.some(e => e.status === 'pending')) {
        const syncedOutbox = s.outbox.map(e => e.status === 'pending' ? OutboxEngine.markSynced(e) : e);
        return {
          ...s,
          isOnline: nextOnline,
          outbox: syncedOutbox,
        };
      }
      return { ...s, isOnline: nextOnline };
    });
  }, []);

  // Switch current cashier/user
  const switchUser = useCallback((user: UserSession) => {
    setState(s => ({ ...s, currentUser: user }));
  }, []);

  // Cart operations
  const addToCart = useCallback((product: Product, quantity = 1) => {
    hardwareSounds.playScannerBeep();
    setState(s => {
      const existingIndex = s.cartItems.findIndex(i => i.productId === product.id);
      let updatedItems: CartItem[];

      if (existingIndex >= 0) {
        const existing = s.cartItems[existingIndex];
        const newQty = existing.quantity + quantity;
        const updated = CartEngine.createItem({
          id: existing.id,
          productId: product.id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          barcode: product.barcode,
          unitPriceCents: product.priceCents,
          quantity: newQty,
          discountCents: existing.discountCents,
          taxRatePercent: product.taxRatePercent,
        });
        updatedItems = [...s.cartItems];
        updatedItems[existingIndex] = updated;
      } else {
        const newItem = CartEngine.createItem({
          id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: product.id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          barcode: product.barcode,
          unitPriceCents: product.priceCents,
          quantity,
          taxRatePercent: product.taxRatePercent,
        });
        updatedItems = [...s.cartItems, newItem];
      }

      // Update customer display
      const calc = CartEngine.recalculate(updatedItems, s.orderDiscountCents);
      HardwareAbstractionLayer.updateCustomerDisplay(
        product.nameEn.slice(0, 20),
        `TOTAL: ${(calc.totalCents / 100).toFixed(2)} ${s.currency}`
      );

      return { ...s, cartItems: updatedItems };
    });
  }, []);

  const updateCartItemQuantity = useCallback((cartItemId: string, delta: number) => {
    setState(s => {
      const updated = s.cartItems.map(item => {
        if (item.id === cartItemId) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          const product = s.products.find(p => p.id === item.productId);
          return CartEngine.createItem({
            id: item.id,
            productId: item.productId,
            nameEn: item.nameEn,
            nameAr: item.nameAr,
            barcode: item.barcode,
            unitPriceCents: item.unitPriceCents,
            quantity: nextQty,
            discountCents: item.discountCents,
            taxRatePercent: product?.taxRatePercent ?? 15,
          });
        }
        return item;
      }).filter(Boolean) as CartItem[];

      return { ...s, cartItems: updated };
    });
  }, []);

  const removeCartItem = useCallback((cartItemId: string) => {
    setState(s => ({
      ...s,
      cartItems: s.cartItems.filter(i => i.id !== cartItemId),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState(s => ({
      ...s,
      cartItems: [],
      selectedCustomerId: undefined,
      orderDiscountCents: 0,
    }));
    HardwareAbstractionLayer.updateCustomerDisplay('WELCOME TO APEXPOS', 'READY FOR SCAN');
  }, []);

  const applyOrderDiscount = useCallback((discountCents: number) => {
    setState(s => ({ ...s, orderDiscountCents: discountCents }));
  }, []);

  const selectCustomer = useCallback((customerId?: string) => {
    setState(s => ({ ...s, selectedCustomerId: customerId }));
  }, []);

  // Multi-cart / Park ticket operations
  const parkCurrentCart = useCallback((note?: string) => {
    setState(s => {
      if (s.cartItems.length === 0) return s;
      const customer = s.customers.find(c => c.id === s.selectedCustomerId);
      const newHold: CartHold = {
        id: `hold-${Date.now()}`,
        ticketNumber: `TKT-#${(s.heldCarts.length + 1).toString().padStart(3, '0')}`,
        customerId: s.selectedCustomerId,
        customerName: customer ? (s.lang === 'ar' ? customer.nameAr : customer.nameEn) : undefined,
        items: s.cartItems,
        note: note || (s.lang === 'ar' ? 'سلة معلقة' : 'Held Cart'),
        createdAt: Date.now(),
      };
      return {
        ...s,
        heldCarts: [newHold, ...s.heldCarts],
        cartItems: [],
        selectedCustomerId: undefined,
        orderDiscountCents: 0,
      };
    });
  }, []);

  const retrieveParkedCart = useCallback((holdId: string) => {
    setState(s => {
      const hold = s.heldCarts.find(h => h.id === holdId);
      if (!hold) return s;
      return {
        ...s,
        cartItems: hold.items,
        selectedCustomerId: hold.customerId,
        heldCarts: s.heldCarts.filter(h => h.id !== holdId),
      };
    });
  }, []);

  // Hardware triggers
  const kickDrawer = useCallback(() => {
    HardwareAbstractionLayer.kickCashDrawer();
    setState(s => ({ ...s, cashDrawerOpen: true }));
    setTimeout(() => {
      setState(s => ({ ...s, cashDrawerOpen: false }));
    }, 2000);
  }, []);

  // Checkout Use Case: Commit Order atomically with Ledger, Outbox, and Shift update
  const completeCheckout = useCallback((payments: PaymentSplit[]): { success: boolean; orderId?: string; error?: string } => {
    let resultOrderId: string | undefined;

    setState(s => {
      if (s.cartItems.length === 0) {
        return s;
      }
      if (s.activeShift.status !== 'open') {
        alert(s.lang === 'ar' ? 'خطأ: لا يوجد وردية مفتوحة لتسجيل البيع' : 'Error: No active shift is open');
        return s;
      }

      const calc = CartEngine.recalculate(s.cartItems, s.orderDiscountCents);
      const validation = CartEngine.validatePayments(calc.totalCents, payments);

      if (!validation.isValid) {
        alert(validation.error || 'Payment validation error');
        return s;
      }

      const orderId = generateUUIDv7();
      resultOrderId = orderId;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${(s.orders.length + 1).toString().padStart(6, '0')}`;
      const customer = s.customers.find(c => c.id === s.selectedCustomerId);

      // Split breakdown
      const cashSplit = payments.find(p => p.method === 'cash');
      const cardSplit = payments.find(p => p.method === 'card');
      const creditSplit = payments.find(p => p.method === 'customer_credit');
      const walletSplit = payments.find(p => p.method === 'wallet');

      const cashCents = cashSplit ? Math.max(0, cashSplit.amountCents - validation.changeGivenCents) : 0;
      const cardCents = cardSplit ? cardSplit.amountCents : 0;
      const creditCents = creditSplit ? creditSplit.amountCents : 0;
      const walletCents = walletSplit ? walletSplit.amountCents : 0;

      // 1. Create Order entity
      const newOrder: Order = {
        id: orderId,
        invoiceNumber,
        idempotencyKey: `idemp-ord-${orderId}`,
        shiftId: s.activeShift.id,
        cashierId: s.currentUser.id,
        cashierName: s.currentUser.fullName,
        branchId: s.currentUser.branchId,
        terminalId: s.currentUser.terminalId,
        customerId: s.selectedCustomerId,
        customerName: customer ? (s.lang === 'ar' ? customer.nameAr : customer.nameEn) : undefined,
        items: s.cartItems,
        subtotalCents: calc.subtotalCents,
        discountCents: calc.discountCents,
        taxCents: calc.taxCents,
        totalCents: calc.totalCents,
        payments,
        changeGivenCents: validation.changeGivenCents,
        status: 'completed',
        createdAt: Date.now(),
        isSyncPending: !s.isOnline,
        outboxEventId: `evt-${orderId}`,
      };

      // 2. Generate Double-Entry General Ledger records
      const newLedgerEntries = FinancialLedger.createSaleEntries({
        orderId,
        invoiceNumber,
        timestamp: Date.now(),
        cashCents,
        cardCents: cardCents + walletCents,
        creditCents,
        subtotalCents: calc.subtotalCents - calc.discountCents,
        taxCents: calc.taxCents,
        customerId: s.selectedCustomerId,
      });

      // 3. Create Transactional Outbox Event
      const outboxEvent = OutboxEngine.createEvent({
        aggregateType: 'Order',
        aggregateId: orderId,
        eventType: 'OrderCompleted',
        payload: {
          order: newOrder,
          ledger: newLedgerEntries,
        },
      });

      const finalEvent = s.isOnline ? OutboxEngine.markSynced(outboxEvent) : outboxEvent;

      // 4. Update Shift sales accumulators
      const updatedShift = ShiftEngine.recordSale(s.activeShift, {
        cashCents,
        cardCents,
        creditCents,
        walletCents,
      });

      // 5. Deduct product inventory stock
      const updatedProducts = s.products.map(prod => {
        const cartItem = s.cartItems.find(i => i.productId === prod.id);
        if (cartItem) {
          return {
            ...prod,
            currentStock: Math.max(0, prod.currentStock - cartItem.quantity),
          };
        }
        return prod;
      });

      // 6. Update customer balance if debt payment was made
      const updatedCustomers = s.customers.map(cust => {
        if (cust.id === s.selectedCustomerId && creditCents > 0) {
          return {
            ...cust,
            currentBalanceCents: cust.currentBalanceCents + creditCents,
            loyaltyPoints: cust.loyaltyPoints + Math.floor(calc.totalCents / 1000), // 1 point per 10 units
          };
        }
        return cust;
      });

      // 7. Format thermal receipt payload
      const receiptPayload: ThermalReceiptPayload = {
        storeName: 'APEX ARTISAN ROASTERY & BAKERY',
        storeTaxNumber: 'VAT 310123456700003',
        invoiceNumber,
        date: new Date().toLocaleString(s.lang === 'ar' ? 'ar-SA' : 'en-US'),
        cashierName: s.currentUser.fullName,
        customerName: customer ? (s.lang === 'ar' ? customer.nameAr : customer.nameEn) : undefined,
        items: s.cartItems.map(item => ({
          name: s.lang === 'ar' ? item.nameAr : item.nameEn,
          qty: item.quantity,
          unitPrice: (item.unitPriceCents / 100).toFixed(2),
          total: (item.totalCents / 100).toFixed(2),
        })),
        subtotal: (calc.subtotalCents / 100).toFixed(2) + ` ${s.currency}`,
        tax: (calc.taxCents / 100).toFixed(2) + ` ${s.currency}`,
        discount: (calc.discountCents / 100).toFixed(2) + ` ${s.currency}`,
        total: (calc.totalCents / 100).toFixed(2) + ` ${s.currency}`,
        payments: payments.map(p => ({
          method: p.method.toUpperCase(),
          amount: (p.amountCents / 100).toFixed(2) + ` ${s.currency}`,
        })),
        change: (validation.changeGivenCents / 100).toFixed(2) + ` ${s.currency}`,
        qrPayload: `APEXPOS|${invoiceNumber}|${calc.totalCents}|${calc.taxCents}`,
      };

      // Hardware triggers: kick drawer on cash, print receipt
      if (cashCents > 0) {
        HardwareAbstractionLayer.kickCashDrawer();
      }
      HardwareAbstractionLayer.printThermalReceipt(receiptPayload);

      return {
        ...s,
        orders: [newOrder, ...s.orders],
        ledgerEntries: [...newLedgerEntries, ...s.ledgerEntries],
        outbox: [finalEvent, ...s.outbox],
        activeShift: updatedShift,
        products: updatedProducts,
        customers: updatedCustomers,
        cartItems: [],
        selectedCustomerId: undefined,
        orderDiscountCents: 0,
        lastReceipt: receiptPayload,
        cashDrawerOpen: cashCents > 0,
      };
    });

    return { success: true, orderId: resultOrderId };
  }, []);

  // Cash in / Cash out for active shift
  const recordShiftCashMovement = useCallback((type: 'in' | 'out', amountCents: number, reason: string) => {
    setState(s => {
      const updated = ShiftEngine.recordCashMovement(s.activeShift, type, amountCents);
      const glEntry: GeneralLedgerEntry = {
        id: `gl-shift-${Date.now()}`,
        entryNumber: `GL-MOVE-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        type: type === 'in' ? 'cash_drop' : 'cash_payout',
        referenceId: s.activeShift.id,
        description: `Shift Cash ${type === 'in' ? 'Deposit' : 'Withdrawal'}: ${reason}`,
        debitAccount: type === 'in' ? '1010-Cash-On-Hand' : '5010-Store-Expenses',
        creditAccount: type === 'in' ? '2010-Owner-Equity' : '1010-Cash-On-Hand',
        amountCents,
      };
      return {
        ...s,
        activeShift: updated,
        ledgerEntries: [glEntry, ...s.ledgerEntries],
      };
    });
  }, []);

  // Close shift (Z-Report)
  const closeCurrentShift = useCallback((countedCashCents: number, notes?: string) => {
    setState(s => {
      const closed = ShiftEngine.closeShift(s.activeShift, countedCashCents, notes);
      const outboxEvt = OutboxEngine.createEvent({
        aggregateType: 'Shift',
        aggregateId: closed.id,
        eventType: 'ShiftClosed',
        payload: { shift: closed },
      });
      return {
        ...s,
        activeShift: closed,
        outbox: [s.isOnline ? OutboxEngine.markSynced(outboxEvt) : outboxEvt, ...s.outbox],
      };
    });
  }, []);

  // Open fresh shift
  const openNewShift = useCallback((openingFloatCents: number) => {
    setState(s => {
      const nextShiftNum = `SH-2026-${(Math.floor(Math.random() * 9000) + 1000)}`;
      const newShift = ShiftEngine.createNewShift({
        id: `shift-${Date.now()}`,
        shiftNumber: nextShiftNum,
        cashierId: s.currentUser.id,
        cashierName: s.currentUser.fullName,
        terminalId: s.currentUser.terminalId,
        openingFloatCents,
      });
      return {
        ...s,
        activeShift: newShift,
      };
    });
  }, []);

  // Customer debt settlement
  const settleCustomerDebt = useCallback((customerId: string, amountCents: number, method: 'cash' | 'card') => {
    setState(s => {
      const customer = s.customers.find(c => c.id === customerId);
      if (!customer) return s;

      const newBalance = Math.max(0, customer.currentBalanceCents - amountCents);
      const updatedCustomers = s.customers.map(c => 
        c.id === customerId ? { ...c, currentBalanceCents: newBalance } : c
      );

      const glEntry: GeneralLedgerEntry = {
        id: `gl-debt-${Date.now()}`,
        entryNumber: `GL-RCPT-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        type: 'customer_payment',
        referenceId: customerId,
        description: `Customer debt receipt for ${s.lang === 'ar' ? customer.nameAr : customer.nameEn}`,
        debitAccount: method === 'cash' ? '1010-Cash-On-Hand' : '1020-Bank-Account',
        creditAccount: `1110-Accounts-Receivable-${customerId}`,
        amountCents,
      };

      // If cash, update shift cash in
      let updatedShift = s.activeShift;
      if (method === 'cash') {
        updatedShift = ShiftEngine.recordCashMovement(s.activeShift, 'in', amountCents);
      }

      return {
        ...s,
        customers: updatedCustomers,
        activeShift: updatedShift,
        ledgerEntries: [glEntry, ...s.ledgerEntries],
      };
    });
  }, []);

  // Inventory adjustment
  const adjustStock = useCallback((productId: string, quantityDelta: number, reason: string) => {
    setState(s => {
      const updated = s.products.map(p => {
        if (p.id === productId) {
          const nextStock = Math.max(0, p.currentStock + quantityDelta);
          return { ...p, currentStock: nextStock };
        }
        return p;
      });

      const outboxEvt = OutboxEngine.createEvent({
        aggregateType: 'Inventory',
        aggregateId: productId,
        eventType: 'StockAdjusted',
        payload: { productId, delta: quantityDelta, reason },
      });

      return {
        ...s,
        products: updated,
        outbox: [s.isOnline ? OutboxEngine.markSynced(outboxEvt) : outboxEvt, ...s.outbox],
      };
    });
  }, []);

  // Add new product
  const addNewProduct = useCallback((newProduct: Product) => {
    setState(s => ({
      ...s,
      products: [newProduct, ...s.products],
    }));
  }, []);

  const closeReceiptModal = useCallback(() => {
    setState(s => ({ ...s, lastReceipt: null }));
  }, []);

  return {
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
  };
}
