/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Sale, Purchase, SaleItem, PRODUCT_CATEGORIES } from '../types';
import { 
  ShoppingCart, 
  ShoppingBag, 
  DollarSign, 
  UserCheck, 
  Search, 
  PlusCircle, 
  Trash2, 
  FileText, 
  Phone, 
  MapPin, 
  Sparkles, 
  Edit, 
  Tag, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Download
} from 'lucide-react';
import { InvoicePrintable } from './InvoicePrintable';
import { formatDateToShow } from '../utils';

interface SalesManagerProps {
  sales: Sale[];
  customers: Customer[];
  purchases: Purchase[];
  onAddSale: (sale: Omit<Sale, 'id'>) => void;
  onDeleteSale: (id: string) => void;
  onEditSale: (sale: Sale) => void;
}

export function SalesManager({
  sales,
  customers,
  purchases,
  onAddSale,
  onDeleteSale,
  onEditSale
}: SalesManagerProps) {
  // Navigation & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // Form: Customer fields
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState('');

  // Form: Sub-items array inside the current invoice being compiled
  const [invoiceItems, setInvoiceItems] = useState<SaleItem[]>([]);

  // Form: Current sub-item inputs (under construction)
  const [subCategory, setSubCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [subProductCode, setSubProductCode] = useState('');
  const [subGender, setSubGender] = useState<'boys' | 'girls'>('boys');
  const [subQuantity, setSubQuantity] = useState<number>(1); // defaults to 1 piece
  const [subPrice, setSubPrice] = useState<number>(5.00); // selling price (set manually!)

  // Auto populate phone and province and calculate customer stats when customer name matches
  const selectedCustomer = customers.find(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase());
  const selectedCustomerId = selectedCustomer ? selectedCustomer.id : '';

  useEffect(() => {
    if (selectedCustomer) {
      setPhone(selectedCustomer.phone);
      setProvince(selectedCustomer.province);
    }
  }, [selectedCustomer]);

  // Dynamically match category, gender, and price on manual typing/selection of a product code, prioritizing variants with positive stock
  useEffect(() => {
    if (!subProductCode) return;
    const trimmed = subProductCode.toUpperCase().trim();
    const matchingPurchases = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === trimmed);
    if (matchingPurchases.length > 0) {
      // Prioritize the variant/gender that has remaining available stock (> 0)
      const withStock = matchingPurchases.find(p => getLiveStockAvailable(p.productCode, p.gender || 'boys') > 0);
      const match = withStock || matchingPurchases[0];
      setSubCategory(match.category);
      
      const targetGender = match.gender || 'boys';
      setSubGender(prev => prev !== targetGender ? targetGender : prev);

      // Dynamically calculate and suggest selling price based on the latest sold price or cost markup
      let suggestedPrice = 5.00;
      
      // Look for the most recent sale of this item code and gender
      let lastSoldPrice = 0;
      for (let i = sales.length - 1; i >= 0; i--) {
        const s = sales[i];
        if (s.items && s.items.length > 0) {
          const itemMatch = s.items.find(item => item.productCode.toUpperCase().trim() === trimmed && (item.gender || 'boys') === targetGender);
          if (itemMatch) {
            lastSoldPrice = itemMatch.price;
            break;
          }
        } else if (s.productCode.toUpperCase().trim() === trimmed && (s.gender || 'boys') === targetGender) {
          lastSoldPrice = s.totalAmount / (s.quantity || 1);
          break;
        }
      }

      if (lastSoldPrice > 0) {
        suggestedPrice = lastSoldPrice;
      } else {
        // Fallback to 50% profit markup on the cost of this item
        const cost = match.price || 3.5;
        suggestedPrice = Number((cost * 1.5).toFixed(2));
      }
      setSubPrice(suggestedPrice);
    }
  }, [subProductCode, purchases, sales]);

  // Total warehouse purchases list grouped by productCode to compute average cost and current available stock levels
  const availableInventoryCodes = Array.from(new Set(purchases.filter(p => !p.archivedFromInventory).map(p => p.productCode.toUpperCase().trim())));

  // Helper: calculate average purchase cost of a code
  const getAveragePurchaseCost = (code: string): number => {
    const trimmed = code.toUpperCase().trim();
    const matchPurchases = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === trimmed);
    if (matchPurchases.length === 0) return 3.5; // fallback
    const totalQty = matchPurchases.reduce((sum, p) => sum + p.quantity, 0);
    const totalCost = matchPurchases.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    return totalQty > 0 ? (totalCost / totalQty) : 3.5;
  };

  // Helper: calculate live physical stock of a code
  const getLiveStockAvailable = (code: string, gender?: 'boys' | 'girls'): number => {
    const trimmed = code.toUpperCase().trim();
    const activePurchases = purchases.filter(p => 
      !p.archivedFromInventory &&
      p.productCode.toUpperCase().trim() === trimmed && 
      (!gender || (p.gender || 'boys') === gender)
    );

    const totalIn = activePurchases.reduce((sum, p) => sum + p.quantity, 0);

    // Out count of this code across all sales
    const totalOut = sales.reduce((sum, s) => {
      if (editingSaleId && s.id === editingSaleId) {
        return sum; // Do not double-subtract when editing
      }

      // Stock reset check: ignore sales prior to earliest active purchase date for this item
      if (activePurchases.length > 0) {
        const isValidSale = activePurchases.some(p => {
          const sDateSplit = s.date.split('T')[0];
          const pDateSplit = p.date.split('T')[0];
          if (sDateSplit >= pDateSplit) {
            return true;
          }
          if (s.createdAt && p.createdAt && s.createdAt >= p.createdAt) {
            return true;
          }
          return false;
        });
        if (!isValidSale) {
          return sum;
        }
      } else {
        return sum;
      }

      if (s.items && s.items.length > 0) {
        const itemMatch = s.items.filter(i => 
          i.productCode.toUpperCase().trim() === trimmed && 
          (!gender || (i.gender || 'boys') === gender)
        );
        return sum + itemMatch.reduce((acc, sub) => acc + sub.quantity, 0);
      } else if (s.productCode.toUpperCase().trim() === trimmed) {
        const sGender = s.gender || 'boys';
        if (!gender || sGender === gender) {
          return sum + s.quantity;
        }
      }
      return sum;
    }, 0);

    return totalIn - totalOut;
  };

  // Helper: calculate quantity already added/drafted in the current unsaved invoice
  const getDraftedQuantity = (code: string, gender: 'boys' | 'girls'): number => {
    const trimmed = code.toUpperCase().trim();
    return invoiceItems
      .filter(item => item.productCode.toUpperCase().trim() === trimmed && (item.gender || 'boys') === gender)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Live stock alert variables for the currently typed code
  // Dynamically subtracts items already added to the current transaction draft
  const targetLiveStock = subProductCode 
    ? Math.max(0, getLiveStockAvailable(subProductCode, subGender) - getDraftedQuantity(subProductCode, subGender)) 
    : 0;
  const isTargetOutOfStock = subProductCode && (targetLiveStock - subQuantity < 0);
  const isTargetLowStock = subProductCode && (targetLiveStock - subQuantity < 15);

  // Auto calculated invoice totals from added sub-items
  const calculatedTotalAmount = invoiceItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const calculatedTotalProfit = invoiceItems.reduce((sum, item) => sum + item.profit, 0);
  const calculatedTotalQuantity = invoiceItems.reduce((sum, item) => sum + item.quantity, 0);

  // Sub-item addition trigger
  const handleAddSubItem = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!subProductCode) {
      alert('الرجاء كتابة أو اختيار كود صنف الملابس لإضافته للفاتورة.');
      return;
    }
    if (subQuantity <= 0) {
      alert('الرجاء إدخال كمية صحيحة أكبر من الصفر.');
      return;
    }
    if (subPrice <= 0) {
      alert('الرجاء إدخال سعر مبيع صحيح أكبر من الصفر.');
      return;
    }

    const code = subProductCode.toUpperCase().trim();
    
    // Check available warehouse stock first for this specific item and gender
    const totalInStock = getLiveStockAvailable(code, subGender);
    const alreadyDrafted = getDraftedQuantity(code, subGender);
    const remainingAvailable = totalInStock - alreadyDrafted;

    if (subQuantity > remainingAvailable) {
      alert(`⚠️ تنبيه: الكمية المطلوبة (${subQuantity} قطعة) أكبر من الكمية المتبقية المتوفرة في المستودع لهذا الصنف والجنس المحدد (${remainingAvailable} قطعة متوفرة حالياً من أصل ${totalInStock}). لا يمكن إضافة هذا الصنف.`);
      return;
    }

    const avgCost = getAveragePurchaseCost(code);
    const itemTotal = subPrice * subQuantity;
    const itemProfit = Math.max(0, (subPrice - avgCost) * subQuantity);

    // Check if item code and gender is already added in the current invoiceItems array
    const existingIndex = invoiceItems.findIndex(i => i.productCode.toUpperCase().trim() === code && (i.gender || 'boys') === subGender);
    if (existingIndex > -1) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += subQuantity;
      updated[existingIndex].totalAmount = updated[existingIndex].quantity * updated[existingIndex].price;
      updated[existingIndex].profit = Math.max(0, (updated[existingIndex].price - avgCost) * updated[existingIndex].quantity);
      setInvoiceItems(updated);
    } else {
      setInvoiceItems([...invoiceItems, {
        category: subCategory,
        productCode: code,
        quantity: subQuantity,
        price: subPrice,
        totalAmount: itemTotal,
        profit: itemProfit,
        gender: subGender
      }]);
    }

    // Reset single item inputs for next entry
    setSubProductCode('');
    setSubQuantity(1);
    setSubPrice(5.00);
  };

  // Direct selection of items from fast catalog clicks
  const handleQuickSelectCode = (code: string) => {
    setSubProductCode(code);
    const matchingPurchases = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === code.toUpperCase().trim());
    if (matchingPurchases.length > 0) {
      const withStock = matchingPurchases.find(p => getLiveStockAvailable(p.productCode, p.gender || 'boys') > 0);
      const match = withStock || matchingPurchases[0];
      setSubCategory(match.category);
      setSubGender(match.gender || 'boys');
    }
  };

  // Submitting the invoice
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('الرجاء تحديد اسم الزبون.');
      return;
    }

    // Prepare items list. If they didn't click "أضف الصنف" but left fields filled
    let finalItems = [...invoiceItems];
    if (finalItems.length === 0) {
      if (subProductCode) {
        const code = subProductCode.toUpperCase().trim();
        
        // Check available warehouse stock first
        const totalInStock = getLiveStockAvailable(code, subGender);
        if (subQuantity > totalInStock) {
          alert(`⚠️ تنبيه: الكمية المطلوبة (${subQuantity} قطعة) أكبر من الكمية المتوفرة في المستودع لهذا الصنف والجنس المحدد (${totalInStock} قطعة متوفرة حالياً). لا يمكن حفظ الفاتورة.`);
          return;
        }

        const avgCost = getAveragePurchaseCost(code);
        const itemTotal = subPrice * subQuantity;
        const itemProfit = Math.max(0, (subPrice - avgCost) * subQuantity);
        finalItems.push({
          category: subCategory,
          productCode: code,
          quantity: subQuantity,
          price: subPrice,
          totalAmount: itemTotal,
          profit: itemProfit,
          gender: subGender
        });
      } else {
        alert('يرجى إضافة صنف ملابس واحد على الأكثر للفاتورة قبل الحفظ.');
        return;
      }
    }

    const finalTotalAmount = finalItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const finalTotalProfit = finalItems.reduce((sum, item) => sum + item.profit, 0);
    const finalTotalQuantity = finalItems.reduce((sum, item) => sum + item.quantity, 0);

    const firstItem = finalItems[0];
    const displayCode = firstItem.productCode + (finalItems.length > 1 ? ` (+${finalItems.length - 1} أصناف)` : '');
    const displayCategory = firstItem.category + (finalItems.length > 1 ? '...' : '');

    // Generate or fetch customer ID
    const finalCustomerId = selectedCustomerId || `cust-${Date.now()}`;

    if (editingSaleId) {
      onEditSale({
        id: editingSaleId,
        customerId: finalCustomerId,
        customerName: customerName.trim(),
        customerPhone: phone,
        province: province || 'غير محدد',
        category: displayCategory,
        productCode: displayCode,
        quantity: finalTotalQuantity,
        totalAmount: finalTotalAmount,
        profit: finalTotalProfit,
        date,
        notes,
        items: finalItems,
        gender: firstItem.gender
      });
      setSuccess('تم تعديل الفاتورة الكلية وتفاصيل بيع البضاعة بنجاح!');
      setEditingSaleId(null);
    } else {
      onAddSale({
        customerId: finalCustomerId,
        customerName: customerName.trim(),
        customerPhone: phone,
        province: province || 'غير محدد',
        category: displayCategory,
        productCode: displayCode,
        quantity: finalTotalQuantity,
        totalAmount: finalTotalAmount,
        profit: finalTotalProfit,
        date,
        notes,
        items: finalItems,
        gender: firstItem.gender
      });
      setSuccess('تم تسجيل المعاملة وترحيل الفاتورة التراكمية وخصم الكميات بنجاح!');
    }

    // reset forms
    setCustomerName('');
    setPhone('');
    setProvince('');
    setInvoiceItems([]);
    setSubProductCode('');
    setNotes('');
    setTimeout(() => {
      setSuccess('');
    }, 4000);
  };

  const handleStartEdit = (sale: Sale) => {
    setEditingSaleId(sale.id);
    setCustomerName(sale.customerName);
    setPhone(sale.customerPhone || '');
    setProvince(sale.province || '');
    setDate(sale.date);
    setNotes(sale.notes || '');

    if (sale.items && sale.items.length > 0) {
      setInvoiceItems(sale.items);
    } else {
      // fallback legacy mapping
      const matchedPurchase = purchases.find(p => p.productCode === sale.productCode);
      const estPrice = sale.quantity > 0 ? (sale.totalAmount / sale.quantity) : 5;
      setInvoiceItems([{
        category: sale.category,
        productCode: sale.productCode,
        quantity: sale.quantity,
        price: estPrice,
        totalAmount: sale.totalAmount,
        profit: sale.profit,
        gender: sale.gender || 'boys'
      }]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSaleId(null);
    setCustomerName('');
    setPhone('');
    setProvince('');
    setInvoiceItems([]);
    setSubProductCode('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const year = parts[0];
    const month = parts[1];
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'long' });
  };

  const handleExportSalesToExcel = () => {
    const headers = [
      'رقم الفاتورة',
      'التاريخ واليوم',
      'اسم المشتري (الزبون)',
      'رقم الهاتف',
      'المحافظة',
      'الأصناف المباعة والتفاصيل الكلية',
      'إجمالي الكمية (قطعة)',
      'صافي قيمة الفاتورة ($)',
      'الملاحظات'
    ];

    const rows = filteredSales.map(sale => {
      let itemsStr = '';
      if (sale.items && sale.items.length > 0) {
        itemsStr = sale.items.map(i => `${i.productCode} (${i.quantity} ق) ${i.gender === 'girls' ? 'بناتي' : 'صبياني'} [${i.category}]`).join(' - ');
      } else {
        itemsStr = `${sale.productCode} (${sale.quantity} ق) ${sale.gender === 'girls' ? 'بناتي' : 'صبياني'} [${sale.category}]`;
      }

      return [
        `#${sale.id.slice(-5)}`,
        sale.date,
        sale.customerName,
        sale.customerPhone || '',
        sale.province || '',
        itemsStr,
        sale.quantity,
        sale.totalAmount.toFixed(2),
        sale.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val).replace(/"/g, '""');
          if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            return `"${str}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    let filenameSuffix = 'كل_الفترات';
    if (filterDate) {
      filenameSuffix = filterDate;
    } else if (!showAllMonths) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      filenameSuffix = `${year}-${month}`;
    }
    
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_فواتير_البيع_المفلترة_${filenameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter local sales lists
  const filteredSales = sales.filter(sale => {
    // 1. Text search matching name, item code, province, categories
    const matchesSearch = 
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Date/Month filtering
    if (filterDate) {
      // If a specific month is selected, filter by that month!
      return sale.date.startsWith(filterDate);
    } else if (!showAllMonths) {
      // By default, filter to show only current month's sales
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-11

      const saleDateParts = sale.date.split('-');
      if (saleDateParts.length >= 2) {
        const saleYear = parseInt(saleDateParts[0], 10);
        const saleMonth = parseInt(saleDateParts[1], 10) - 1; // split produces 1-based, change to 0-based
        return saleYear === currentYear && saleMonth === currentMonth;
      }
      return false;
    }

    return true; // if showAllMonths is true and filterDate is empty, match everything
  });

  const getCustomerProfileData = (custId: string) => {
    const custSales = sales.filter(s => s.customerId === custId);
    const totalSpent = custSales.reduce((acc, item) => acc + item.totalAmount, 0);
    const orderCount = custSales.length;
    const avgInvoice = orderCount > 0 ? (totalSpent / orderCount) : 0;
    return {
      orderCount,
      totalSpent,
      avgInvoice,
      invoices: custSales
    };
  };

  const activeProfile = selectedCustomerId ? getCustomerProfileData(selectedCustomerId) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto leading-relaxed">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs font-sans">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">نظام المبيعات وتسجيل الفواتير المشتركة</h2>
            <p className="text-xs text-slate-500">إدخال عمليات المبيع فورياً بالجملة وربط الفاتورة بملف الزبون وعمل حساب أرباح حقيقي للقطع</p>
          </div>
        </div>
        <div className="text-xs bg-slate-100 border border-slate-250 text-slate-650 font-bold px-3.5 py-1.5 rounded-full self-start md:self-center">
          إجمالي الفواتير الصادرة بالكامل: {sales.length} فواتير
        </div>
      </div>

      <div className="space-y-6 font-sans">
        
        {/* Full Screen Section: Recording New Sale with Smart Populators */}
        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200 shadow-xs h-fit space-y-4 w-full">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-2 flex items-center gap-2 text-xs">
            <PlusCircle className="h-5 w-5 text-emerald-600 font-bold" />
            {editingSaleId ? `تعديل الفاتورة (${editingSaleId})` : 'إنشاء فاتورة مبيعات جديدة'}
          </h3>

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg mb-2 text-xs font-semibold border border-emerald-100">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmitSale} className="space-y-3 px-0.5">
            
            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">اسم الزبون المطلوب:</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                list="customer-suggestions"
                required
                placeholder="اكتب اسم الزبون أو اختر..."
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden text-right bg-white text-slate-800"
              />
              <datalist id="customer-suggestions">
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.name}>
                    {cust.province}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Autopopulated details with editing options */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">هاتف الشاحن/الزبون:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="رقم الهاتف"
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">محافظة الشحن:</label>
                <input
                  type="text"
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  required
                  placeholder="المحافظة"
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden text-right"
                />
              </div>
            </div>

            {/* Sale Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">تاريخ الفاتورة:</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden font-mono text-right"
              />
            </div>

            {/* Sub-item Builder section (إضافة صنف) */}
            <div className="border border-slate-200 p-3.5 rounded-xl bg-slate-50 space-y-3.5 mt-2">
              <span className="font-black text-xs text-slate-850 flex items-center justify-between">
                <span>➕ بناء وتجهيز أصناف الفاتورة:</span>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 rounded-md">المبلغ يحسب تلقائياً</span>
              </span>

              {/* Pajama Category Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">صنف القطعة الفرعي:</label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                  list="sub-category-suggestions"
                  placeholder="اكتب اسم الصنف أو اختر..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-300 focus:border-emerald-500 outline-hidden text-right bg-white text-slate-800 font-semibold"
                />
                <datalist id="sub-category-suggestions">
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Product Code */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">كود الصنف المستخرجة من المخزن:</label>
                <input
                  type="text"
                  value={subProductCode}
                  onChange={e => setSubProductCode(e.target.value)}
                  list="sub-inventory-codes"
                  placeholder="اكتب كود الصنف أو اختر..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-300 focus:border-emerald-500 outline-hidden font-mono uppercase tracking-wider text-right"
                />
                <datalist id="sub-inventory-codes">
                  {availableInventoryCodes.map(code => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
                
                {/* Available stock level indicators */}
                {subProductCode && (
                  <div className={`mt-1 px-2 py-0.5 rounded text-[9px] font-bold flex justify-between ${targetLiveStock <= 0 ? 'bg-rose-50 text-rose-700' : isTargetOutOfStock ? 'bg-rose-50 text-rose-700' : isTargetLowStock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    <span>مخزون الكود الحالي:</span>
                    <span>{targetLiveStock} ق متوفرة</span>
                  </div>
                )}
              </div>

              {/* Gender target for clothing item */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">الجنس:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubGender('boys')}
                    className={`py-1 rounded-md text-[10px] font-bold border cursor-pointer ${subGender === 'boys' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-white border-slate-200 text-slate-650'}`}
                  >
                    👦 صبياني
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubGender('girls')}
                    className={`py-1 rounded-md text-[10px] font-bold border cursor-pointer ${subGender === 'girls' ? 'bg-pink-50 text-pink-800 border-pink-200' : 'bg-white border-slate-200 text-slate-650'}`}
                  >
                    👧 بناتي
                  </button>
                </div>
              </div>

              {/* Quantity in Single pieces */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الكمية المطلوبة (بالقطعة):</label>
                  <input
                    type="number"
                    min="1"
                    value={subQuantity}
                    onChange={e => setSubQuantity(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-300 focus:border-emerald-500 outline-hidden font-mono text-center bg-white font-bold"
                  />
                  <span className="text-[9px] text-slate-400 block text-center mt-1">الكمية تسجل مباشرة بالقطعة فردياً</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">سعر المبيع للقطعة الواحدة ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={subPrice}
                    onChange={e => setSubPrice(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-300 focus:border-emerald-500 outline-hidden font-mono text-center bg-white font-black text-slate-800"
                  />
                  <span className="text-[9px] text-emerald-600 block text-center mt-1">السعر المدخل للقطعة الواحدة</span>
                </div>
              </div>

              {/* Cost Price helper estimation as requested by user */}
              {subProductCode && (
                <div className="text-[9px] text-slate-400 bg-slate-100 p-1.5 rounded-lg border border-slate-200/60 leading-tight">
                  💡 تلميح: متوسط تكلفة القطعة في الوارد هي <b className="text-slate-800 font-mono font-bold">${getAveragePurchaseCost(subProductCode).toFixed(2)}</b>. البيع بسعر <b className="text-emerald-700 font-mono font-black">${subPrice.toFixed(2)}</b> يحقق ربحاً تقديرياً يبلغ <b className="text-emerald-700 font-bold font-mono">${((subPrice - getAveragePurchaseCost(subProductCode)) * subQuantity).toFixed(1)}</b>.
                </div>
              )}

              {/* Add item button */}
              <button
                type="button"
                onClick={handleAddSubItem}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 border border-slate-705 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
              >
                <Plus className="h-4 w-4" />
                أضف هذا الصنف إلى الفاتورة 
              </button>
            </div>

            {/* Render sub-items inside invoice */}
            {invoiceItems.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-4 font-sans">
                <span className="font-bold text-xs text-slate-800 block border-b border-slate-200 pb-1.5">الأصناف والقطع المدرجة حالياً ({invoiceItems.length}):</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-white p-2.5 text-xs rounded-lg border border-slate-150 shadow-3xs hover:border-slate-350 transition-all">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold font-mono text-emerald-800">{item.productCode}</span>
                          <span className={`px-1 rounded text-[9px] font-black ${item.gender === 'girls' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.gender === 'girls' ? 'بنات' : 'أولاد'}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[10px] block leading-tight">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-left">
                          <span className="font-bold font-mono block text-slate-800 text-[11px]">{item.quantity} عدد × ${item.price.toFixed(1)}</span>
                          <span className="font-bold font-mono text-emerald-700 block text-[10px]">=$ {item.totalAmount.toFixed(1)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInvoiceItems(invoiceItems.filter((_, idx) => idx !== index))}
                          className="text-rose-650 hover:bg-rose-50 p-1.5 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                          title="احذف الصنف من القائمة"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Auto Calculated displays */}
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-right grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-450 block font-semibold leading-tight mb-1">المبلغ الإجمالي للفاتورة</span>
                <span className="text-xs font-black font-mono text-emerald-805">${calculatedTotalAmount.toFixed(2)}</span>
              </div>
              <div className="border-r border-slate-200 pr-3">
                <span className="text-[10px] text-slate-450 block font-semibold leading-tight mb-1">الربح الصافي للفاتورة</span>
                <span className="text-xs font-black font-mono text-indigo-800">${calculatedTotalProfit.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1">ملاحظات وشركة النقل:</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="مثال: تسليم شركة القدموس - استلم دفعة دولار وباقي ليرة..."
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden h-14 resize-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs font-sans"
              >
                {editingSaleId ? 'حفظ تعديلات الفاتورة وتحديث الأرصدة' : 'ترحيل الفاتورة وحفظ المعاملة الكلية'}
              </button>

              {editingSaleId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                >
                  إلغاء التعديل والعودة للإنشاء
                </button>
              )}
            </div>
          </form>

          {/* Catalog for rapide codes selection as requested by user - "اضافة اختيار متعدد" */}
          <div className="border-t border-slate-100 pt-4 font-sans max-h-56 overflow-y-auto">
            <span className="text-xs text-slate-550 font-bold block mb-2">أصناف بضائع المستودع للتحديد السريع:</span>
            {availableInventoryCodes.length === 0 ? (
              <span className="text-[10px] text-slate-400 block">لا يوجد كودات مسجلة بالمستودع حالياً.</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {availableInventoryCodes.map(code => {
                  const currentStock = getLiveStockAvailable(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleQuickSelectCode(code)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-800 hover:border-emerald-250 text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{code}</span>
                      <span className="text-[8px] bg-slate-200 px-1 rounded-sm text-slate-600">({currentStock} ق)</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Dynamic section stacked below: Customer Profile Stats and Past Invoices Log */}
        <div className="space-y-6 w-full">
          
          {/* Selected Customer Repeat Analysis */}
          {selectedCustomerId && activeProfile && selectedCustomer && (
            <div className="bg-slate-900 p-5 rounded-xl text-white shadow-xs relative overflow-hidden border border-slate-850">
              <div className="absolute top-0 left-0 translate-y-3 shrink-0 translate-x-3 opacity-5">
                <Sparkles className="h-28 w-28 text-white rotate-12" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold tracking-wider mb-2 inline-block border border-slate-700">
                    الملف التعريفي للزبون المتكرر
                  </span>
                  <h3 className="text-base font-bold flex items-center gap-2 mb-1">
                    <UserCheck className="h-5 w-5 text-emerald-400" />
                    {selectedCustomer.name}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs text-slate-300 mt-2">
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-500" /> هاتف مبيعات الزبون: {selectedCustomer.phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-500" /> محور الشحن: محافظة {selectedCustomer.province}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 shrink-0 md:w-80">
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg text-center backdrop-blur-xs">
                    <ShoppingBag className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
                    <span className="text-[10px] text-slate-300 block">عدد الطلبيات</span>
                    <span className="font-bold font-mono text-xs text-emerald-300">{activeProfile.orderCount} طلبات</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg text-center backdrop-blur-xs">
                    <DollarSign className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
                    <span className="text-[10px] text-slate-300 block">إجمالي القيمة</span>
                    <span className="font-bold font-mono text-xs text-emerald-400">${activeProfile.totalSpent}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg text-center backdrop-blur-xs">
                    <FileText className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
                    <span className="text-[10px] text-slate-300 block">متوسط الفاتورة</span>
                    <span className="font-bold font-mono text-xs">${activeProfile.avgInvoice.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Selected Customer's Invoices logs */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                <span className="font-bold text-xs text-slate-300 block mb-2">سجل الفواتير السابقة الصادرة للزبون الحالي:</span>
                {activeProfile.invoices.length === 0 ? (
                  <p className="text-[11px] text-slate-400">لم يتم ترحيل فواتير بيع معتمدة لهذا الاسم بعد.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeProfile.invoices.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedInvoice(s)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono text-[10px] flex items-center gap-1.5 transition-all text-right cursor-pointer"
                      >
                        <FileText className="h-3 w-3 text-emerald-400" />
                        <span>فاتورة {formatDateToShow(s.date)} - إجمالي ${s.totalAmount}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table of all sales invoices list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex flex-col gap-1 text-right">
                <span className="font-bold text-slate-900 text-xs">سجل حركة الفواتير والصفقات العام للتوزيع بالمحافظات</span>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    filterDate 
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                      : showAllMonths 
                        ? 'bg-slate-100 text-slate-705 border-slate-200'
                        : 'bg-emerald-50 text-emerald-850 border-emerald-200'
                  }`}>
                    {filterDate 
                      ? `🔍 شهر مخصص: ${formatMonthName(filterDate)}` 
                      : showAllMonths 
                        ? `📅 فواتير كل الأوقات المسجلة`
                        : `📅 فواتير الشهر الحالي فقط: ${new Date().toLocaleString('ar-AE', { month: 'long', year: 'numeric' })}`
                    }
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                {/* Text Search Box */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ابحث بالزبون، كود الصنف، المحافظة..."
                    className="w-full pr-8.5 pl-3 py-1.5 rounded-lg text-[11px] border border-slate-205 outline-hidden bg-white text-right font-medium text-slate-705 focus:border-emerald-500"
                  />
                </div>

                {/* Date Picker Filter Input */}
                <div className="flex items-center gap-1.5 border border-slate-205 bg-white rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-650 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400">بحسب شهر:</span>
                  <input
                    type="month"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="outline-hidden text-[11px] font-mono font-bold text-slate-700 cursor-pointer bg-transparent py-0.5"
                    title="اختر الشهر المطلوب تصفيته"
                  />
                  {filterDate && (
                    <button
                      type="button"
                      onClick={() => setFilterDate('')}
                      className="mr-1 text-rose-600 hover:text-rose-800 font-extrabold text-xs transition-colors p-0.5 hover:bg-rose-50 rounded"
                      title="مسح تصفية التاريخ والعودة للشهر الحالي"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Export to Excel Button */}
                <button
                  type="button"
                  onClick={handleExportSalesToExcel}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
                  title="تصدير كشف الفواتير المصفاة والمحددة زمنياً إلى ملف Excel"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تصدير Excel 📊</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right divide-y divide-slate-150 text-xs">
                <thead className="bg-slate-50 text-slate-400 text-[10px]">
                  <tr>
                    <th className="p-3 font-semibold text-center">رقم الفاتورة</th>
                    <th className="p-3 font-semibold text-center">التاريخ</th>
                    <th className="p-3 font-semibold">المشتري (الزبون)</th>
                    <th className="p-3 font-semibold">الأصناف والتفاصيل</th>
                    <th className="p-3 font-semibold text-center">إجمالي القطع</th>
                    <th className="p-3 font-semibold text-center">صافي قيمتها ($)</th>
                    <th className="p-3 font-semibold text-center">تحكم بفاتورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد سجلات مبيعات مرحّلة تطابق شروط البحث الفعالة.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono text-[10px] text-slate-400">#{sale.id.slice(-5)}</td>
                        <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">{formatDateToShow(sale.date)}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block text-xs">{sale.customerName}</span>
                          <span className="text-[10px] text-slate-400 block font-medium">{sale.customerPhone} ({sale.province})</span>
                        </td>
                        <td className="p-3">
                          {sale.items && sale.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {sale.items.map((i, sIdx) => (
                                <span key={sIdx} className="inline-block bg-slate-100 text-slate-700 border border-slate-200 rounded-sm px-1 text-[9px] font-mono leading-none">
                                  {i.productCode} ({i.quantity})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-800 block text-[11px]">{sale.category}</span>
                              <span className="text-[10px] text-emerald-800 font-bold font-mono block uppercase">{sale.productCode}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold font-mono">{sale.quantity} ق</td>
                        <td className="p-3 text-center font-bold font-mono text-emerald-700">${sale.totalAmount.toFixed(1)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0">
                            <button
                              onClick={() => handleStartEdit(sale)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="تعديل الفاتورة بالكامل"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(sale)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-750 border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="عرض وتصدير الفاتورة"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                            
                            {deleteConfirmId === sale.id ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    onDeleteSale(sale.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px]"
                                >
                                  تأكيد
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[9px] border border-slate-200"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(sale.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
                                title="تراجع عن الفاتورة"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Invoice modal overlay */}
      {selectedInvoice && (
        <InvoicePrintable
          sale={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

    </div>
  );
}
