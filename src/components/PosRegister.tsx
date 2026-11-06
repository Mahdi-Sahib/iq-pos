import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  PauseCircle, 
  PlayCircle, 
  Percent, 
  User, 
  CreditCard, 
  Banknote, 
  Wallet, 
  FileText, 
  Check, 
  X, 
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { PosState } from '../infrastructure/posStore.ts';
import { Product, PaymentSplit, PaymentMethod } from '../domain/types.ts';
import { CartEngine } from '../domain/cart.ts';

interface PosRegisterProps {
  state: PosState;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (id: string, delta: number) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  applyOrderDiscount: (discountCents: number) => void;
  selectCustomer: (id?: string) => void;
  parkCurrentCart: (note?: string) => void;
  retrieveParkedCart: (id: string) => void;
  completeCheckout: (payments: PaymentSplit[]) => { success: boolean; orderId?: string; error?: string };
}

export const PosRegister: React.FC<PosRegisterProps> = ({
  state,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  applyOrderDiscount,
  selectCustomer,
  parkCurrentCart,
  retrieveParkedCart,
  completeCheckout,
}) => {
  const isAr = state.lang === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('');
  const [showHeldTickets, setShowHeldTickets] = useState<boolean>(false);

  // Split payment state
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [cardTenderedInput, setCardTenderedInput] = useState<string>('');
  const [creditTenderedInput, setCreditTenderedInput] = useState<string>('');
  const [walletTenderedInput, setWalletTenderedInput] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Recalculate cart totals
  const cartCalculation = useMemo(() => {
    return CartEngine.recalculate(state.cartItems, state.orderDiscountCents);
  }, [state.cartItems, state.orderDiscountCents]);

  // Filtered products
  const categories = useMemo(() => {
    const set = new Set<string>();
    state.products.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.includes(q) ||
        p.barcode.includes(q) ||
        p.code.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [state.products, selectedCategory, searchQuery]);

  // Selected customer entity
  const selectedCustomer = useMemo(() => {
    return state.customers.find(c => c.id === state.selectedCustomerId);
  }, [state.customers, state.selectedCustomerId]);

  // Handle barcode scanner submission
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = state.products.find(p => p.barcode === barcodeInput.trim() || p.code === barcodeInput.trim());
    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      alert(isAr ? `المنتج غير موجود: ${barcodeInput}` : `Product not found: ${barcodeInput}`);
      setBarcodeInput('');
    }
  };

  // Open Payment modal & prefill defaults
  const openPaymentModal = () => {
    if (state.cartItems.length === 0) return;
    const totalMajor = (cartCalculation.totalCents / 100).toFixed(2);
    setCashTenderedInput(totalMajor);
    setCardTenderedInput('');
    setCreditTenderedInput('');
    setWalletTenderedInput('');
    setActivePaymentMethod('cash');
    setIsPaymentModalOpen(true);
  };

  // Payment splits calculation
  const paymentSplits = useMemo((): PaymentSplit[] => {
    const splits: PaymentSplit[] = [];
    const cashVal = parseFloat(cashTenderedInput) || 0;
    const cardVal = parseFloat(cardTenderedInput) || 0;
    const creditVal = parseFloat(creditTenderedInput) || 0;
    const walletVal = parseFloat(walletTenderedInput) || 0;

    if (cashVal > 0) splits.push({ method: 'cash', amountCents: Math.round(cashVal * 100) });
    if (cardVal > 0) splits.push({ method: 'card', amountCents: Math.round(cardVal * 100) });
    if (creditVal > 0) splits.push({ method: 'customer_credit', amountCents: Math.round(creditVal * 100) });
    if (walletVal > 0) splits.push({ method: 'wallet', amountCents: Math.round(walletVal * 100) });

    return splits;
  }, [cashTenderedInput, cardTenderedInput, creditTenderedInput, walletTenderedInput]);

  const paymentValidation = useMemo(() => {
    return CartEngine.validatePayments(cartCalculation.totalCents, paymentSplits);
  }, [cartCalculation.totalCents, paymentSplits]);

  // Handle finalize sale
  const handleFinalizeSale = () => {
    if (!paymentValidation.isValid) return;

    // Check credit limit if credit is used
    const creditSplit = paymentSplits.find(p => p.method === 'customer_credit');
    if (creditSplit) {
      if (!selectedCustomer) {
        alert(isAr ? 'خطأ: يجب تحديد عميل مسجل للبيع الآجل' : 'Error: Customer must be selected for credit sale');
        return;
      }
      const newDebt = selectedCustomer.currentBalanceCents + creditSplit.amountCents;
      if (newDebt > selectedCustomer.creditLimitCents) {
        const excess = (newDebt - selectedCustomer.creditLimitCents) / 100;
        alert(isAr 
          ? `تجاوز الحد الائتماني بمقدار ${excess} ${state.currency}!` 
          : `Credit limit exceeded by ${excess} ${state.currency}!`);
        return;
      }
    }

    const res = completeCheckout(paymentSplits);
    if (res.success) {
      setIsPaymentModalOpen(false);
    }
  };

  // Quick cash chips
  const applyQuickCash = (amount: number) => {
    setCashTenderedInput(amount.toFixed(2));
    setCardTenderedInput('');
    setCreditTenderedInput('');
    setWalletTenderedInput('');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        parkCurrentCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (state.cartItems.length > 0 && confirm(isAr ? 'إلغاء وتفريغ السلة الحالية؟' : 'Void active cart?')) {
          clearCart();
        }
      } else if (e.key === 'F12' || (e.key === 'Enter' && e.ctrlKey)) {
        e.preventDefault();
        if (!isPaymentModalOpen && state.cartItems.length > 0) {
          openPaymentModal();
        }
      } else if (e.key === 'Escape') {
        setIsPaymentModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsDiscountModalOpen(false);
        setShowHeldTickets(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.cartItems.length, isPaymentModalOpen, isAr, parkCurrentCart, clearCart]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100">
      {/* LEFT / MAIN: Catalog & Scanner */}
      <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
        {/* Search & Barcode Header */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-3">
          {/* Quick Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 min-w-[240px] relative">
            <Barcode className="w-4 h-4 text-emerald-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder={isAr ? 'امسح الباركود أو اضغط Enter...' : 'Scan barcode or hit Enter...'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg ps-9 pe-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </form>

          {/* Product text search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو الرمز...' : 'Search product name or SKU...'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg ps-9 pe-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Held tickets toggle pill */}
          {state.heldCarts.length > 0 && (
            <button
              onClick={() => setShowHeldTickets(!showHeldTickets)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-950/60 text-amber-300 border border-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-900 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isAr ? `المعلق (${state.heldCarts.length})` : `Held (${state.heldCarts.length})`}
              </span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat === 'All' ? (isAr ? 'جميع الأصناف' : 'All Items') : cat}
            </button>
          ))}
        </div>

        {/* Held Tickets Drawer */}
        {showHeldTickets && state.heldCarts.length > 0 && (
          <div className="p-3 bg-slate-900/95 border-b border-amber-900/50 flex flex-wrap gap-2">
            {state.heldCarts.map(hold => (
              <div
                key={hold.id}
                className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-amber-400">{hold.ticketNumber}</span>
                  <div className="text-[11px] text-slate-400">
                    {hold.items.length} {isAr ? 'عناصر' : 'items'} • {hold.customerName || (isAr ? 'عميل نقدي' : 'Cash')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    retrieveParkedCart(hold.id);
                    setShowHeldTickets(false);
                  }}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium"
                >
                  {isAr ? 'استعادة' : 'Recall'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredProducts.map(product => {
            const isOutOfStock = product.currentStock <= 0;
            const isLowStock = product.currentStock <= product.minStockAlert;

            return (
              <button
                key={product.id}
                disabled={isOutOfStock}
                onClick={() => addToCart(product)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border text-start transition-all ${
                  isOutOfStock
                    ? 'bg-slate-900/40 border-slate-800/50 opacity-50 cursor-not-allowed'
                    : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/70 hover:bg-slate-850 hover:shadow-md cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {product.code}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isOutOfStock
                        ? 'bg-rose-950 text-rose-400'
                        : isLowStock
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-slate-800 text-emerald-400'
                    }`}>
                      {isOutOfStock ? (isAr ? 'نفد' : 'Out') : `${product.currentStock} ${product.unit}`}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug">
                    {isAr ? product.nameAr : product.nameEn}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {isAr ? product.nameEn : product.nameAr}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {(product.priceCents / 100).toFixed(2)} {state.currency}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    +{product.taxRatePercent}% VAT
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT / REGISTER CART: Order Summary & Checkout */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-slate-900 border-s border-slate-800/80 select-none">
        {/* Customer & Cart Header */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-start"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {selectedCustomer 
                  ? (isAr ? selectedCustomer.nameAr : selectedCustomer.nameEn)
                  : (isAr ? 'عميل نقدي عام (غير محدد)' : 'Standard Walk-in Customer')}
              </div>
              {selectedCustomer && (
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <span>{isAr ? 'الرصيد المدين:' : 'A/R Debt:'}</span>
                  <span className="font-mono text-amber-400">
                    {(selectedCustomer.currentBalanceCents / 100).toFixed(2)} {state.currency}
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* Park Cart Button (F4) */}
          <button
            onClick={() => parkCurrentCart()}
            disabled={state.cartItems.length === 0}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 hover:bg-slate-750 disabled:opacity-40 transition-colors"
            title={isAr ? 'تعليق السلة الحالية (F4)' : 'Hold / Park Cart (F4)'}
          >
            <PauseCircle className="w-4 h-4" />
          </button>

          {/* Void Cart Button (F9) */}
          <button
            onClick={() => {
              if (state.cartItems.length > 0 && confirm(isAr ? 'هل أنت متأكد من تفريغ السلة؟' : 'Void current cart?')) {
                clearCart();
              }
            }}
            disabled={state.cartItems.length === 0}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-rose-400 hover:bg-slate-750 disabled:opacity-40 transition-colors"
            title={isAr ? 'إلغاء الفاتورة (F9)' : 'Void Cart (F9)'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {state.cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3">
                <Barcode className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400">
                {isAr ? 'السلة فارغة' : 'Cart is Empty'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                {isAr ? 'امسح الباركود أو اختر صنفاً من القائمة لبدء البيع' : 'Scan a barcode or click a product tile to add items'}
              </p>
            </div>
          ) : (
            state.cartItems.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-slate-100 truncate">
                    {isAr ? item.nameAr : item.nameEn}
                  </h5>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono">
                      {(item.unitPriceCents / 100).toFixed(2)} {state.currency}
                    </span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono">{item.barcode}</span>
                  </div>
                </div>

                {/* Quantity adjustments */}
                <div className="flex items-center gap-1.5 bg-slate-900 rounded-md border border-slate-800 p-0.5">
                  <button
                    onClick={() => updateCartItemQuantity(item.id, -1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartItemQuantity(item.id, 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="text-end min-w-[70px]">
                  <div className="font-mono font-bold text-emerald-400">
                    {(item.totalCents / 100).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="text-[10px] text-rose-400 hover:underline mt-0.5 inline-block"
                  >
                    {isAr ? 'حذف' : 'Remove'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Totals & Action Section */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Quick Subtotals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? 'المجموع قبل الضريبة:' : 'Subtotal (Excl. Tax):'}</span>
              <span className="font-mono">
                {(cartCalculation.subtotalCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>{isAr ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}</span>
              <span className="font-mono">
                {(cartCalculation.taxCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>

            {cartCalculation.discountCents > 0 && (
              <div className="flex justify-between text-amber-400 font-medium">
                <span>{isAr ? 'الخصم المطبق:' : 'Order Discount:'}</span>
                <span className="font-mono">
                  -{(cartCalculation.discountCents / 100).toFixed(2)} {state.currency}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-base font-bold">
              <span className="text-white">
                {isAr ? 'الإجمالي النهائي:' : 'Net Total:'}
              </span>
              <span className="font-mono text-emerald-400 text-lg">
                {(cartCalculation.totalCents / 100).toFixed(2)} {state.currency}
              </span>
            </div>
          </div>

          {/* Quick Action row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'خصم الفاتورة' : 'Apply Discount'}</span>
            </button>

            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'تحديد العميل' : 'Select Customer'}</span>
            </button>
          </div>

          {/* Primary Pay Button */}
          <button
            disabled={state.cartItems.length === 0}
            onClick={openPaymentModal}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Banknote className="w-5 h-5" />
            <span>
              {isAr ? 'الدفع وإنهاء البيع (F12)' : 'Pay & Finalize (F12)'}
            </span>
            <span className="font-mono bg-emerald-700/80 px-2 py-0.5 rounded text-xs">
              {(cartCalculation.totalCents / 100).toFixed(2)} {state.currency}
            </span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Split Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  {isAr ? 'إتمام الدفع والدفع المتعدد (Split Payment)' : 'Complete Payment & Split Tender'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr ? 'الإجمالي المطلوب:' : 'Total Amount Due:'}{' '}
                  <span className="font-mono text-emerald-400 font-bold">
                    {(cartCalculation.totalCents / 100).toFixed(2)} {state.currency}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Payment Methods tabs */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', labelAr: 'نقد (Cash)', labelEn: 'Cash', icon: <Banknote className="w-4 h-4" /> },
                  { id: 'card', labelAr: 'بطاقة (Card)', labelEn: 'Card / POS', icon: <CreditCard className="w-4 h-4" /> },
                  { id: 'customer_credit', labelAr: 'آجل (Debt)', labelEn: 'A/R Debt', icon: <FileText className="w-4 h-4" /> },
                  { id: 'wallet', labelAr: 'محفظة (ApplePay)', labelEn: 'Wallet', icon: <Wallet className="w-4 h-4" /> },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActivePaymentMethod(m.id as PaymentMethod)}
                    className={`p-2.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1.5 border transition-all ${
                      activePaymentMethod === m.id
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    {m.icon}
                    <span>{isAr ? m.labelAr : m.labelEn}</span>
                  </button>
                ))}
              </div>

              {/* Input for Active Method */}
              <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {isAr ? `المبلغ المخصص لـ [${activePaymentMethod}]:` : `Amount for [${activePaymentMethod}]:`}
                  </span>
                  <span className="font-mono text-slate-500">
                    {state.currency}
                  </span>
                </div>

                {activePaymentMethod === 'cash' && (
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={cashTenderedInput}
                      onChange={(e) => setCashTenderedInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    {/* Quick cash denomination chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[10, 20, 50, 100, 200, 500].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => applyQuickCash(amt)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono"
                        >
                          {amt} {state.currency}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => applyQuickCash(cartCalculation.totalCents / 100)}
                        className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 rounded text-xs font-mono font-bold"
                      >
                        {isAr ? 'المبلغ بالضبط' : 'Exact Amount'}
                      </button>
                    </div>
                  </div>
                )}

                {activePaymentMethod === 'card' && (
                  <input
                    type="number"
                    step="0.01"
                    value={cardTenderedInput}
                    onChange={(e) => setCardTenderedInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                )}

                {activePaymentMethod === 'customer_credit' && (
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={creditTenderedInput}
                      onChange={(e) => setCreditTenderedInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    {!selectedCustomer ? (
                      <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {isAr ? 'تنبيه: يجب اختيار عميل مسجل لتسجيل الدين الآجل' : 'Alert: Select a registered customer for credit sales'}
                      </p>
                    ) : (
                      <div className="text-xs text-slate-400 mt-2 flex justify-between">
                        <span>{isAr ? 'الحد الائتماني المتاح:' : 'Available Credit:'}</span>
                        <span className="font-mono text-emerald-400">
                          {((selectedCustomer.creditLimitCents - selectedCustomer.currentBalanceCents) / 100).toFixed(2)} {state.currency}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {activePaymentMethod === 'wallet' && (
                  <input
                    type="number"
                    step="0.01"
                    value={walletTenderedInput}
                    onChange={(e) => setWalletTenderedInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Payment Summary Box */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>{isAr ? 'المجموع المدفوع:' : 'Total Paid:'}</span>
                  <span className="font-mono font-bold">
                    {(paymentValidation.paidCents / 100).toFixed(2)} {state.currency}
                  </span>
                </div>

                {paymentValidation.remainingCents > 0 && (
                  <div className="flex justify-between text-rose-400 font-semibold">
                    <span>{isAr ? 'المتبقي مطلوب دفعه:' : 'Remaining Due:'}</span>
                    <span className="font-mono">
                      {(paymentValidation.remainingCents / 100).toFixed(2)} {state.currency}
                    </span>
                  </div>
                )}

                {paymentValidation.changeGivenCents > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1 border-t border-slate-800">
                    <span>{isAr ? 'المتبقي نقداً للعميل (Change):' : 'Change Given to Customer:'}</span>
                    <span className="font-mono">
                      {(paymentValidation.changeGivenCents / 100).toFixed(2)} {state.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                disabled={!paymentValidation.isValid}
                onClick={handleFinalizeSale}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/60"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isAr ? 'تأكيد البيع وطباعة الفاتورة' : 'Confirm & Print Receipt'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Customer Selection Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                {isAr ? 'تحديد العميل للطلب' : 'Select Customer Account'}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {/* Option to clear customer (Walk-in) */}
              <button
                onClick={() => {
                  selectCustomer(undefined);
                  setIsCustomerModalOpen(false);
                }}
                className={`w-full p-3 rounded-lg border text-start text-xs flex items-center justify-between transition-colors ${
                  !state.selectedCustomerId
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div>
                  <div className="font-bold">{isAr ? 'عميل نقدي عام (Walk-in)' : 'Walk-in Customer'}</div>
                  <div className="text-[11px] text-slate-400">{isAr ? 'بدون حساب آجل' : 'No credit terms'}</div>
                </div>
                {!state.selectedCustomerId && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              {state.customers.map(cust => (
                <button
                  key={cust.id}
                  onClick={() => {
                    selectCustomer(cust.id);
                    setIsCustomerModalOpen(false);
                  }}
                  className={`w-full p-3 rounded-lg border text-start text-xs flex items-center justify-between transition-colors ${
                    state.selectedCustomerId === cust.id
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div>
                    <div className="font-bold">{isAr ? cust.nameAr : cust.nameEn}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{cust.phone}</span>
                      <span>•</span>
                      <span>{isAr ? 'الرصيد المدين:' : 'Debt:'} {(cust.currentBalanceCents / 100).toFixed(2)} {state.currency}</span>
                    </div>
                  </div>
                  {state.selectedCustomerId === cust.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Order Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-sm">
              {isAr ? 'تطبيق خصم على الفاتورة' : 'Apply Order Discount'}
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'نسبة الخصم المئوية (%):' : 'Discount Percentage (%):'}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercentInput}
                onChange={(e) => setDiscountPercentInput(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              {[5, 10, 15, 20].map(pct => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercentInput(pct.toString())}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-xs font-mono"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs font-medium"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const pct = parseFloat(discountPercentInput) || 0;
                  const discountCents = Math.round((cartCalculation.subtotalCents * pct) / 100);
                  applyOrderDiscount(discountCents);
                  setIsDiscountModalOpen(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
              >
                {isAr ? 'تطبيق' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
