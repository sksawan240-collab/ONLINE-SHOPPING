import {
  User,
  Product,
  Category,
  CartState,
  Order,
  Coupon,
  Review,
  NotificationItem,
  EmailLog,
  AuditLog,
  StoreSettings,
  RegistrationData,
  OrderStatus,
} from '../types';

const API_BASE = '/api';

function getStoredToken(): string | null {
  return localStorage.getItem('luxe_access_token');
}

export function setStoredTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem('luxe_access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('luxe_refresh_token', refreshToken);
  }
}

export function clearStoredTokens() {
  localStorage.removeItem('luxe_access_token');
  localStorage.removeItem('luxe_refresh_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If token invalid, handle refresh or error
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      const refreshToken = localStorage.getItem('luxe_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.tokens) {
            setStoredTokens(refreshData.tokens.accessToken, refreshData.tokens.refreshToken);
            // Retry original request
            headers['Authorization'] = `Bearer ${refreshData.tokens.accessToken}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            return await retryRes.json();
          }
        } catch {
          clearStoredTokens();
        }
      }
    }

    const error: any = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    register: (payload: RegistrationData) =>
      request<{ success: boolean; message: string; email?: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      request<{ success: boolean; message: string; user: User; tokens: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    logout: () => {
      clearStoredTokens();
      return request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' });
    },
    logoutAll: () => {
      clearStoredTokens();
      return request<{ success: boolean; message: string }>('/auth/logout-all', { method: 'POST' });
    },
    getMe: () => request<{ success: boolean; user: User }>('/auth/me'),
    updateProfile: (payload: Partial<User>) =>
      request<{ success: boolean; user: User; message: string }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    addAddress: (address: any) =>
      request<{ success: boolean; message: string; addresses: any[] }>('/auth/addresses', {
        method: 'POST',
        body: JSON.stringify(address),
      }),
    deleteAddress: (id: string) =>
      request<{ success: boolean; message: string; addresses: any[] }>(`/auth/addresses/${id}`, {
        method: 'DELETE',
      }),
  },

  // Products
  products: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.append(k, String(v));
      });
      return request<{
        success: boolean;
        products: Product[];
        pagination: { total: number; page: number; totalPages: number; limit: number; hasMore: boolean };
      }>(`/products?${searchParams.toString()}`);
    },
    get: (idOrSlug: string) =>
      request<{ success: boolean; product: Product; related: Product[]; reviews: Review[] }>(`/products/${idOrSlug}`),
    getFilters: () =>
      request<{
        success: boolean;
        filters: {
          categories: string[];
          brands: string[];
          sizes: string[];
          colors: { name: string; hex: string }[];
          minPrice: number;
          maxPrice: number;
        };
      }>('/products/meta/filters'),
    create: (data: any) =>
      request<{ success: boolean; message: string; product: Product }>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<{ success: boolean; message: string; product: Product }>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/products/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categories
  categories: {
    list: () => request<{ success: boolean; categories: Category[] }>('/categories'),
    create: (data: any) =>
      request<{ success: boolean; category: Category }>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<{ success: boolean; category: Category }>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // Cart
  cart: {
    get: () => request<{ success: boolean; cart: CartState }>('/cart'),
    addItem: (payload: { productId: string; size?: string; color?: string; quantity?: number }) =>
      request<{ success: boolean; message: string; itemCount: number }>('/cart/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateItem: (itemId: string, quantity: number) =>
      request<{ success: boolean; message: string }>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    removeItem: (itemId: string) =>
      request<{ success: boolean; message: string }>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      }),
    clear: () => request<{ success: boolean; message: string }>('/cart/clear', { method: 'DELETE' }),
  },

  // Wishlist
  wishlist: {
    get: () => request<{ success: boolean; items: Product[]; productIds: string[] }>('/wishlist'),
    toggle: (productId: string) =>
      request<{ success: boolean; isInWishlist: boolean; count: number; productIds: string[]; message: string }>(
        '/wishlist/toggle',
        {
          method: 'POST',
          body: JSON.stringify({ productId }),
        }
      ),
  },

  // Orders
  orders: {
    create: (orderData: any) =>
      request<{ success: boolean; message: string; order: Order }>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      }),
    list: (params: Record<string, string | number | undefined> = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.append(k, String(v));
      });
      return request<{
        success: boolean;
        orders: Order[];
        pagination: { total: number; page: number; totalPages: number; limit: number };
      }>(`/orders?${searchParams.toString()}`);
    },
    get: (id: string) => request<{ success: boolean; order: Order }>(`/orders/${id}`),
    track: (orderId: string) => request<{ success: boolean; order: Partial<Order> }>(`/orders/track/${orderId}`),
    updateStatus: (id: string, status: OrderStatus, data?: { carrier?: string, trackingNumber?: string, note?: string }) =>
      request<{ success: boolean; order: Order }>(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...data }),
      }),
    requestReturn: (id: string, reason: string) =>
      request<{ success: boolean; message: string; order: Order }>(`/orders/${id}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    processReturn: (id: string, payload: { returnStatus: string; resolutionNotes?: string }) =>
      request<{ success: boolean; order: Order }>(`/orders/${id}/return-process`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },

  // Payments — PayU production gateway + legacy stubs
  payments: {
    payuConfig: () =>
      request<{ success: boolean; env: string; enabled: boolean; payUrl: string }>('/payu/config'),
    payuCreate: (orderData: any) =>
      request<{
        success: boolean; message?: string; reused?: boolean; order: Order;
        payuUrl: string; payuFields: Record<string, string>;
      }>('/payu/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
      }),
    payuStatus: (orderId: string) =>
      request<{ success: boolean; verified: boolean; paymentStatus: string; order: Order }>(`/payu/status/${encodeURIComponent(orderId)}`),
    payuRetry: (orderId: string) =>
      request<{ success: boolean; message?: string; order: Order; payuUrl: string; payuFields: Record<string, string> }>(`/payu/retry/${encodeURIComponent(orderId)}`, {
        method: 'POST',
      }),
    payuAdminTransactions: (params: Record<string, string | number | undefined> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') sp.append(k, String(v));
      });
      return request<{ success: boolean; transactions: any[]; pagination: any }>(`/payu/admin/transactions?${sp.toString()}`);
    },
    payuAdminVerify: (orderId: string) =>
      request<{ success: boolean; payuResult: any; order: Order }>(`/payu/admin/verify/${encodeURIComponent(orderId)}`, {
        method: 'POST',
      }),
    create: (orderData: any) =>
      request<{
        success: boolean;
        message?: string;
        order: Order;
        paymentId: string;
        checkoutUrl: string;
        amount: number;
      }>('/payments/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
      }),
    initiateYoupi: (payload: { orderId: string; amount: number; customer: { name: string; email: string; phone: string; } }) =>
      request<{ success: boolean; paymentId: string; iframeUrl: string; message: string }>('/youpi', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getYoupiStatus: (paymentId: string) =>
      request<{ success: boolean; status: 'PAID' | 'PENDING' | 'FAILED' }>(`/youpi?paymentId=${paymentId}`),
  },

  // Dashboards
  dashboard: {
    admin: () => request<{ success: boolean; stats: any; topSellingProducts: any[]; lowStockProducts: any[]; categorySales: any[]; recentOrders: Order[] }>('/dashboard/admin'),
    salesManager: () => request<{ success: boolean; stats: any; recentPending: Order[]; lowStockItems: Product[]; returnRequests: Order[] }>('/dashboard/sales-manager'),
    customer: () => request<{ success: boolean; stats: any; recentOrders: Order[] }>('/dashboard/customer'),
  },

  // Admin
  admin: {
    getUsers: (params: Record<string, string | number | undefined> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') sp.append(k, String(v));
      });
      return request<{ success: boolean; users: User[]; pagination: any }>(`/admin/users?${sp.toString()}`);
    },
    createUser: (data: any) =>
      request<{ success: boolean; user: User }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: any) =>
      request<{ success: boolean; user: User }>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteUser: (id: string) =>
      request<{ success: boolean; message: string }>(`/admin/users/${id}`, {
        method: 'DELETE',
      }),
    getAuditLogs: (params: Record<string, any> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return request<{ success: boolean; logs: AuditLog[]; pagination: any }>(`/admin/audit-logs?${sp.toString()}`);
    },
    getSettings: () => request<{ success: boolean; settings: StoreSettings }>('/admin/settings'),
    updateSettings: (data: any) =>
      request<{ success: boolean; settings: StoreSettings }>('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    seedCatalog: (force: boolean = false) =>
      request<{ success: boolean; message: string; categoriesCount: number; productsCount: number }>('/admin/seed', {
        method: 'POST',
        body: JSON.stringify({ force }),
      }),
  },

  // Coupons
  coupons: {
    list: () => request<{ success: boolean; coupons: Coupon[] }>('/coupons'),
    create: (data: any) =>
      request<{ success: boolean; coupon: Coupon }>('/coupons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    validate: (code: string, subtotal: number) =>
      request<{ success: boolean; coupon: { code: string; discountType: string; discountValue: number; discountAmount: number } }>(
        '/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code, subtotal }),
        }
      ),
    delete: (id: string) => request<{ success: boolean; message: string }>(`/coupons/${id}`, { method: 'DELETE' }),
  },

  // Reviews
  reviews: {
    getForProduct: (productId: string) => request<{ success: boolean; reviews: Review[] }>(`/reviews/product/${productId}`),
    submit: (data: { productId: string; rating: number; title?: string; comment: string }) =>
      request<{ success: boolean; review: Review; message: string }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    moderate: (id: string, isApproved: boolean) =>
      request<{ success: boolean; review: Review }>(`/reviews/${id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ isApproved }),
      }),
  },



  // Notifications
  notifications: {
    list: () => request<{ success: boolean; notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
    markAllRead: () => request<{ success: boolean; message: string }>('/notifications/mark-all-read', { method: 'PATCH' }),
    markRead: (id: string) => request<{ success: boolean; notification: NotificationItem }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  },

  // Email Logs
  emails: {
    list: () => request<{ success: boolean; logs: EmailLog[] }>('/emails/logs'),
  },
};