# APEXPOS ENTERPRISE — MASTER ARCHITECTURE & ENGINEERING SPECIFICATIONS
Version: 1.0.0-PROD • Target Platform: Desktop (Windows / macOS via Flutter & Drift/SQLite)
Document Status: Approved by Principal Software Architect & Engineering Review Board

---

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1.1 Executive Summary
ApexPOS Enterprise is an offline-first, high-performance retail and hospitality Point of Sale system engineered for zero-latency checkout, uncompromising financial integrity, and multi-terminal scalability. The system functions autonomously without internet connectivity using an embedded SQLite database engine with Drift ORM and Native FFI isolates, with built-in transactional outbox mechanics designed for seamless, event-driven synchronization to cloud and LAN peer terminals.

### 1.2 Target Personas & Core Journeys
1. **Cashier (Ahmad)**: Requires sub-second item lookup via laser barcode scanner, instant keyboard-driven cart manipulation, split payments under 5 seconds, and reliable offline operation during power or network outages.
2. **Store Manager (Sarah)**: Requires strict till accountability, shift X/Z reports with automated shortage/surplus calculation, approval for overrides/discounts, and inventory monitoring.
3. **Financial Controller / Accountant (Khaled)**: Demands double-entry general ledger tracking, zero floating-point arithmetic errors, immutable audit trails, and strict accounts receivable reconciliation.
4. **IT / Systems Engineer (Tariq)**: Requires local SQLite integrity verification, automated WAL checkpointing, reliable backup/restore, and deterministic LAN host/client coordination.

### 1.3 Key Quality Attributes
- **Zero-Latency Checkout**: Keyboard navigation and barcode entry response time < 16ms (60 FPS minimum, target 120 FPS).
- **Financial Invariant Guarantee**: Monetary values stored strictly as 64-bit integer minor currency units (cents/halalas). No floating-point data types.
- **Offline Autonomy**: 100% of core sales, returns, shift management, and inventory tracking executed locally.
- **Disaster Recovery**: Automatic SQLite crash recovery via Write-Ahead Logging (WAL) and atomic transactions.

---

## 2. COMPLETE FEATURES MATRIX

| Module | Core Capability | Offline Availability | Sync Mechanism | Conflict Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Sales & POS** | Cash, Card, Split, Customer Credit, Parked Tickets, Returns | 100% Local | Transactional Outbox (UUIDv7) | Deterministic (Append-only) |
| **Products & Catalog** | Simple, Variable (SKU/Barcode), Cost, Taxes, Categories | 100% Local | Inbound sync from Cloud/Host | Versioned Vector Clocks |
| **Cashier Shifts** | Open Float, Sales Accumulators, Cash In/Out, X/Z-Reports | 100% Local | Outbox event on shift close | Host Authoritative |
| **Customers & A/R** | Credit Limits, Ledger Statement, Payment Allocations | 100% Local | Outbox journal events | Journal Ledger Derivation |
| **Inventory & Stock** | Multi-Warehouse, Stock Movements, FIFO/Avg Costing | 100% Local | Outbox movement events | Sequence Cursors |
| **Purchasing & A/P** | Supplier Invoices, Goods Received Notes, Payables | 100% Local | Outbox purchase events | Double-entry journals |
| **Hardware HAL** | Thermal ESC/POS, Barcode OPOS, Cash Drawer, VFD Pole | 100% Local Native | Device Event Bus | N/A (Local hardware) |
| **Security & RBAC** | Argon2id Auth, Deny-by-default, Permission Matrix | 100% Local | Local policy cache | Host Policy |

---

## 3. DOMAIN ARCHITECTURE (CLEAN ARCHITECTURE)

```
+--------------------------------------------------------------------------+
|                            PRESENTATION LAYER                            |
|    Flutter Desktop / React UI • Windows Fluent / macOS Human Interface   |
|         State Management (Riverpod / BLoC) • Reactive ViewModels         |
+--------------------------------------------------------------------------+
                                     | (calls)
+--------------------------------------------------------------------------+
|                            APPLICATION LAYER                             |
|       Use Cases • Application Services • Commands • Query Handlers       |
|    CheckoutUseCase • CloseShiftUseCase • SettleCustomerDebtUseCase       |
+--------------------------------------------------------------------------+
                                     | (coordinates)
+--------------------------------------------------------------------------+
|                              DOMAIN LAYER                                |
|  Pure Business Entities • Value Objects (Money) • Financial Invariants  |
|     CartEngine • ShiftEngine • FinancialLedger • OutboxEngine            |
|       (Zero external framework dependencies, 100% unit-tested)           |
+--------------------------------------------------------------------------+
                                     | (implemented by)
+--------------------------------------------------------------------------+
|                          INFRASTRUCTURE LAYER                            |
|    Drift ORM • SQLite Native FFI • Background Isolate • WAL Mode         |
|      Hardware Abstraction Layer (ESC/POS, Serial Barcode, Cash Drawer)   |
|         Secure Storage (DPAPI on Windows, Keychain on macOS)             |
+--------------------------------------------------------------------------+
                                     | (connects to)
+--------------------------------------------------------------------------+
|                           INTEGRATION LAYER                              |
|     Local Host/Client LAN Engine • Transactional Outbox Worker           |
|        Cloud Sync Client (HTTPS/gRPC) • Event Serialization (JSON)       |
+--------------------------------------------------------------------------+
```

---

## 4. MODULE DEPENDENCY MAP

- `pos_domain` (Zero dependencies; pure Dart/TS logic)
  ^
  |--- `pos_application` (Depends on `pos_domain`)
        ^
        |--- `pos_presentation` (Depends on `pos_application`, `pos_domain`)
        |--- `pos_infrastructure` (Implements repository interfaces from `pos_domain`)
        |--- `pos_integration` (Implements sync contracts from `pos_domain`)

No circular dependencies are permitted. All database queries pass through Repository interfaces defined in the domain layer.

---

## 5. DATABASE SCHEMA & ERD (SQLITE / DRIFT SPECIFICATION)

### 5.1 SQLite Configuration Pragma
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000; -- 64MB cache
```

### 5.2 Drift / SQLite Schema Definition
```sql
-- 1. Branches & Terminals
CREATE TABLE branches (
    id TEXT PRIMARY KEY NOT NULL, -- UUIDv7
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    tax_number TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE terminals (
    id TEXT PRIMARY KEY NOT NULL, -- UUIDv7
    branch_id TEXT NOT NULL REFERENCES branches(id),
    terminal_code TEXT NOT NULL UNIQUE,
    is_host INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 2. Products & Inventory
CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    category TEXT NOT NULL,
    price_cents INTEGER NOT NULL, -- Integer minor unit
    cost_cents INTEGER NOT NULL,  -- Integer minor unit
    tax_rate_percent INTEGER NOT NULL DEFAULT 15,
    unit TEXT NOT NULL DEFAULT 'pcs',
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);

-- 3. Customers & Receivables
CREATE TABLE customers (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    phone TEXT NOT NULL,
    tax_number TEXT,
    credit_limit_cents INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 4. Cashier Shifts
CREATE TABLE cashier_shifts (
    id TEXT PRIMARY KEY NOT NULL,
    shift_number TEXT NOT NULL UNIQUE,
    terminal_id TEXT NOT NULL REFERENCES terminals(id),
    cashier_id TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    opened_at INTEGER NOT NULL,
    closed_at INTEGER,
    opening_float_cents INTEGER NOT NULL,
    cash_sales_cents INTEGER NOT NULL DEFAULT 0,
    card_sales_cents INTEGER NOT NULL DEFAULT 0,
    credit_sales_cents INTEGER NOT NULL DEFAULT 0,
    cash_in_cents INTEGER NOT NULL DEFAULT 0,
    cash_out_cents INTEGER NOT NULL DEFAULT 0,
    expected_cash_cents INTEGER NOT NULL,
    counted_cash_cents INTEGER,
    discrepancy_cents INTEGER,
    status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
    notes TEXT
);

-- 5. Orders (Sales Documents)
CREATE TABLE orders (
    id TEXT PRIMARY KEY NOT NULL, -- UUIDv7
    invoice_number TEXT NOT NULL UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    shift_id TEXT NOT NULL REFERENCES cashier_shifts(id),
    terminal_id TEXT NOT NULL REFERENCES terminals(id),
    customer_id TEXT REFERENCES customers(id),
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    change_given_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('completed', 'refunded', 'voided')),
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_orders_shift ON orders(shift_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 6. Order Line Items
CREATE TABLE order_items (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    product_id TEXT NOT NULL REFERENCES products(id),
    barcode TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    tax_rate_percent INTEGER NOT NULL,
    tax_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL
);

-- 7. Payment Splits
CREATE TABLE payment_splits (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'customer_credit', 'wallet', 'transfer')),
    amount_cents INTEGER NOT NULL,
    reference_number TEXT,
    created_at INTEGER NOT NULL
);

-- 8. General Ledger (Double-Entry Accounting)
CREATE TABLE general_ledger_entries (
    id TEXT PRIMARY KEY NOT NULL,
    entry_number TEXT NOT NULL UNIQUE,
    timestamp INTEGER NOT NULL,
    entry_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    description TEXT NOT NULL,
    debit_account TEXT NOT NULL,
    credit_account TEXT NOT NULL,
    amount_cents INTEGER NOT NULL
);
CREATE INDEX idx_gl_reference ON general_ledger_entries(reference_id);
CREATE INDEX idx_gl_debit_account ON general_ledger_entries(debit_account);
CREATE INDEX idx_gl_credit_account ON general_ledger_entries(credit_account);

-- 9. Transactional Outbox (Sync Engine)
CREATE TABLE transactional_outbox (
    id TEXT PRIMARY KEY NOT NULL, -- UUIDv7
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_flight', 'synced', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_outbox_pending ON transactional_outbox(status, created_at);
```

---

## 6. BUSINESS & FINANCIAL INVARIANTS

1. **Integer Minor Units Only**: No currency value may ever be stored or computed using IEEE 754 Floating Point numbers. All values are integer cents/halalas.
2. **Double-Entry Balance Rule**: In any accounting posting transaction, `SUM(Debits) == SUM(Credits)`. Any mismatch causes immediate transaction rollback.
3. **Immutable Posted Documents**: Once an order or journal entry is written to SQLite, it cannot be updated or deleted. Reversals must be executed via `REV-` correction documents.
4. **Derived Customer Debt**: Customer accounts receivable balance is never stored as an arbitrary mutable counter; it is calculated from the ledger: `Sum of Unpaid Invoices - Sum of Valid Receipts`.
5. **Atomic Shift Ledger**: An order cannot be registered without an active `open` shift.
6. **Cash Change Constraint**: Change given to a customer can NEVER exceed the cash tendered. Electronic and credit payments cannot yield cash change.
7. **Transactional Outbox Guarantee**: An order record and its corresponding outbox event MUST be committed in the exact same SQLite transaction.

---

## 7. ROLE-BASED ACCESS CONTROL (PERMISSIONS MATRIX)

| Capability / Action | Owner | Admin | Manager | Cashier | Accountant | Purchasing | Inventory | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Open Register / Sales | YES | YES | YES | YES | NO | NO | NO | NO |
| Apply Item Discount | YES | YES | YES | UP TO 5% | NO | NO | NO | NO |
| Void Active Cart | YES | YES | YES | PIN Req | NO | NO | NO | NO |
| Issue Return / Refund | YES | YES | YES | PIN Req | NO | NO | NO | NO |
| Open / Close Shift | YES | YES | YES | YES (Own) | NO | NO | NO | NO |
| View Financial X-Report | YES | YES | YES | YES | YES | NO | NO | READ |
| View Financial Z-Report | YES | YES | YES | NO | YES | NO | NO | READ |
| Manual Price Override | YES | YES | YES | NO | NO | NO | NO | NO |
| Settle Customer Debt | YES | YES | YES | NO | YES | NO | NO | NO |
| Adjust Stock Quantities | YES | YES | YES | NO | NO | NO | YES | NO |
| Manage System Users | YES | YES | NO | NO | NO | NO | NO | NO |

---

## 8. UI/UX DESIGN SYSTEM SPECIFICATIONS

- **Grid & Layout**: 12-column responsive layout optimized for 1920x1080 and 1366x768 POS touch displays.
- **Color Tokens**:
  - Surface Background: Dark Slate (`#0B0F19`)
  - Elevated Surface: Deep Navy Card (`#111827`)
  - Accent Primary: Emerald Tech (`#10B981`)
  - Warning / Alert: Amber Gold (`#F59E0B`)
  - Danger / Void: Crimson Rose (`#EF4444`)
  - Typography: Neutral White (`#F9FAFB`) & Muted Slate (`#94A3B8`)
- **Typography**:
  - English: `Plus Jakarta Sans`, 400/500/600/700
  - Arabic: `Cairo`, 400/600/700
  - Numbers & Monetary Units: `JetBrains Mono` for tabular alignment
- **Keyboard Shortcuts**:
  - `F1`: Switch to POS Register
  - `F2`: Cashier Shifts & Till
  - `F3`: Products & Inventory
  - `F4`: Park / Hold Current Ticket
  - `F5`: Transaction Outbox & Sync
  - `F6`: Hardware HAL Simulator
  - `F7`: Pop Cash Drawer
  - `F8`: Reprint Last Receipt
  - `F9`: Void Current Cart
  - `F10`: Master Architecture Docs
  - `F12` / `Enter`: Pay & Finalize Ticket
  - `Esc`: Dismiss Modal / Clear Search

---

## 9. USER FLOWS & SCREEN SPECIFICATIONS

### Flow A: High-Speed Cash Checkout
1. Cashier scans barcode `6281001234567` or presses quick item tile.
2. Product is appended to cart in < 16ms with default unit price and 15% VAT.
3. Cashier taps `Space` or clicks `Pay`.
4. Payment modal opens with focus on quick tender buttons ($10, $20, $50, Exact).
5. Cashier presses Enter or selects Exact Cash.
6. Local SQLite transaction commits:
   - Writes `orders` row.
   - Writes `order_items` rows.
   - Writes `payment_splits` row.
   - Writes `general_ledger_entries` rows.
   - Writes `transactional_outbox` event.
   - Updates `cashier_shifts` sales accumulator.
   - Decrements stock in `products`.
7. Drawer kick pulse dispatched to thermal printer via ESC/POS command `\x1B\x70\x00\x19\xFA`.
8. Thermal receipt prints; UI returns to blank cart ready for next scan.

---

## 10. OFFLINE-FIRST ARCHITECTURE

ApexPOS operates completely decoupled from internet availability:
- **Local-First Source of Truth**: The local embedded SQLite file is authoritative for all business transactions executed on that terminal.
- **Background Isolate Persistence**: All database disk reads and writes execute inside a dedicated Dart / Native background thread, preventing UI jank or frame drops.
- **WAL Checkpoint Policy**: Checkpoints are scheduled periodically (`PRAGMA wal_checkpoint(PASSIVE)`) and upon shift closure (`PRAGMA wal_checkpoint(TRUNCATE)`).

---

## 11. FUTURE CLOUD SYNC ARCHITECTURE

- **Time-Ordered UUIDv7**: Prevents primary key collisions across distributed stores and maintains index locality.
- **Idempotency Keys**: Every client transaction includes a cryptographically unique `idempotency_key` (`idemp-<aggregate>-<id>-<hash>`). The server rejects or deduplicates any repeated submission.
- **Sync Cursors**: The local client tracks `last_synced_outbox_timestamp` and `last_received_inbox_sequence`.
- **Append-Only Event Stream**: Sync sends event deltas rather than whole database dumps, drastically reducing network payload to < 2KB per transaction.

---

## 12. LOCAL HOST / CLIENT ARCHITECTURE PLAN (LAN MULTI-TERMINAL)

- **Dedicated Host Terminal**: One primary machine in the physical store acts as the SQLite database master and embedded HTTP/WebSocket server.
- **Client Terminals**: Secondary lane terminals connect to the Host over the local subnet (e.g. `http://192.168.1.50:8443/api/v1`).
- **No Shared Network Drive**: Accessing SQLite over SMB / NFS is strictly prohibited to prevent database corruption. All client operations pass through Host API transactions.
- **Failover / Degraded Mode**: If Host becomes unreachable, client registers alert the cashier and switch to Emergency Standalone Buffer mode with dedicated outbox queues.

---

## 13. PERFORMANCE & TESTING STRATEGY

### Performance Benchmarks
- Cart Item Scan Latency: <= 12ms
- Split Payment Atomic Commit: <= 25ms
- 10,000 Product Search Query: <= 15ms (Indexed SQLite FTS5)
- SQLite Cold Boot: <= 450ms

### Quality Assurance Matrix
- **Unit Tests**: Pure domain logic, money value object, financial ledger invariants, shift calculators (`node:test` / `flutter_test`).
- **Integration Tests**: SQLite transaction rollback resilience, foreign key constraints, migration smoke tests.
- **Stress & Longevity Tests**: 100,000 mock transactions simulating peak Black Friday load without memory leaks.

---

## 14. IMPLEMENTATION ROADMAP

- **Phase 0 (Foundation - Current)**: Clean Architecture setup, Money Value Object, SQLite/Drift schema contracts, Double-entry financial invariants, Cashier Shift Engine, Transactional Outbox Engine, Comprehensive Architectural Hub.
- **Phase 1 (Operational POS)**: Product catalog, barcode scanner HAL, responsive desktop checkout, thermal receipt formatting, cash drawer hardware triggers, X/Z reports.
- **Phase 2 (Commercial Operations)**: Supplier purchasing, multi-warehouse transfers, customer credit debt settlement, return authorizations.
- **Phase 3 (Advanced Management)**: Delivery & COD tracking, financial corrections, inventory valuation (FIFO), advanced analytics.
- **Phase 4 (Scale & Cloud)**: Multi-terminal LAN host broadcast, cloud sync worker, multi-tenant Filament admin dashboard.
