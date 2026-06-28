/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Purchase, Sale, PRODUCT_CATEGORIES } from '../types';
import { formatDateToShow } from '../utils';
import { 
  Archive, 
  PlusCircle, 
  Search, 
  Truck, 
  AlertCircle, 
  TrendingUp, 
  AlertTriangle, 
  Trash2, 
  ShieldAlert,
  Edit2,
  Calendar,
  Users,
  CheckCircle2,
  Tag
} from 'lucide-react';

interface InventoryManagerProps {
  purchases: Purchase[];
  sales: Sale[];
  onAddPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  onEditPurchase: (id: string, updatedFields: Partial<Purchase>) => void;
  onDeletePurchase: (id: string) => void;
}

export function InventoryManager({
  purchases,
  sales,
  onAddPurchase,
  onEditPurchase,
  onDeletePurchase
}: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'log' | 'suppliers'>('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedLogKeys, setExpandedLogKeys] = useState<string[]>([]);

  // Form states
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(1);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [gender, setGender] = useState<'boys' | 'girls'>('boys');
  const [success, setSuccess] = useState('');

  // Expanded supplier ID state to view their items in ledger tab
  const [expandedSupplierName, setExpandedSupplierName] = useState<string | null>(null);
  const [selectedSupplierMonth, setSelectedSupplierMonth] = useState<string>('all');

  // Local persistence for archived suppliers (stopped dealing with them)
  const [archivedSuppliers, setArchivedSuppliers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('archivedSuppliers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showArchivedSuppliers, setShowArchivedSuppliers] = useState<boolean>(false);
  const [supplierDeleteConfirmName, setSupplierDeleteConfirmName] = useState<string | null>(null);

  const handleArchiveSupplier = (name: string) => {
    setArchivedSuppliers(prev => {
      const updated = prev.includes(name) ? prev : [...prev, name];
      localStorage.setItem('archivedSuppliers', JSON.stringify(updated));
      return updated;
    });
    setSupplierDeleteConfirmName(null);
  };

  const handleRestoreSupplier = (name: string) => {
    setArchivedSuppliers(prev => {
      const updated = prev.filter(n => n !== name);
      localStorage.setItem('archivedSuppliers', JSON.stringify(updated));
      return updated;
    });
  };

  const getArabicMonthName = (yearMonth: string) => {
    const parts = yearMonth.split('-');
    if (parts.length < 2) return yearMonth;
    const year = parts[0];
    const month = parts[1];
    const monthsAr: { [key: string]: string } = {
      '01': 'كانون الثاني / يناير',
      '02': 'شباط / فبراير',
      '03': 'آذار / مارس',
      '04': 'نيسان / أبريل',
      '05': 'أيار / مايو',
      '06': 'حزيران / يونيو',
      '07': 'تموز / يوليو',
      '08': 'آب / أغسطس',
      '09': 'أيلول / سبتمبر',
      '10': 'تشرين الأول / أكتوبر',
      '11': 'تشرين الثاني / نوفمبر',
      '12': 'كانون الأول / ديسمبر'
    };
    return `${monthsAr[month] || month} ${year}`;
  };

  // Compute calculated stock levels based on chronologically sorted Purchases and Sales (Perpetual Inventory Method)
  const stockMap: {
    [key: string]: {
      code: string;
      category: string;
      totalIn: number;
      totalOut: number;
      currentStock: number;
      avgPriceIn: number;
      salesCount: number;
      gender: 'boys' | 'girls';
    }
  } = {};

  // Build sorted transaction list
  const sortedTransactions: Array<
    | { type: 'purchase'; date: string; createdAt: number; p: Purchase }
    | { type: 'sale'; date: string; createdAt: number; s: Sale }
  > = [];

  purchases.forEach(p => {
    if (p.archivedFromInventory) return;
    sortedTransactions.push({
      type: 'purchase',
      date: p.date.split('T')[0],
      createdAt: p.createdAt || 0,
      p
    });
  });

  sales.forEach(s => {
    sortedTransactions.push({
      type: 'sale',
      date: s.date.split('T')[0],
      createdAt: s.createdAt || 0,
      s
    });
  });

  // Sort: older first. On same day, purchase first to have stock to sell.
  sortedTransactions.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.type !== b.type) {
      return a.type === 'purchase' ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });

  sortedTransactions.forEach(tx => {
    if (tx.type === 'purchase') {
      const p = tx.p;
      const code = p.productCode.toUpperCase().trim();
      const g = p.gender || 'boys';
      const key = `${code}_${g}`;

      if (!stockMap[key]) {
        stockMap[key] = {
          code,
          category: p.category,
          totalIn: 0,
          totalOut: 0,
          currentStock: 0,
          avgPriceIn: 0,
          salesCount: 0,
          gender: g
        };
      }

      // Cost calculation with remaining stock on hand before this purchase
      const remainingQty = Math.max(0, stockMap[key].currentStock);
      const oldAvgPrice = stockMap[key].avgPriceIn;
      const currentValuation = remainingQty * oldAvgPrice;
      const newBatchValuation = p.quantity * p.price;
      const totalNewQty = remainingQty + p.quantity;

      stockMap[key].avgPriceIn = totalNewQty > 0 ? (currentValuation + newBatchValuation) / totalNewQty : p.price;
      stockMap[key].totalIn += p.quantity;
      stockMap[key].currentStock += p.quantity;

    } else {
      const s = tx.s;
      // Process sales items
      if (s.items && s.items.length > 0) {
        s.items.forEach(item => {
          const code = item.productCode.toUpperCase().trim();
          const g = item.gender || 'boys';
          const key = `${code}_${g}`;

          const activePurchasesOfItem = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === code && (p.gender || 'boys') === g);
          if (activePurchasesOfItem.length > 0) {
            const isValidSale = activePurchasesOfItem.some(p => {
              const sDateSplit = s.date.split('T')[0];
              const pDateSplit = p.date.split('T')[0];
              if (sDateSplit >= pDateSplit) return true;
              if (s.createdAt && p.createdAt && s.createdAt >= p.createdAt) return true;
              return false;
            });
            if (!isValidSale) return;
          } else {
            return;
          }

          if (!stockMap[key]) {
            stockMap[key] = {
              code,
              category: item.category,
              totalIn: 0,
              totalOut: 0,
              currentStock: 0,
              avgPriceIn: 0,
              salesCount: 0,
              gender: g
            };
          }
          stockMap[key].totalOut += item.quantity;
          stockMap[key].currentStock -= item.quantity;
          stockMap[key].salesCount += item.quantity;
        });
      } else {
        // Backward compatibility flat invoices
        const code = s.productCode.toUpperCase().trim();
        const g = s.gender || 'boys';
        const key = `${code}_${g}`;

        const activePurchasesOfItem = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === code && (p.gender || 'boys') === g);
        if (activePurchasesOfItem.length > 0) {
          const isValidSale = activePurchasesOfItem.some(p => {
            const sDateSplit = s.date.split('T')[0];
            const pDateSplit = p.date.split('T')[0];
            if (sDateSplit >= pDateSplit) return true;
            if (s.createdAt && p.createdAt && s.createdAt >= p.createdAt) return true;
            return false;
          });
          if (!isValidSale) return;
        } else {
          return;
        }

        if (!stockMap[key]) {
          stockMap[key] = {
            code,
            category: s.category,
            totalIn: 0,
            totalOut: 0,
            currentStock: 0,
            avgPriceIn: 0,
            salesCount: 0,
            gender: g
          };
        }
        stockMap[key].totalOut += s.quantity;
        stockMap[key].currentStock -= s.quantity;
        stockMap[key].salesCount += s.quantity;
      }
    }
  });

  // Convert to Array for rendering
  const stockList = Object.values(stockMap);

  // Filter lists based on search
  const filteredStock = stockList.filter(item => 
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group active purchases by SKU (productCode + gender combo) for consolidated view
  interface GroupedPurchase {
    key: string;
    productCode: string;
    category: string;
    categories: string[];
    gender: 'boys' | 'girls';
    supplier: string;
    suppliers: string[];
    totalQuantity: number;
    weightedAvgPrice: number;
    totalInvoice: number;
    mostRecentDate: string;
    items: Purchase[];
  }

  const groupedPurchasesMap: { [key: string]: GroupedPurchase } = {};

  purchases.forEach(p => {
    if (p.archivedFromInventory) return;
    const code = p.productCode.toUpperCase().trim();
    const g = p.gender || 'boys';
    const key = `${code}_${g}`;

    if (!groupedPurchasesMap[key]) {
      groupedPurchasesMap[key] = {
        key,
        productCode: code,
        category: p.category,
        categories: [],
        gender: g,
        supplier: p.supplier,
        suppliers: [],
        totalQuantity: 0,
        weightedAvgPrice: 0,
        totalInvoice: 0,
        mostRecentDate: p.date,
        items: []
      };
    }

    const gp = groupedPurchasesMap[key];
    gp.items.push(p);
    gp.totalQuantity += p.quantity;
    gp.totalInvoice += (p.quantity * p.price);

    if (p.date > gp.mostRecentDate) {
      gp.mostRecentDate = p.date;
      gp.category = p.category; // Set the most recent category as primary
      gp.supplier = p.supplier; // Set the most recent supplier as primary
    }

    if (p.category && !gp.categories.includes(p.category)) {
      gp.categories.push(p.category);
    }
    if (p.supplier && !gp.suppliers.includes(p.supplier)) {
      gp.suppliers.push(p.supplier);
    }
  });

  // Calculate weighted average price for each SKU
  Object.values(groupedPurchasesMap).forEach(gp => {
    gp.weightedAvgPrice = gp.totalQuantity > 0 ? (gp.totalInvoice / gp.totalQuantity) : 0;
  });

  const groupedPurchasesList = Object.values(groupedPurchasesMap);

  const filteredGroupedPurchasesLog = groupedPurchasesList.filter(gp => {
    const search = searchTerm.toLowerCase();
    const matchesCode = gp.productCode.toLowerCase().includes(search);
    const matchesCategory = gp.categories.some(cat => cat.toLowerCase().includes(search));
    const matchesSupplier = gp.suppliers.some(sup => sup.toLowerCase().includes(search));
    return matchesCode || matchesCategory || matchesSupplier;
  });

  // Group purchases by Supplier for the Supplier accounting ledger tab
  const suppliersMap: {
    [name: string]: {
      name: string;
      totalSpent: number;
      totalPieces: number;
      items: {
        id: string;
        productCode: string;
        category: string;
        price: number;
        quantity: number;
        date: string;
        gender?: 'boys' | 'girls';
        archivedFromInventory?: boolean;
      }[];
    }
  } = {};

  purchases.forEach(p => {
    const name = p.supplier.trim() || 'مورد عام / بدون اسم';
    if (!suppliersMap[name]) {
      suppliersMap[name] = {
        name,
        totalSpent: 0,
        totalPieces: 0,
        items: []
      };
    }
    suppliersMap[name].totalSpent += (p.quantity * p.price);
    suppliersMap[name].totalPieces += p.quantity;
    suppliersMap[name].items.push({
      id: p.id,
      productCode: p.productCode,
      category: p.category,
      price: p.price,
      quantity: p.quantity,
      date: p.date,
      gender: p.gender,
      archivedFromInventory: p.archivedFromInventory
    });
  });

  const suppliersList = Object.values(suppliersMap);
  const filteredSuppliers = suppliersList.filter(s => {
    const isSupplierArchived = archivedSuppliers.includes(s.name);
    if (!showArchivedSuppliers && isSupplierArchived) {
      return false;
    }
    return s.name.toLowerCase().includes(supplierSearch.toLowerCase());
  });

  const expandedSupplierItems = expandedSupplierName ? (suppliersMap[expandedSupplierName]?.items || []) : [];
  const expandedSupplierMonths = Array.from(new Set(expandedSupplierItems.map(item => item.date.substring(0, 7)))).sort().reverse();

  const filteredSupplierItems = expandedSupplierItems.filter(item => {
    if (selectedSupplierMonth === 'all') return true;
    return item.date.substring(0, 7) === selectedSupplierMonth;
  });

  const filteredSupplierSpent = filteredSupplierItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const filteredSupplierPieces = filteredSupplierItems.reduce((sum, item) => sum + item.quantity, 0);

  // Detect if typed productCode exists in general stock (synchronized with active purchases)
  const cleanTypedCode = productCode.toUpperCase().trim();
  const isCodeExistentInStock = cleanTypedCode.length > 0 && purchases.some(p => p.productCode.toUpperCase().trim() === cleanTypedCode);
  const isExactItemExistent = cleanTypedCode.length > 0 && purchases.some(p => p.productCode.toUpperCase().trim() === cleanTypedCode && (p.gender || 'boys') === gender);

  // Form submission
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productCode || quantity <= 0 || price <= 0 || !supplier) return;

    if (editingPurchaseId) {
      // Editing Mode
      onEditPurchase(editingPurchaseId, {
        category,
        productCode: productCode.toUpperCase().trim(),
        quantity: Number(quantity),
        price: Number(price),
        supplier,
        date,
        gender
      });
      setSuccess('تم تعديل بيانات فاتورة الوارد بالمستودع وتحديث المخزون بنجاح!');
      setEditingPurchaseId(null);
    } else {
      // Add Mode
      onAddPurchase({
        category,
        productCode: productCode.toUpperCase().trim(),
        quantity: Number(quantity),
        price: Number(price),
        supplier,
        date,
        gender
      });
      setSuccess('تم تسجيل إدخال البضاعة الواردة للمستودع وتحديث المخزون بنجاح!');
    }

    // Reset Form
    setProductCode('');
    setQuantity(1);
    setPrice(1);
    setSupplier('');
    setGender('boys');
    setTimeout(() => setSuccess(''), 3500);
  };

  // Start editing a purchase
  const handleStartEdit = (pur: Purchase) => {
    setEditingPurchaseId(pur.id);
    setCategory(pur.category);
    setProductCode(pur.productCode);
    setQuantity(pur.quantity);
    setPrice(pur.price);
    setSupplier(pur.supplier);
    setDate(pur.date);
    setGender(pur.gender || 'boys');
    setSuccess('');
    setActiveTab('status'); // Switch to form tab automatically so the user sees the input fields
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPurchaseId(null);
    setProductCode('');
    setQuantity(1);
    setPrice(1);
    setSupplier('');
    setGender('boys');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header section with tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans">إدارة المستودع وسجل الواردات</h2>
            <p className="text-xs text-slate-500 font-sans">مراقبة حركات المخزون، تتبع كودات الأصناف، وتسجيل طلبيات الواردات والجنس والشحن</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-center border border-slate-200 font-sans overflow-x-auto select-none scrollbar-none">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activeTab === 'status' ? 'bg-white text-emerald-700 shadow-xs text-emerald-800' : 'text-slate-600 hover:text-slate-900'} ${editingPurchaseId ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
          >
            {editingPurchaseId ? '✏️ تعديل صنف المشتريات' : '➕ إضافة صنف جديد'}
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activeTab === 'log' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            📝 سجل فواتير المشتريات
          </button>
          <button
            onClick={() => {
              setActiveTab('suppliers');
              setExpandedSupplierName(null);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activeTab === 'suppliers' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🏭 الموردين والمعامل
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tab Contents */}
        <div className="w-full space-y-4">
          
          {/* TAB 1: إضافة أصناف (formerly status) */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              
              {/* Purchase Inward Entry / Edit Form */}
              <div className="w-full bg-white rounded-xl p-5 md:p-6 border border-slate-205 shadow-xs leading-relaxed text-right">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2 text-xs">
                  {editingPurchaseId ? (
                    <Edit2 className="h-5 w-5 text-emerald-600 animate-pulse" />
                  ) : (
                    <PlusCircle className="h-5 w-5 text-emerald-600" />
                  )}
                  {editingPurchaseId ? 'تعديل فاتورة وارد سابقة' : 'شراء وارد جديد (مشتريات) على كامل مساحة الشاشة'}
                </h3>

                {success && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg mb-4 text-[11px] font-bold border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitPurchase} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">صنف الملابس الكلي (اختيار أو كتابة):</label>
                      <input
                        type="text"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        list="category-suggestions"
                        required
                        placeholder="اكتب اسم الصنف أو اختر..."
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden text-right bg-white text-slate-705"
                      />
                      <datalist id="category-suggestions">
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">كود الصنف (مهم جداً وموحد):</label>
                      <input
                        type="text"
                        value={productCode}
                        onChange={e => setProductCode(e.target.value)}
                        required
                        placeholder="مثال: SUM-BOY-101"
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden font-mono uppercase text-right tracking-wider"
                      />
                      
                      {isExactItemExistent && !editingPurchaseId && (
                        <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-[10px] space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            الكود مسجل مسبقاً: سيتم تسجيل دفعة جديدة وتحديث المخزون!
                          </p>
                          <p className="text-emerald-700 text-[9px] font-medium font-sans">
                            تم العثور على هذا الصنف مسبقاً. سيتم تسجيل هذه الشحنة كدفعة منفصلة ومستقلة لتتبع كشف حساب المورد بدقة وبشكل زمني، مع دمج الكميات تلقائياً وتحديث إجمالي المتبقي بالمستودع.
                          </p>
                        </div>
                      )}

                      {!isExactItemExistent && isCodeExistentInStock && !editingPurchaseId && (
                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-[10px] space-y-1">
                          <p className="font-bold flex items-center gap-1 text-amber-900">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            الكود مسجل مسبقاً ولكن بجنس آخر!
                          </p>
                          <p className="text-slate-500 text-[9px] font-sans">
                            هذا الكود مسجل مسبقاً بجنس مخالف. سيتم تسجيله كمدخل منفصل تماماً لتجنب اختلاط الجرد الصبياني والبناتي.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الجنس المستهدف للصنف:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGender('boys')}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            gender === 'boys'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          صبياني
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('girls')}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            gender === 'girls'
                              ? 'bg-pink-50 text-pink-700 border-pink-200 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          بناتي
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الكمية الإجمالية (بالقطعة الفردية - وليس بالدرزن):</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        required
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden font-mono text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">سعر التكلفة للقطعة الواحدة ($):</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={price}
                        onChange={e => setPrice(Number(e.target.value))}
                        required
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden font-mono text-center bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">اسم المورد / ورشة الموديل:</label>
                      <input
                        type="text"
                        value={supplier}
                        onChange={e => setSupplier(e.target.value)}
                        required
                        placeholder="مثال: معامل الفرح للقطنيات"
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">تاريخ إدخال الدفعة:</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden font-mono text-right"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs whitespace-nowrap transition-colors cursor-pointer shadow-xs"
                    >
                      {editingPurchaseId ? 'حفظ التعديلات' : 'تسجيل فاتورة الوارد'}
                    </button>
                    {editingPurchaseId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold border border-slate-200 text-xs transition-colors cursor-pointer"
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="bg-white rounded-xl p-4 border border-slate-205 shadow-xs flex items-center text-right">
              <div className="relative w-full">
                <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث بكود الصنف، أو صنف الملابس، أو المورد لفلترة الجدول الفعلي..."
                  className="w-full pr-10 pl-4 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden transition-colors text-right font-sans"
                />
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="bg-white rounded-xl p-4 border border-slate-205 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={e => setSupplierSearch(e.target.value)}
                  placeholder="ابحث عن اسم المورد أو المصنع أو مشغل الخياطة بالجملة..."
                  className="w-full pr-10 pl-4 py-1.5 rounded-lg text-xs border border-slate-205 focus:border-emerald-500 outline-hidden transition-colors text-right font-sans"
                />
              </div>
              <div className="flex items-center gap-2 select-none cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="showArchivedSuppliers"
                  checked={showArchivedSuppliers}
                  onChange={e => setShowArchivedSuppliers(e.target.checked)}
                  className="rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="showArchivedSuppliers" className="text-xs font-bold text-slate-650 cursor-pointer">
                  🗄️ إظهار الموردين الموقوف التعامل معهم ({archivedSuppliers.length})
                </label>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="bg-white rounded-xl border border-slate-205 shadow-xs overflow-hidden leading-relaxed">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center font-sans">
                <span className="font-bold text-slate-900 text-xs">سجل حركة الوارد التفصيلية مع الموردين ومصانع التوريد</span>
                <span className="text-[10px] text-slate-400 font-semibold">مجموع الأصناف المستوردة: {groupedPurchasesList.length} صنفاً (موزعة على {purchases.filter(p => !p.archivedFromInventory).length} دفعة مستقلة)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right divide-y divide-slate-100 font-sans">
                  <thead className="bg-slate-50 text-slate-400 text-[10px]">
                    <tr>
                      <th className="p-3 font-semibold text-center">آخر توريد</th>
                      <th className="p-3 font-semibold">كود الصنف</th>
                      <th className="p-3 font-semibold">أصناف الموديل</th>
                      <th className="p-3 font-semibold text-center">الجنس</th>
                      <th className="p-3 font-semibold">الموردين / المصانع</th>
                      <th className="p-3 font-semibold text-center font-mono">الكمية المسجلة</th>
                      <th className="p-3 font-semibold text-center text-slate-700 bg-slate-100 border-x border-slate-200">الكمية المتبقية حالياً</th>
                      <th className="p-2.5 font-semibold text-center">متوسط التكلفة للقطعة</th>
                      <th className="p-3 font-semibold text-center font-mono">فاتورة الوارد الإجمالية</th>
                      <th className="p-3 font-semibold text-center">شحنات الوارد التفصيلية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                    {filteredGroupedPurchasesLog.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-medium font-sans">
                          لم يتم العثور على أي سجلات واردة للفلترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredGroupedPurchasesLog.map(gp => {
                        const key = gp.key;
                        const remaining = stockMap[key]?.currentStock ?? 0;
                        const isOut = remaining <= 0;
                        const isLow = remaining < 15;
                        const isExpanded = expandedLogKeys.includes(key);

                        // Join all suppliers nicely
                        const suppliersStr = gp.suppliers.join(' / ') || gp.supplier;
                        // Join all categories nicely
                        const categoriesStr = gp.categories.join(' / ') || gp.category;

                        return (
                          <React.Fragment key={key}>
                            {/* Main Grouped Row */}
                            <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-55/40 border-b-0' : ''}`}>
                              <td className="p-3 text-center font-mono text-slate-550 whitespace-nowrap">
                                {formatDateToShow(gp.mostRecentDate)}
                                <span className="text-[9px] text-slate-400 block">آخر توريد</span>
                              </td>
                              <td className="p-3 font-bold font-mono text-emerald-700">{gp.productCode}</td>
                              <td className="p-3 font-semibold text-slate-800">{categoriesStr}</td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${gp.gender === 'girls' ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                  {gp.gender === 'girls' ? '👧 بناتي' : '👦 صبياني'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-650">{suppliersStr}</td>
                              <td className="p-3 text-center font-mono font-bold text-slate-900">
                                {gp.totalQuantity} قطعة
                                <span className="text-[9px] text-slate-400 font-sans block">إجمالي الوارد</span>
                              </td>
                              <td className="p-3 text-center font-mono bg-slate-50 border-x border-slate-100 font-bold">
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black inline-block text-center min-w-[85px] ${
                                  remaining < 0 
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                    : remaining === 0
                                      ? 'bg-red-50 text-red-650 border border-red-100'
                                      : isLow 
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-250'
                                }`}>
                                  {remaining} قطعة {remaining < 0 ? '❌ جرد سالب' : remaining === 0 ? '❌ نفذ' : isLow ? '⚠️' : '✅'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-indigo-700">
                                ${gp.weightedAvgPrice.toFixed(2)}
                                <span className="text-[9px] text-slate-400 block font-normal">(متوسط التكلفة)</span>
                              </td>
                              <td className="p-3 text-center font-bold font-mono text-emerald-600">${(gp.totalInvoice).toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedLogKeys(prev => 
                                      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-150 text-indigo-700 border border-indigo-100 transition-all flex items-center gap-1.5 mx-auto cursor-pointer font-sans"
                                >
                                  <span>{isExpanded ? '🔼 إخفاء الدفعات' : '🔽 عرض الدفعات'}</span>
                                  <span className="font-mono bg-indigo-200 text-indigo-800 px-1 py-0.5 rounded text-[10px]">
                                    {gp.items.length}
                                  </span>
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Details Sub-table */}
                            {isExpanded && (
                              <tr className="bg-slate-50/20">
                                <td colSpan={10} className="p-4 bg-slate-50/50 border-y border-slate-150 text-right">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                      <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2 font-sans">
                                        <span className="p-1 px-1.5 bg-indigo-100 text-indigo-850 rounded text-[10px] font-mono">#{gp.productCode}</span>
                                        <span>تفصيل دفعات الشحن وطلبيات التوريد المسجلة في السجل التاريخي:</span>
                                      </h5>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-right divide-y divide-slate-150 font-sans text-xs">
                                        <thead className="bg-slate-50 text-slate-450 text-[10px]">
                                          <tr>
                                            <th className="p-2.5 font-bold text-center">تاريخ الشحنة</th>
                                            <th className="p-2.5 font-bold">المورد / المصنع</th>
                                            <th className="p-2.5 font-bold">الموديل كحالة منفصلة</th>
                                            <th className="p-2.5 font-bold text-center">الكمية المسجلة</th>
                                            <th className="p-2.5 font-semibold text-center text-slate-705">التكلفة للقطعة</th>
                                            <th className="p-2.5 font-bold text-center">إجمالي الفاتورة</th>
                                            <th className="p-2.5 font-bold text-center">تحكم بالدفعة</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-705">
                                          {gp.items.map(pur => (
                                            <tr key={pur.id} className="hover:bg-slate-50/70">
                                              <td className="p-2.5 text-center font-mono text-slate-500">{formatDateToShow(pur.date)}</td>
                                              <td className="p-2.5 font-bold text-slate-800">{pur.supplier}</td>
                                              <td className="p-2.5 text-slate-650 font-medium">{pur.category}</td>
                                              <td className="p-2.5 text-center font-mono font-bold text-slate-800">{pur.quantity} قطعة</td>
                                              <td className="p-2.5 text-center font-mono text-indigo-650 font-bold">${pur.price}</td>
                                              <td className="p-2.5 text-center font-mono text-emerald-600 font-black">${(pur.quantity * pur.price).toFixed(2)}</td>
                                              <td className="p-2.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  <button
                                                    onClick={() => handleStartEdit(pur)}
                                                    className="p-1 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                                    title="تعديل الفاتورة"
                                                  >
                                                    <Edit2 className="h-3 w-3" />
                                                  </button>

                                                  {deleteConfirmId === pur.id ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                      <button
                                                        onClick={() => {
                                                          onDeletePurchase(pur.id);
                                                          setDeleteConfirmId(null);
                                                        }}
                                                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-750 text-white font-bold text-[10px] transition-colors cursor-pointer"
                                                      >
                                                        تأكيد
                                                      </button>
                                                      <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200"
                                                      >
                                                        إلغاء
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <button
                                                      onClick={() => setDeleteConfirmId(pur.id)}
                                                      className="p-1 px-1.5 rounded-lg bg-rose-50 text-rose-650 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
                                                      title="حذف فاتورة الوارد بالمخازن"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              
              {/* Supplier Search List View */}
              {!expandedSupplierName ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
                  {filteredSuppliers.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200 text-slate-400">
                      <Truck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs">لم يتم العثور على أي معامل أو ورش توريد تطابق الاسم المدخل.</p>
                    </div>
                  ) : (
                    filteredSuppliers.map((sup, idx) => (
                      <div key={idx} className={`bg-white p-5 rounded-xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${archivedSuppliers.includes(sup.name) ? 'border-rose-150 bg-rose-50/5' : 'border-slate-205'}`}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <Truck className="h-4.5 w-4.5" />
                              </div>
                              <h4 className="font-bold text-slate-900 text-xs">{sup.name}</h4>
                            </div>
                            {archivedSuppliers.includes(sup.name) && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-700 font-bold leading-none animate-pulse shrink-0">
                                🛑 موقوف التعامل معه
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-right">
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-tight">قطع مستوردة</span>
                              <span className="font-bold font-mono text-slate-800 text-xs">{sup.totalPieces} قطع</span>
                            </div>
                            <div className="border-r border-slate-200 pr-3">
                              <span className="text-[10px] text-slate-400 block leading-tight">إجمالي الحساب</span>
                              <span className="font-bold font-mono text-emerald-700 text-xs">${sup.totalSpent.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setExpandedSupplierName(sup.name);
                              setSelectedSupplierMonth('all');
                            }}
                            className="flex-1 text-center py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                          >
                            👁️ كشف البضائع
                          </button>
                          
                          {archivedSuppliers.includes(sup.name) ? (
                            <button
                              onClick={() => handleRestoreSupplier(sup.name)}
                              className="px-2.5 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-250 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                              title="إعادة تفعيل المورد والتعامل معه"
                            >
                              تفعيل
                            </button>
                          ) : (
                            supplierDeleteConfirmName === sup.name ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleArchiveSupplier(sup.name)}
                                  className="px-2 py-2 rounded-lg bg-rose-600 hover:bg-rose-705 text-white font-bold text-[10px] transition-colors cursor-pointer"
                                  title="تأكيد إيقاف التعامل مع المورد"
                                >
                                  تأكيد
                                </button>
                                <button
                                  onClick={() => setSupplierDeleteConfirmName(null)}
                                  className="px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] border border-slate-200 font-bold transition-colors cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSupplierDeleteConfirmName(sup.name)}
                                className="px-2.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-650 border border-rose-100 text-xs font-bold transition-colors cursor-pointer"
                                title="إيقاف التعامل وحذف من القائمة الرئيسية"
                              >
                                إيقاف
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Detailed ledger view for a single supplier
                <div className="bg-white rounded-xl border border-slate-205 shadow-xs overflow-hidden leading-relaxed font-sans">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        كشف حساب تفصيلي للمورد: {expandedSupplierName}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        إجمالي التوريدات الكلية مدى الحياة: ${suppliersMap[expandedSupplierName]?.totalSpent.toFixed(2)} | الكميات: {suppliersMap[expandedSupplierName]?.totalPieces} قطعة
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setExpandedSupplierName(null);
                        setSelectedSupplierMonth('all');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-xs border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      🔙 عودة لقائمة الموردين
                    </button>
                  </div>

                  {/* Month filter bar */}
                  <div className="p-4 bg-slate-50/50 border-b border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">📅 فلترة المشتريات بالشهور:</span>
                      <select
                        value={selectedSupplierMonth}
                        onChange={(e) => setSelectedSupplierMonth(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="all">عرض كافة الأشهر (بدون فلترة)</option>
                        {expandedSupplierMonths.map(ym => (
                          <option key={ym} value={ym}>
                            {getArabicMonthName(ym)} ({ym})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedSupplierMonth !== 'all' && (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-3 py-1.5 rounded-lg text-xs">
                        فلترة شهر {getArabicMonthName(selectedSupplierMonth)}: إجمالي التوريد: <span className="font-mono text-emerald-700">${filteredSupplierSpent.toFixed(2)}</span> | قطع مستلمة: <span className="font-mono text-slate-900">{filteredSupplierPieces} قطع</span>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right divide-y divide-slate-100 font-sans">
                      <thead className="bg-slate-50 text-slate-450 text-[10px]">
                        <tr>
                          <th className="p-3 font-semibold text-center">التاريخ</th>
                          <th className="p-3 font-semibold">كود الصنف</th>
                          <th className="p-3 font-semibold">الصنف الكلي</th>
                          <th className="p-3 font-semibold text-center">نوع الموديل</th>
                          <th className="p-3 font-semibold text-center">الكمية المسحوبة</th>
                          <th className="p-3 font-semibold text-center">سعر التكلفة فردي</th>
                          <th className="p-3 font-semibold text-center">الإجمالي ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                        {filteredSupplierItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              لم يتم العثور على فواتير تطابق الفلتر المحدد.
                            </td>
                          </tr>
                        ) : (
                          filteredSupplierItems.map((item, index) => (
                            <tr key={index} className={`hover:bg-slate-50/50 ${item.archivedFromInventory ? 'opacity-75 bg-rose-50/10' : ''}`}>
                              <td className="p-3 text-center font-mono text-slate-500">{formatDateToShow(item.date)}</td>
                              <td className="p-3 font-mono">
                                <div className="flex items-center justify-start gap-1.5">
                                  <span className={`font-bold ${item.archivedFromInventory ? 'text-slate-400 font-medium' : 'text-emerald-700'}`}>{item.productCode}</span>
                                  {item.archivedFromInventory && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 rounded font-bold leading-none scale-90 shrink-0">
                                      محذوف من المخزن
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-slate-800">{item.category}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.gender === 'girls' ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                  {item.gender === 'girls' ? '👧 بناتي' : '👦 صبياني'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="p-3 text-center font-mono">${item.price}</td>
                              <td className="p-3 text-center font-bold font-mono text-emerald-600">${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
