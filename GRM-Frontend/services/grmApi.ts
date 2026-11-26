/**
 * Typed REST API Client for GRM-Backend (ASP.NET Core 9.0 Web API)
 * Default base URL: http://localhost:5133 (from Properties/launchSettings.json)
 */

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:5133';

const TOKEN_STORAGE_KEY = 'grm_jwt_token';

function loadStoredToken(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  } catch { }
  return null;
}

let currentJwtToken: string | null = loadStoredToken();

export function setApiToken(token: string | null) {
  currentJwtToken = token;
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch { }
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
  createdAt: string;
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
}

export interface ApiProductDto {
  id: number;
  name: string;
  description?: string | null;
  category: string;
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
  sku: string;
  model: string;
  quantity: number;
}

export interface ApiBundleDto {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  items: ApiBundleItemDto[];
}

export interface ApiCartItemDto {
  variantId: number;
  productId: number;
  productName: string;
  model: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
}

export interface ApiCartDto {
  items: ApiCartItemDto[];
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

export interface ApiOrderDto {
  id: number;
  quotationId?: number | null;
  customerId?: number | null;
  customerName: string;
  staffId?: number | null;
  staffName?: string | null;
  channel: string;
  status: string;
  paymentMethod?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  items: ApiOrderItemDto[];
}

export interface ApiInvoiceDto {
  id: number;
  invoiceNumber: string;
  orderId: number;
  customerId?: number | null;
  customerName: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  issuedAt: string;
  paidAt?: string | null;
  isVoided: boolean;
  voidReason?: string | null;
}

export interface ApiSupplierDto {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface ApiRequisitionDto {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  model: string;
  quantity: number;
  reason: string;
  status: string;
  requestedByName: string;
  purchaseOrderId?: number | null;
  createdAt: string;
}

export interface ApiPurchaseOrderDto {
  id: number;
  poNumber: string;
  supplierId?: number | null;
  supplierName?: string | null;
  status: string;
  source: string;
  notes?: string | null;
  createdAt: string;
  items: {
    id: number;
    variantId: number;
    sku: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }[];
}

export interface ApiBusinessSettingsDto {
  maxStaffDiscountPercent: number;
  defaultQuotationValidityDays: number;
  updatedAt: string;
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

/* ==================== Core HTTP Wrapper ==================== */

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
    const message =
      parsed?.message ||
      parsed?.title ||
      (typeof parsed === 'string' && parsed) ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(message);
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
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.category) qs.set('category', params.category);
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
      isActive?: boolean;
      variants?: { model: string; sku: string; price: number; stock: number }[];
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

    addVariant: (
      productId: number,
      payload: { model: string; sku: string; price: number; stock: number }
    ) =>
      request<ApiVariantDto>(`/api/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    updateVariant: (
      variantId: number,
      payload: { model: string; sku: string; price: number; stock: number }
    ) =>
      request<ApiVariantDto>(`/api/variants/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  bundles: {
    list: () => request<ApiBundleDto[]>('/api/bundles'),

    create: (payload: {
      name: string;
      description?: string;
      price: number;
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
      notes?: string
    ) =>
      request<ApiQuotationDto>('/api/quotations/requests', {
        method: 'POST',
        body: JSON.stringify({ items, notes }),
      }),

    create: (payload: {
      customerId: number;
      items: { variantId: number; quantity: number }[];
      discountPercent: number;
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
        discountPercent?: number;
        notes?: string;
      }
    ) =>
      request<ApiQuotationDto>(`/api/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    send: (id: number) =>
      request<ApiQuotationDto>(`/api/quotations/${id}/send`, {
        method: 'POST',
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
    checkout: (payload: {
      paymentMethod?: string;
      shippingAddress?: string;
      notes?: string;
    }) =>
      request<ApiOrderDto>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    walkIn: (payload: {
      customerId?: number;
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

    getAll: () => request<ApiOrderDto[]>('/api/orders'),
    getMy: () => request<ApiOrderDto[]>('/api/orders/my'),
    getById: (id: number) => request<ApiOrderDto>(`/api/orders/${id}`),

    updateStatus: (id: number, status: string) =>
      request<ApiOrderDto>(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    cancel: (id: number, reason?: string) =>
      request<ApiOrderDto>(`/api/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  invoices: {
    generate: (
      orderId: number,
      payload?: {
        paymentMethod?: string;
        paymentStatus?: string;
        amountPaid?: number;
        notes?: string;
      }
    ) =>
      request<ApiInvoiceDto>(`/api/orders/${orderId}/invoice`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),

    getAll: () => request<ApiInvoiceDto[]>('/api/invoices'),
    getMy: () => request<ApiInvoiceDto[]>('/api/invoices/my'),
    getById: (id: number) => request<ApiInvoiceDto>(`/api/invoices/${id}`),

    updatePaymentStatus: (
      id: number,
      payload: { paymentStatus: string; amountPaid?: number; paymentMethod?: string }
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
    list: () => request<ApiSupplierDto[]>('/api/suppliers'),
    create: (payload: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
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
    list: () => request<ApiRequisitionDto[]>('/api/requisitions'),
    create: (payload: { variantId: number; quantity: number; reason: string }) =>
      request<ApiRequisitionDto>('/api/requisitions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    approve: (
      id: number,
      payload?: { supplierId?: number; createPurchaseOrder?: boolean; notes?: string }
    ) =>
      request<ApiRequisitionDto>(`/api/requisitions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),
    decline: (id: number, reason?: string) =>
      request<ApiRequisitionDto>(`/api/requisitions/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  purchaseOrders: {
    list: () => request<ApiPurchaseOrderDto[]>('/api/purchase-orders'),
    approve: (id: number, supplierId?: number) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ supplierId }),
      }),
    send: (id: number) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}/send`, {
        method: 'POST',
      }),
    receive: (
      id: number,
      items: { variantId: number; quantityReceived: number }[],
      notes?: string
    ) =>
      request<ApiPurchaseOrderDto>(`/api/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ items, notes }),
      }),
    pdfUrl: (id: number) => `${API_BASE_URL}/api/purchase-orders/${id}/pdf`,
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

  users: {
    list: () => request<(ApiUserDto & { isActive: boolean })[]>('/api/users'),
    create: (payload: {
      username: string;
      email: string;
      password: string;
      role: string;
      fullName?: string;
      phoneNumber?: string;
      address?: string;
    }) =>
      request<ApiUserDto & { isActive: boolean }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    setStatus: (id: number, isActive: boolean) =>
      request<ApiUserDto & { isActive: boolean }>(`/api/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
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
};

