export enum UserRole {
  PROVIDER = 'PROVIDER',
  CUSTOMER = 'CUSTOMER',
  NONE = 'NONE'
}

export enum MilkType {
  COW = 'Cow',
  BUFFALO = 'Buffalo'
}

export enum PaymentMode {
  CASH = 'Cash',
  ONLINE = 'Online' // UPI/NetBanking
}

export enum DeliveryStatus {
  PENDING = 'Pending',
  DELIVERED = 'Delivered',
  MISSED = 'Missed', // Customer wasn't home
  PAUSED = 'Paused' // Customer requested pause
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  milkType: MilkType;
  defaultQuantity: number; // Litres
  prices: Record<MilkType, number>; // Price per litre for each type
  deliveryTime: 'Morning' | 'Evening';
  startDate: string;
  paymentMode: PaymentMode;
  balance: number;
  isPaused: boolean;
}

export interface DeliveryLog {
  id: string;
  customerId: string;
  date: string; // ISO Date string YYYY-MM-DD
  status: DeliveryStatus;
  quantity: number;
  milkType?: MilkType; // Added to allow specific delivery overrides
  extras: string[]; // e.g., "Curd", "Ghee"
  extraCost: number;
}

export interface PaymentLog {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  mode: PaymentMode;
}

export interface User {
  id: string;
  mobile: string;
  role: UserRole;
  name?: string;
  linkedCustomerId?: string; // If role is CUSTOMER
}