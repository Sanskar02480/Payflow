import axios, { AxiosError } from 'axios';
import type {
  AuthResponse,
  PageResponse,
  TransactionView,
  TransferRequest,
  TransferResponse,
  WalletBalance,
  ApiError,
} from '../types';

const TOKEN_KEY = 'payflow.token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    if (err.response?.status === 401) {
      tokenStorage.clear();
      // Bounce to login if a protected call returns 401.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// Surface the backend's "message" string when present.
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiError>(err) && err.response?.data) {
    const data = err.response.data;
    if (data.details && data.details.length > 0) return data.details.join(', ');
    if (data.message) return data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export const authApi = {
  register: (email: string, password: string) =>
    http.post<AuthResponse>('/api/auth/register', { email, password }).then((r) => r.data),
  login: (email: string, password: string, rememberMe: boolean) =>
    http
      .post<AuthResponse>('/api/auth/login', { email, password, rememberMe })
      .then((r) => r.data),
  forgotPassword: (email: string) =>
    http
      .post<{ message: string }>('/api/auth/forgot-password', { email })
      .then((r) => r.data),
  resetPassword: (token: string, newPassword: string) =>
    http
      .post<{ message: string }>('/api/auth/reset-password', { token, newPassword })
      .then((r) => r.data),
};

export const walletApi = {
  balance: () => http.get<WalletBalance>('/api/wallet/balance').then((r) => r.data),
};

export const paymentApi = {
  transfer: (req: TransferRequest, idempotencyKey: string) =>
    http
      .post<TransferResponse>('/api/payments/transfer', req, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data),
};

export const transactionApi = {
  history: (page = 0, size = 20) =>
    http
      .get<PageResponse<TransactionView>>('/api/transactions/history', { params: { page, size } })
      .then((r) => r.data),
  adminAll: (page = 0, size = 50) =>
    http
      .get<PageResponse<TransactionView>>('/api/admin/transactions', { params: { page, size } })
      .then((r) => r.data),
};
