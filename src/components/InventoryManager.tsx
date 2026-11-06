import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowUpDown, 
  Barcode, 
  FileSpreadsheet, 
  Check, 
  X,
  TrendingUp,
  Package
} from 'lucide-react';
import { PosState } from '../infrastructure/posStore.ts';
import { Product } from '../domain/types.ts';

interface InventoryManagerProps {
  state: PosState;
  adjustStock: (productId: string, quantityDelta: number, reason: string) => void;
  addNewProduct: (product: Product) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  state,
  adjustStock,
  addNewProduct,
}) => {
  const isAr = state.lang === 'ar';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  // Stock Adjust Modal
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>('');
  const [adjustReasonInput, setAdjustReasonInput] = useState<string>('Stocktake Discrepancy');

  // Add Product Modal
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newNameEn, setNewNameEn] = useState<string>('');
  const [newNameAr, setNewNameAr] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Beverages');
  const [newBarcode, setNewBarcode] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCost, setNewCost] = useState<string>('');
  const [newInitialStock, setNewInitialStock] = useState<string>('20');

  const categories = useMemo(() => {
    const set = new Set<string>();
    state.products.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchLowStock = !filterLowStockOnly || p.currentStock <= p.minStockAlert;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.includes(q) ||
        p.barcode.includes(q) ||
        p.code.toLowerCase().includes(q);

      return matchCat && matchLowStock && matchSearch;
    });
  }, [state.products, selectedCategory, filterLowStockOnly, searchQuery]);

  // Overall Inventory Stats
  const totalStockUnits = useMemo(() => {
    return state.products.reduce((sum, p) => sum + p.currentStock, 0);
  }, [state.products]);

  const totalInventoryValuationCents = useMemo(() => {
    return state.products.reduce((sum, p) => sum + p.currentStock * p.costCents, 0);
  }, [state.products]);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    const qty = parseInt(adjustQtyInput, 10);
    if (isNaN(qty) || qty === 0) return;

    adjustStock(selectedProductForAdjust.id, qty, adjustReasonInput);
    setSelectedProductForAdjust(null);
    setAdjustQtyInput('');
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newNameEn || !newPrice) return;

    const priceCents = Math.round(parseFloat(newPrice) * 100);
    const costCents = Math.round((parseFloat(newCost) || 0) * 100);
    const initialStock = parseInt(newInitialStock, 10) || 0;

    const prod: Product = {
      id: `prod-${Date.now()}`,
      code: newCode.toUpperCase(),
      nameEn: newNameEn,
      nameAr: newNameAr || newNameEn,
      category: newCategory,
      barcode: newBarcode || `628100${Date.now().toString().slice(-7)}`,
      unit: 'pcs',
      priceCents,
      costCents,
      taxRatePercent: 15,
      currentStock: initialStock,
      minStockAlert: 5,
      isVariable: false,
    };

    addNewProduct(prod);
    setIsAddProductModalOpen(false);
    // Reset form
    setNewCode('');
    setNewNameEn('');
    setNewNameAr('');
    setNewPrice('');
    setNewCost('');
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-950 text-slate-100 space-y-6">
      {/* Header and KPI bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            <span>{isAr ? 'إدارة المخزون والمستودعات' : 'Catalog & Warehouse Inventory'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'متابعة حركات الأصناف، تقييم المخزون (Weighted Average)، وتعديل الفروقات الجردية'
              : 'Track product movements, inventory valuation (Weighted Average), and stocktake adjustments'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/60"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة منتج جديد' : 'New Product'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? 'إجمالي عدد الأصناف' : 'Total SKU Count'}
          </span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {state.products.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? 'إجمالي وحدات المخزون المتوفرة' : 'Total Units on Hand'}
          </span>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {totalStockUnits}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? 'القيمة التكلفية الإجمالية للمخزون' : 'Total Inventory Valuation (Cost)'}
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {(totalInventoryValuationCents / 100).toFixed(2)} {state.currency}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم أو الباركود أو SKU...' : 'Search by SKU, barcode or name...'}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg ps-9 pe-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 text-slate-300 text-xs border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              filterLowStockOnly
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'تنبيهات نقص المخزون' : 'Low Stock Only'}</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3 text-start">{isAr ? 'الرمز والباركود' : 'SKU / Barcode'}</th>
                <th className="p-3 text-start">{isAr ? 'اسم الصنف' : 'Product Name'}</th>
                <th className="p-3 text-start">{isAr ? 'التصنيف' : 'Category'}</th>
                <th className="p-3 text-end">{isAr ? 'الرصيد' : 'Stock'}</th>
                <th className="p-3 text-end">{isAr ? 'التكلفة' : 'Unit Cost'}</th>
                <th className="p-3 text-end">{isAr ? 'سعر البيع' : 'Selling Price'}</th>
                <th className="p-3 text-end">{isAr ? 'الهامش %' : 'Margin %'}</th>
                <th className="p-3 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredProducts.map(prod => {
                const isLow = prod.currentStock <= prod.minStockAlert;
                const margin = prod.priceCents > 0 
                  ? Math.round(((prod.priceCents - prod.costCents) / prod.priceCents) * 100) 
                  : 0;

                return (
                  <tr key={prod.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-white">{prod.code}</div>
                      <div className="text-[11px] text-slate-400">{prod.barcode}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">
                        {isAr ? prod.nameAr : prod.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isAr ? prod.nameEn : prod.nameAr}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {prod.category}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        prod.currentStock <= 0
                          ? 'bg-rose-950 text-rose-400'
                          : isLow
                          ? 'bg-amber-950 text-amber-300'
                          : 'text-slate-200'
                      }`}>
                        {prod.currentStock} {prod.unit}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono text-slate-400">
                      {(prod.costCents / 100).toFixed(2)} {state.currency}
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-emerald-400">
                      {(prod.priceCents / 100).toFixed(2)} {state.currency}
                    </td>
                    <td className="p-3 text-end font-mono text-sky-400">
                      {margin}%
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedProductForAdjust(prod);
                          setAdjustQtyInput('');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        {isAr ? 'تعديل المخزون' : 'Adjust Stock'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdjustSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-white text-base">
              {isAr ? 'تسوية وتعديل رصيد المخزون' : 'Stock Adjustment & Reconciliation'}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-200">
                {isAr ? selectedProductForAdjust.nameAr : selectedProductForAdjust.nameEn}
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>{isAr ? 'الرصيد الحالي بالمستودع:' : 'Current On Hand:'}</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {selectedProductForAdjust.currentStock} {selectedProductForAdjust.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'قيمة التعديل (+ للإضافة، - للخصم):' : 'Quantity Delta (+ to add, - to deduct):'}
              </label>
              <input
                type="number"
                required
                value={adjustQtyInput}
                onChange={(e) => setAdjustQtyInput(e.target.value)}
                placeholder="e.g. +10 or -3"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {isAr ? 'سبب التسوية:' : 'Adjustment Reason:'}
              </label>
              <select
                value={adjustReasonInput}
                onChange={(e) => setAdjustReasonInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Stocktake Discrepancy">{isAr ? 'فروقات جرد دوري' : 'Stocktake Discrepancy'}</option>
                <option value="Damaged Goods">{isAr ? 'بضاعة تالفة / منتهية الصلاحية' : 'Damaged / Expired Goods'}</option>
                <option value="Supplier Purchase Intake">{isAr ? 'استلام مشتريات مورد' : 'Supplier Purchase Intake'}</option>
                <option value="Internal Store Consumption">{isAr ? 'استهلاك داخلي / ضيافة' : 'Internal Store Consumption'}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProductForAdjust(null)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'حفظ التسوية' : 'Commit Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateProductSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-white text-base">
              {isAr ? 'إضافة منتج جديد للكتالوج' : 'Create New Catalog Product'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'رمز الصنف (SKU):' : 'Product Code (SKU):'}
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. COF-SUM-01"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'الباركود الدولي:' : 'Barcode:'}
                </label>
                <input
                  type="text"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  placeholder="e.g. 628100..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'الاسم بالإنجليزية:' : 'English Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="e.g. Sumatra Roast 1kg"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'الاسم بالعربية:' : 'Arabic Name:'}
                </label>
                <input
                  type="text"
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="مثال: بن سومطرة فاخر 1 كغ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'التصنيف:' : 'Category:'}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Coffee Beans">Coffee Beans</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'سعر البيع:' : 'Selling Price:'} ({state.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'تكلفة الشراء:' : 'Cost Price:'} ({state.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'حفظ الصنف' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
