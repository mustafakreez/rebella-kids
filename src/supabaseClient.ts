import { createClient } from '@supabase/supabase-js';
import { Customer, Sale, Purchase, Expense } from './types';

// Default values provided by user
export const DEFAULT_SUPABASE_URL = 'https://dnbdrdgoxzazcdbpjeey.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Vgbo0oKER2rBjWWMoC-AlQ_9jGdibtj';

// SQL Schema for users to create the tables in Supabase SQL editor
export const SUPABASE_SQL_SCHEMA = `-- 1. جدول سجل الزبائن والعملاء
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  province TEXT,
  "createdAt" TEXT
);

-- 2. جدول المشتريات والواردات للمخزن
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  "productCode" TEXT,
  quantity INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 0,
  supplier TEXT,
  date TEXT
);

-- 3. جدول فواتير مبيعات الأطفال بالجملة
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  province TEXT,
  category TEXT NOT NULL,
  "productCode" TEXT,
  quantity INTEGER DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  date TEXT,
  notes TEXT
);

-- 4. جدول قيود المصاريف التشغيلية
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  date TEXT
);`;

// Load custom credentials from localStorage if edited by the user
export function getSupabaseCredentials() {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
  }
  const url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
}

export function getSupabaseClient() {
  const { url, key } = getSupabaseCredentials();
  
  // Safe validation to prevent white screen of death on startup if credentials are empty or invalid
  if (!url || typeof url !== 'string' || !url.trim() || !url.startsWith('http')) {
    console.warn('Supabase URL is invalid or missing:', url);
    return null;
  }
  if (!key || typeof key !== 'string' || !key.trim()) {
    console.warn('Supabase Anon Key is missing');
    return null;
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Client Export
export const supabase = getSupabaseClient();

// Push all local data to Supabase (Upsert mode)
export async function pushDataToSupabase(
  customers: Customer[],
  purchases: Purchase[],
  sales: Sale[],
  expenses: Expense[]
) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('فشل جلب اتصال قاعدة المعطيات: يرجى التحقق من إعدادات الربط وعنوان URL ومفتاح Anon Key الصحيح لـ Supabase.');
  }
  const errorLog: string[] = [];

  // Sanitize data to match the database tables schema exactly (omitting extra JS UI state variables like 'items', 'gender', 'createdAt' etc. which are not columns)
  const cleanCustomers = customers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    province: c.province || '',
    createdAt: c.createdAt
  }));

  const cleanPurchases = purchases.map(p => ({
    id: p.id,
    category: p.category,
    productCode: p.productCode,
    quantity: p.quantity,
    price: p.price,
    supplier: p.supplier || '',
    date: p.date
  }));

  const cleanSales = sales.map(s => ({
    id: s.id,
    customerId: s.customerId,
    customerName: s.customerName,
    customerPhone: s.customerPhone || '',
    province: s.province || '',
    category: s.category,
    productCode: s.productCode,
    quantity: s.quantity,
    totalAmount: s.totalAmount,
    profit: s.profit,
    date: s.date,
    notes: s.notes || ''
  }));

  const cleanExpenses = expenses.map(e => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    category: e.category,
    date: e.date
  }));

  if (cleanCustomers.length > 0) {
    const { error } = await client.from('customers').upsert(cleanCustomers);
    if (error) {
      console.error('Error upserting customers:', error);
      errorLog.push(`الزبائن: ${error.message} (ربما لم يتم إنشاء جدول customers بعد)`);
    }
  }

  if (cleanPurchases.length > 0) {
    const { error } = await client.from('purchases').upsert(cleanPurchases);
    if (error) {
      console.error('Error upserting purchases:', error);
      errorLog.push(`المشتريات: ${error.message} (ربما لم يتم إنشاء جدول purchases بعد)`);
    }
  }

  if (cleanSales.length > 0) {
    const { error } = await client.from('sales').upsert(cleanSales);
    if (error) {
      console.error('Error upserting sales:', error);
      errorLog.push(`المبيعات: ${error.message} (ربما لم يتم إنشاء جدول sales بعد)`);
    }
  }

  if (cleanExpenses.length > 0) {
    const { error } = await client.from('expenses').upsert(cleanExpenses);
    if (error) {
      console.error('Error upserting expenses:', error);
      errorLog.push(`المصاريف: ${error.message} (ربما لم يتم إنشاء جدول expenses بعد)`);
    }
  }

  if (errorLog.length > 0) {
    throw new Error(errorLog.join('\n'));
  }
}

// Pull all data from Supabase Cloud
export async function pullDataFromSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('فشل جلب اتصال قاعدة المعطيات: يرجى التحقق من إعدادات الربط وعنوان URL ومفتاح Anon Key الصحيح لـ Supabase.');
  }

  const { data: customers, error: errC } = await client.from('customers').select('*');
  const { data: purchases, error: errP } = await client.from('purchases').select('*');
  const { data: sales, error: errS } = await client.from('sales').select('*');
  const { data: expenses, error: errE } = await client.from('expenses').select('*');

  const errorLog: string[] = [];
  if (errC) errorLog.push(`الزبائن: ${errC.message}`);
  if (errP) errorLog.push(`المشتريات: ${errP.message}`);
  if (errS) errorLog.push(`المبيعات: ${errS.message}`);
  if (errE) errorLog.push(`المصاريف: ${errE.message}`);

  if (errorLog.length > 0) {
    throw new Error(`تنبيه: فشل جلب بعض الجداول من سوبابيس (يرجى تشغيل كود SQL لإنشاء جداول قاعدة المعطيات):\n${errorLog.join('\n')}`);
  }

  return {
    customers: (customers || []) as Customer[],
    purchases: (purchases || []) as Purchase[],
    sales: (sales || []) as Sale[],
    expenses: (expenses || []) as Expense[],
  };
}

