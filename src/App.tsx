/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Customer, Sale, Purchase, Expense } from './types';
import { loadStateFromStorage, saveStateToStorage } from './data';
import { pushDataToSupabase } from './supabaseClient';
import { Dashboard } from './components/Dashboard';
import { SalesManager } from './components/SalesManager';
import { InventoryManager } from './components/InventoryManager';
import { CustomerManager } from './components/CustomerManager';
import { BackupManager } from './components/BackupManager';
import { ExpenseManager } from './components/ExpenseManager';
import { 
  BarChart3, ShoppingCart, Archive, Users, Database, 
  Sparkles, Check, RefreshCcw, Wifi, CloudRain, Coins
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'inventory' | 'customers' | 'backup' | 'expenses'>('dashboard');

  // Core accounting states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [initialized, setInitialized] = useState(false);
  const [supabaseAutoSync, setSupabaseAutoSync] = useState(false);

  // Load from Storage on boot
  useEffect(() => {
    const data = loadStateFromStorage();
    setCustomers(data.customers);
    setPurchases(data.purchases);
    setSales(data.sales);
    setExpenses(data.expenses);
    setSupabaseAutoSync(localStorage.getItem('supabase_auto_sync') === 'true');
    setInitialized(true);
  }, []);

  // Save to Storage on changes
  useEffect(() => {
    if (initialized) {
      saveStateToStorage(customers, purchases, sales, expenses);
      
      const isAutoSyncEnabled = localStorage.getItem('supabase_auto_sync') === 'true';
      setSupabaseAutoSync(isAutoSyncEnabled);
      
      if (isAutoSyncEnabled) {
        pushDataToSupabase(customers, purchases, sales, expenses)
          .then(() => console.log('Auto-synced to Supabase!'))
          .catch((err) => console.warn('Supabase background auto-sync:', err));
      }
    }
  }, [customers, purchases, sales, expenses, initialized]);

  // Sync state whenever active tab changes (to reflect toggles in BackupManager)
  useEffect(() => {
    if (initialized) {
      setSupabaseAutoSync(localStorage.getItem('supabase_auto_sync') === 'true');
    }
  }, [activeTab, initialized]);

  // Handler functions
  const handleAddCustomer = (newCust: Omit<Customer, 'id' | 'createdAt'>) => {
    const fresh: Customer = {
      ...newCust,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [fresh, ...prev]);
  };

  const handleEditCustomer = (editedCust: Customer) => {
    setCustomers(prev => prev.map(c => c.id === editedCust.id ? editedCust : c));
    // Update invoice records accordingly
    setSales(prev => prev.map(s => s.customerId === editedCust.id ? {
      ...s,
      customerName: editedCust.name,
      customerPhone: editedCust.phone,
      province: editedCust.province
    } : s));
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const handleAddSale = (newSale: Omit<Sale, 'id'>) => {
    const fresh: Sale = {
      ...newSale,
      id: `INV-${Date.now().toString().slice(-6)}`,
      createdAt: Date.now()
    };
    setSales(prev => [fresh, ...prev]);

    // Automatically register customer if they don't already exist in registry
    const existing = customers.find(c => c.name.trim().toLowerCase() === newSale.customerName.trim().toLowerCase());
    if (!existing) {
      const newCust: Customer = {
        id: newSale.customerId,
        name: newSale.customerName.trim(),
        phone: newSale.customerPhone || '',
        province: newSale.province || 'غير محدد',
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [newCust, ...prev]);
    }
  };

  const handleDeleteSale = (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const handleEditSale = (editedSale: Sale) => {
    setSales(prev => prev.map(s => s.id === editedSale.id ? editedSale : s));

    // Automatically register customer if they don't already exist in registry
    const existing = customers.find(c => c.name.trim().toLowerCase() === editedSale.customerName.trim().toLowerCase());
    if (!existing) {
      const newCust: Customer = {
        id: editedSale.customerId,
        name: editedSale.customerName.trim(),
        phone: editedSale.customerPhone || '',
        province: editedSale.province || 'غير محدد',
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [newCust, ...prev]);
    }
  };

  const handleAddPurchase = (newPur: Omit<Purchase, 'id'>) => {
    const fresh: Purchase = {
      ...newPur,
      id: `PUR-${Date.now().toString().slice(-6)}`,
      createdAt: Date.now()
    };
    setPurchases(prev => [fresh, ...prev]);
  };

  const handleEditPurchase = (id: string, updatedFields: Partial<Purchase>) => {
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };

  const handleDeletePurchase = (id: string) => {
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, archivedFromInventory: true } : p));
  };

  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const fresh: Expense = {
      ...newExp,
      id: `EXP-${Date.now().toString().slice(-6)}`
    };
    setExpenses(prev => [fresh, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleImportState = (imported: {
    customers: Customer[];
    purchases: Purchase[];
    sales: Sale[];
    expenses: Expense[];
  }) => {
    setCustomers(imported.customers);
    setPurchases(imported.purchases);
    setSales(imported.sales);
    setExpenses(imported.expenses);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="text-center space-y-2">
          <RefreshCcw className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-sm font-semibold">جارٍ تحميل نظام ريبلا كيدز المحاسبي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 text-slate-800 flex font-sans" dir="rtl">
      
      {/* Visual RTL Sidebar for Desktop Viewports (no-print) */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 no-print h-full hidden md:flex">
        <div>
          {/* Brand Identity */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-100">
            <div>
              <h1 className="text-base font-extrabold leading-none text-slate-950">ريبلا كيدز</h1>
            </div>
          </div>

          {/* Navigation link items */}
          <nav className="p-4 space-y-1">
            <button
               onClick={() => setActiveTab('dashboard')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all border text-right cursor-pointer ${
                 activeTab === 'dashboard'
                   ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                   : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
               }`}
            >
              <BarChart3 className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>📊 لوحة الأرباح والمصاريف</span>
            </button>

            <button
               onClick={() => setActiveTab('expenses')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all border text-right cursor-pointer ${
                 activeTab === 'expenses'
                   ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                   : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
               }`}
            >
              <Coins className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'expenses' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>💸 المصاريف والأرصدة</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all border text-right cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'sales' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>🧾 المبيعات وفواتير الزبائن</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all border text-right cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Archive className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'inventory' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>📦 جرد المخزن والواردات</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all border text-right cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'customers' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>👥 سجل الزبائن ومحاور الشحن</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all border text-right cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Database className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'backup' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>💾 قواعد البيانات والنسخ</span>
            </button>
          </nav>
        </div>

        {/* Corporate Status & Connectivity info */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
            <div>
              <p className="text-[10px] opacity-70">حالة الربط والشبكة</p>
              <p className="text-xs font-semibold">
                {supabaseAutoSync ? 'سوبابيس: ربط سحابي نشط ⚡' : 'سوبابيس: تخزين محلي آمن 💾'}
              </p>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${supabaseAutoSync ? 'bg-teal-400 animate-pulse' : 'bg-emerald-400'}`}></div>
          </div>
        </div>
      </aside>

      {/* Main Column area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Mobile Header (no-print) */}
        <header className="bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between md:hidden no-print shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-slate-900">ريبلا كيدز</h1>
          </div>
        </header>

        {/* Mobile menu container (no-print) */}
        <div className="bg-white border-b border-slate-150 py-2 px-3 flex items-center gap-1 overflow-x-auto select-none scrollbar-none md:hidden shrink-0 no-print">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border ${
              activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-slate-600 border-transparent'
            }`}
          >
            📊 لوحة التحكم
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border ${
              activeTab === 'expenses' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-slate-600 border-transparent'
            }`}
          >
            💸 المصاريف والأرصدة
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border ${
              activeTab === 'sales' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-slate-600 border-transparent'
            }`}
          >
            🧾 المبيعات
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border ${
              activeTab === 'inventory' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-slate-600 border-transparent'
            }`}
          >
            📦 المستودع
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border ${
              activeTab === 'customers' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-slate-600 border-transparent'
            }`}
          >
            👥 الزبائن
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border ${
              activeTab === 'backup' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-slate-600 border-transparent'
            }`}
          >
            💾 النسخ الاحتياطي
          </button>
        </div>

        {/* Content Pane container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {activeTab === 'dashboard' && (
            <Dashboard
              sales={sales}
              purchases={purchases}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseManager
              sales={sales}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'sales' && (
            <SalesManager
              sales={sales}
              customers={customers}
              purchases={purchases}
              onAddSale={handleAddSale}
              onDeleteSale={handleDeleteSale}
              onEditSale={handleEditSale}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManager
              purchases={purchases}
              sales={sales}
              onAddPurchase={handleAddPurchase}
              onEditPurchase={handleEditPurchase}
              onDeletePurchase={handleDeletePurchase}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerManager
              customers={customers}
              sales={sales}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'backup' && (
            <BackupManager
              customers={customers}
              purchases={purchases}
              sales={sales}
              expenses={expenses}
              onImportState={handleImportState}
            />
          )}

        </main>

      </div>

    </div>
  );
}
