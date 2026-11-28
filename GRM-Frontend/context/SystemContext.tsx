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
  API_BASE_URL,
  ApiBundleDto,
  ApiCartDto,
  ApiContactInquiryDto,
  ApiInventoryItemDto,
  ApiInvoiceDto,
  ApiOrderDto,
  ApiProductDto,
  ApiPurchaseOrderDto,
  ApiQuotationDto,
  ApiReorderSuggestionDto,
  ApiRequisitionDto,
  ApiStockMovementDto,
  ApiSupplierDto,
  ApiUserDto,
} from '../services/grmApi';

/* ============================== TYPES ============================== */
export type Role = 'Guest' | 'Customer' | 'Staff' | 'Admin';
export type Category = 'Smart Locks' | 'Solar Panels' | 'Batteries' | 'Solar Bundles';
export type Payment = 'Cash on Delivery' | 'Manual Bank Transfer' | 'Cash (Walk-in)';
export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
export type InvoiceStatus = 'Unpaid' | 'Paid' | 'Voided';
export type POStatus = 'Draft' | 'Approved' | 'Sent' | 'Received';
export type MoveType =
  | 'Sale'
  | 'Stock-In'
  | 'Stock-Out'
  | 'Adjustment'
  | 'Receiving'
  | 'Cancel-Restock';

export interface User {
  id: string;
  backendId: number;
  username?: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
  role: Exclude<Role, 'Guest'>;
  active: boolean;
}
export interface Product {
  id: string;
  backendId: number;
  name: string;
  category: Exclude<Category, 'Solar Bundles'>;
  description: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  active: boolean;
}
export interface Variant {
  id: string;
  backendId: number;
  productId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  dailySales: number[];
  reorderThreshold?: number;
  salesVelocity?: number;
  imageUrl?: string | null;
  active: boolean;
}
export interface BundleComponent {
  variantId: string;
  qty: number;
}
export interface Bundle {
  id: string;
  backendId: number;
  name: string;
  sku: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  availableStock?: number;
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
  backendId: number;
  customerId: string | null;
  customerName: string;
  lines: LineItem[];
  discountPercent: number;
  status: 'Requested' | 'Quoted' | 'Accepted' | 'Converted' | 'Declined';
  validUntil: string | null;
  isExpired?: boolean;
  note: string;
  createdAt: string;
  preparedBy: string | null;
  orderId: string | null;
}
export interface Order {
  id: string;
  backendId: number;
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
  backendId: number;
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
  sku?: string;
  type: MoveType;
  qty: number;
  reason: string;
  ref: string;
  by: string;
  at: string;
}
export interface Supplier {
  id: string;
  backendId: number;
  name: string;
  contact: string;
  phone: string;
}
export interface Requisition {
  id: string;
  backendId: number;
  variantId: string;
  sku?: string;
  productName?: string;
  model?: string;
  qty: number;
  reason: string;
  requestedBy: string;
  status: 'Pending' | 'Approved' | 'Declined';
  poId: string | null;
  createdAt: string;
}
export interface POLine {
  variantId: string;
  sku?: string;
  productName?: string;
  model?: string;
  qty: number;
  received: number;
}
export interface PurchaseOrder {
  id: string;
  backendId: number;
  poNumber?: string;
  supplierId: string | null;
  supplierName?: string | null;
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
  users: User[];
  products: Product[];
  variants: Variant[];
  bundles: Bundle[];
  quotations: Quotation[];
  orders: Order[];
  invoices: Invoice[];
  movements: Movement[];
  suppliers: Supplier[];
  requisitions: Requisition[];
  pos: PurchaseOrder[];
  inquiries: Inquiry[];
  settings: { maxStaffDiscountPercent: number; defaultQuotationValidityDays?: number };
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
  isFeatured?: boolean;
  imageUrl?: string | null;
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

export const velocityOf = (v: Variant) => {
  if (v.salesVelocity !== undefined) return v.salesVelocity;
  if (!v.dailySales.length) return 0;
  return v.dailySales.reduce((a, b) => a + b, 0) / v.dailySales.length;
};
export const thresholdOf = (v: Variant) => v.reorderThreshold ?? 5;
export const isLow = (v: Variant) => v.stock <= thresholdOf(v);

export const variantLabel = (d: DB, v?: Variant | null) =>
  v
    ? `${d.products.find((p) => p.id === v.productId)?.name ?? '?'} — ${v.name}`
    : '?';

export const bundleAvailable = (d: DB, b: Bundle) => {
  if (b.availableStock !== undefined) return b.availableStock;
  return b.components.length === 0
    ? 0
    : Math.min(
        ...b.components.map((c) =>
          Math.floor(
            (d.variants.find((v) => v.id === c.variantId)?.stock ?? 0) / c.qty
          )
        )
      );
};

export const isExpired = (q: Quotation) =>
  Boolean(q.isExpired) ||
  (q.status === 'Quoted' &&
    !!q.validUntil &&
    new Date(q.validUntil).getTime() < Date.now());

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
      isFeatured: p.isFeatured,
      imageUrl: v.imageUrl ?? p.imageUrl,
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
      imageUrl: b.imageUrl,
    });
  }
  return out;
}

/* ============================== STORAGE KEYS ============================== */
// Only the Guest role cart and the JWT token are stored in localStorage.
const GUEST_CART_KEY = 'grm-guest-cart-v1';
const AUTH_TOKEN_KEY = 'grm-auth-token-v1';

function readGuestCart(): CartItem[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (i) =>
              (i?.kind === 'variant' || i?.kind === 'bundle') &&
              typeof i?.refId === 'string' &&
              typeof i?.qty === 'number' &&
              i.qty > 0
          );
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function writeGuestCart(items: CartItem[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore storage errors
  }
}

function readStoredToken(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}

function writeStoredToken(token: string | null) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
      else localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

function emptyDB(): DB {
  return {
    users: [],
    products: [],
    variants: [],
    bundles: [],
    quotations: [],
    orders: [],
    invoices: [],
    movements: [],
    suppliers: [],
    requisitions: [],
    pos: [],
    inquiries: [],
    settings: { maxStaffDiscountPercent: 15, defaultQuotationValidityDays: 7 },
  };
}

/* ============================== MAPPERS ============================== */
function mapRole(role: string): Exclude<Role, 'Guest'> {
  if (role === 'Admin') return 'Admin';
  if (role === 'Staff') return 'Staff';
  return 'Customer';
}

function mapUser(u: ApiUserDto): User {
  return {
    id: `U-${u.id}`,
    backendId: u.id,
    username: u.username,
    name: u.fullName?.trim() || u.username,
    email: u.email,
    phone: u.phoneNumber ?? '',
    address: u.address ?? '',
    role: mapRole(u.role),
    active: u.isActive ?? true,
  };
}

function mapCategory(category: string): Exclude<Category, 'Solar Bundles'> {
  if (
    category === 'Smart Locks' ||
    category === 'Solar Panels' ||
    category === 'Batteries'
  ) {
    return category;
  }
  return 'Smart Locks';
}

function mapPayment(method?: string | null): Payment {
  if (method === 'Manual Bank Transfer') return 'Manual Bank Transfer';
  if (method === 'Cash (Walk-in)') return 'Cash (Walk-in)';
  return 'Cash on Delivery';
}

function mapCatalog(
  apiProducts: ApiProductDto[],
  apiBundles: ApiBundleDto[],
  invItems: ApiInventoryItemDto[] = [],
  reorderSuggestions: ApiReorderSuggestionDto[] = []
): { products: Product[]; variants: Variant[]; bundles: Bundle[] } {
  const invByVid = new Map<number, ApiInventoryItemDto>();
  for (const item of invItems) invByVid.set(item.variantId, item);

  const reorderByVid = new Map<number, ApiReorderSuggestionDto>();
  for (const s of reorderSuggestions) reorderByVid.set(s.variantId, s);

  const products: Product[] = [];
  const variants: Variant[] = [];

  for (const bp of apiProducts) {
    const pid = `P-${bp.id}`;
    products.push({
      id: pid,
      backendId: bp.id,
      name: bp.name,
      category: mapCategory(bp.category),
      description: bp.description ?? '',
      imageUrl: bp.imageUrl ?? null,
      isFeatured: bp.isFeatured ?? false,
      active: bp.isActive,
    });

    for (const bv of bp.variants) {
      const inv = invByVid.get(bv.id);
      const reo = reorderByVid.get(bv.id);
      variants.push({
        id: `V-${bv.id}`,
        backendId: bv.id,
        productId: pid,
        name: bv.model,
        sku: bv.sku,
        price: Number(bv.price),
        stock: bv.stock,
        dailySales: [0, 0, 0, 0, 0, 0, 0],
        reorderThreshold: reo?.effectiveThreshold ?? inv?.reorderThreshold,
        salesVelocity: reo ? Number(reo.dailySalesVelocity) : undefined,
        imageUrl: bv.imageUrl ?? null,
        active: bp.isActive,
      });
    }
  }

  const bundles: Bundle[] = apiBundles.map((bb) => ({
    id: `B-${bb.id}`,
    backendId: bb.id,
    name: bb.name,
    sku: `BND-${bb.id}`,
    description: bb.description ?? '',
    price: Number(bb.price),
    imageUrl: bb.imageUrl ?? null,
    availableStock: bb.availableStock,
    active: true,
    components: bb.items.map((item) => ({
      variantId: `V-${item.variantId}`,
      qty: item.quantity,
    })),
  }));

  return { products, variants, bundles };
}

function mapCart(dto: ApiCartDto): CartItem[] {
  const items: CartItem[] = dto.items.map((i) => ({
    kind: 'variant',
    refId: `V-${i.variantId}`,
    qty: i.quantity,
  }));
  const bundles: CartItem[] = (dto.bundles ?? []).map((b) => ({
    kind: 'bundle',
    refId: `B-${b.bundleId}`,
    qty: b.quantity,
  }));
  return [...items, ...bundles];
}

function mapQuotationStatus(status: string): Quotation['status'] {
  if (status === 'Draft') return 'Requested';
  if (status === 'Sent') return 'Quoted';
  if (status === 'Accepted') return 'Accepted';
  if (status === 'Converted') return 'Converted';
  if (status === 'Declined') return 'Declined';
  return 'Requested';
}

function mapQuotation(q: ApiQuotationDto, ordersByQuoteId: Map<number, number>): Quotation {
  const convertedOrderId = ordersByQuoteId.get(q.id);
  return {
    id: `QT-${q.id}`,
    backendId: q.id,
    customerId: `U-${q.customerId}`,
    customerName: q.customerName,
    lines: q.items.map((i) => ({
      kind: i.bundleId ? 'bundle' : 'variant',
      refId: i.bundleId ? `B-${i.bundleId}` : `V-${i.variantId}`,
      name: i.bundleName
        ? `${i.bundleName} (${i.productName} — ${i.model})`
        : `${i.productName} — ${i.model}`,
      sku: i.sku,
      unitPrice: Number(i.unitPrice),
      qty: i.quantity,
    })),
    discountPercent: Number(q.discountPercent),
    status: mapQuotationStatus(q.status),
    validUntil: q.expiresAt ?? null,
    isExpired: q.isExpired ?? false,
    note: q.notes ?? '',
    createdAt: q.createdAt,
    preparedBy: q.staffName ?? null,
    orderId: convertedOrderId ? `ORD-${convertedOrderId}` : null,
  };
}

function mapInvoice(inv: ApiInvoiceDto): Invoice {
  const status: InvoiceStatus = inv.isVoided
    ? 'Voided'
    : inv.paymentStatus === 'Paid'
      ? 'Paid'
      : 'Unpaid';
  return {
    id: inv.invoiceNumber || `INV-${inv.id}`,
    backendId: inv.id,
    orderId: `ORD-${inv.orderId}`,
    amount: Number(inv.totalAmount),
    status,
    issuedAt: inv.issuedAt,
    paidAt: inv.paidAt ?? null,
    voidReason: inv.voidReason ?? null,
    payment: mapPayment(inv.paymentMethod),
  };
}

function mapOrder(o: ApiOrderDto, invoices: Invoice[]): Order {
  const ordId = `ORD-${o.id}`;
  const matchingInvoices = invoices.filter((i) => i.orderId === ordId);
  const linkedInvoice =
    matchingInvoices.find((i) => i.status !== 'Voided') ?? matchingInvoices[0];

  const status: OrderStatus =
    o.status === 'Processing' || o.status === 'Completed' || o.status === 'Cancelled'
      ? o.status
      : 'Pending';

  return {
    id: ordId,
    backendId: o.id,
    customerId: o.customerId ? `U-${o.customerId}` : null,
    customerName: o.customerName,
    channel: o.channel === 'WalkIn' ? 'WalkIn' : 'Online',
    lines: o.items.map((i) => ({
      kind: 'variant',
      refId: `V-${i.variantId}`,
      name: i.bundleName
        ? `${i.bundleName} (${i.productName} — ${i.model})`
        : `${i.productName} — ${i.model}`,
      sku: i.sku,
      unitPrice: Number(i.unitPrice),
      qty: i.quantity,
    })),
    discountPercent: Number(o.discountPercent),
    subtotal: Number(o.subtotal),
    total: Number(o.total),
    status,
    payment: mapPayment(o.paymentMethod),
    address: o.shippingAddress ?? '',
    createdAt: o.createdAt,
    quotationId: o.quotationId ? `QT-${o.quotationId}` : null,
    invoiceId: linkedInvoice?.id ?? null,
  };
}

function mapMovement(m: ApiStockMovementDto, users: User[]): Movement {
  const reason = m.reason ?? '';
  let type: MoveType = 'Adjustment';
  if (m.type === 'StockOut') {
    type =
      reason.includes('Order') ||
      reason.includes('order') ||
      reason.includes('SalesOrder')
        ? 'Sale'
        : 'Stock-Out';
  } else if (m.type === 'StockIn') {
    if (reason.startsWith('Cancelled Order')) type = 'Cancel-Restock';
    else if (reason.startsWith('Received PO')) type = 'Receiving';
    else type = 'Stock-In';
  }

  const refMatch = reason.match(/(?:PO-\d+|Order\s+#\d+|Quotation\s+#\d+)/i);
  const actor = m.userId
    ? users.find((u) => u.backendId === m.userId)?.name ?? `User #${m.userId}`
    : 'System';

  return {
    id: `MV-${m.id}`,
    variantId: `V-${m.variantId}`,
    sku: m.sku,
    type,
    qty: m.quantityChange,
    reason,
    ref: refMatch ? refMatch[0] : '—',
    by: actor,
    at: m.createdAt,
  };
}

function mapSupplier(s: ApiSupplierDto): Supplier {
  return {
    id: `S-${s.id}`,
    backendId: s.id,
    name: s.name,
    contact: s.contactPerson ?? '',
    phone: s.phone ?? '',
  };
}

function mapRequisition(r: ApiRequisitionDto): Requisition {
  const status: Requisition['status'] =
    r.status === 'Approved' || r.status === 'Declined' ? r.status : 'Pending';
  return {
    id: `PR-${r.id}`,
    backendId: r.id,
    variantId: `V-${r.variantId}`,
    sku: r.sku,
    productName: r.productName,
    model: r.model,
    qty: r.quantity,
    reason: r.reason,
    requestedBy: r.requestedByName,
    status,
    poId: r.poNumber ?? (r.purchaseOrderId ? `PO-${r.purchaseOrderId}` : null),
    createdAt: r.createdAt,
  };
}

function mapPurchaseOrder(po: ApiPurchaseOrderDto): PurchaseOrder {
  const status: POStatus =
    po.status === 'Approved' || po.status === 'Sent' || po.status === 'Received'
      ? po.status
      : 'Draft';
  const source: PurchaseOrder['source'] =
    po.source === 'Requisition' || po.source === 'Admin' ? po.source : 'System';

  return {
    id: po.poNumber || `PO-${po.id}`,
    backendId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId ? `S-${po.supplierId}` : null,
    supplierName: po.supplierName ?? null,
    lines: po.items.map((item) => ({
      variantId: `V-${item.variantId}`,
      sku: item.sku,
      productName: item.productName,
      model: item.model,
      qty: item.quantityOrdered,
      received: item.quantityReceived,
    })),
    status,
    source,
    note: po.notes ?? '',
    createdAt: po.createdAt,
  };
}

function mapInquiry(c: ApiContactInquiryDto): Inquiry {
  return {
    id: `IN-${c.id}`,
    name: c.name,
    email: c.email,
    message: c.message,
    at: c.createdAt,
  };
}

function buildUsernameFromEmail(email: string): string {
  const base = email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 40);
  const safeBase = base.length >= 3 ? base : (base + 'user').slice(0, 10);
  return `${safeBase}${Math.floor(10 + Math.random() * 89)}`;
}

/* ============================== CONTEXT ============================== */
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
  syncWithBackend: (overrideUser?: User | null) => Promise<boolean>;
  flash: (msg: string, tone?: 'ok' | 'err') => void;
  login: (email: string, pw: string) => Promise<Res<User>>;
  register: (p: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) => Promise<Res<User>>;
  logout: () => Promise<void>;
  updateProfile: (p: { name: string; phone: string; address: string }) => Promise<Res<User>>;
  changePassword: (cur: string, next: string) => Promise<Res<void>>;
  addToCart: (kind: 'variant' | 'bundle', refId: string, qty?: number) => Promise<Res<void>>;
  setCartQty: (kind: string, refId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  requestQuotation: (note: string) => Promise<Res<Quotation>>;
  checkout: (payment: Payment, address: string) => Promise<Res<Order>>;
  acceptQuotation: (id: string) => Promise<Res<Quotation>>;
  convertQuotation: (id: string) => Promise<Res<{ id: string }>>;
  declineQuotation: (id: string) => Promise<Res<Quotation>>;
  saveQuotation: (p: {
    id?: string;
    customerId?: string | null;
    customerName?: string;
    items?: CartItem[];
    discountPercent: number;
    validDays: number;
    note: string;
  }) => Promise<Res<Quotation>>;
  walkInSale: (p: {
    customerName: string;
    items: CartItem[];
    discountPercent: number;
    payment: Payment;
    paid: boolean;
  }) => Promise<Res<{ orderId: string; invoiceId: string }>>;
  advanceOrder: (id: string) => Promise<Res<Order>>;
  cancelOrder: (id: string) => Promise<Res<Order>>;
  generateInvoice: (orderId: string) => Promise<Res<Invoice>>;
  markPaid: (id: string) => Promise<Res<Invoice>>;
  voidInvoice: (id: string, reason: string) => Promise<Res<Invoice>>;
  logStock: (p: {
    variantId: string;
    type: 'Stock-In' | 'Stock-Out';
    qty: number;
    reason: string;
  }) => Promise<Res<void>>;
  adjustStock: (p: {
    variantId: string;
    newCount: number;
    reason: string;
  }) => Promise<Res<void>>;
  createRequisition: (p: {
    variantId: string;
    qty: number;
    reason: string;
  }) => Promise<Res<Requisition>>;
  decideRequisition: (
    id: string,
    approve: boolean,
    supplierId?: string
  ) => Promise<Res<void>>;
  updatePO: (
    id: string,
    p: { supplierId?: string | null; lines?: POLine[] }
  ) => Promise<Res<void>>;
  setPOStatus: (id: string, to: 'Approved' | 'Sent') => Promise<Res<void>>;
  discardPO: (id: string) => Promise<Res<void>>;
  receivePO: (id: string, received: Record<number, number>) => Promise<Res<void>>;
  recalculateReorder: () => Promise<Res<{ draftPurchaseOrdersCreated: number }>>;
  saveProduct: (
    p: Partial<Product> & { name: string; category: Product['category'] }
  ) => Promise<Res<Product>>;
  saveVariant: (
    p: Partial<Variant> & {
      productId: string;
      name: string;
      sku: string;
      price: number;
    }
  ) => Promise<Res<Variant>>;
  saveBundle: (
    p: Partial<Bundle> & {
      name: string;
      sku: string;
      price: number;
      components: BundleComponent[];
    }
  ) => Promise<Res<Bundle>>;
  deleteBundle: (id: string) => Promise<Res<void>>;
  setMaxDiscount: (pct: number) => Promise<Res<void>>;
  saveSupplier: (p: Partial<Supplier> & { name: string }) => Promise<Res<Supplier>>;
  saveUser: (p: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: 'Staff' | 'Customer';
    phone?: string;
  }) => Promise<Res<User>>;
  toggleUser: (id: string) => Promise<Res<void>>;
  submitInquiry: (p: {
    name: string;
    email: string;
    message: string;
  }) => Promise<Res<void>>;
}

const SystemCtx = createContext<Ctx | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [guestCart, setGuestCart] = useState<CartItem[]>(readGuestCart);
  const [customerCart, setCustomerCart] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  const dbRef = useRef<DB>(db);
  const userRef = useRef<User | null>(currentUser);
  const guestCartRef = useRef<CartItem[]>(guestCart);
  const customerCartRef = useRef<CartItem[]>(customerCart);
  const timer = useRef<any>(null);

  dbRef.current = db;
  userRef.current = currentUser;
  guestCartRef.current = guestCart;
  customerCartRef.current = customerCart;

  const role: Role = currentUser?.role ?? 'Guest';

  const flash = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setNotice({ msg, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 4500);
  }, []);

  const updateGuestCart = useCallback((items: CartItem[]) => {
    guestCartRef.current = items;
    setGuestCart(items);
    writeGuestCart(items);
  }, []);

  /** Load full state from GRM-Backend according to current user role */
  const syncWithBackend = useCallback(
    async (overrideUser?: User | null): Promise<boolean> => {
      const activeUser =
        overrideUser !== undefined ? overrideUser : userRef.current;

      try {
        const [prodPage, bundleList] = await Promise.all([
          grmApi.products.list({ page: 1, pageSize: 100 }),
          grmApi.bundles.list().catch(() => [] as ApiBundleDto[]),
        ]);

        setApiOnline(true);

        if (!activeUser) {
          const { products, variants, bundles } = mapCatalog(
            prodPage.items,
            bundleList
          );
          const next: DB = {
            ...emptyDB(),
            products,
            variants,
            bundles,
          };
          dbRef.current = next;
          setDb(next);
          setCustomerCart([]);
          return true;
        }

        if (activeUser.role === 'Customer') {
          const [cartDto, apiOrders, apiInvoices, apiQuotes, apiProfile] =
            await Promise.all([
              grmApi.cart.get().catch(() => null),
              grmApi.orders.getMy().catch(() => [] as ApiOrderDto[]),
              grmApi.invoices.getMy().catch(() => [] as ApiInvoiceDto[]),
              grmApi.quotations.getMy().catch(() => [] as ApiQuotationDto[]),
              grmApi.profile.get().catch(() => null),
            ]);

          const refreshedUser = apiProfile ? mapUser(apiProfile) : activeUser;
          userRef.current = refreshedUser;
          setCurrentUser(refreshedUser);

          const { products, variants, bundles } = mapCatalog(
            prodPage.items,
            bundleList
          );
          const invoices = apiInvoices.map(mapInvoice);
          const orders = apiOrders.map((o) => mapOrder(o, invoices));
          const ordersByQuoteId = new Map<number, number>();
          for (const o of apiOrders) {
            if (o.quotationId) ordersByQuoteId.set(o.quotationId, o.id);
          }

          const next: DB = {
            ...emptyDB(),
            users: [refreshedUser],
            products,
            variants,
            bundles,
            orders,
            invoices,
            quotations: apiQuotes.map((q) => mapQuotation(q, ordersByQuoteId)),
          };
          dbRef.current = next;
          setDb(next);
          if (cartDto) {
            const mapped = mapCart(cartDto);
            customerCartRef.current = mapped;
            setCustomerCart(mapped);
          }
          return true;
        }

        // Staff or Admin
        const isAdmin = activeUser.role === 'Admin';
        const [
          apiOrders,
          apiInvoices,
          apiQuotes,
          apiInvItems,
          apiMovements,
          apiReqs,
          apiPOs,
          apiSettings,
          apiUsers,
          apiSuppliers,
          apiInquiries,
          apiReorder,
        ] = await Promise.all([
          grmApi.orders.getAll().catch(() => [] as ApiOrderDto[]),
          grmApi.invoices.getAll().catch(() => [] as ApiInvoiceDto[]),
          grmApi.quotations.getAll().catch(() => [] as ApiQuotationDto[]),
          grmApi.inventory.getAll().catch(() => [] as ApiInventoryItemDto[]),
          grmApi.inventory.movements().catch(() => [] as ApiStockMovementDto[]),
          grmApi.requisitions.list().catch(() => [] as ApiRequisitionDto[]),
          grmApi.purchaseOrders.list().catch(() => [] as ApiPurchaseOrderDto[]),
          grmApi.settings.get().catch(() => null),
          grmApi.users.list().catch(() => [] as ApiUserDto[]),
          isAdmin
            ? grmApi.suppliers.list().catch(() => [] as ApiSupplierDto[])
            : Promise.resolve([] as ApiSupplierDto[]),
          isAdmin
            ? grmApi.contact.list().catch(() => [] as ApiContactInquiryDto[])
            : Promise.resolve([] as ApiContactInquiryDto[]),
          isAdmin
            ? grmApi.reorder
                .suggestions(7, true)
                .catch(() => [] as ApiReorderSuggestionDto[])
            : Promise.resolve([] as ApiReorderSuggestionDto[]),
        ]);

        const users = apiUsers.map(mapUser);
        const { products, variants, bundles } = mapCatalog(
          prodPage.items,
          bundleList,
          apiInvItems,
          apiReorder
        );
        const invoices = apiInvoices.map(mapInvoice);
        const orders = apiOrders.map((o) => mapOrder(o, invoices));
        const ordersByQuoteId = new Map<number, number>();
        for (const o of apiOrders) {
          if (o.quotationId) ordersByQuoteId.set(o.quotationId, o.id);
        }

        const next: DB = {
          users: users.length ? users : [activeUser],
          products,
          variants,
          bundles,
          orders,
          invoices,
          quotations: apiQuotes.map((q) => mapQuotation(q, ordersByQuoteId)),
          movements: apiMovements.map((m) => mapMovement(m, users)),
          suppliers: apiSuppliers.map(mapSupplier),
          requisitions: apiReqs.map(mapRequisition),
          pos: apiPOs.map(mapPurchaseOrder),
          inquiries: apiInquiries.map(mapInquiry),
          settings: {
            maxStaffDiscountPercent: apiSettings
              ? Number(apiSettings.maxStaffDiscountPercent)
              : 15,
            defaultQuotationValidityDays: apiSettings
              ? apiSettings.defaultQuotationValidityDays
              : 7,
          },
        };

        dbRef.current = next;
        setDb(next);
        setCustomerCart([]);
        return true;
      } catch {
        setApiOnline(false);
        return false;
      }
    },
    []
  );

  /** Push any Guest localStorage cart items into Customer's backend cart on login/register */
  const mergeGuestCartToBackend = useCallback(async () => {
    const itemsToMerge = [...guestCartRef.current];
    if (itemsToMerge.length === 0) return;

    for (const item of itemsToMerge) {
      if (item.kind === 'variant') {
        const v = dbRef.current.variants.find((x) => x.id === item.refId);
        const vid = v?.backendId ?? Number(item.refId.replace(/^V-/, ''));
        if (vid > 0) {
          await grmApi.cart.addItem(vid, item.qty).catch(() => {});
        }
      } else {
        const b = dbRef.current.bundles.find((x) => x.id === item.refId);
        const bid = b?.backendId ?? Number(item.refId.replace(/^B-/, ''));
        if (bid > 0) {
          await grmApi.cart.addBundle(bid, item.qty).catch(() => {});
        }
      }
    }

    updateGuestCart([]);
  }, [updateGuestCart]);

  // Restore session from JWT token in localStorage and sync initial catalog
  useEffect(() => {
    let active = true;
    (async () => {
      const storedToken = readStoredToken();
      if (storedToken) {
        setApiToken(storedToken);
        try {
          const me = await grmApi.auth.me();
          if (!active) return;
          const mapped = mapUser(me);
          userRef.current = mapped;
          setCurrentUser(mapped);
          await syncWithBackend(mapped);
          return;
        } catch {
          setApiToken(null);
          writeStoredToken(null);
        }
      }
      if (!active) return;
      userRef.current = null;
      setCurrentUser(null);
      await syncWithBackend(null);
    })();
    return () => {
      active = false;
    };
  }, [syncWithBackend]);

  const splitLineItems = (items: CartItem[]) => {
    const variantItems: { variantId: number; quantity: number }[] = [];
    const bundleItems: { bundleId: number; quantity: number }[] = [];
    for (const item of items) {
      if (item.kind === 'variant') {
        const v = dbRef.current.variants.find((x) => x.id === item.refId);
        if (v) variantItems.push({ variantId: v.backendId, quantity: item.qty });
      } else {
        const b = dbRef.current.bundles.find((x) => x.id === item.refId);
        if (b) bundleItems.push({ bundleId: b.backendId, quantity: item.qty });
      }
    }
    return { variantItems, bundleItems };
  };

  const api: Omit<
    Ctx,
    | 'db'
    | 'user'
    | 'role'
    | 'cart'
    | 'listings'
    | 'notice'
    | 'apiOnline'
    | 'apiBaseUrl'
    | 'syncWithBackend'
    | 'flash'
  > = {
    login: async (email, pw) => {
      try {
        const authRes = await grmApi.auth.login(email.trim(), pw);
        setApiToken(authRes.token);
        writeStoredToken(authRes.token);
        const mapped = mapUser(authRes.user);
        userRef.current = mapped;
        setCurrentUser(mapped);
        if (mapped.role === 'Customer') {
          await mergeGuestCartToBackend();
        }
        await syncWithBackend(mapped);
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Login failed' };
      }
    },

    register: async (p) => {
      try {
        if (!p.name.trim() || !p.email.includes('@') || p.password.length < 6) {
          throw new Error(
            'Enter a name, valid email and a password of 6+ characters'
          );
        }
        const username = buildUsernameFromEmail(p.email.trim());
        await grmApi.auth.register({
          username,
          email: p.email.trim(),
          password: p.password,
          fullName: p.name.trim(),
          phoneNumber: p.phone?.trim() || undefined,
        });
        const authRes = await grmApi.auth.login(p.email.trim(), p.password);
        setApiToken(authRes.token);
        writeStoredToken(authRes.token);
        const mapped = mapUser(authRes.user);
        userRef.current = mapped;
        setCurrentUser(mapped);
        await mergeGuestCartToBackend();
        await syncWithBackend(mapped);
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Registration failed' };
      }
    },

    logout: async () => {
      await grmApi.auth.logout().catch(() => {});
      setApiToken(null);
      writeStoredToken(null);
      userRef.current = null;
      setCurrentUser(null);
      customerCartRef.current = [];
      setCustomerCart([]);
      await syncWithBackend(null);
    },

    updateProfile: async (p) => {
      try {
        const updated = await grmApi.profile.update({
          fullName: p.name,
          phoneNumber: p.phone,
          address: p.address,
        });
        const mapped = mapUser(updated);
        userRef.current = mapped;
        setCurrentUser(mapped);
        await syncWithBackend(mapped);
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to update profile' };
      }
    },

    changePassword: async (cur, next) => {
      try {
        if (next.length < 6) {
          throw new Error('New password must be at least 6 characters');
        }
        await grmApi.auth.changePassword(cur, next);
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to change password' };
      }
    },

    addToCart: async (kind, refId, qty = 1) => {
      // Guest cart stays strictly in localStorage
      if (!userRef.current) {
        const current = [...guestCartRef.current];
        const existing = current.find(
          (i) => i.kind === kind && i.refId === refId
        );
        if (existing) existing.qty += qty;
        else current.push({ kind, refId, qty });
        updateGuestCart(current);
        return { ok: true, data: undefined };
      }

      if (userRef.current.role !== 'Customer') {
        return {
          ok: false,
          error: 'Only Guests and Customers can use the shopping cart',
        };
      }

      try {
        let dto: ApiCartDto;
        if (kind === 'variant') {
          const v = dbRef.current.variants.find((x) => x.id === refId);
          if (!v) throw new Error('Item not found');
          dto = await grmApi.cart.addItem(v.backendId, qty);
        } else {
          const b = dbRef.current.bundles.find((x) => x.id === refId);
          if (!b) throw new Error('Bundle not found');
          dto = await grmApi.cart.addBundle(b.backendId, qty);
        }
        const mapped = mapCart(dto);
        customerCartRef.current = mapped;
        setCustomerCart(mapped);
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to add item to cart' };
      }
    },

    setCartQty: async (kind, refId, qty) => {
      // Guest cart stays strictly in localStorage
      if (!userRef.current) {
        const next = guestCartRef.current
          .map((i) =>
            i.kind === kind && i.refId === refId ? { ...i, qty } : i
          )
          .filter((i) => i.qty > 0);
        updateGuestCart(next);
        return;
      }

      if (userRef.current.role !== 'Customer') return;

      try {
        let dto: ApiCartDto;
        if (kind === 'variant') {
          const v = dbRef.current.variants.find((x) => x.id === refId);
          if (!v) return;
          dto =
            qty > 0
              ? await grmApi.cart.updateItem(v.backendId, qty)
              : await grmApi.cart.removeItem(v.backendId);
        } else {
          const b = dbRef.current.bundles.find((x) => x.id === refId);
          if (!b) return;
          dto =
            qty > 0
              ? await grmApi.cart.updateBundle(b.backendId, qty)
              : await grmApi.cart.removeBundle(b.backendId);
        }
        const mapped = mapCart(dto);
        customerCartRef.current = mapped;
        setCustomerCart(mapped);
      } catch (e: any) {
        flash(e?.message ?? 'Failed to update cart', 'err');
      }
    },

    clearCart: async () => {
      if (!userRef.current) {
        updateGuestCart([]);
        return;
      }
      if (userRef.current.role !== 'Customer') return;
      try {
        await grmApi.cart.clear();
        customerCartRef.current = [];
        setCustomerCart([]);
      } catch (e: any) {
        flash(e?.message ?? 'Failed to clear cart', 'err');
      }
    },

    requestQuotation: async (note) => {
      try {
        if (userRef.current?.role !== 'Customer') {
          throw new Error('Log in as a Customer to request a quotation');
        }
        const { variantItems, bundleItems } = splitLineItems(
          customerCartRef.current
        );
        if (!variantItems.length && !bundleItems.length) {
          throw new Error('Your cart is empty');
        }
        const apiQ = await grmApi.quotations.requestQuote(
          variantItems,
          note,
          bundleItems.length ? bundleItems : undefined
        );
        await grmApi.cart.clear().catch(() => {});
        customerCartRef.current = [];
        setCustomerCart([]);
        await syncWithBackend();
        return { ok: true, data: mapQuotation(apiQ, new Map()) };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to request quotation',
        };
      }
    },

    checkout: async (payment, address) => {
      try {
        if (userRef.current?.role !== 'Customer') {
          throw new Error('Log in as a Customer to place an order');
        }
        if (!address.trim()) {
          throw new Error('Delivery address is required');
        }
        const apiOrder = await grmApi.orders.checkout({
          paymentMethod: payment,
          shippingAddress: address.trim(),
        });
        customerCartRef.current = [];
        setCustomerCart([]);
        await syncWithBackend();
        const mapped =
          dbRef.current.orders.find((o) => o.backendId === apiOrder.id) ??
          mapOrder(apiOrder, dbRef.current.invoices);
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Checkout failed' };
      }
    },

    acceptQuotation: async (id) => {
      try {
        const q = dbRef.current.quotations.find((x) => x.id === id);
        if (!q) throw new Error('Quotation not found');
        const apiQ = await grmApi.quotations.accept(q.backendId);
        await syncWithBackend();
        return { ok: true, data: mapQuotation(apiQ, new Map()) };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to accept quotation',
        };
      }
    },

    convertQuotation: async (id) => {
      try {
        const q = dbRef.current.quotations.find((x) => x.id === id);
        if (!q) throw new Error('Quotation not found');
        const orderRes = await grmApi.quotations.convert(q.backendId);
        await syncWithBackend();
        return { ok: true, data: { id: `ORD-${orderRes.id}` } };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to convert quotation',
        };
      }
    },

    declineQuotation: async (id) => {
      try {
        const q = dbRef.current.quotations.find((x) => x.id === id);
        if (!q) throw new Error('Quotation not found');
        const apiQ = await grmApi.quotations.decline(
          q.backendId,
          'Declined by customer'
        );
        await syncWithBackend();
        return { ok: true, data: mapQuotation(apiQ, new Map()) };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to decline quotation',
        };
      }
    },

    saveQuotation: async (p) => {
      try {
        if (p.id) {
          const q = dbRef.current.quotations.find((x) => x.id === p.id);
          if (!q) throw new Error('Quotation not found');
          await grmApi.quotations.update(q.backendId, {
            discountPercent: p.discountPercent,
            notes: p.note,
          });
          const sent = await grmApi.quotations.send(q.backendId, {
            validDays: p.validDays,
          });
          await syncWithBackend();
          return { ok: true, data: mapQuotation(sent, new Map()) };
        }

        const cust = dbRef.current.users.find((u) => u.id === p.customerId);
        if (!cust?.backendId) {
          throw new Error('Select a registered Customer account');
        }
        const { variantItems, bundleItems } = splitLineItems(p.items ?? []);
        if (!variantItems.length && !bundleItems.length) {
          throw new Error('Select at least one item');
        }
        const created = await grmApi.quotations.create({
          customerId: cust.backendId,
          items: variantItems,
          bundles: bundleItems.length ? bundleItems : undefined,
          discountPercent: p.discountPercent,
          notes: p.note,
        });
        const sent = await grmApi.quotations.send(created.id, {
          validDays: p.validDays,
        });
        await syncWithBackend();
        return { ok: true, data: mapQuotation(sent, new Map()) };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to save quotation' };
      }
    },

    walkInSale: async (p) => {
      try {
        const { variantItems, bundleItems } = splitLineItems(p.items);
        if (!variantItems.length && !bundleItems.length) {
          throw new Error('Select at least one item');
        }
        const order = await grmApi.orders.createWalkIn({
          customerName: p.customerName.trim() || 'Walk-in Customer',
          items: variantItems,
          bundles: bundleItems.length ? bundleItems : undefined,
          discountPercent: p.discountPercent,
          paymentMethod: p.payment,
          status: 'Completed',
        });
        const inv = await grmApi.invoices.generate(order.id, {
          paymentMethod: p.payment,
          paymentStatus: p.paid ? 'Paid' : 'Unpaid',
        });
        await syncWithBackend();
        return {
          ok: true,
          data: {
            orderId: `ORD-${order.id}`,
            invoiceId: inv.invoiceNumber || `INV-${inv.id}`,
          },
        };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to record walk-in sale',
        };
      }
    },

    advanceOrder: async (id) => {
      try {
        const ord = dbRef.current.orders.find((o) => o.id === id);
        if (!ord) throw new Error('Order not found');
        const nextStatus =
          ord.status === 'Pending'
            ? 'Processing'
            : ord.status === 'Processing'
              ? 'Completed'
              : null;
        if (!nextStatus) throw new Error(`Order is ${ord.status}`);
        const updated = await grmApi.orders.updateStatus(
          ord.backendId,
          nextStatus
        );
        await syncWithBackend();
        return {
          ok: true,
          data:
            dbRef.current.orders.find((o) => o.backendId === updated.id) ??
            mapOrder(updated, dbRef.current.invoices),
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to advance order' };
      }
    },

    cancelOrder: async (id) => {
      try {
        const ord = dbRef.current.orders.find((o) => o.id === id);
        if (!ord) throw new Error('Order not found');
        const cancelled = await grmApi.orders.cancel(
          ord.backendId,
          'Cancelled via portal'
        );
        await syncWithBackend();
        return {
          ok: true,
          data:
            dbRef.current.orders.find((o) => o.backendId === cancelled.id) ??
            mapOrder(cancelled, dbRef.current.invoices),
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to cancel order' };
      }
    },

    generateInvoice: async (orderId) => {
      try {
        const ord = dbRef.current.orders.find((o) => o.id === orderId);
        if (!ord) throw new Error('Order not found');
        const inv = await grmApi.invoices.generate(ord.backendId);
        await syncWithBackend();
        return { ok: true, data: mapInvoice(inv) };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to generate invoice',
        };
      }
    },

    markPaid: async (id) => {
      try {
        const inv = dbRef.current.invoices.find((i) => i.id === id);
        if (!inv) throw new Error('Invoice not found');
        const updated = await grmApi.invoices.updatePaymentStatus(
          inv.backendId,
          { paymentStatus: 'Paid' }
        );
        await syncWithBackend();
        return { ok: true, data: mapInvoice(updated) };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to mark invoice as Paid',
        };
      }
    },

    voidInvoice: async (id, reason) => {
      try {
        const inv = dbRef.current.invoices.find((i) => i.id === id);
        if (!inv) throw new Error('Invoice not found');
        if (!reason.trim()) {
          throw new Error('A reason is required to void an invoice');
        }
        const updated = await grmApi.invoices.void(inv.backendId, reason.trim());
        await syncWithBackend();
        return { ok: true, data: mapInvoice(updated) };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to void invoice' };
      }
    },

    logStock: async (p) => {
      try {
        const v = dbRef.current.variants.find((x) => x.id === p.variantId);
        if (!v) throw new Error('Select a variant');
        if (!p.reason.trim()) throw new Error('A reason is mandatory');
        if (!Number.isInteger(p.qty) || p.qty < 1) {
          throw new Error('Quantity must be a whole number ≥ 1');
        }
        if (p.type === 'Stock-In') {
          await grmApi.inventory.stockIn(v.backendId, p.qty, p.reason.trim());
        } else {
          await grmApi.inventory.stockOut(v.backendId, p.qty, p.reason.trim());
        }
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to log stock' };
      }
    },

    adjustStock: async (p) => {
      try {
        const v = dbRef.current.variants.find((x) => x.id === p.variantId);
        if (!v) throw new Error('Select a variant');
        if (!p.reason.trim()) throw new Error('An audit reason is required');
        if (!Number.isInteger(p.newCount) || p.newCount < 0) {
          throw new Error('New count must be a whole number ≥ 0');
        }
        await grmApi.inventory.adjust(
          v.backendId,
          p.newCount,
          p.reason.trim()
        );
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to adjust stock' };
      }
    },

    createRequisition: async (p) => {
      try {
        const v = dbRef.current.variants.find((x) => x.id === p.variantId);
        if (!v) throw new Error('Select a variant');
        if (!Number.isInteger(p.qty) || p.qty < 1) {
          throw new Error('Quantity must be ≥ 1');
        }
        const req = await grmApi.requisitions.create({
          variantId: v.backendId,
          quantity: p.qty,
          reason: p.reason.trim() || 'Low stock',
        });
        await syncWithBackend();
        return { ok: true, data: mapRequisition(req) };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to submit requisition',
        };
      }
    },

    decideRequisition: async (id, approve, supplierId) => {
      try {
        const req = dbRef.current.requisitions.find((r) => r.id === id);
        if (!req) throw new Error('Requisition not found');
        if (approve) {
          const sup = supplierId
            ? dbRef.current.suppliers.find((s) => s.id === supplierId)
            : undefined;
          await grmApi.requisitions.approve(req.backendId, {
            supplierId: sup?.backendId,
            createPurchaseOrder: true,
          });
        } else {
          await grmApi.requisitions.decline(req.backendId, {
            reason: 'Declined by Admin',
          });
        }
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to process requisition',
        };
      }
    },

    updatePO: async (id, p) => {
      try {
        const po = dbRef.current.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        const sup =
          p.supplierId !== undefined && p.supplierId !== null
            ? dbRef.current.suppliers.find((s) => s.id === p.supplierId)
            : undefined;

        const items = p.lines
          ? p.lines.map((l) => {
              const v = dbRef.current.variants.find((x) => x.id === l.variantId);
              if (!v) throw new Error('Variant not found');
              if (!Number.isInteger(l.qty) || l.qty < 1) {
                throw new Error('Quantities must be whole numbers ≥ 1');
              }
              return { variantId: v.backendId, quantityOrdered: l.qty };
            })
          : undefined;

        await grmApi.purchaseOrders.update(po.backendId, {
          ...(p.supplierId !== undefined
            ? { supplierId: sup?.backendId ?? null, clearSupplier: p.supplierId === null }
            : {}),
          ...(items ? { items } : {}),
        });
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to update PO' };
      }
    },

    setPOStatus: async (id, to) => {
      try {
        const po = dbRef.current.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        if (to === 'Approved') {
          await grmApi.purchaseOrders.approve(po.backendId);
        } else {
          await grmApi.purchaseOrders.send(po.backendId);
        }
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to update PO status' };
      }
    },

    discardPO: async (id) => {
      try {
        const po = dbRef.current.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        await grmApi.purchaseOrders.remove(po.backendId);
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to discard PO' };
      }
    },

    receivePO: async (id, rec) => {
      try {
        const po = dbRef.current.pos.find((x) => x.id === id);
        if (!po) throw new Error('PO not found');
        const items: { variantId: number; quantityReceived: number }[] = [];
        po.lines.forEach((l, idx) => {
          const add = rec[idx] ?? 0;
          if (add > 0) {
            const v = dbRef.current.variants.find((x) => x.id === l.variantId);
            if (v) {
              items.push({ variantId: v.backendId, quantityReceived: add });
            }
          }
        });
        if (!items.length) throw new Error('Enter at least one received quantity');
        await grmApi.purchaseOrders.receive(po.backendId, { items });
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to receive PO' };
      }
    },

    recalculateReorder: async () => {
      try {
        const res = await grmApi.reorder.recalculate({
          lookbackDays: 7,
          generateDraftPurchaseOrders: true,
        });
        await syncWithBackend();
        return {
          ok: true,
          data: {
            draftPurchaseOrdersCreated: res.draftPurchaseOrdersCreated,
          },
        };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to recalculate reorder suggestions',
        };
      }
    },

    saveProduct: async (p) => {
      try {
        if (!p.name.trim()) throw new Error('Name is required');
        let dto: ApiProductDto;
        if (p.id) {
          const existing = dbRef.current.products.find((x) => x.id === p.id);
          if (!existing) throw new Error('Product not found');
          dto = await grmApi.products.update(existing.backendId, {
            name: p.name.trim(),
            description: p.description ?? existing.description,
            category: p.category,
            imageUrl: p.imageUrl ?? existing.imageUrl,
            isFeatured: p.isFeatured ?? existing.isFeatured,
            isActive: p.active ?? existing.active,
          });
        } else {
          dto = await grmApi.products.create({
            name: p.name.trim(),
            description: p.description,
            category: p.category,
            imageUrl: p.imageUrl,
            isFeatured: p.isFeatured,
            isActive: p.active ?? true,
          });
        }
        await syncWithBackend();
        const mapped =
          dbRef.current.products.find((x) => x.backendId === dto.id) ?? {
            id: `P-${dto.id}`,
            backendId: dto.id,
            name: dto.name,
            category: mapCategory(dto.category),
            description: dto.description ?? '',
            active: dto.isActive,
          };
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to save product' };
      }
    },

    saveVariant: async (p) => {
      try {
        if (!p.name.trim() || !p.sku.trim()) {
          throw new Error('Name and SKU are required');
        }
        if (!(p.price >= 0)) throw new Error('Invalid price');

        let dto;
        if (p.id) {
          const existing = dbRef.current.variants.find((x) => x.id === p.id);
          if (!existing) throw new Error('Variant not found');
          dto = await grmApi.products.updateVariant(existing.backendId, {
            model: p.name.trim(),
            sku: p.sku.trim(),
            price: p.price,
            stock: p.stock ?? existing.stock,
            imageUrl: p.imageUrl ?? existing.imageUrl,
          });
        } else {
          const prod = dbRef.current.products.find((x) => x.id === p.productId);
          if (!prod) throw new Error('Product not found');
          dto = await grmApi.products.addVariant(prod.backendId, {
            model: p.name.trim(),
            sku: p.sku.trim(),
            price: p.price,
            stock: p.stock ?? 0,
            imageUrl: p.imageUrl,
          });
        }
        await syncWithBackend();
        const mapped =
          dbRef.current.variants.find((x) => x.backendId === dto.id) ?? {
            id: `V-${dto.id}`,
            backendId: dto.id,
            productId: `P-${dto.productId}`,
            name: dto.model,
            sku: dto.sku,
            price: Number(dto.price),
            stock: dto.stock,
            dailySales: [0, 0, 0, 0, 0, 0, 0],
            active: true,
          };
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to save variant' };
      }
    },

    saveBundle: async (p) => {
      try {
        if (!p.name.trim()) throw new Error('Name is required');
        if (!p.components.length) {
          throw new Error('A bundle needs at least one component');
        }
        if (p.components.some((c) => c.qty < 1)) {
          throw new Error('Component quantities must be ≥ 1');
        }
        const items = p.components.map((c) => {
          const v = dbRef.current.variants.find((x) => x.id === c.variantId);
          if (!v) throw new Error('Bundle component variant not found');
          return { variantId: v.backendId, quantity: c.qty };
        });

        let dto: ApiBundleDto;
        if (p.id) {
          const existing = dbRef.current.bundles.find((x) => x.id === p.id);
          if (!existing) throw new Error('Bundle not found');
          dto = await grmApi.bundles.update(existing.backendId, {
            name: p.name.trim(),
            description: p.description ?? existing.description,
            price: p.price,
            imageUrl: p.imageUrl ?? existing.imageUrl,
            items,
          });
        } else {
          dto = await grmApi.bundles.create({
            name: p.name.trim(),
            description: p.description,
            price: p.price,
            imageUrl: p.imageUrl,
            items,
          });
        }
        await syncWithBackend();
        const mapped =
          dbRef.current.bundles.find((x) => x.backendId === dto.id) ?? {
            id: `B-${dto.id}`,
            backendId: dto.id,
            name: dto.name,
            sku: `BND-${dto.id}`,
            description: dto.description ?? '',
            price: Number(dto.price),
            active: true,
            components: p.components,
          };
        return { ok: true, data: mapped };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to save bundle' };
      }
    },

    deleteBundle: async (id) => {
      try {
        const b = dbRef.current.bundles.find((x) => x.id === id);
        if (!b) throw new Error('Bundle not found');
        await grmApi.bundles.remove(b.backendId);
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to delete bundle' };
      }
    },

    setMaxDiscount: async (pct) => {
      try {
        if (!(pct >= 0 && pct <= 100)) throw new Error('Enter 0–100');
        await grmApi.settings.update({ maxStaffDiscountPercent: pct });
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to update discount limit',
        };
      }
    },

    saveSupplier: async (p) => {
      try {
        if (!p.name.trim()) throw new Error('Supplier name is required');
        let dto: ApiSupplierDto;
        if (p.id) {
          const existing = dbRef.current.suppliers.find((s) => s.id === p.id);
          if (!existing) throw new Error('Supplier not found');
          dto = await grmApi.suppliers.update(existing.backendId, {
            name: p.name.trim(),
            contactPerson: p.contact,
            phone: p.phone,
          });
        } else {
          dto = await grmApi.suppliers.create({
            name: p.name.trim(),
            contactPerson: p.contact,
            phone: p.phone,
          });
        }
        await syncWithBackend();
        return { ok: true, data: mapSupplier(dto) };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to save supplier' };
      }
    },

    saveUser: async (p) => {
      try {
        if (!p.name.trim() || !p.email.includes('@')) {
          throw new Error('Name and valid email are required');
        }
        if (!p.password || p.password.length < 6) {
          throw new Error('Password must be 6+ characters');
        }
        const created = await grmApi.users.create({
          username: buildUsernameFromEmail(p.email.trim()),
          email: p.email.trim(),
          password: p.password,
          role: p.role,
          fullName: p.name.trim(),
          phoneNumber: p.phone,
        });
        await syncWithBackend();
        return { ok: true, data: mapUser(created) };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to create account' };
      }
    },

    toggleUser: async (id) => {
      try {
        const u = dbRef.current.users.find((x) => x.id === id);
        if (!u) throw new Error('User not found');
        await grmApi.users.setStatus(u.backendId, !u.active);
        await syncWithBackend();
        return { ok: true, data: undefined };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ?? 'Failed to update user status',
        };
      }
    },

    submitInquiry: async (p) => {
      try {
        if (!p.name.trim() || !p.email.includes('@') || !p.message.trim()) {
          throw new Error('Please complete all fields');
        }
        await grmApi.contact.submit({
          name: p.name.trim(),
          email: p.email.trim(),
          message: p.message.trim(),
        });
        return { ok: true, data: undefined };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Failed to send inquiry' };
      }
    },
  };

  const activeCart = role === 'Guest' ? guestCart : role === 'Customer' ? customerCart : [];

  const value = useMemo<Ctx>(
    () => ({
      db,
      user: currentUser,
      role,
      cart: activeCart,
      listings: buildListings(db),
      notice,
      apiOnline,
      apiBaseUrl: API_BASE_URL,
      syncWithBackend,
      flash,
      ...api,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, currentUser, role, activeCart, notice, apiOnline]
  );

  return <SystemCtx.Provider value={value}>{children}</SystemCtx.Provider>;
}

export function useSystem(): Ctx {
  const c = useContext(SystemCtx);
  if (!c) throw new Error('useSystem must be used inside SystemProvider');
  return c;
}
