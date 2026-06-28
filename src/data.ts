/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Sale, Purchase, Expense } from './types';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'محلات الأمل للألبسة',
    phone: '0933111222',
    province: 'دمشق',
    createdAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'cust-2',
    name: 'بوتيك ياسمين الشام',
    phone: '0944555666',
    province: 'حلب',
    createdAt: '2026-04-18T12:30:00Z',
  },
  {
    id: 'cust-3',
    name: 'تجزئة الفرسان',
    phone: '0955999888',
    province: 'حمص',
    createdAt: '2026-05-02T15:15:00Z',
  },
  {
    id: 'cust-4',
    name: 'مجمع سيتي سنتر اللاذقية',
    phone: '0966444111',
    province: 'اللاذقية',
    createdAt: '2026-05-10T09:45:00Z',
  }
];

export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pur-1',
    category: 'بيجامات قطن صيفي',
    productCode: 'SUM-BOY-101',
    quantity: 150,
    price: 4.5, // 4.5$ per piece
    supplier: 'معمل الشروق للغزل والنسيج (حلب)',
    date: '2026-05-01',
  },
  {
    id: 'pur-2',
    category: 'بيجامات بناتي خروج',
    productCode: 'SUM-GRL-202',
    quantity: 120,
    price: 6.0,
    supplier: 'مجموعة الوفاء التجارية (ريف دمشق)',
    date: '2026-05-03',
  },
  {
    id: 'pur-3',
    category: 'بيجامات مخمل شتوي',
    productCode: 'WIN-MKM-303',
    quantity: 80,
    price: 8.5,
    supplier: 'ورشات حموي وإخوانه (دمشق)',
    date: '2026-05-05',
  },
  {
    id: 'pur-4',
    category: 'طبيقي / بيبي قطنيات',
    productCode: 'BAB-COT-404',
    quantity: 200,
    price: 3.2,
    supplier: 'معمل الشروق للغزل والنسيج (حلب)',
    date: '2026-05-08',
  },
  {
    id: 'pur-5',
    category: 'بيجامات إنترلوك ربيعي',
    productCode: 'SPR-INT-505',
    quantity: 100,
    price: 5.5,
    supplier: 'مجموعة الوفاء التجارية (ريف دمشق)',
    date: '2026-05-12',
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    customerId: 'cust-1',
    customerName: 'محلات الأمل للألبسة',
    customerPhone: '0933111222',
    province: 'دمشق',
    category: 'بيجامات قطن صيفي',
    productCode: 'SUM-BOY-101',
    quantity: 35,
    totalAmount: 245, // sold for 7$ each (Profit = 245 - (35 * 4.5) = 245 - 157.5 = 87.5)
    profit: 87.5,
    date: '2026-05-10',
    notes: 'تم الدفع بالدولار نقداً - تم تسليم البضاعة عبر شركة القدموس للشحن',
  },
  {
    id: 'sale-2',
    customerId: 'cust-2',
    customerName: 'بوتيك ياسمين الشام',
    customerPhone: '0944555666',
    province: 'حلب',
    category: 'بيجامات بناتي خروج',
    productCode: 'SUM-GRL-202',
    quantity: 20,
    totalAmount: 180, // sold for 9$ each (Profit = 180 - (20 * 6) = 60)
    profit: 60,
    date: '2026-05-15',
    notes: 'دفعة أولى 100$ والباقي عند المطابقة',
  },
  {
    id: 'sale-3',
    customerId: 'cust-1',
    customerName: 'محلات الأمل للألبسة',
    customerPhone: '0933111222',
    province: 'دمشق',
    category: 'طبيقي / بيبي قطنيات',
    productCode: 'BAB-COT-404',
    quantity: 50,
    totalAmount: 250, // sold for 5$ each (Profit = 250 - (50 * 3.2) = 250 - 160 = 90)
    profit: 90,
    date: '2026-05-18',
    notes: 'شحن مباشر إلى فرع الحريقة',
  },
  {
    id: 'sale-4',
    customerId: 'cust-3',
    customerName: 'تجزئة الفرسان',
    customerPhone: '0955999888',
    province: 'حمص',
    category: 'بيجامات إنترلوك ربيعي',
    productCode: 'SPR-INT-505',
    quantity: 15,
    totalAmount: 120, // sold for 8$ each (Profit = 120 - (15 * 5.5) = 120 - 82.5 = 37.5)
    profit: 37.5,
    date: '2026-05-22',
    notes: 'دفعة نقدية كاملة بالدولار',
  },
  {
    id: 'sale-5',
    customerId: 'cust-4',
    customerName: 'مجمع سيتي سنتر اللاذقية',
    customerPhone: '0966444111',
    province: 'اللاذقية',
    category: 'بيجامات مخمل شتوي',
    productCode: 'WIN-MKM-303',
    quantity: 10,
    totalAmount: 130, // sold for 13$ each (Profit = 130 - (10 * 8.5) = 45)
    profit: 45,
    date: '2026-05-25',
    notes: 'المحاسب أبو حيدر - تسليم كراجات',
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    name: 'آجار مستودع الحريقة الشهري',
    amount: 150,
    category: 'rent',
    date: '2026-05-01',
  },
  {
    id: 'exp-2',
    name: 'حملة إعلانات فيسبوك وتلغرام للموسم',
    amount: 80,
    category: 'advertising',
    date: '2026-05-04',
  },
  {
    id: 'exp-3',
    name: 'رواتب عمال المستودع والشحن',
    amount: 220,
    category: 'salaries',
    date: '2026-05-28',
  },
  {
    id: 'exp-4',
    name: 'فاتورة إنترنت ومحروقات مولدة',
    amount: 45,
    category: 'other',
    date: '2026-05-15',
  }
];

// LocalStorage helpers to load/save state smoothly
export function loadStateFromStorage() {
  if (typeof window === 'undefined') {
    return {
      customers: INITIAL_CUSTOMERS,
      purchases: INITIAL_PURCHASES,
      sales: INITIAL_SALES,
      expenses: INITIAL_EXPENSES
    };
  }

  const storedCustomers = localStorage.getItem('pajama_erp_customers');
  const storedPurchases = localStorage.getItem('pajama_erp_purchases');
  const storedSales = localStorage.getItem('pajama_erp_sales');
  const storedExpenses = localStorage.getItem('pajama_erp_expenses');

  return {
    customers: storedCustomers ? JSON.parse(storedCustomers) : INITIAL_CUSTOMERS,
    purchases: storedPurchases ? JSON.parse(storedPurchases) : INITIAL_PURCHASES,
    sales: storedSales ? JSON.parse(storedSales) : INITIAL_SALES,
    expenses: storedExpenses ? JSON.parse(storedExpenses) : INITIAL_EXPENSES
  };
}

export function saveStateToStorage(
  customers: Customer[],
  purchases: Purchase[],
  sales: Sale[],
  expenses: Expense[]
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pajama_erp_customers', JSON.stringify(customers));
  localStorage.setItem('pajama_erp_purchases', JSON.stringify(purchases));
  localStorage.setItem('pajama_erp_sales', JSON.stringify(sales));
  localStorage.setItem('pajama_erp_expenses', JSON.stringify(expenses));
}
