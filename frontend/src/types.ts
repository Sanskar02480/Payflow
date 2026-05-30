export type Role = 'USER' | 'ADMIN';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AuthResponse {
  token: string;
  email: string;
  role: Role;
}

export interface WalletBalance {
  walletId: number;
  email: string;
  balance: number;
}

export interface TransferRequest {
  recipientEmail: string;
  amount: number;
}

export interface TransferResponse {
  transactionId: number;
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  status: TransactionStatus;
  senderNewBalance: number;
  completedAt: string;
  replayed: boolean;
}

export interface TransactionView {
  id: number;
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  status: TransactionStatus;
  direction: 'SENT' | 'RECEIVED' | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details: string[];
}
