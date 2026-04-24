const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// In-memory access token — never stored in localStorage
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}
export function getAccessToken() {
  return _accessToken;
}

type FetchOptions = RequestInit & { skipAuth?: boolean };

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth && _accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include", // send refresh-token cookie
  });

  if (res.status === 401 && !skipAuth && path !== "/api/auth/refresh") {
    // Try silent token refresh
    const refreshed = await silentRefresh();

    if (refreshed) {
      headers["Authorization"] = `Bearer ${_accessToken}`;
      const retry = await fetch(`${BASE}${path}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });

      if (!retry.ok) {
        const err = await retry
          .json()
          .catch(() => ({ message: "Request failed" }));
        throw Object.assign(new Error(err.message ?? "Request failed"), {
          status: retry.status,
        });
      }
      return retry.json() as Promise<T>;
    }
    // Refresh failed — clear token, caller should redirect to login
    _accessToken = null;
    throw Object.assign(new Error("Session expired"), { status: 401 });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw Object.assign(new Error(err.message ?? "Request failed"), {
      status: res.status,
      errors: err.errors,
    });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

let _refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json();
      _accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    role: string;
  }) =>
    apiFetch<{ user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      skipAuth: true,
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ accessToken: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      skipAuth: true,
    }),

  logout: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),

  me: () => apiFetch<{ user: ApiUser }>("/api/auth/me"),
};

// ─── Items ────────────────────────────────────────────────────────────────────
export const itemsApi = {
  browse: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; items: ApiItem[] }>(`/api/items${qs}`);
  },

  getById: (id: string) => apiFetch<{ item: ApiItem }>(`/api/items/${id}`),

  myListings: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; items: ApiItem[] }>(
      `/api/items/my/listings${qs}`,
    );
  },

  create: (form: FormData) =>
    apiFetch<{ item: ApiItem }>("/api/items", {
      method: "POST",
      body: form,
    }),

  activate: (id: string) =>
    apiFetch<{ item: ApiItem }>(`/api/items/${id}/activate`, {
      method: "PATCH",
    }),

  remove: (id: string) =>
    apiFetch<{ item: ApiItem }>(`/api/items/${id}`, { method: "DELETE" }),

  adminAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; items: ApiItem[] }>(
      `/api/items/admin/all${qs}`,
    );
  },
};

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletApi = {
  balance: () => apiFetch<{ balance: string }>("/api/wallet/balance"),

  transactions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; transactions: ApiWalletTxn[] }>(
      `/api/wallet/transactions${qs}`,
    );
  },

  topUp: (body: { amount: number; successUrl: string; cancelUrl: string }) =>
    apiFetch<{
      checkoutSessionId: string;
      checkoutUrl: string;
      amount: number;
    }>("/api/wallet/top-up", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersApi = {
  myPurchases: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; orders: ApiOrder[] }>(
      `/api/orders/my/purchases${qs}`,
    );
  },

  mySales: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; orders: ApiOrder[] }>(
      `/api/orders/my/sales${qs}`,
    );
  },

  getById: (id: string) => apiFetch<{ order: ApiOrder }>(`/api/orders/${id}`),

  create: (itemId: string) =>
    apiFetch<{ order: ApiOrder }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ itemId }),
    }),

  adminAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; orders: ApiOrder[] }>(
      `/api/orders/admin/all${qs}`,
    );
  },

  complete: (id: string) =>
    apiFetch<{ order: ApiOrder }>(`/api/orders/${id}/complete`, {
      method: "POST",
    }),
};

// ─── Lockers ──────────────────────────────────────────────────────────────────
export const lockersApi = {
  all: () => apiFetch<{ slots: ApiLockerSlot[] }>("/api/lockers"),

  plans: () => apiFetch<{ plans: ApiLockerPlan[] }>("/api/lockers/plans"),

  getSlot: (slotId: string) =>
    apiFetch<{ slot: ApiLockerSlot }>(`/api/lockers/${slotId}`),

  updateStatus: (slotId: string, status: string) =>
    apiFetch<{ slot: ApiLockerSlot }>(`/api/lockers/${slotId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getCameraAssignments: () =>
    apiFetch<{ assignments: Record<string, number | null> }>(
      "/api/lockers/camera-assignments",
    ),

  updateCameraAssignment: (slotId: string, cameraIndex: number | null) =>
    apiFetch<{ slot: { slotId: string; cameraIndex: number | null } }>(
      `/api/lockers/camera-assignments/${slotId}`,
      { method: "PATCH", body: JSON.stringify({ cameraIndex }) },
    ),
};

// ─── Refunds ──────────────────────────────────────────────────────────────────
export const refundsApi = {
  request: (body: { orderId: string; reason: string }) =>
    apiFetch<{ refund: ApiRefund }>("/api/refunds", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getById: (id: string) =>
    apiFetch<{ refund: ApiRefund }>(`/api/refunds/${id}`),

  adminAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; refunds: ApiRefund[] }>(
      `/api/refunds/admin/all${qs}`,
    );
  },

  process: (id: string, body: { approved: boolean; adminNotes?: string }) =>
    apiFetch<{ refund: ApiRefund }>(`/api/refunds/${id}/process`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Users (admin) ────────────────────────────────────────────────────────────
export const usersApi = {
  adminAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; users: ApiUser[] }>(
      `/api/users/admin/all${qs}`,
    );
  },

  getById: (id: string) =>
    apiFetch<{ user: ApiUser }>(`/api/users/admin/${id}`),

  update: (id: string, body: { role?: string; isVerified?: boolean }) =>
    apiFetch<{ user: ApiUser }>(`/api/users/admin/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateMe: (body: { fullName?: string }) =>
    apiFetch<{ user: ApiUser }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ─── Config (admin) ───────────────────────────────────────────────────────────
export const configApi = {
  getPlatformFee: () =>
    apiFetch<{ feePct: number }>("/api/config/platform-fee"),

  setPlatformFee: (feePct: number) =>
    apiFetch<{ feePct: number }>("/api/config/platform-fee", {
      method: "PATCH",
      body: JSON.stringify({ feePct }),
    }),

  updateSubscriptionPlan: (
    id: string,
    data: { price?: number; name?: string },
  ) =>
    apiFetch<{ plan: ApiLockerPlan }>(`/api/lockers/plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Cashouts (admin) ─────────────────────────────────────────────────────────
export const cashoutsApi = {
  adminAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; requests: ApiCashoutRequest[] }>(
      `/api/cashouts/admin/all${qs}`,
    );
  },

  approve: (id: string, adminNotes?: string) =>
    apiFetch<{ request: ApiCashoutRequest }>(`/api/cashouts/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ adminNotes }),
    }),

  deny: (id: string, adminNotes?: string) =>
    apiFetch<{ request: ApiCashoutRequest }>(`/api/cashouts/${id}/deny`, {
      method: "POST",
      body: JSON.stringify({ adminNotes }),
    }),
};

// ─── Reports (admin) ──────────────────────────────────────────────────────────
export const reportsApi = {
  overview: () => apiFetch<{ overview: ApiOverview }>("/api/reports/overview"),

  transactions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; transactions: ApiWalletTxn[] }>(
      `/api/reports/transactions${qs}`,
    );
  },

  auditLogs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ total: number; logs: ApiAuditLog[] }>(
      `/api/reports/audit-logs${qs}`,
    );
  },

  daily: (days: number) =>
    apiFetch<{ rows: ApiDailyRow[]; days: number }>(
      `/api/reports/daily?days=${days}`,
    ),
};

// ─── API Types ─────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  walletBalance: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ApiItem {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: string;
  description: string;
  imageUrl?: string;
  sellerId: string;
  seller?: { id: string; fullName: string };
  status: string;
  slotId?: string;
  slot?: { slotId: string; status: string };
  subscriptionPlan?: ApiLockerPlan;
  subscriptionEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrder {
  id: string;
  itemId: string;
  item?: ApiItem;
  buyerId: string;
  buyer?: { id: string; fullName: string; email: string };
  sellerId: string;
  seller?: { id: string; fullName: string; email: string };
  amount: string;
  status: string;
  slotId: string;
  personalCode: string;
  holdEndsAt: string;
  createdAt: string;
  refund?: ApiRefund;
  events?: ApiOrderEvent[];
}

export interface ApiOrderEvent {
  id: string;
  event: string;
  actor: string;
  createdAt: string;
}

export interface ApiWalletTxn {
  id: string;
  userId: string;
  user?: { id: string; fullName: string; email: string };
  type: string;
  amount: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface ApiLockerSlot {
  slotId: string;
  status: string;
  lastEvent?: string;
  cameraIndex?: number | null;
  currentItem?: ApiItem;
  events?: ApiLockerEvent[];
}

// ─── IoT / Monitor types ──────────────────────────────────────────────────────
export interface WsEspHealth {
  type: "ESP_HEALTH";
  connected: boolean;
  deviceId: string;
  lastSeen: number;
  heartbeatCount: number;
  rssi: number | null;
  uptime: number | null;
  freeHeap: number | null;
  slots: { slotId: string; doorOpen: boolean }[];
}

export interface WsCameraStatus {
  type: "CAMERA_SERVER_STATUS";
  online: boolean;
  lastSeen: number;
  cameras: { index: number; name: string }[];
}

export interface WsCaptureResult {
  type: "CAPTURE_RESULT";
  requestId: string;
  slotId: string;
  imageUrl: string;
  ts: number;
}

export interface WsCaptureError {
  type: "CAPTURE_ERROR";
  requestId: string;
  slotId: string;
  error: string;
}

export interface ApiLockerEvent {
  id: string;
  slotId: string;
  eventType: string;
  source: string;
  createdAt: string;
}

export interface ApiLockerPlan {
  id: string;
  planKey: string;
  name: string;
  durationDays: number;
  price: string;
  highlight: boolean;
}

export interface ApiRefund {
  id: string;
  orderId: string;
  buyerId: string;
  buyer?: { id: string; fullName: string; email: string };
  sellerId: string;
  seller?: { id: string; fullName: string; email: string };
  amount: string;
  policy: string;
  buyerRefundAmount: string;
  sellerFeeAmount: string;
  status: string;
  adminNotes?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface ApiOverview {
  totalUsers: number;
  totalItems: number;
  activeItems: number;
  totalOrders: number;
  completedOrders: number;
  pendingRefunds: number;
  totalSlots: number;
  occupiedSlots: number;
  platformRevenue: string | number;
}

export interface ApiDailyRow {
  date: string;
  sales_count: number;
  sales_total: number;
  commission_count: number;
  commission_total: number;
  refund_count: number;
  refund_total: number;
  payout_count: number;
  payout_total: number;
  topup_count: number;
  topup_total: number;
}

export interface ApiAuditLog {
  id: string;
  type: string;
  actor: string;
  entity: string;
  action: string;
  metadata?: unknown;
  createdAt: string;
}

export interface ApiCashoutRequest {
  id: string;
  userId: string;
  user?: { id: string; fullName: string; email: string };
  amount: string;
  method: "GCASH" | "MAYA" | "BANK";
  accountNumber: string;
  accountName: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "DENIED";
  adminNotes?: string;
  requestedAt: string;
  processedAt?: string;
}
