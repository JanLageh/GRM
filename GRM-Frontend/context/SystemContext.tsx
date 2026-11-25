import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  grmApi,
  setApiToken,
  getApiToken,
  API_BASE_URL,
  ApiQuotationDto,
  ApiUserDto,
} from '../services/grmApi';

/* ============================== TYPES ============================== */
export type Role = 'Guest' | 'Customer' | 'Staff' | 'Admin';
export type Category = 'Smart Locks' | 'Solar Panels' | 'Batteries' | 'Solar Bundles';
export type Payment = 'Cash on Delivery' | 'Manual Bank Transfer' | 'Cash (Walk-in)';
export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
export type InvoiceStatus = 'Unpaid' | 'Paid' | 'Voided';
export type POStatus = 'Draft' | 'Approved' | 'Sent' | 'Received';
export type MoveType = 'Sale' | 'Stock-In' | 'Stock-Out' | 'Adjustment' | 'Receiving' | 'Cancel-Restock';

export interface User {
  id: string;
  backendId?: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: Exclude<Role, 'Guest'>;
  active: boolean;
}
export interface Product {
  id: string;
  backendId?: number;
  name: string;
  category: Exclude<Category, 'Solar Bundles'>;
  description: string;
  active: boolean;
}
export interface Variant {
  id: string;
  backendId?: number;
  productId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  dailySales: number[];
  active: boolean;
}
export interface BundleComponent {
  variantId: string;
  qty: number;
}
export interface Bundle {
  id: string;
  backendId?: number;
  name: string;
  sku: string;
  description: string;
  price: number;
  active: boolean;
  components: BundleComponent[];
}
export interface CartItem {
  kind: 'variant' | 'bundle';
  refId: string;
  qty: number;
}
export interface LineItem extends CartItem {
  name: string;
  sku: string;
  unitPrice: number;
}
export interface Quotation {
  id: string;
  backendId?: number;
  customerId: string | null;
  customerName: string;
  lines: LineItem[];
  discountPercent: number;
  status: 'Requested' | 'Quoted' | 'Accepted' | 'Declined';
  validUntil: string | null;
  note: string;
  createdAt: string;
  preparedBy: string | null;
  orderId: string | null;
}
export interface Order {
  id: string;
  backendId?: number;
  customerId: string | null;
  customerName: string;
  channel: 'Online' | 'WalkIn';
  lines: LineItem[];
  discountPercent: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  payment: Payment;
  address: string;
  createdAt: string;
  quotationId: string | null;
  invoiceId: string | null;
}
export interface Invoice {
  id: string;
  backendId?: number;
  orderId: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
  voidReason: string | null;
  payment: Payment;
}
export interface Movement {
  id: string;
  variantId: string;
  type: MoveType;
  qty: number;
  reason: string;
  ref: string;
  by: string;
  at: string;
}
export interface Supplier {
  id: string;
  backendId?: number;
  name: string;
  contact: string;
  phone: string;
}
export interface Requisition {
  id: string;
  backendId?: number;
  variantId: string;
  qty: number;
  reason: string;
  requestedBy: string;
  status: 'Pending' | 'Approved' | 'Declined';
  poId: string | null;
  createdAt: string;
}
export interface POLine {
  variantId: string;
  qty: number;
  received: number;
}
export interface PurchaseOrder {
  id: string;
  supplierId: string | null;
  lines: POLine[];
  status: POStatus;
  source: 'System' | 'Requisition' | 'Admin';
  note: string;
  createdAt: string;
}
export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  at: string;
}
export interface DB {
  v: number;
  seq: number;
  session: { userId: string | null; token: string | null };
  users: User[];
  products: Product[];
  variants: Variant[];
  bundles: Bundle[];
  carts: Record<string, CartItem[]>;
  quotations: Quotation[];
  orders: Order[];
  invoices: Invoice[];
  movements: Movement[];
  suppliers: Supplier[];
  requisitions: Requisition[];
  pos: PurchaseOrder[];
  inquiries: Inquiry[];
  settings: { maxStaffDiscountPercent: number };
}
export type Res<T = any> = { ok: true; data: T } | { ok: false; error: string };

export interface Listing {
  kind: 'variant' | 'bundle';
  id: string;
  name: string;
  sub: string;
  sku: string;
  price: number;
  stock: number;
  low: boolean;
  category: Category;
  desc: string;
}

/* ============================== HELPERS ============================== */
export const peso = (n: number) =>
  '₱' +
  (Math.round(n * 100) / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
export const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : '—';
export const fmtDT = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : '—';
const LEAD_DAYS = 7;
const SAFETY = 2;
export const velocityOf = (v: Variant) =>
  v.dailySales.reduce((a, b) => a + b, 0) / v.dailySales.length;
export const thresholdOf = (v: Variant) =>
  Math.ceil(velocityOf(v) * LEAD_DAYS) + SAFETY;
export const isLow = (v: Variant) => v.stock <= thresholdOf(v);
const nowISO = () => new Date().toISOString();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const nid = (d: DB, p: string) => `${p}-${1000 + ++d.seq}`;
const b64 = (s: string) => (typeof btoa !== 'undefined' ? btoa(s) : s);

export const variantLabel = (d: DB, v: Variant) =>
  `${d.products.find((p) => p.id === v.productId)?.name ?? '?'} — ${v.name}`;
export const bundleAvailable = (d: DB, b: Bundle) =>
  b.components.length === 0
    ? 0
    : Math.min(
      ...b.components.map((c) =>
        Math.floor(
          (d.variants.find((v) => v.id === c.variantId)?.stock ?? 0) / c.qty
        )
      )
    );
export const isExpired = (q: Quotation) =>
  q.status === 'Quoted' &&
  !!q.validUntil &&
  new Date(q.validUntil).getTime() < Date.now();
export const totals = (
  lines: { unitPrice: number; qty: number }[],
  pct: number
) => {
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const discount = (subtotal * pct) / 100;
  return { subtotal, discount, total: subtotal - discount };
};

export function buildListings(d: DB, includeInactive = false): Listing[] {
  const out: Listing[] = [];
  for (const v of d.variants) {
    const p = d.products.find((x) => x.id === v.productId);
    if (!p || (!includeInactive && !(v.active && p.active))) continue;
    out.push({
      kind: 'variant',
      id: v.id,
      name: p.name,
      sub: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      low: isLow(v),
      category: p.category,
      desc: p.description,
    });
  }
  for (const b of d.bundles) {
    if (!includeInactive && !b.active) continue;
    const a = bundleAvailable(d, b);
    out.push({
      kind: 'bundle',
      id: b.id,
      name: b.name,
      sub: 'Composite Solar Kit',
      sku: b.sku,
      price: b.price,
      stock: a,
      low: a <= 2,
      category: 'Solar Bundles',
      desc: b.description,
    });
  }
  return out;
}

/* ============================== SEED ============================== */
function seed(): DB {
  const d: DB = {
    v: 1,
    seq: 20,
    session: { userId: null, token: null },
    users: [],
    products: [
      {
        id: 'P-1',
        backendId: 1,
        name: 'Garry SmartLock',
        category: 'Smart Locks',
        description: 'Keyless smart door lock with app-free access control.',
        active: true,
      },
      {
        id: 'P-2',
        backendId: 2,
        name: 'Monocrystalline Solar Panel Set',
        category: 'Solar Panels',
        description: 'High-efficiency mono PERC solar panel sets.',
        active: true,
      },
      {
        id: 'P-3',
        backendId: 3,
        name: 'LiFePO4 Solar Battery',
        category: 'Batteries',
        description: 'Wall-mount lithium iron phosphate storage battery.',
        active: true,
      },
    ],
    variants: [
      { id: 'V-1', backendId: 1, productId: 'P-1', name: 'PIN Keypad', sku: 'SL-PIN-01', price: 5990, stock: 24, dailySales: [2, 1, 3, 2, 1, 2, 2], active: true },
      { id: 'V-2', backendId: 2, productId: 'P-1', name: 'Biometric', sku: 'SL-BIO-01', price: 9490, stock: 12, dailySales: [1, 1, 0, 1, 1, 1, 1], active: true },
      { id: 'V-3', backendId: 3, productId: 'P-1', name: 'Card + PIN', sku: 'SL-CRD-01', price: 7250, stock: 9, dailySales: [0, 0, 0, 0, 0, 0, 0], active: true },
      { id: 'V-4', backendId: 4, productId: 'P-2', name: 'Small (2 kW)', sku: 'SP-S-02', price: 18500, stock: 15, dailySales: [1, 0, 1, 1, 0, 1, 1], active: true },
      { id: 'V-5', backendId: 5, productId: 'P-2', name: 'Medium (4 kW)', sku: 'SP-M-04', price: 34900, stock: 10, dailySales: [1, 1, 0, 1, 1, 0, 1], active: true },
      { id: 'V-6', backendId: 6, productId: 'P-2', name: 'Large (7 kW)', sku: 'SP-L-07', price: 62000, stock: 6, dailySales: [0, 1, 0, 0, 1, 0, 1], active: true },
      { id: 'V-7', backendId: 7, productId: 'P-3', name: '5 kWh', sku: 'BT-05', price: 48000, stock: 8, dailySales: [1, 0, 1, 0, 1, 0, 1], active: true },
      { id: 'V-8', backendId: 8, productId: 'P-3', name: '10 kWh', sku: 'BT-10', price: 89000, stock: 5, dailySales: [0, 1, 0, 1, 0, 0, 1], active: true },
    ],
    bundles: [
      { id: 'B-1', backendId: 1, name: 'Small Solar + Battery Kit', sku: 'BND-SMALL', description: '2 kW panel set with a 5 kWh battery.', price: 62000, active: true, components: [{ variantId: 'V-4', qty: 1 }, { variantId: 'V-7', qty: 1 }] },
      { id: 'B-2', backendId: 2, name: 'Medium Solar + Battery Kit', sku: 'BND-MEDIUM', description: '4 kW panel set with a 10 kWh battery.', price: 119000, active: true, components: [{ variantId: 'V-5', qty: 1 }, { variantId: 'V-8', qty: 1 }] },
      { id: 'B-3', backendId: 3, name: 'Large Solar + Battery Kit', sku: 'BND-LARGE', description: '7 kW panel set with two 10 kWh batteries.', price: 225000, active: true, components: [{ variantId: 'V-6', qty: 1 }, { variantId: 'V-8', qty: 2 }] },
    ],
    carts: { guest: [] },
    quotations: [],
    orders: [],
    invoices: [],
    movements: [],
    suppliers: [
      { id: 'S-1', name: 'SunBridge Solar Supply (Cebu)', contact: 'Ramon Uy', phone: '032 255 0101' },
      { id: 'S-2', name: 'SecureHome Distributors', contact: 'Ana Reyes', phone: '032 255 0202' },
    ],
    requisitions: [],
    pos: [],
    inquiries: [],
    settings: { maxStaffDiscountPercent: 10 },
  };
  const hist = new Date(Date.now() - 3 * 86400000).toISOString();
  d.orders.push({
    id: 'ORD-1001',
    customerId: 'U-3',
    customerName: 'Maria Santos',
    channel: 'Online',
    discountPercent: 0,
    subtotal: 11980,
    total: 11980,
    status: 'Completed',
    payment: 'Cash on Delivery',
    address: 'Pajo, Lapu-Lapu City',
    createdAt: hist,
    quotationId: null,
    invoiceId: 'INV-1001',
    lines: [
      {
        kind: 'variant',
        refId: 'V-1',
        name: 'Garry SmartLock — PIN Keypad',
        sku: 'SL-PIN-01',
        unitPrice: 5990,
        qty: 2,
      },
    ],
  });
  d.invoices.push({
    id: 'INV-1001',
    orderId: 'ORD-1001',
    amount: 11980,
    status: 'Paid',
    issuedAt: hist,
    paidAt: hist,
    voidReason: null,
    payment: 'Cash on Delivery',
  });
  d.movements.push({
    id: 'MV-1001',
    variantId: 'V-1',
    type: 'Sale',
    qty: -2,
    reason: 'Sale ORD-1001',
    ref: 'ORD-1001',
    by: 'System',
    at: hist,
  });
  syncDrafts(d);
  return d;
}

/* ============================== DOMAIN RULES ============================== */
function suggestedQty(v: Variant) {
  return Math.max(Math.ceil(velocityOf(v) * 21) + SAFETY - v.stock, 5);
}
function syncDrafts(d: DB) {
  for (const v of d.variants) {
    if (!v.active || !isLow(v)) continue;
    const open = d.pos.some(
      (p) =>
        p.status !== 'Received' &&
        p.lines.some((l) => l.variantId === v.id && l.received < l.qty)
    );
    if (open) continue;
    d.pos.push({
      id: nid(d, 'PO'),
      supplierId: d.suppliers[0]?.id ?? null,
      status: 'Draft',
      source: 'System',
      createdAt: nowISO(),
      note: `Auto-generated: ${v.sku} stock ${v.stock} ≤ reorder threshold ${thresholdOf(v)} (velocity ${velocityOf(v).toFixed(2)}/day)`,
      lines: [{ variantId: v.id, qty: suggestedQty(v), received: 0 }],
    });
  }
}
const cur = (d: DB) => d.users.find((u) => u.id === d.session.userId) || null;
const roleOf = (d: DB): Role => cur(d)?.role ?? 'Guest';
const need = (d: DB, ...r: Role[]) => {
  if (!r.includes(roleOf(d)))
    throw new Error(`403 Forbidden — requires ${r.join(' / ')} role`);
};
const who = (d: DB) => cur(d)?.name ?? 'System';
const assertDiscount = (d: DB, pct: number) => {
  if (!(pct >= 0 && pct <= 100))
    throw new Error('Discount must be between 0% and 100%');
  if (roleOf(d) === 'Staff' && pct > d.settings.maxStaffDiscountPercent)
    throw new Error(
      `Discount ${pct}% exceeds the Admin limit of ${d.settings.maxStaffDiscountPercent}% for Staff`
    );
};
function toLines(d: DB, items: CartItem[]): LineItem[] {
  if (!items.length) throw new Error('No items selected');
  return items.map((i) => {
    if (i.qty < 1) throw new Error('Quantity must be at least 1');
    if (i.kind === 'variant') {
      const v = d.variants.find((x) => x.id === i.refId);
      if (!v || !v.active) throw new Error('Item is unavailable');
      return { ...i, name: variantLabel(d, v), sku: v.sku, unitPrice: v.price };
    }
    const b = d.bundles.find((x) => x.id === i.refId);
    if (!b || !b.active) throw new Error('Bundle is unavailable');
    return { ...i, name: b.name, sku: b.sku, unitPrice: b.price };
  });
}
function expand(d: DB, items: CartItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) {
    if (i.kind === 'variant')
      m.set(i.refId, (m.get(i.refId) ?? 0) + i.qty);
    else
      for (const c of d.bundles.find((b) => b.id === i.refId)?.components ?? [])
        m.set(c.variantId, (m.get(c.variantId) ?? 0) + c.qty * i.qty);
  }
  return m;
}
function deduct(d: DB, items: CartItem[], ref: string) {
  const m = expand(d, items);
  for (const [id, q] of m) {
    const v = d.variants.find((x) => x.id === id);
    if (!v || v.stock < q)
      throw new Error(
        `Insufficient stock for ${v?.sku ?? id}: ${v?.stock ?? 0} available, ${q} needed`
      );
  }
  for (const [id, q] of m) {
    const v = d.variants.find((x) => x.id === id)!;
    v.stock -= q;
    v.dailySales[v.dailySales.length - 1] += q;
    d.movements.push({
      id: nid(d, 'MV'),
      variantId: id,
      type: 'Sale',
      qty: -q,
      reason: `Sale ${ref}`,
      ref,
      by: who(d),
      at: nowISO(),
    });
  }
}
function restock(d: DB, items: CartItem[], ref: string) {
  for (const [id, q] of expand(d, items)) {
    const v = d.variants.find((x) => x.id === id);
    if (!v) continue;
    v.stock += q;
    const last = v.dailySales.length - 1;
    v.dailySales[last] = Math.max(0, v.dailySales[last] - q);
    d.movements.push({
      id: nid(d, 'MV'),
      variantId: id,
      type: 'Cancel-Restock',
      qty: q,
      reason: `Cancelled ${ref}`,
      ref,
      by: who(d),
      at: nowISO(),
    });
  }
}
function createOrder(
  d: DB,
  o: {
    customerId: string | null;
    customerName: string;
    channel: 'Online' | 'WalkIn';
    lines: LineItem[];
    discountPercent: number;
    payment: Payment;
    address: string;
    status: OrderStatus;
    quotationId?: string | null;
  }
): Order {
  const id = nid(d, 'ORD');
  deduct(d, o.lines, id);
  const t = totals(o.lines, o.discountPercent);
  const order: Order = {
    id,
    customerId: o.customerId,
    customerName: o.customerName,
    channel: o.channel,
    lines: o.lines,
    discountPercent: o.discountPercent,
    subtotal: t.subtotal,
    total: t.total,
    status: o.status,
    payment: o.payment,
    address: o.address,
    createdAt: nowISO(),
    quotationId: o.quotationId ?? null,
    invoiceId: null,
  };
  d.orders.push(order);
  return order;
}
function makeInvoice(d: DB, order: Order, paid: boolean): Invoice {
  const inv: Invoice = {
    id: nid(d, 'INV'),
    orderId: order.id,
    amount: order.total,
    status: paid ? 'Paid' : 'Unpaid',
    issuedAt: nowISO(),
    paidAt: paid ? nowISO() : null,
    voidReason: null,
    payment: order.payment,
  };
  d.invoices.push(inv);
  order.invoiceId = inv.id;
  return inv;
}
const cartKey = (d: DB) => d.session.userId ?? 'guest';
function makeSession(d: DB, u: User, jwtToken?: string) {
  d.session = {
    userId: u.id,
    token:
      jwtToken ||
      `eyJhbGciOiJIUzI1NiJ9.${b64(
        JSON.stringify({ sub: u.id, role: u.role, exp: Date.now() + 8 * 3600e3 })
      )}.mock-signature`,
  };
  const g = d.carts.guest ?? [];
  const mine = d.carts[u.id] ?? [];
  for (const it of g) {
    const ex = mine.find((m) => m.kind === it.kind && m.refId === it.refId);
    if (ex) ex.qty += it.qty;
    else mine.push({ ...it });
  }
  d.carts[u.id] = mine;
  d.carts.guest = [];
}

/* ============================== CONTEXT ============================== */
const KEY = 'garry-sis-db-v1';
function load(): DB {
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(KEY);
      if (s) {
        const d = JSON.parse(s) as DB;
        if (d.v === 1) return d;
      }
    }
  } catch { }
  return seed();
}

type Notice = { msg: string; tone: 'ok' | 'err' } | null;
export interface Ctx {
  db: DB;
  user: User | null;
  role: Role;
  cart: CartItem[];
  listings: Listing[];
  notice: Notice;
  apiOnline: boolean;
  apiBaseUrl: string;
  syncWithBackend: () => Promise<boolean>;
  flash: (msg: string, tone?: 'ok' | 'err') => void;
  login: (email: string, pw: string) => Promise<Res<User>>;
  register: (p: { name: string; email: string; password: string; phone: string }) => Promise<Res<User>>;
  logout: () => void;
  // switchRole: (r: Role) => void;
  updateProfile: (p: { name: string; phone: string; address: string }) => Res;
  changePassword: (cur: string, next: string) => Res;
  addToCart: (kind: 'variant' | 'bundle', refId: string, qty?: number) => Res;
  setCartQty: (kind: string, refId: string, qty: number) => void;
  clearCart: () => void;
  requestQuotation: (note: string) => Res;
  checkout: (payment: Payment, address: string) => Res<Order>;
  acceptQuotation: (id: string, payment: Payment) => Res<Order>;
  declineQuotation: (id: string) => Res;
  saveQuotation: (p: {
    id?: string;
    customerId?: string | null;
    customerName?: string;
    items?: CartItem[];
    discountPercent: number;
    validDays: number;
    note: string;
  }) => Res<Quotation>;
  walkInSale: (p: {
    customerName: string;
    items: CartItem[];
    discountPercent: number;
    payment: Payment;
    paid: boolean;
  }) => Res<{ orderId: string; invoiceId: string }>;
  advanceOrder: (id: string) => Res;
  cancelOrder: (id: string) => Res;
  generateInvoice: (orderId: string) => Res<Invoice>;
  markPaid: (id: string) => Res;
  voidInvoice: (id: string, reason: string) => Res;
  logStock: (p: {
    variantId: string;
    type: 'Stock-In' | 'Stock-Out';
    qty: number;
    reason: string;
  }) => Res;
  adjustStock: (p: { variantId: string; newCount: number; reason: string }) => Res;
  createRequisition: (p: { variantId: string; qty: number; reason: string }) => Res;
  decideRequisition: (id: string, approve: boolean, supplierId?: string) => Res;
  updatePO: (id: string, p: { supplierId?: string | null; lines?: POLine[] }) => Res;
  setPOStatus: (id: string, to: 'Approved' | 'Sent') => Res;
  discardPO: (id: string) => Res;
  receivePO: (id: string, received: Record<number, number>) => Res;
  saveProduct: (p: Partial<Product> & { name: string; category: Product['category'] }) => Res;
  saveVariant: (
    p: Partial<Variant> & {
      productId: string;
      name: string;
      sku: string;
      price: number;
    }
  ) => Res;
  saveBundle: (
    p: Partial<Bundle> & {
      name: string;
      sku: string;
      price: number;
      components: BundleComponent[];
    }
  ) => Res;
  setMaxDiscount: (pct: number) => Res;
  saveSupplier: (p: Partial<Supplier> & { name: string }) => Res;
  saveUser: (p: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: 'Staff' | 'Customer';
    phone?: string;
  }) => Res;
  toggleUser: (id: string) => Res;
  submitInquiry: (p: { name: string; email: string; message: string }) => Res;
  resetDemo: () => void;
}

const SystemCtx = createContext<Ctx | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const ref = useRef<DB>(db);
  const [notice, setNotice] = useState<Notice>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const timer = useRef<any>(null);

  const flash = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setNotice({ msg, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 4500);
  }, []);

  const commit = useCallback((d: DB) => {
    ref.current = d;
    setDb(d);
    try {
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(KEY, JSON.stringify(d));
    } catch { }
  }, []);

  const tx = <T,>(fn: (d: DB) => T): Res<T> => {
    try {
      const d = clone(ref.current);
      const data = fn(d);
      syncDrafts(d);
      commit(d);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message ?? String(e) };
    }
  };

  const upsertUserFromApi = (d: DB, apiUser: ApiUserDto & { isActive?: boolean }): User => {
    const validRole: Exclude<Role, 'Guest'> =
      apiUser.role === 'Admin' || apiUser.role === 'Staff' || apiUser.role === 'Customer'
        ? apiUser.role
        : 'Customer';
    let existing = d.users.find(
      (u) => u.backendId === apiUser.id || u.email.toLowerCase() === apiUser.email.toLowerCase()
    );
    if (!existing) {
      existing = {
        id: `U-${apiUser.id}`,
        backendId: apiUser.id,
        name: apiUser.fullName || apiUser.username,
        email: apiUser.email,
        password: '',
        phone: apiUser.phoneNumber ?? '',
        address: apiUser.address ?? '',
        role: validRole,
        active: apiUser.isActive ?? true,
      };
      d.users.push(existing);
    } else {
      existing.backendId = apiUser.id;
      existing.name = apiUser.fullName || apiUser.username;
      existing.email = apiUser.email;
      existing.phone = apiUser.phoneNumber ?? existing.phone;
      existing.address = apiUser.address ?? existing.address;
      existing.role = validRole;
      if (apiUser.isActive !== undefined) existing.active = apiUser.isActive;
    }
    return existing;
  };

  /** Synchronize catalog, bundles, settings, suppliers, and users from GRM-Backend (PostgreSQL) */
  const syncWithBackend = useCallback(async (): Promise<boolean> => {
    try {
      const [prodPage, bundleList] = await Promise.all([
        grmApi.products.list({ page: 1, pageSize: 100 }),
        grmApi.bundles.list().catch(() => []),
      ]);

      const d = clone(ref.current);

      // Merge Products & Variants from GRM-Backend by SKU / Name
      for (const bp of prodPage.items) {
        let localProd = d.products.find(
          (p) =>
            p.backendId === bp.id ||
            p.name.toLowerCase() === bp.name.toLowerCase()
        );
        const cat = (
          ['Smart Locks', 'Solar Panels', 'Batteries'].includes(bp.category)
            ? bp.category
            : 'Smart Locks'
        ) as Product['category'];

        if (!localProd) {
          localProd = {
            id: `P-${bp.id}`,
            backendId: bp.id,
            name: bp.name,
            category: cat,
            description: bp.description ?? '',
            active: bp.isActive,
          };
          d.products.push(localProd);
        } else {
          localProd.backendId = bp.id;
          localProd.name = bp.name;
          localProd.description = bp.description ?? localProd.description;
          localProd.active = bp.isActive;
        }

        for (const bv of bp.variants) {
          let localVar = d.variants.find(
            (v) =>
              v.backendId === bv.id ||
              v.sku.toLowerCase() === bv.sku.toLowerCase()
          );
          if (!localVar) {
            localVar = {
              id: `V-${bv.id}`,
              backendId: bv.id,
              productId: localProd.id,
              name: bv.model,
              sku: bv.sku,
              price: Number(bv.price),
              stock: bv.stock,
              dailySales: [1, 0, 1, 0, 1, 0, 1],
              active: true,
            };
            d.variants.push(localVar);
          } else {
            localVar.backendId = bv.id;
            localVar.name = bv.model;
            localVar.sku = bv.sku;
            localVar.price = Number(bv.price);
            localVar.stock = bv.stock;
          }
        }
      }

      // Merge Bundles from GRM-Backend
      for (const bb of bundleList) {
        let localBundle = d.bundles.find(
          (b) =>
            b.backendId === bb.id ||
            b.name.toLowerCase() === bb.name.toLowerCase()
        );
        const mappedComponents: BundleComponent[] = bb.items
          .map((item) => {
            const v = d.variants.find(
              (x) => x.backendId === item.variantId || x.sku === item.sku
            );
            return v ? { variantId: v.id, qty: item.quantity } : null;
          })
          .filter(Boolean) as BundleComponent[];

        if (localBundle) {
          localBundle.backendId = bb.id;
          localBundle.price = Number(bb.price);
          localBundle.description = bb.description ?? localBundle.description;
          if (mappedComponents.length > 0) {
            localBundle.components = mappedComponents;
          }
        } else if (mappedComponents.length > 0) {
          d.bundles.push({
            id: `B-${bb.id}`,
            backendId: bb.id,
            name: bb.name,
            sku: `BND-${bb.id}`,
            description: bb.description ?? '',
            price: Number(bb.price),
            active: true,
            components: mappedComponents,
          });
        }
      }

      // Sync authenticated resources when a JWT token is present
      if (getApiToken()) {
        const [settingsRes, suppliersRes, usersRes] = await Promise.all([
          grmApi.settings.get().catch(() => null),
          grmApi.suppliers.list().catch(() => null),
          roleOf(d) === 'Admin' ? grmApi.users.list().catch(() => null) : Promise.resolve(null),
        ]);

        if (settingsRes) {
          d.settings.maxStaffDiscountPercent = Number(settingsRes.maxStaffDiscountPercent);
        }

        if (suppliersRes) {
          for (const bs of suppliersRes) {
            let localSup = d.suppliers.find(
              (s) => s.backendId === bs.id || s.name.toLowerCase() === bs.name.toLowerCase()
            );
            if (!localSup) {
              d.suppliers.push({
                id: `S-${bs.id}`,
                backendId: bs.id,
                name: bs.name,
                contact: bs.contactPerson ?? '',
                phone: bs.phone ?? '',
              });
            } else {
              localSup.backendId = bs.id;
              localSup.name = bs.name;
              localSup.contact = bs.contactPerson ?? localSup.contact;
              localSup.phone = bs.phone ?? localSup.phone;
            }
          }
        }

        if (usersRes) {
          for (const bu of usersRes) {
            upsertUserFromApi(d, bu);
          }
        }
      }

      syncDrafts(d);
      commit(d);
      setApiOnline(true);
      return true;
    } catch {
      setApiOnline(false);
      return false;
    }
  }, [commit]);

  /** Sync variant stock changes (deductions/additions) to GRM-Backend /api/inventory using the active JWT */
  const pushStockDeltasToBackend = useCallback(
    async (
      deltas: { backendVariantId?: number; delta: number; reason: string }[]
    ) => {
      try {
        const token = getApiToken();
        if (!token) return;
        for (const item of deltas) {
          if (!item.backendVariantId || item.delta === 0) continue;
          if (item.delta > 0) {
            await grmApi.inventory.stockIn(
              item.backendVariantId,
              item.delta,
              item.reason,
              token
            );
          } else {
            await grmApi.inventory.stockOut(
              item.backendVariantId,
              Math.abs(item.delta),
              item.reason,
              token
            );
          }
        }
        await syncWithBackend();
      } catch { }
    },
    [syncWithBackend]
  );

  // Restore session from stored JWT and sync with GRM-Backend on mount
  useEffect(() => {
    const init = async () => {
      const token = getApiToken();
      if (token) {
        try {
          const me = await grmApi.auth.me();
          const d = clone(ref.current);
          const u = upsertUserFromApi(d, me);
          d.session = { userId: u.id, token };
          commit(d);
          setApiOnline(true);
        } catch {
          setApiToken(null);
          const d = clone(ref.current);
          d.session = { userId: null, token: null };
          commit(d);
        }
      }
      await syncWithBackend();
    };
    init();
  }, [commit, syncWithBackend]);

  const api: Omit<
    Ctx,
    | 'db'
    | 'user'
    | 'role'
    | 'cart'
    | 'listings'
    | 'notice'
    | 'flash'
    | 'apiOnline'
    | 'apiBaseUrl'
    | 'syncWithBackend'
  > = {
    login: async (email, pw) => {
      try {
        const authRes = await grmApi.auth.login(email.trim(), pw);
        setApiToken(authRes.token);
        setApiOnline(true);
        const res = tx((d) => {
          const u = upsertUserFromApi(d, authRes.user);
          // Merge guest cart into authenticated user cart
          if (d.carts.guest?.length) {
            const c = d.carts[u.id] ?? (d.carts[u.id] = []);
            for (const g of d.carts.guest) {
              const ex = c.find((x) => x.kind === g.kind && x.refId === g.refId);
              if (ex) ex.qty += g.qty;
              else c.push({ ...g });
            }
            d.carts.guest = [];
          }
          d.session = { userId: u.id, token: authRes.token };
          return u;
        });
        if (res.ok) {
          syncWithBackend();
        }
        return res;
      } catch (e: any) {
        const msg = e?.message || 'Unable to connect to GRM-Backend.';
        if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
          setApiOnline(false);
          return {
            ok: false,
            error: `Cannot reach GRM-Backend at ${API_BASE_URL}. Make sure the ASP.NET Core server and PostgreSQL are running.`,
          };
        }
        return { ok: false, error: msg };
      }
    },

    register: async (p) => {
      if (!p.name.trim() || !p.email.includes('@') || p.password.length < 6) {
        return {
          ok: false,
          error: 'Enter a name, valid email and a password of 6+ characters',
        };
      }
      try {
        const baseUsername = p.email
          .split('@')[0]
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 40);
        const username =
          (baseUsername.length >= 3 ? baseUsername : `user_${baseUsername}`) +
          Math.floor(10 + Math.random() * 89);

        await grmApi.auth.register({
          username,
          email: p.email.trim(),
          password: p.password,
          fullName: p.name.trim(),
          phoneNumber: p.phone,
        });
        const authRes = await grmApi.auth.login(p.email.trim(), p.password);
        setApiToken(authRes.token);
        setApiOnline(true);
        const res = tx((d) => {
          const u = upsertUserFromApi(d, authRes.user);
          if (d.carts.guest?.length) {
            const c = d.carts[u.id] ?? (d.carts[u.id] = []);
            for (const g of d.carts.guest) {
              const ex = c.find((x) => x.kind === g.kind && x.refId === g.refId);
              if (ex) ex.qty += g.qty;
              else c.push({ ...g });
            }
            d.carts.guest = [];
          }
          d.session = { userId: u.id, token: authRes.token };
          return u;
        });
        if (res.ok) {
          syncWithBackend();
        }
        return res;
      } catch (e: any) {
        const msg = e?.message || 'Registration failed.';
        if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
          setApiOnline(false);
          return {
            ok: false,
            error: `Cannot reach GRM-Backend at ${API_BASE_URL}. Make sure the ASP.NET Core server and PostgreSQL are running.`,
          };
        }
        return { ok: false, error: msg };
      }
    },

    logout: () => {
      grmApi.auth.logout().catch(() => { });
      setApiToken(null);
      tx((d) => {
        d.session = { userId: null, token: null };
      });
    },

    // switchRole: (r) => {
    //   tx((d) => {
    //     if (r === 'Guest') {
    //       d.session = { userId: null, token: null };
    //       setApiToken(null);
    //       return;
    //     }
    //     const u = d.users.find((x) => x.role === r && x.active);
    //     if (!u) throw new Error(`No active ${r} account`);
    //     makeSession(d, u);
    //   });
    //   if (r !== 'Guest') {
    //     authenticateBackendRole(r).then(() => syncWithBackend());
    //   }
    // },

    updateProfile: (p) => {
      const res = tx((d) => {
        const u = cur(d);
        if (!u) throw new Error('401 Unauthorized');
        u.name = p.name;
        u.phone = p.phone;
        u.address = p.address;
      });
      if (res.ok) {
        grmApi.profile
          .update({
            fullName: p.name,
            phoneNumber: p.phone,
            address: p.address,
          })
          .catch(() => { });
      }
      return res;
    },

    changePassword: (c, n) =>
      tx((d) => {
        const u = cur(d);
        if (!u) throw new Error('401 Unauthorized');
        if (u.password !== c) throw new Error('Current password is incorrect');
        if (n.length < 6)
          throw new Error('New password must be at least 6 characters');
        u.password = n;
      }),

    addToCart: (kind, refId, qty = 1) => {
      const res = tx((d) => {
        const k = cartKey(d);
        const c = d.carts[k] ?? (d.carts[k] = []);
        const ex = c.find((i) => i.kind === kind && i.refId === refId);
        if (ex) ex.qty += qty;
        else c.push({ kind, refId, qty });
        return d.variants.find((v) => v.id === refId)?.backendId;
      });
      if (res.ok && kind === 'variant' && res.data && roleOf(ref.current) === 'Customer') {
        grmApi.cart.addItem(res.data, qty).catch(() => { });
      }
      return res;
    },

    setCartQty: (kind, refId, qty) => {
      const bId = ref.current.variants.find((v) => v.id === refId)?.backendId;
      tx((d) => {
        const k = cartKey(d);
        d.carts[k] = (d.carts[k] ?? [])
          .map((i) => (i.kind === kind && i.refId === refId ? { ...i, qty } : i))
          .filter((i) => i.qty > 0);
      });
      if (kind === 'variant' && bId && roleOf(ref.current) === 'Customer') {
        if (qty > 0) grmApi.cart.updateItem(bId, qty).catch(() => { });
        else grmApi.cart.removeItem(bId).catch(() => { });
      }
    },

    clearCart: () => {
      tx((d) => {
        d.carts[cartKey(d)] = [];
      });
      if (roleOf(ref.current) === 'Customer') {
        grmApi.cart.clear().catch(() => { });
      }
    },

    requestQuotation: (note) => {
      const currentItems =
        ref.current.carts[ref.current.session.userId ?? ''] ?? [];
      const expanded = expand(ref.current, currentItems);
      const backendItems = Array.from(expanded.entries())
        .map(([vId, q]) => ({
          variantId:
            ref.current.variants.find((v) => v.id === vId)?.backendId ?? 0,
          quantity: q,
        }))
        .filter((i) => i.variantId > 0);

      const res = tx((d) => {
        need(d, 'Customer');
        const u = cur(d)!;
        const lines = toLines(d, d.carts[u.id] ?? []);
        const qObj: Quotation = {
          id: nid(d, 'QT'),
          customerId: u.id,
          customerName: u.name,
          lines,
          discountPercent: 0,
          status: 'Requested',
          validUntil: null,
          note,
          createdAt: nowISO(),
          preparedBy: null,
          orderId: null,
        };
        d.quotations.push(qObj);
        d.carts[u.id] = [];
        return qObj;
      });

      if (res.ok && backendItems.length > 0 && getApiToken()) {
        grmApi.quotations
          .requestQuote(backendItems, note)
          .then((apiQ: ApiQuotationDto) => {
            tx((d) => {
              const target = d.quotations.find((x) => x.id === res.data.id);
              if (target) target.backendId = apiQ.id;
            });
          })
          .catch(() => { });
      }
      return res;
    },

    checkout: (payment, address) => {
      const res = tx((d) => {
        need(d, 'Customer');
        const u = cur(d)!;
        if (!address.trim()) throw new Error('Delivery address is required');
        const lines = toLines(d, d.carts[u.id] ?? []);
        const o = createOrder(d, {
          customerId: u.id,
          customerName: u.name,
          channel: 'Online',
          lines,
          discountPercent: 0,
          payment,
          address,
          status: 'Pending',
        });
        d.carts[u.id] = [];
        return o;
      });
      if (res.ok && getApiToken()) {
        grmApi.orders
          .checkout({ paymentMethod: payment, shippingAddress: address })
          .then((apiOrder) => {
            tx((d) => {
              const target = d.orders.find((x) => x.id === res.data.id);
              if (target) target.backendId = apiOrder.id;
            });
            syncWithBackend();
          })
          .catch(() => { });
      }
      return res;
    },

    acceptQuotation: (id, payment) => {
      const targetQuote = ref.current.quotations.find((q) => q.id === id);

      const res = tx((d) => {
        need(d, 'Customer', 'Staff', 'Admin');
        const q = d.quotations.find((x) => x.id === id);
        if (!q) throw new Error('Quotation not found');
        if (roleOf(d) === 'Customer' && q.customerId !== d.session.userId)
          throw new Error('403 Forbidden');
        if (q.status !== 'Quoted')
          throw new Error('Only a prepared quotation can be accepted');
        if (isExpired(q)) throw new Error('This quotation has expired');
        const cust = d.users.find((u) => u.id === q.customerId);
        const o = createOrder(d, {
          customerId: q.customerId,
          customerName: q.customerName,
          channel: q.customerId ? 'Online' : 'WalkIn',
          lines: q.lines,
          discountPercent: q.discountPercent,
          payment,
          address: cust?.address || 'To be confirmed',
          status: 'Pending',
          quotationId: q.id,
        });
        q.status = 'Accepted';
        q.orderId = o.id;
        return o;
      });

      if (res.ok && targetQuote?.backendId && getApiToken()) {
        const bId = targetQuote.backendId;
        grmApi.quotations
          .accept(bId)
          .then(() => syncWithBackend())
          .catch(() => { });
      }
      return res;
    },

    declineQuotation: (id) => {
      const bId = ref.current.quotations.find((q) => q.id === id)?.backendId;
      const res = tx((d) => {
        need(d, 'Customer', 'Staff', 'Admin');
        const q = d.quotations.find((x) => x.id === id);
        if (!q) throw new Error('Quotation not found');
        if (roleOf(d) === 'Customer' && q.customerId !== d.session.userId)
          throw new Error('403 Forbidden');
        if (q.status !== 'Quoted' && q.status !== 'Requested')
          throw new Error('Quotation can no longer be declined');
        q.status = 'Declined';
      });
      if (res.ok && bId) {
        grmApi.quotations.decline(bId, 'Declined by customer').catch(() => { });
      }
      return res;
    },

    saveQuotation: (p) => {
      const res = tx((d) => {
        need(d, 'Staff', 'Admin');
        assertDiscount(d, p.discountPercent);
        const validUntil = new Date(
          Date.now() + p.validDays * 86400000
        ).toISOString();
        if (p.id) {
          const q = d.quotations.find((x) => x.id === p.id);
          if (!q) throw new Error('Quotation not found');
          if (q.status !== 'Requested' && q.status !== 'Quoted')
            throw new Error('Quotation is closed');
          q.discountPercent = p.discountPercent;
          q.validUntil = validUntil;
          q.note = p.note;
          q.status = 'Quoted';
          q.preparedBy = who(d);
          return q;
        }
        const cust = d.users.find((u) => u.id === p.customerId);
        const name = cust?.name ?? (p.customerName ?? '').trim();
        if (!name)
          throw new Error('Select a customer or enter a walk-in name');
        const q: Quotation = {
          id: nid(d, 'QT'),
          customerId: cust?.id ?? null,
          customerName: name,
          lines: toLines(d, p.items ?? []),
          discountPercent: p.discountPercent,
          status: 'Quoted',
          validUntil,
          note: p.note,
          createdAt: nowISO(),
          preparedBy: who(d),
          orderId: null,
        };
        d.quotations.push(q);
        return q;
      });

      if (res.ok && res.data.backendId) {
        const bId = res.data.backendId;
        grmApi.quotations
          .update(bId, {
            discountPercent: p.discountPercent,
            notes: p.note,
          })
          .then(() => grmApi.quotations.send(bId))
          .catch(() => { });
      }
      return res;
    },

    walkInSale: (p) => {
      const expanded = expand(ref.current, p.items);
      const deltas = Array.from(expanded.entries()).map(([vId, q]) => ({
        backendVariantId: ref.current.variants.find((v) => v.id === vId)
          ?.backendId,
        delta: -q,
        reason: `Walk-In POS Sale (${p.customerName || 'Walk-in'})`,
      }));

      const res = tx((d) => {
        need(d, 'Staff', 'Admin');
        assertDiscount(d, p.discountPercent);
        const o = createOrder(d, {
          customerId: null,
          customerName: p.customerName.trim() || 'Walk-in Customer',
          channel: 'WalkIn',
          lines: toLines(d, p.items),
          discountPercent: p.discountPercent,
          payment: p.payment,
          address: 'In-store',
          status: 'Completed',
        });
        const inv = makeInvoice(d, o, p.paid);
        return { orderId: o.id, invoiceId: inv.id };
      });
      if (res.ok) {
        pushStockDeltasToBackend(deltas);
      }
      return res;
    },

    advanceOrder: (id) =>
      tx((d) => {
        need(d, 'Staff', 'Admin');
        const o = d.orders.find((x) => x.id === id);
        if (!o) throw new Error('Order not found');
        if (o.status === 'Pending') o.status = 'Processing';
        else if (o.status === 'Processing') o.status = 'Completed';
        else throw new Error(`Order is ${o.status}`);
      }),

    cancelOrder: (id) => {
      const ord = ref.current.orders.find((x) => x.id === id);
      const expanded = ord
        ? expand(ref.current, ord.lines)
        : new Map<string, number>();
      const deltas = Array.from(expanded.entries()).map(([vId, q]) => ({
        backendVariantId: ref.current.variants.find((v) => v.id === vId)
          ?.backendId,
        delta: q,
        reason: `Cancelled Order ${id}`,
      }));

      const res = tx((d) => {
        need(d, 'Customer', 'Staff', 'Admin');
        const o = d.orders.find((x) => x.id === id);
        if (!o) throw new Error('Order not found');
        const r = roleOf(d);
        if (
          r === 'Customer' &&
          (o.customerId !== d.session.userId || o.status !== 'Pending')
        )
          throw new Error(
            'Customers can only cancel their own Pending orders'
          );
        if (o.status === 'Completed' || o.status === 'Cancelled')
          throw new Error(`Cannot cancel a ${o.status} order`);
        const inv = d.invoices.find((i) => i.id === o.invoiceId);
        if (inv?.status === 'Paid')
          throw new Error('Paid invoice must be voided by the Admin first');
        if (inv && inv.status === 'Unpaid') {
          inv.status = 'Voided';
          inv.voidReason = 'Order cancelled';
        }
        restock(d, o.lines, o.id);
        o.status = 'Cancelled';
      });
      if (res.ok) {
        pushStockDeltasToBackend(deltas);
      }
      return res;
    },

    generateInvoice: (orderId) =>
      tx((d) => {
        need(d, 'Staff', 'Admin');
        const o = d.orders.find((x) => x.id === orderId);
        if (!o) throw new Error('Order not found');
        if (o.status === 'Cancelled')
          throw new Error('Cannot invoice a cancelled order');
        const ex = d.invoices.find((i) => i.id === o.invoiceId);
        if (ex && ex.status !== 'Voided')
          throw new Error('Invoice already exists for this order');
        return makeInvoice(d, o, false);
      }),

    markPaid: (id) =>
      tx((d) => {
        need(d, 'Staff', 'Admin');
        const i = d.invoices.find((x) => x.id === id);
        if (!i) throw new Error('Invoice not found');
        if (i.status !== 'Unpaid') throw new Error(`Invoice is ${i.status}`);
        i.status = 'Paid';
        i.paidAt = nowISO();
      }),

    voidInvoice: (id, reason) =>
      tx((d) => {
        need(d, 'Admin');
        const i = d.invoices.find((x) => x.id === id);
        if (!i) throw new Error('Invoice not found');
        if (i.status === 'Voided') throw new Error('Invoice already voided');
        if (!reason.trim())
          throw new Error('A reason is required to void an invoice');
        i.status = 'Voided';
        i.voidReason = reason.trim();
      }),

    logStock: (p) => {
      const bId = ref.current.variants.find(
        (v) => v.id === p.variantId
      )?.backendId;
      const res = tx((d) => {
        need(d, 'Staff', 'Admin');
        if (!p.reason.trim()) throw new Error('A reason is mandatory');
        if (!Number.isInteger(p.qty) || p.qty < 1)
          throw new Error('Quantity must be a whole number ≥ 1');
        const v = d.variants.find((x) => x.id === p.variantId);
        if (!v) throw new Error('Select a variant');
        if (p.type === 'Stock-Out' && v.stock < p.qty)
          throw new Error(`Only ${v.stock} in stock`);
        v.stock += p.type === 'Stock-In' ? p.qty : -p.qty;
        d.movements.push({
          id: nid(d, 'MV'),
          variantId: v.id,
          type: p.type,
          qty: p.type === 'Stock-In' ? p.qty : -p.qty,
          reason: p.reason.trim(),
          ref: '—',
          by: who(d),
          at: nowISO(),
        });
      });
      if (res.ok && bId) {
        if (p.type === 'Stock-In') {
          grmApi.inventory
            .stockIn(bId, p.qty, p.reason)
            .then(() => syncWithBackend())
            .catch(() => { });
        } else {
          grmApi.inventory
            .stockOut(bId, p.qty, p.reason)
            .then(() => syncWithBackend())
            .catch(() => { });
        }
      }
      return res;
    },

    adjustStock: (p) => {
      const bId = ref.current.variants.find(
        (v) => v.id === p.variantId
      )?.backendId;
      const res = tx((d) => {
        need(d, 'Admin');
        if (!p.reason.trim()) throw new Error('An audit reason is required');
        if (!Number.isInteger(p.newCount) || p.newCount < 0)
          throw new Error('New count must be a whole number ≥ 0');
        const v = d.variants.find((x) => x.id === p.variantId);
        if (!v) throw new Error('Select a variant');
        const diff = p.newCount - v.stock;
        d.movements.push({
          id: nid(d, 'MV'),
          variantId: v.id,
          type: 'Adjustment',
          qty: diff,
          reason: p.reason.trim(),
          ref: '—',
          by: who(d),
          at: nowISO(),
        });
        v.stock = p.newCount;
      });
      if (res.ok && bId) {
        grmApi.inventory
          .adjust(bId, p.newCount, p.reason)
          .then(() => syncWithBackend())
          .catch(() => { });
      }
      return res;
    },

    createRequisition: (p) =>
      tx((d) => {
        need(d, 'Staff', 'Admin');
        if (!p.variantId) throw new Error('Select a variant');
        if (!Number.isInteger(p.qty) || p.qty < 1)
          throw new Error('Quantity must be ≥ 1');
        d.requisitions.push({
          id: nid(d, 'PR'),
          variantId: p.variantId,
          qty: p.qty,
          reason: p.reason,
          requestedBy: who(d),
          status: 'Pending',
          poId: null,
          createdAt: nowISO(),
        });
      }),

    decideRequisition: (id, approve, supplierId) =>
      tx((d) => {
        need(d, 'Admin');
        const r = d.requisitions.find((x) => x.id === id);
        if (!r) throw new Error('Requisition not found');
        if (r.status !== 'Pending')
          throw new Error(`Requisition already ${r.status}`);
        if (!approve) {
          r.status = 'Declined';
          return;
        }
        if (!supplierId) throw new Error('Assign a supplier to approve');
        const po: PurchaseOrder = {
          id: nid(d, 'PO'),
          supplierId,
          lines: [{ variantId: r.variantId, qty: r.qty, received: 0 }],
          status: 'Approved',
          source: 'Requisition',
          note: `From ${r.id} by ${r.requestedBy}: ${r.reason}`,
          createdAt: nowISO(),
        };
        d.pos.push(po);
        r.status = 'Approved';
        r.poId = po.id;
      }),

    updatePO: (id, p) =>
      tx((d) => {
        need(d, 'Admin');
        const po = d.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        if (po.status !== 'Draft' && po.status !== 'Approved')
          throw new Error('Only Draft/Approved POs can be edited');
        if (p.supplierId !== undefined) po.supplierId = p.supplierId;
        if (p.lines) {
          if (p.lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1))
            throw new Error('Quantities must be whole numbers ≥ 1');
          po.lines = p.lines;
        }
      }),

    setPOStatus: (id, to) =>
      tx((d) => {
        need(d, 'Admin');
        const po = d.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        if (to === 'Approved') {
          if (po.status !== 'Draft')
            throw new Error('Only Drafts can be approved');
          if (!po.supplierId) throw new Error('Assign a supplier first');
        }
        if (to === 'Sent' && po.status !== 'Approved')
          throw new Error('Only Approved POs can be sent');
        po.status = to;
      }),

    discardPO: (id) =>
      tx((d) => {
        need(d, 'Admin');
        const po = d.pos.find((x) => x.id === id);
        if (!po || po.status !== 'Draft')
          throw new Error('Only Draft POs can be discarded');
        d.pos = d.pos.filter((x) => x.id !== id);
      }),

    receivePO: (id, rec) => {
      const targetPo = ref.current.pos.find((p) => p.id === id);
      const deltas: {
        backendVariantId?: number;
        delta: number;
        reason: string;
      }[] = [];
      if (targetPo) {
        targetPo.lines.forEach((l, idx) => {
          const add = rec[idx] ?? 0;
          if (add > 0) {
            deltas.push({
              backendVariantId: ref.current.variants.find(
                (v) => v.id === l.variantId
              )?.backendId,
              delta: add,
              reason: `PO Receiving ${id}`,
            });
          }
        });
      }

      const res = tx((d) => {
        need(d, 'Staff', 'Admin');
        const po = d.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        if (po.status !== 'Approved' && po.status !== 'Sent')
          throw new Error('Only Approved or Sent POs can be received');
        let any = false;
        po.lines.forEach((l, idx) => {
          const add = rec[idx] ?? 0;
          if (!add) return;
          if (!Number.isInteger(add) || add < 0 || l.received + add > l.qty)
            throw new Error(`Invalid received quantity for line ${idx + 1}`);
          const v = d.variants.find((x) => x.id === l.variantId)!;
          v.stock += add;
          l.received += add;
          any = true;
          d.movements.push({
            id: nid(d, 'MV'),
            variantId: v.id,
            type: 'Receiving',
            qty: add,
            reason: `Received against ${po.id}`,
            ref: po.id,
            by: who(d),
            at: nowISO(),
          });
        });
        if (!any) throw new Error('Enter at least one received quantity');
        if (po.lines.every((l) => l.received >= l.qty)) po.status = 'Received';
      });
      if (res.ok && deltas.length > 0) {
        pushStockDeltasToBackend(deltas);
      }
      return res;
    },

    saveProduct: (p) => {
      const res = tx((d) => {
        need(d, 'Admin');
        if (!p.name.trim()) throw new Error('Name is required');
        if (p.id) {
          const existing = d.products.find((x) => x.id === p.id)!;
          Object.assign(existing, p);
          return existing;
        } else {
          const created: Product = {
            id: nid(d, 'P'),
            name: p.name.trim(),
            category: p.category,
            description: p.description ?? '',
            active: p.active ?? true,
          };
          d.products.push(created);
          return created;
        }
      });
      if (res.ok) {
        if (res.data.backendId) {
          grmApi.products
            .update(res.data.backendId, {
              name: res.data.name,
              description: res.data.description,
              category: res.data.category,
              isActive: res.data.active,
            })
            .catch(() => { });
        } else {
          grmApi.products
            .create({
              name: res.data.name,
              description: res.data.description,
              category: res.data.category,
              isActive: res.data.active,
            })
            .then(() => syncWithBackend())
            .catch(() => { });
        }
      }
      return res;
    },

    saveVariant: (p) => {
      const res = tx((d) => {
        need(d, 'Admin');
        if (!p.name.trim() || !p.sku.trim())
          throw new Error('Name and SKU are required');
        if (!(p.price >= 0)) throw new Error('Invalid price');
        if (
          d.variants.some(
            (v) =>
              v.sku.toLowerCase() === p.sku.trim().toLowerCase() &&
              v.id !== p.id
          )
        )
          throw new Error('SKU must be unique');
        if (p.id) {
          const existing = d.variants.find((x) => x.id === p.id)!;
          Object.assign(existing, { ...p, sku: p.sku.trim() });
          return existing;
        } else {
          const created: Variant = {
            id: nid(d, 'V'),
            productId: p.productId,
            name: p.name.trim(),
            sku: p.sku.trim(),
            price: p.price,
            stock: p.stock ?? 0,
            dailySales: [0, 0, 0, 0, 0, 0, 0],
            active: p.active ?? true,
          };
          d.variants.push(created);
          return created;
        }
      });
      if (res.ok) {
        const prodBackendId = ref.current.products.find(
          (x) => x.id === res.data.productId
        )?.backendId;
        if (res.data.backendId) {
          grmApi.products
            .updateVariant(res.data.backendId, {
              model: res.data.name,
              sku: res.data.sku,
              price: res.data.price,
              stock: res.data.stock,
            })
            .catch(() => { });
        } else if (prodBackendId) {
          grmApi.products
            .addVariant(prodBackendId, {
              model: res.data.name,
              sku: res.data.sku,
              price: res.data.price,
              stock: res.data.stock,
            })
            .then(() => syncWithBackend())
            .catch(() => { });
        }
      }
      return res;
    },

    saveBundle: (p) => {
      const res = tx((d) => {
        need(d, 'Admin');
        if (!p.name.trim() || !p.sku.trim())
          throw new Error('Name and SKU are required');
        if (!p.components.length)
          throw new Error('A bundle needs at least one component');
        if (p.components.some((c) => c.qty < 1))
          throw new Error('Component quantities must be ≥ 1');
        if (p.id) {
          const existing = d.bundles.find((x) => x.id === p.id)!;
          Object.assign(existing, p);
          return existing;
        } else {
          const created: Bundle = {
            id: nid(d, 'B'),
            name: p.name.trim(),
            sku: p.sku.trim(),
            description: p.description ?? '',
            price: p.price,
            active: p.active ?? true,
            components: p.components,
          };
          d.bundles.push(created);
          return created;
        }
      });
      if (res.ok) {
        const items = res.data.components
          .map((c) => ({
            variantId:
              ref.current.variants.find((v) => v.id === c.variantId)
                ?.backendId ?? 0,
            quantity: c.qty,
          }))
          .filter((i) => i.variantId > 0);
        if (items.length > 0) {
          if (res.data.backendId) {
            grmApi.bundles
              .update(res.data.backendId, {
                name: res.data.name,
                description: res.data.description,
                price: res.data.price,
                items,
              })
              .catch(() => { });
          } else {
            grmApi.bundles
              .create({
                name: res.data.name,
                description: res.data.description,
                price: res.data.price,
                items,
              })
              .then(() => syncWithBackend())
              .catch(() => { });
          }
        }
      }
      return res;
    },

    setMaxDiscount: (pct) => {
      const res = tx((d) => {
        need(d, 'Admin');
        if (!(pct >= 0 && pct <= 100)) throw new Error('Enter 0–100');
        d.settings.maxStaffDiscountPercent = pct;
      });
      if (res.ok && getApiToken()) {
        grmApi.settings.update({ maxStaffDiscountPercent: pct }).catch(() => { });
      }
      return res;
    },

    saveSupplier: (p) => {
      const res = tx((d) => {
        need(d, 'Admin');
        if (!p.name.trim()) throw new Error('Supplier name is required');
        if (p.id) {
          const existing = d.suppliers.find((x) => x.id === p.id)!;
          Object.assign(existing, p);
          return existing;
        } else {
          const created: Supplier = {
            id: nid(d, 'S'),
            name: p.name.trim(),
            contact: p.contact ?? '',
            phone: p.phone ?? '',
          };
          d.suppliers.push(created);
          return created;
        }
      });
      if (res.ok && getApiToken()) {
        if (res.data.backendId) {
          grmApi.suppliers
            .update(res.data.backendId, {
              name: res.data.name,
              contactPerson: res.data.contact,
              phone: res.data.phone,
            })
            .catch(() => { });
        } else {
          grmApi.suppliers
            .create({
              name: res.data.name,
              contactPerson: res.data.contact,
              phone: res.data.phone,
            })
            .then(() => syncWithBackend())
            .catch(() => { });
        }
      }
      return res;
    },

    saveUser: (p) => {
      const res = tx((d) => {
        need(d, 'Admin');
        if (!p.name.trim() || !p.email.includes('@'))
          throw new Error('Name and valid email are required');
        if (
          d.users.some(
            (u) =>
              u.email.toLowerCase() === p.email.trim().toLowerCase() &&
              u.id !== p.id
          )
        )
          throw new Error('Email already used');
        if (p.id) {
          const u = d.users.find((x) => x.id === p.id)!;
          u.name = p.name;
          u.email = p.email;
          u.role = p.role;
          if (p.password) u.password = p.password;
          return { user: u, created: false };
        } else {
          if (!p.password || p.password.length < 6)
            throw new Error('Password must be 6+ characters');
          const u: User = {
            id: nid(d, 'U'),
            name: p.name.trim(),
            email: p.email.trim(),
            password: p.password,
            phone: p.phone ?? '',
            address: '',
            role: p.role,
            active: true,
          };
          d.users.push(u);
          return { user: u, created: true };
        }
      });
      if (res.ok && res.data.created && getApiToken() && p.password) {
        const baseUsername = p.email
          .split('@')[0]
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 40);
        const username =
          (baseUsername.length >= 3 ? baseUsername : `user_${baseUsername}`) +
          Math.floor(10 + Math.random() * 89);
        grmApi.users
          .create({
            username,
            email: p.email.trim(),
            password: p.password,
            role: p.role,
            fullName: p.name.trim(),
            phoneNumber: p.phone,
          })
          .then(() => syncWithBackend())
          .catch(() => { });
      }
      return res;
    },

    toggleUser: (id) => {
      const targetUser = ref.current.users.find((x) => x.id === id);
      const res = tx((d) => {
        need(d, 'Admin');
        const u = d.users.find((x) => x.id === id);
        if (!u) throw new Error('User not found');
        if (u.id === d.session.userId)
          throw new Error('You cannot deactivate your own account');
        u.active = !u.active;
        return u.active;
      });
      if (res.ok && targetUser?.backendId && getApiToken()) {
        grmApi.users.setStatus(targetUser.backendId, res.data).catch(() => { });
      }
      return res;
    },

    submitInquiry: (p) => {
      const res = tx((d) => {
        if (!p.name.trim() || !p.email.includes('@') || !p.message.trim())
          throw new Error('Please complete all fields');
        d.inquiries.push({ id: nid(d, 'IN'), ...p, at: nowISO() });
      });
      if (res.ok) {
        grmApi.contact
          .submit({ name: p.name.trim(), email: p.email.trim(), message: p.message.trim() })
          .catch(() => { });
      }
      return res;
    },

    resetDemo: () => {
      commit(seed());
      syncWithBackend();
    },
  };

  const value = useMemo<Ctx>(() => {
    const user = cur(db);
    return {
      db,
      user,
      role: roleOf(db),
      cart: db.carts[db.session.userId ?? 'guest'] ?? [],
      listings: buildListings(db),
      notice,
      apiOnline,
      apiBaseUrl: API_BASE_URL,
      syncWithBackend,
      flash,
      ...api,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, notice, apiOnline]);

  return <SystemCtx.Provider value={value}>{children}</SystemCtx.Provider>;
}

export function useSystem(): Ctx {
  const c = useContext(SystemCtx);
  if (!c) throw new Error('useSystem must be used inside SystemProvider');
  return c;
}
