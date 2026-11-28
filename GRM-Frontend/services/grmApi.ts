/**
 * Typed REST API Client for GRM-Backend (ASP.NET Core 9.0 Web API)
 * Default base URL: http://localhost:5133 (from Properties/launchSettings.json)
 */

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:5133';

let currentJwtToken: string | null = null;

export function setApiToken(token: string | null) {
  currentJwtToken = token;
}

export function getApiToken(): string | null {
  return currentJwtToken;
}

/* ==================== Backend DTO Interfaces ==================== */

export interface ApiUserDto {
  id: number;
  username: string;
  email: string;
  role: 'Customer' | 'Staff' | 'Admin' | string;
  fullName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApiAuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: ApiUserDto;
}

export interface ApiVariantDto {
  id: number;
  productId: number;
  model: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

export interface ApiProductDto {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive: boolean;
  minPrice?: number | null;
  totalStock: number;
  variants: ApiVariantDto[];
}

export interface ApiPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiBundleItemDto {
  variantId: number;
  productName?: string;
  sku: string;
  model: string;
  quantity: number;
  stock?: number;
}

export interface ApiBundleDto {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  availableStock?: number;
  items: ApiBundleItemDto[];
}

export interface ApiCartItemDto {
  variantId: number;
  productId: number;
  productName: string;
  model: string;
  sku: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
}

export interface ApiCartBundleItemDto {
  bundleId: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  availableStock: number;
  lineTotal: number;
  components: ApiBundleItemDto[];
}

export interface ApiCartDto {
  items: ApiCartItemDto[];
  bundles: ApiCartBundleItemDto[];
  totalQuantity: number;
  total: number;
}

export interface ApiInventoryItemDto {
  variantId: number;
  productId: number;
  productName: string;
  model: string;
  sku: string;
  stock: number;
  reorderThreshold: number;
}

export interface ApiStockMovementDto {
  id: number;
  variantId: number;
  sku: string;
  type: 'StockIn' | 'StockOut' | 'Adjustment' | string;
  quantityChange: number;
  stockAfter: number;
  reason?: string | null;
  userId?: number | null;
  createdAt: string;
}

export interface ApiQuotationItemDto {
  id: number;
  variantId: number;
  bundleId?: number | null;
  bundleName?: string | null;
  sku: string;
  productName: string;
  model: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ApiQuotationDto {
  id: number;
  customerId: number;
  customerName: string;
  staffId?: number | null;
  staffName?: string | null;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Converted' | string;
  notes?: string | null;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  updatedAt?: string | null;
  sentAt?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  respondedAt?: string | null;
  declineReason?: string | null;
  items: ApiQuotationItemDto[];
}

export interface ApiSalesOrderDto {
  id: number;
  quotationId: number;
  customerId: number;
  customerName: string;
  total: number;
  createdAt: string;
}

export interface ApiOrderItemDto {
  id: number;
  variantId: number;
  bundleId?: number | null;
  bundleName?: string | null;
  sku: string;
  productName: string;
  model: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ApiOrderCorrectionDto {
  id: number;
  correctedByUserId: number;
  correctedByName: string;
  reason: string;
  previousTotal: number;
  newTotal: number;
  correctedAt: string;
}

export interface ApiOrderDto {
  id: number;
  quotationId?: number | null;
  customerId?: number | null;
  customerName: string;
  staffId?: number | null;
  staffName?: string | null;
  channel: 'Online' | 'WalkIn' | string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | string;
  paymentMethod?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  isCorrected: boolean;
  correctedAt?: string | null;
  correctedByUserId?: number | null;
  correctedByName?: string | null;
  correctionReason?: string | null;
  items: ApiOrderItemDto[];
  corrections: ApiOrderCorrectionDto[];
}

export interface ApiInvoiceItemDto {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  model: string;
  bundleName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ApiInvoiceDto {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderChannel: string;
  orderStatus: string;
  customerId?: number | null;
  customerName: string;
  billingAddress?: string | null;
  issuedByUserId: number;
  issuedByName: string;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' | string;
  paymentMethod?: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  issuedAt: string;
  dueDate?: string | null;
  paidAt?: string | null;
  updatedAt?: string | null;
  isVoided: boolean;
  voidedAt?: string | null;
  voidedByUserId?: number | null;
  voidedByName?: string | null;
  voidReason?: string | null;
  items: ApiInvoiceItemDto[];
}

export interface ApiSupplierDto {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApiRequisitionDto {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  model: string;
  currentStock: number;
  quantity: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined' | string;
  requestedByUserId: number;
  requestedByName: string;
  reviewedByUserId?: number | null;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  purchaseOrderId?: number | null;
  poNumber?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApiReorderSettingsDto {
  variantId: number;
  sku: string;
  productName: string;
  model: string;
  stock: number;
  reorderThreshold: number;
  defaultReorderQuantity?: number | null;
  leadTimeDays: number;
  safetyStock: number;
  useDynamicThreshold: boolean;
  salesVelocity: number;
  lastReorderCalculatedAt?: string | null;
}

export interface ApiReorderSuggestionDto {
  variantId: number;
  productId: number;
  productName: string;
  model: string;
  sku: string;
  currentStock: number;
  reorderThreshold: number;
  computedThreshold: number;
  effectiveThreshold: number;
  defaultReorderQuantity?: number | null;
  leadTimeDays: number;
  safetyStock: number;
  useDynamicThreshold: boolean;
  unitsSoldInWindow: number;
  lookbackDays: number;
  dailySalesVelocity: number;
  needsReorder: boolean;
  suggestedQuantity: number;
  openPurchaseOrderQuantity: number;
  hasOpenPurchaseOrder: boolean;
  lastCalculatedAt?: string | null;
}

export interface ApiRecalculateReorderResponse {
  calculatedAt: string;
  lookbackDays: number;
  variantsEvaluated: number;
  lowStockCount: number;
  draftPurchaseOrdersCreated: number;
  createdPurchaseOrderIds: number[];
  suggestions: ApiReorderSuggestionDto[];
}

export interface ApiPurchaseOrderItemDto {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  model: string;
  currentStock: number;
  quantityOrdered: number;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  lineTotal: number;
}

export interface ApiPurchaseOrderDto {
  id: number;
  poNumber: string;
  supplierId?: number | null;
  supplierName?: string | null;
  supplierContact?: string | null;
  supplierPhone?: string | null;
  requisitionId?: number | null;
  status: 'Draft' | 'Approved' | 'Sent' | 'Received' | string;
  source: 'System' | 'Requisition' | 'Admin' | string;
  notes?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  approvedByUserId?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  totalQuantityOrdered: number;
  totalQuantityReceived: number;
  totalCost: number;
  items: ApiPurchaseOrderItemDto[];
}

export interface ApiBusinessSettingsDto {
  maxStaffDiscountPercent: number;
  defaultQuotationValidityDays: number;
  updatedAt: string;
  updatedByUserId?: number | null;
  updatedByName?: string | null;
}

export interface ApiContactInquiryDto {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string | null;
  subject?: string | null;
  message: string;
  createdAt: string;
}

export interface ApiLowStockAlertDto {
  variantId: number;
  productId: number;
  productName: string;
  model: string;
  sku: string;
  currentStock: number;
  reorderThreshold: number;
  shortage: number;
  salesVelocity: number;
  status: string;
}

export interface ApiDashboardDto {
  date: string;
  todaySalesRevenue: number;
  todayOrdersCount: number;
  todayOnlineOrdersCount: number;
  todayWalkInOrdersCount: number;
  todayUnitsSold: number;
  todayPaidRevenue: number;
  openOrdersCount: number;
  pendingOrdersCount: number;
  processingOrdersCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingRequisitionsCount: number;
  draftPurchaseOrdersCount: number;
  totalPaidRevenue?: number | null;
  lowStockAlerts: ApiLowStockAlertDto[];
}

export interface ApiDailySummaryReportDto {
  date: string;
  ordersCount: number;
  cancelledOrdersCount: number;
  onlineOrdersCount: number;
  onlineSalesTotal: number;
  walkInOrdersCount: number;
  walkInSalesTotal: number;
  totalSales: number;
  totalDiscounts: number;
  unitsSold: number;
  invoicesIssuedCount: number;
  invoicesPaidCount: number;
  paymentsCollectedToday: number;
  lowStockAlertsCount: number;
  byStatus: { status: string; orderCount: number; totalAmount: number }[];
}

export interface ApiSalesReportDto {
  from: string;
  to: string;
  orderCount: number;
  cancelledOrderCount: number;
  cancelledOrderTotal: number;
  unitsSold: number;
  grossRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  collectedRevenue: number;
  unpaidReceivables: number;
  voidedInvoicesTotal: number;
  byChannel: { channel: string; orderCount: number; unitsSold: number; revenue: number }[];
  byStatus: { status: string; orderCount: number; totalAmount: number }[];
  dailyTrend: {
    date: string;
    orderCount: number;
    unitsSold: number;
    revenue: number;
    costOfGoodsSold: number;
    profit: number;
  }[];
}

export interface ApiBestSellersReportDto {
  from?: string | null;
  to?: string | null;
  limit: number;
  items: {
    variantId: number;
    productId: number;
    productName: string;
    model: string;
    sku: string;
    category: string;
    currentStock: number;
    unitPrice: number;
    unitsSold: number;
    orderCount: number;
    grossSales: number;
    netSales: number;
  }[];
}

export interface ApiDeadStockReportDto {
  lookbackDays: number;
  maxUnitsSold: number;
  itemCount: number;
  totalDeadStockUnits: number;
  totalTiedUpValue: number;
  items: {
    variantId: number;
    productId: number;
    productName: string;
    model: string;
    sku: string;
    category: string;
    currentStock: number;
    unitPrice: number;
    tiedUpValue: number;
    unitsSoldInWindow: number;
    lastSoldAt?: string | null;
    classification: string;
  }[];
}

export interface ApiInventoryValuationReportDto {
  generatedAt: string;
  totalVariants: number;
  totalUnitsInStock: number;
  totalRetailValue: number;
  totalCostValue: number;
  byCategory: {
    category: string;
    variantCount: number;
    totalUnits: number;
    totalRetailValue: number;
  }[];
  items: {
    variantId: number;
    productId: number;
    productName: string;
    model: string;
    sku: string;
    category: string;
    isActive: boolean;
    stock: number;
    unitPrice: number;
    retailValue: number;
    averageUnitCost?: number | null;
    costValue?: number | null;
  }[];
}

export interface ApiQuoteConversionReportDto {
  from?: string | null;
  to?: string | null;
  totalQuotations: number;
  draftCount: number;
  sentCount: number;
  awaitingResponseCount: number;
  expiredCount: number;
  acceptedCount: number;
  convertedCount: number;
  declinedCount: number;
  acceptanceRatePercent: number;
  conversionRatePercent: number;
  totalSentValue: number;
  totalAcceptedValue: number;
  totalConvertedValue: number;
  totalDeclinedValue: number;
  averageResponseHours?: number | null;
}

/* ==================== Core HTTP Wrapper ==================== */

function extractErrorMessage(parsed: any, status: number, statusText: string): string {
  if (parsed?.message) return parsed.message;
  if (parsed?.errors && typeof parsed.errors === 'object') {
    const first = Object.values(parsed.errors).flat().find(Boolean);
    if (typeof first === 'string') return first;
  }
  if (parsed?.title) return parsed.title;
  if (typeof parsed === 'string' && parsed) return parsed;
  return `HTTP ${status} ${statusText}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  overrideToken?: string | null
): Promise<T> {
  const token = overrideToken !== undefined ? overrideToken : currentJwtToken;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(parsed, res.status, res.statusText));
  }

  return parsed as T;
}

/* ==================== Grouped Endpoint Methods ==================== */

export const grmApi = {
  baseUrl: API_BASE_URL,

  auth: {
    login: (emailOrUsername: string, password: string) =>
      request<ApiAuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrUsername, password }),
      }),

    register: (payload: {
      username: string;
      email: string;
      password: string;
      fullName?: string;
      phoneNumber?: string;
      address?: string;
    }) =>
      request<ApiUserDto>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    logout: () =>
      request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

    me: () => request<ApiUserDto>('/api/auth/me'),

    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  profile: {
    get: () => request<ApiUserDto>('/api/profile'),
    update: (payload: {
      username?: string;
      email?: string;
      fullName?: string;
      phoneNumber?: string;
      address?: string;
    }) =>
      request<ApiUserDto>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  products: {
    list: (params?: {
      search?: string;
      category?: string;
      isFeatured?: boolean;
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.category) qs.set('category', params.category);
      if (params?.isFeatured !== undefined)
        qs.set('isFeatured', String(params.isFeatured));
      qs.set('page', String(params?.page ?? 1));
      qs.set('pageSize', String(params?.pageSize ?? 100));
      return request<ApiPagedResult<ApiProductDto>>(
        `/api/products?${qs.toString()}`
      );
    },

    getById: (id: number) => request<ApiProductDto>(`/api/products/${id}`),

    create: (payload: {
      name: string;
      description?: string;
      category: string;
      imageUrl?: string | null;
      isFeatured?: boolean;
      isActive?: boolean;
      variants?: {
        model: string;
        sku: string;
        price: number;
        stock: number;
        imageUrl?: string | null;
      }[];
    }) =>
      request<ApiProductDto>('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (
      id: number,
      payload: {
        name: string;
        description?: string;
        category: string;
        imageUrl?: string | null;
        isFeatured?: boolean;
        isActive: boolean;
      }
    ) =>
      request<ApiProductDto>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    setStatus: (id: number, isActive: boolean) =>
      request<ApiProductDto>(`/api/products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),

    setFeatured: (id: number, isFeatured: boolean) =>
      request<ApiProductDto>(`/api/products/${id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured }),
      }),

    addVariant: (
      productId: number,
      payload: {
        model: string;
        sku: string;
        price: number;
        stock: number;
        imageUrl?: string | null;
      }
    ) =>
      request<ApiVariantDto>(`/api/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    updateVariant: (
      variantId: number,
      payload: {
        model: string;
        sku: string;
        price: number;
        stock: number;
        imageUrl?: string | null;
      }
    ) =>
      request<ApiVariantDto>(`/api/variants/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  bundles: {
    list: () => request<ApiBundleDto[]>('/api/bundles'),

    getById: (id: number) => request<ApiBundleDto>(`/api/bundles/${id}`),

    create: (payload: {
      name: string;
      description?: string;
      price: number;
      imageUrl?: string | null;
      items: { variantId: number; quantity: number }[];
    }) =>
      request<ApiBundleDto>('/api/bundles', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (
      id: number,
      payload: {
        name: string;
        description?: string;
        price: number;
        imageUrl?: string | null;
        items: { variantId: number; quantity: number }[];
      }
    ) =>
      request<ApiBundleDto>(`/api/bundles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    remove: (id: number) =>
      request<void>(`/api/bundles/${id}`, { method: 'DELETE' }),
  },

  cart: {
    get: () => request<ApiCartDto>('/api/cart'),

    addItem: (variantId: number, quantity: number) =>
      request<ApiCartDto>('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      }),

    updateItem: (variantId: number, quantity: number) =>
      request<ApiCartDto>(`/api/cart/items/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),

    removeItem: (variantId: number) =>
      request<ApiCartDto>(`/api/cart/items/${variantId}`, {
        method: 'DELETE',
      }),

    addBundle: (bundleId: number, quantity: number) =>
      request<ApiCartDto>('/api/cart/bundles', {
        method: 'POST',
        body: JSON.stringify({ bundleId, quantity }),
      }),

    updateBundle: (bundleId: number, quantity: number) =>
      request<ApiCartDto>(`/api/cart/bundles/${bundleId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),

    removeBundle: (bundleId: number) =>
      request<ApiCartDto>(`/api/cart/bundles/${bundleId}`, {
        method: 'DELETE',
      }),

    clear: () => request<void>('/api/cart', { method: 'DELETE' }),
  },

  inventory: {
    getAll: (tokenOverride?: string | null) =>
      request<ApiInventoryItemDto[]>('/api/inventory', {}, tokenOverride),

    lowStock: () => request<ApiInventoryItemDto[]>('/api/inventory/low-stock'),

    stockIn: (
      variantId: number,
      quantity: number,
      reason?: string,
      tokenOverride?: string | null
    ) =>
      request<{
        variantId: number;
        sku: string;
        stock: number;
        change: number;
        type: string;
      }>(
        '/api/inventory/stock-in',
        {
          method: 'POST',
          body: JSON.stringify({ variantId, quantity, reason }),
        },
        tokenOverride
      ),

    stockOut: (
      variantId: number,
      quantity: number,
      reason: string,
      tokenOverride?: string | null
    ) =>
      request<{
        variantId: number;
        sku: string;
        stock: number;
        change: number;
        type: string;
      }>(
        '/api/inventory/stock-out',
        {
          method: 'POST',
          body: JSON.stringify({ variantId, quantity, reason }),
        },
        tokenOverride
      ),

    adjust: (variantId: number, newStock: number, reason: string) =>
      request<{
        variantId: number;
        sku: string;
        stock: number;
        change: number;
        type: string;
      }>('/api/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({ variantId, newStock, reason }),
      }),

    movements: (variantId?: number, tokenOverride?: string | null) =>
      request<ApiStockMovementDto[]>(
        `/api/inventory/movements${variantId ? `?variantId=${variantId}` : ''}`,
        {},
        tokenOverride
      ),
  },

  quotations: {
    requestQuote: (
      items: { variantId: number; quantity: number }[],
      notes?: string,
      bundles?: { bundleId: number; quantity: number }[]
    ) =>
      request<ApiQuotationDto>('/api/quotations/requests', {
        method: 'POST',
        body: JSON.stringify({ items, bundles, notes }),
      }),

    create: (payload: {
      customerId: number;
      items: { variantId: number; quantity: number }[];
      bundles?: { bundleId: number; quantity: number }[];
      discountPercent: number;
      expiresAt?: string;
      notes?: string;
    }) =>
      request<ApiQuotationDto>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getAll: (tokenOverride?: string | null) =>
      request<ApiQuotationDto[]>('/api/quotations', {}, tokenOverride),

    getMy: () => request<ApiQuotationDto[]>('/api/quotations/my'),

    getById: (id: number) => request<ApiQuotationDto>(`/api/quotations/${id}`),

    update: (
      id: number,
      payload: {
        items?: { variantId: number; quantity: number }[];
        bundles?: { bundleId: number; quantity: number }[];
        discountPercent?: number;
        expiresAt?: string;
        notes?: string;
      }
    ) =>
      request<ApiQuotationDto>(`/api/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    send: (id: number, payload?: { validDays?: number; expiresAt?: string }) =>
      request<ApiQuotationDto>(`/api/quotations/${id}/send`, {
        method: 'POST',
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      }),

    accept: (id: number, reason?: string) =>
      request<ApiQuotationDto>(`/api/quotations/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    decline: (id: number, reason?: string) =>
      request<ApiQuotationDto>(`/api/quotations/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    convert: (id: number, tokenOverride?: string | null) =>
      request<ApiSalesOrderDto>(
        `/api/quotations/${id}/convert`,
        { method: 'POST' },
        tokenOverride
      ),

    pdfUrl: (id: number) => `${API_BASE_URL}/api/quotations/${id}/pdf`,
  },

  orders: {
    checkout: (payload?: {
      paymentMethod?: string;
      shippingAddress?: string;
      notes?: string;
    }) =>
      request<ApiOrderDto>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),

    createWalkIn: (payload: {
      customerId?: number | null;
      customerName?: string;
      items: { variantId: number; quantity: number }[];
      bundles?: { bundleId: number; quantity: number }[];
      discountPercent?: number;
      paymentMethod?: string;
      notes?: string;
      status?: string;
    }) =>
      request<ApiOrderDto>('/api/orders/walk-in', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getAll: (params?: { status?: string; channel?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.channel) qs.set('channel', params.channel);
      const query = qs.toString();
      return request<ApiOrderDto[]>(`/api/orders${query ? `?${query}` : ''}`);
    },

    getMy: (params?: { status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      const query = qs.toString();
      return request<ApiOrderDto[]>(`/api/orders/my${query ? `?${query}` : ''}`);
    },

    getById: (id: number) => request<ApiOrderDto>(`/api/orders/${id}`),

    updateStatus: (id: number, status: 'Pending' | 'Processing' | 'Completed') =>
      request<ApiOrderDto>(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    cancel: (id: number, reason?: string) =>
      request<ApiOrderDto>(`/api/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    correct: (
      id: number,
      payload: {
        reason: string;
        items?: { variantId: number; quantity: number; unitPrice?: number }[];
        discountPercent?: number;
        customerName?: string;
        paymentMethod?: string;
        shippingAddress?: string;
        notes?: string;
      }
    ) =>
      request<ApiOrderDto>(`/api/orders/${id}/correction`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  invoices: {
    generate: (
      orderId: number,
      payload?: {
        paymentMethod?: string;
        paymentStatus?: string;
        amountPaid?: number;
        dueDate?: string;
        notes?: string;
      }
    ) =>
      request<ApiInvoiceDto>(`/api/orders/${orderId}/invoice`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),

    getAll: (params?: {
      paymentStatus?: string;
      status?: string;
      orderId?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
      if (params?.status) qs.set('status', params.status);
      if (params?.orderId !== undefined) qs.set('orderId', String(params.orderId));
      const query = qs.toString();
      return request<ApiInvoiceDto[]>(`/api/invoices${query ? `?${query}` : ''}`);
    },

    getMy: (params?: { paymentStatus?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
      if (params?.status) qs.set('status', params.status);
      const query = qs.toString();
      return request<ApiInvoiceDto[]>(`/api/invoices/my${query ? `?${query}` : ''}`);
    },

    getById: (id: number) => request<ApiInvoiceDto>(`/api/invoices/${id}`),

    updatePaymentStatus: (
      id: number,
      payload: {
        paymentStatus: string;
        amountPaid?: number;
        paymentMethod?: string;
        notes?: string;
      }
    ) =>
      request<ApiInvoiceDto>(`/api/invoices/${id}/payment-status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    void: (id: number, reason: string) =>
      request<ApiInvoiceDto>(`/api/invoices/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    pdfUrl: (id: number) => `${API_BASE_URL}/api/invoices/${id}/pdf`,
  },

  suppliers: {
    list: (params?: { activeOnly?: boolean; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.activeOnly !== undefined)
        qs.set('activeOnly', String(params.activeOnly));
      if (params?.search) qs.set('search', params.search);
      const query = qs.toString();
      return request<ApiSupplierDto[]>(`/api/suppliers${query ? `?${query}` : ''}`);
    },

    getById: (id: number) => request<ApiSupplierDto>(`/api/suppliers/${id}`),

    create: (payload: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      isActive?: boolean;
    }) =>
      request<ApiSupplierDto>('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (
      id: number,
      payload: {
        name: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
        address?: string;
        isActive?: boolean;
      }
    ) =>
      request<ApiSupplierDto>(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    remove: (id: number) =>
      request<void>(`/api/suppliers/${id}`, { method: 'DELETE' }),
  },

  requisitions: {
    list: (status?: string) => {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      const query = qs.toString();
      return request<ApiRequisitionDto[]>(
        `/api/requisitions${query ? `?${query}` : ''}`
      );
    },

    getById: (id: number) => request<ApiRequisitionDto>(`/api/requisitions/${id}`),

    create: (payload: { variantId: number; quantity: number; reason: string }) =>
      request<ApiRequisitionDto>('/api/requisitions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    approve: (
      id: number,
      payload?: {
        reason?: string;
        notes?: string;
        supplierId?: number;
        createPurchaseOrder?: boolean;
      }
    ) =>
      request<ApiRequisitionDto>(`/api/requisitions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),

    decline: (id: number, payload?: { reason?: string; notes?: string }) =>
      request<ApiRequisitionDto>(`/api/requisitions/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),
  },

  reorder: {
    suggestions: (lookbackDays = 7, includeAll = false) =>
      request<ApiReorderSuggestionDto[]>(
        `/api/reorder/suggestions?lookbackDays=${lookbackDays}&includeAll=${includeAll}`
      ),

    updateSettings: (
      variantId: number,
      payload: {
        reorderThreshold?: number;
        defaultReorderQuantity?: number;
        clearDefaultReorderQuantity?: boolean;
        leadTimeDays?: number;
        safetyStock?: number;
        useDynamicThreshold?: boolean;
      }
    ) =>
      request<ApiReorderSettingsDto>(`/api/reorder/settings/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    recalculate: (payload?: {
      lookbackDays?: number;
      generateDraftPurchaseOrders?: boolean;
    }) =>
      request<ApiRecalculateReorderResponse>('/api/reorder/recalculate', {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),
  },

  purchaseOrders: {
    list: (params?: { status?: string; source?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.source) qs.set('source', params.source);
      const query = qs.toString();
      return request<ApiPurchaseOrderDto[]>(
        `/api/purchase-orders${query ? `?${query}` : ''}`
      );
    },

    getById: (id: number) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}`),

    create: (payload: {
      requisitionId?: number;
      supplierId?: number;
      items?: { variantId: number; quantityOrdered: number; unitCost?: number }[];
      notes?: string;
      status?: string;
    }) =>
      request<ApiPurchaseOrderDto>('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (
      id: number,
      payload: {
        supplierId?: number | null;
        clearSupplier?: boolean;
        items?: { variantId: number; quantityOrdered: number; unitCost?: number }[];
        notes?: string;
      }
    ) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    approve: (id: number, payload?: { supplierId?: number; notes?: string }) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}/approve`, {
        method: 'POST',
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      }),

    send: (id: number) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}/send`, {
        method: 'POST',
      }),

    receive: (
      id: number,
      payload: {
        items: { variantId: number; quantityReceived: number }[];
        notes?: string;
      }
    ) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    remove: (id: number) =>
      request<void>(`/api/purchase-orders/${id}`, { method: 'DELETE' }),

    pdfUrl: (id: number) => `${API_BASE_URL}/api/purchase-orders/${id}/pdf`,
  },

  users: {
    list: (params?: { role?: string; isActive?: boolean; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.role) qs.set('role', params.role);
      if (params?.isActive !== undefined)
        qs.set('isActive', String(params.isActive));
      if (params?.search) qs.set('search', params.search);
      const query = qs.toString();
      return request<ApiUserDto[]>(`/api/users${query ? `?${query}` : ''}`);
    },

    getById: (id: number) => request<ApiUserDto>(`/api/users/${id}`),

    create: (payload: {
      username: string;
      email: string;
      password: string;
      role?: string;
      fullName?: string;
      phoneNumber?: string;
      address?: string;
    }) =>
      request<ApiUserDto>('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    setStatus: (id: number, isActive: boolean) =>
      request<ApiUserDto>(`/api/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
  },

  settings: {
    get: () => request<ApiBusinessSettingsDto>('/api/settings'),
    update: (payload: {
      maxStaffDiscountPercent?: number;
      defaultQuotationValidityDays?: number;
    }) =>
      request<ApiBusinessSettingsDto>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  contact: {
    submit: (payload: {
      name: string;
      email: string;
      phoneNumber?: string;
      subject?: string;
      message: string;
    }) =>
      request<ApiContactInquiryDto>('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    list: () => request<ApiContactInquiryDto[]>('/api/contact'),
  },

  dashboard: {
    get: () => request<ApiDashboardDto>('/api/dashboard'),
  },

  reports: {
    today: () => request<ApiDailySummaryReportDto>('/api/reports/today'),

    sales: (from?: string, to?: string) => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const query = qs.toString();
      return request<ApiSalesReportDto>(
        `/api/reports/sales${query ? `?${query}` : ''}`
      );
    },

    bestSellers: (params?: { from?: string; to?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<ApiBestSellersReportDto>(
        `/api/reports/best-sellers${query ? `?${query}` : ''}`
      );
    },

    deadStock: (days = 30, maxUnitsSold = 0) =>
      request<ApiDeadStockReportDto>(
        `/api/reports/dead-stock?days=${days}&maxUnitsSold=${maxUnitsSold}`
      ),

    inventoryValuation: () =>
      request<ApiInventoryValuationReportDto>('/api/reports/inventory-valuation'),

    quoteConversion: (from?: string, to?: string) => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const query = qs.toString();
      return request<ApiQuoteConversionReportDto>(
        `/api/reports/quote-conversion${query ? `?${query}` : ''}`
      );
    },
  },
};
