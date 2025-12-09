export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  price: number;
  stock: number;
  expiryDate: string;
  batchNumber: string;
}

export interface CartItem extends Medicine {
  quantity: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'digital';
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Simplified for offline demo
  role: 'admin' | 'pharmacist';
  name: string;
  resetRequested?: boolean; // New field for forgot password logic
}

export interface SystemMessage {
  id: string;
  type: 'security' | 'user' | 'system';
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  relatedUserId?: string; // To link actions like password reset
}

export interface StoreSettings {
  storeName: string;
  addressLine1: string;
  addressLine2: string;
  contactNumber: string;
  logo: string; // Base64 string
  currencySymbol: string;
}

export enum Page {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  POS = 'POS',
  SALES = 'SALES',
  SUMMARY = 'SUMMARY',
  AI_CONSULTANT = 'AI_CONSULTANT',
  ADMIN = 'ADMIN',
  SYNC = 'SYNC',
}

export interface Stats {
  totalRevenue: number;
  totalOrders: number;
  lowStockCount: number;
  totalProducts: number;
}