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
};

