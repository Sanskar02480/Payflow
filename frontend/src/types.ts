export type Role = 'USER' | 'ADMIN';

export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED' // original tx that was refunded
  | 'REFUND';  // compensating tx created by a refund

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

export interface DailySpent {
  spentToday: number;
  dailyLimit: number;
  remaining: number;
}

export interface TransactionView {
  id: number;
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  status: TransactionStatus;
  direction: 'SENT' | 'RECEIVED' | null;
  refundOfTransactionId: number | null;
  refundable: boolean;
  createdAt: string;
}

export interface RefundResponse {
  refundTransactionId: number;
  originalTransactionId: number;
  originalSenderEmail: string;
  originalRecipientEmail: string;
  amount: number;
  status: TransactionStatus;
  originalSenderNewBalance: number;
  refundedAt: string;
  replayed: boolean;
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
