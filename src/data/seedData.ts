/**
 * ApexPOS Enterprise - Initial Deterministic Seed Data
 * Contains retail catalog, customers, users, and default warehouse stock.
 */

import { Product, Customer, UserSession, Shift } from '../domain/types.ts';

export const INITIAL_USERS: UserSession[] = [
  {
    id: 'usr-1',
    username: 'ahmad.cashier',
    fullName: 'Ahmad Al-Rashid',
    role: 'cashier',
    branchId: 'br-main-01',
    terminalId: 'POS-01',
    token: 'tok-cashier-001',
  },
  {
    id: 'usr-2',
    username: 'sarah.manager',
    fullName: 'Sarah Al-Mansoor',
    role: 'manager',
    branchId: 'br-main-01',
    terminalId: 'POS-01',
    token: 'tok-manager-002',
  },
  {
    id: 'usr-3',
    username: 'khalid.owner',
    fullName: 'Eng. Khalid Al-Otaibi',
    role: 'owner',
    branchId: 'br-main-01',
    terminalId: 'POS-01',
    token: 'tok-owner-003',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    code: 'COF-ESP-01',
    nameEn: 'Ethiopian Yirgacheffe Beans 1kg',
    nameAr: 'حبوب بن إثيوبي ييرغاتشيفي 1 كغ',
    category: 'Coffee Beans',
    brand: 'Artisan Roast',
    barcode: '6281001234567',
    unit: 'bag',
    priceCents: 12000, // 120.00 SAR
    costCents: 7500,   // 75.00 SAR
    taxRatePercent: 15,
    currentStock: 48,
    minStockAlert: 10,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-002',
    code: 'COF-COL-02',
    nameEn: 'Colombian Supremo Roast 500g',
    nameAr: 'بن كولومبي سوبريمو 500 غرام',
    category: 'Coffee Beans',
    brand: 'Andes Reserve',
    barcode: '6281001234574',
    unit: 'bag',
    priceCents: 6500, // 65.00 SAR
    costCents: 3800,  // 38.00 SAR
    taxRatePercent: 15,
    currentStock: 35,
    minStockAlert: 8,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1559525839-8f8ec320b99f?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-003',
    code: 'BEV-MAT-01',
    nameEn: 'Ceremonial Grade Matcha Latte',
    nameAr: 'ماتشا لاتيه عضوي فاخر',
    category: 'Beverages',
    barcode: '6281009876543',
    unit: 'cup',
    priceCents: 2800, // 28.00 SAR
    costCents: 1100,
    taxRatePercent: 15,
    currentStock: 120,
    minStockAlert: 20,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-004',
    code: 'BEV-CAP-02',
    nameEn: 'Signature Spanish Latte',
    nameAr: 'سبانش لاتيه مميز',
    category: 'Beverages',
    barcode: '6281005544332',
    unit: 'cup',
    priceCents: 2400, // 24.00 SAR
    costCents: 850,
    taxRatePercent: 15,
    currentStock: 150,
    minStockAlert: 25,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-005',
    code: 'BAK-CRO-01',
    nameEn: 'Butter French Croissant',
    nameAr: 'كرواسون فرنسي بالزبدة',
    category: 'Bakery',
    barcode: '6281003322110',
    unit: 'pcs',
    priceCents: 1400, // 14.00 SAR
    costCents: 450,
    taxRatePercent: 15,
    currentStock: 24,
    minStockAlert: 5,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-006',
    code: 'BAK-PIS-02',
    nameEn: 'Pistachio Cruffin Supreme',
    nameAr: 'كرافن محشي فستق حلبي',
    category: 'Bakery',
    barcode: '6281007788991',
    unit: 'pcs',
    priceCents: 2200, // 22.00 SAR
    costCents: 800,
    taxRatePercent: 15,
    currentStock: 16,
    minStockAlert: 4,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-007',
    code: 'EQP-V60-01',
    nameEn: 'Hario V60 Ceramic Dripper 02',
    nameAr: 'قمع ترشيح هاريو V60 سيراميك',
    category: 'Equipment',
    barcode: '6281001122334',
    unit: 'pcs',
    priceCents: 11500, // 115.00 SAR
    costCents: 6800,
    taxRatePercent: 15,
    currentStock: 12,
    minStockAlert: 2,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'prod-008',
    code: 'EQP-SCA-02',
    nameEn: 'Timemore Black Mirror Scale',
    nameAr: 'ميزان ذكي تايمور للمشروبات',
    category: 'Equipment',
    barcode: '6281009988776',
    unit: 'pcs',
    priceCents: 24000, // 240.00 SAR
    costCents: 16000,
    taxRatePercent: 15,
    currentStock: 8,
    minStockAlert: 2,
    isVariable: false,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300&auto=format&fit=crop&q=60',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-01',
    code: 'CUST-001',
    nameEn: 'Al-Noor Café & Roastery',
    nameAr: 'مقهى ومحمصة النور',
    phone: '+966 50 123 4567',
    taxNumber: '310123456700003',
    creditLimitCents: 150000, // 1,500.00 SAR credit limit
    currentBalanceCents: 45000, // 450.00 SAR owed
    loyaltyPoints: 340,
  },
  {
    id: 'cust-02',
    code: 'CUST-002',
    nameEn: 'Dr. Tariq Al-Hashimi',
    nameAr: 'د. طارق الهاشمي',
    phone: '+966 55 987 6543',
    creditLimitCents: 50000, // 500.00 SAR limit
    currentBalanceCents: 0,
    loyaltyPoints: 120,
  },
  {
    id: 'cust-03',
    code: 'CUST-003',
    nameEn: 'Skyline Creative Studio',
    nameAr: 'استوديو سكايلين الإبداعي',
    phone: '+966 54 321 8899',
    taxNumber: '310987654300003',
    creditLimitCents: 300000, // 3,000.00 SAR limit
    currentBalanceCents: 18000, // 180.00 SAR owed
    loyaltyPoints: 620,
  },
];

export const INITIAL_SHIFT: Shift = {
  id: 'shift-live-01',
  shiftNumber: 'SH-2026-0042',
  cashierId: 'usr-1',
  cashierName: 'Ahmad Al-Rashid',
  terminalId: 'POS-01',
  openedAt: Date.now() - 3600000 * 3, // 3 hours ago
  openingFloatCents: 50000, // 500.00 SAR opening float
  cashSalesCents: 68000,    // 680.00 SAR cash sales
  cardSalesCents: 145000,   // 1,450.00 SAR card sales
  creditSalesCents: 24000,  // 240.00 SAR customer debt
  walletSalesCents: 32000,  // 320.00 SAR ApplePay
  cashInCents: 0,
  cashOutCents: 0,
  cashRefundsCents: 0,
  expectedCashCents: 118000, // 500 + 680 = 1,180.00 SAR
  status: 'open',
};
