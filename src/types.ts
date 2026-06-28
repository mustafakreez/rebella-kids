/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  province: string;
  createdAt: string;
}

export interface SaleItem {
  category: string;
  productCode: string;
  quantity: number;
  price: number; // manually entered unit selling price
  gender: 'boys' | 'girls';
  totalAmount: number;
  profit: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  province: string;
  category: string; // for backward compatibility, represent main category or first item
  productCode: string; // for backward compatibility, represent main code or first item
  quantity: number; // for backward compatibility, total quantity or first item
  totalAmount: number; // overall total
  profit: number; // overall profit
  date: string;
  notes?: string;
  gender?: 'boys' | 'girls'; // for backward compatibility
  items?: SaleItem[]; // populated for multiple items in invoice
  createdAt?: number;
}

export interface Purchase {
  id: string;
  category: string;
  productCode: string;
  quantity: number;
  price: number; // Unit Cost in USD
  supplier: string;
  date: string;
  gender?: 'boys' | 'girls';
  createdAt?: number;
  archivedFromInventory?: boolean;
}

export interface Expense {
  id: string;
  name: string;
  amount: number; // in USD
  category: 'rent' | 'advertising' | 'salaries' | 'other';
  date: string;
}

export interface InventoryItem {
  productCode: string;
  category: string;
  quantity: number;
}

export const SYRIAN_PROVINCES = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'دير الزور',
  'الرقة',
  'الحسكة',
  'درعا',
  'السويداء',
  'القنيطرة'
];

export const PRODUCT_CATEGORIES = [
  'بيجامات قطن صيفي',
  'بيجامات مخمل شتوي',
  'بيجامات إنترلوك ربيعي',
  'بيجامات بناتي خروج',
  'بيجامات ولادي سبورت',
  'طبيقي / بيبي قطنيات',
  'بيجامات ميلتون فرو',
  'أخرى'
];
