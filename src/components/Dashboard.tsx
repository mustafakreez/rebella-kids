/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sale, Purchase, Expense } from '../types';
import { formatDateToShow } from '../utils';
import { 
  TrendingUp, DollarSign, Brain, Loader2, Plus, Trash2, 
  Wallet, Landmark, BarChart3, Star, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles,
  Archive
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface DashboardProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

export function Dashboard({
  sales,
  purchases,
  expenses,
  onAddExpense,
  onDeleteExpense
}: DashboardProps) {
  // AI report states
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Capital Accounting states
  const [startingCapital, setStartingCapital] = useState<number>(() => {
    const saved = localStorage.getItem('rebila_starting_capital');
    return saved ? Number(saved) : 50000;
  });
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [tempCapitalText, setTempCapitalText] = useState('');

  // Unique monthly starting capitals mapping (month "YYYY-MM" -> value)
  const [monthlyCapitals, setMonthlyCapitals] = useState<{ [month: string]: number }>(() => {
    const saved = localStorage.getItem('rebila_monthly_capitals');
    return saved ? JSON.parse(saved) : {};
  });

  // Track capital edits: month key -> input text
  const [editingCapitals, setEditingCapitals] = useState<{ [month: string]: string }>({});

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('rebila_starting_capital', String(startingCapital));
  }, [startingCapital]);

  useEffect(() => {
    localStorage.setItem('rebila_monthly_capitals', JSON.stringify(monthlyCapitals));
  }, [monthlyCapitals]);

  const handleSaveMonthlyCapital = (monthKey: string, valueStr: string) => {
    const val = Number(valueStr);
    if (!isNaN(val) && val >= 0) {
      setMonthlyCapitals(prev => ({
        ...prev,
        [monthKey]: val
      }));
    }
    // Remove from editing state
    setEditingCapitals(prev => {
      const copy = { ...prev };
      delete copy[monthKey];
      return copy;
    });
  };

  // Tab and interactive comparison states
  const [dashboardSubTab, setDashboardSubTab] = useState<'general' | 'reports'>('general');
  const [compareMonthA, setCompareMonthA] = useState<string>('');
  const [compareMonthB, setCompareMonthB] = useState<string>('');
  const [selectedDetailedMonth, setSelectedDetailedMonth] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [chartMonthsCount, setChartMonthsCount] = useState<number>(6);

  // Expense form states
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState<'rent' | 'advertising' | 'salaries' | 'other'>('rent');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseSuccess, setExpenseSuccess] = useState('');

  // Calculate high-level financial stats
  const totalSalesUSD = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const grossProfitUSD = sales.reduce((acc, s) => acc + s.profit, 0);
  const totalExpensesUSD = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfitUSD = grossProfitUSD - totalExpensesUSD;

  const currentCapital = startingCapital + netProfitUSD;

  // Calculate dynamic inventory value based on cost price ($) applying Moving Average (Weighted Average Perpetual Inventory)
  const stockCostMap: {
    [key: string]: {
      totalIn: number;
      currentStock: number;
      avgPriceIn: number;
    }
  } = {};

  const sortedDashboardTransactions: Array<
    | { type: 'purchase'; date: string; createdAt: number; p: Purchase }
    | { type: 'sale'; date: string; createdAt: number; s: Sale }
  > = [];

  purchases.forEach(p => {
    if (p.archivedFromInventory) return;
    sortedDashboardTransactions.push({
      type: 'purchase',
      date: p.date.split('T')[0],
      createdAt: p.createdAt || 0,
      p
    });
  });

  sales.forEach(s => {
    sortedDashboardTransactions.push({
      type: 'sale',
      date: s.date.split('T')[0],
      createdAt: s.createdAt || 0,
      s
    });
  });

  sortedDashboardTransactions.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.type !== b.type) {
      return a.type === 'purchase' ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });

  sortedDashboardTransactions.forEach(tx => {
    if (tx.type === 'purchase') {
      const p = tx.p;
      const code = p.productCode.toUpperCase().trim();
      const g = p.gender || 'boys';
      const key = `${code}_${g}`;

      if (!stockCostMap[key]) {
        stockCostMap[key] = {
          totalIn: 0,
          currentStock: 0,
          avgPriceIn: 0
        };
      }

      const remainingQty = Math.max(0, stockCostMap[key].currentStock);
      const oldAvgPrice = stockCostMap[key].avgPriceIn;
      const currentValuation = remainingQty * oldAvgPrice;
      const newBatchValuation = p.quantity * p.price;
      const totalNewQty = remainingQty + p.quantity;

      stockCostMap[key].avgPriceIn = totalNewQty > 0 ? (currentValuation + newBatchValuation) / totalNewQty : p.price;
      stockCostMap[key].totalIn += p.quantity;
      stockCostMap[key].currentStock += p.quantity;

    } else {
      const s = tx.s;
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

          if (stockCostMap[key]) {
            stockCostMap[key].currentStock -= item.quantity;
          }
        });
      } else {
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

        if (stockCostMap[key]) {
          stockCostMap[key].currentStock -= s.quantity;
        }
      }
    }
  });

  const totalInventoryValueUSD = Object.values(stockCostMap).reduce((acc, item) => {
    const value = item.currentStock > 0 ? (item.currentStock * item.avgPriceIn) : 0;
    return acc + value;
  }, 0);

  // Monthly current totals
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const monthlySales = sales.filter(s => s.date.startsWith(currentMonthStr));
  const monthlySalesUSD = monthlySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const monthlyProfitUSD = monthlySales.reduce((acc, s) => acc + s.profit, 0);
  const monthlyPurchases = purchases.filter(p => !p.archivedFromInventory && p.date && p.date.startsWith(currentMonthStr));
  const monthlyPurchasesUSD = monthlyPurchases.reduce((acc, p) => acc + (p.quantity * p.price), 0);

  // Group top customers
  const customerSummaryMap: { [name: string]: { name: string; totalSpent: number; orderCount: number; province: string } } = {};
  sales.forEach(s => {
    if (!customerSummaryMap[s.customerName]) {
      customerSummaryMap[s.customerName] = {
        name: s.customerName,
        totalSpent: 0,
        orderCount: 0,
        province: s.province
      };
    }
    customerSummaryMap[s.customerName].totalSpent += s.totalAmount;
    customerSummaryMap[s.customerName].orderCount += 1;
  });
  const topCustomers = Object.values(customerSummaryMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 4);

  // Group best selling categories (by category description, product code, and gender)
  const categorySummaryMap: { 
    [key: string]: { 
      cat: string; 
      productCode: string; 
      gender?: 'boys' | 'girls'; 
      unitsSold: number; 
      totalSales: number 
    } 
  } = {};

  sales.forEach(s => {
    if (s.items && s.items.length > 0) {
      s.items.forEach(item => {
        const catName = item.category || s.category;
        const code = (item.productCode || s.productCode || '').toUpperCase().trim();
        const g = item.gender || s.gender || 'boys';
        const key = `${catName}_${code}_${g}`;

        if (!categorySummaryMap[key]) {
          categorySummaryMap[key] = {
            cat: catName,
            productCode: code,
            gender: g,
            unitsSold: 0,
            totalSales: 0
          };
        }
        categorySummaryMap[key].unitsSold += item.quantity;
        categorySummaryMap[key].totalSales += item.totalAmount;
      });
    } else {
      const catName = s.category;
      const code = (s.productCode || '').toUpperCase().trim();
      const g = s.gender || 'boys';
      const key = `${catName}_${code}_${g}`;

      if (!categorySummaryMap[key]) {
        categorySummaryMap[key] = {
          cat: catName,
          productCode: code,
          gender: g,
          unitsSold: 0,
          totalSales: 0
        };
      }
      categorySummaryMap[key].unitsSold += s.quantity;
      categorySummaryMap[key].totalSales += s.totalAmount;
    }
  });

  const topCategories = Object.values(categorySummaryMap)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 4);

  // Arabic Month Formatter
  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'long' });
  };

  // Group Sales and Expenses by Month
  const monthlyReports: {
    [month: string]: {
      monthKey: string;
      totalSales: number;
      totalProfit: number;
      totalQty: number;
      salesCount: number;
      expenses: number;
      netProfit: number;
      mostRequestedProvince: string;
      provinceRankings: { province: string; amount: number }[];
    }
  } = {};

  // Find all unique months in sales and expenses
  const allMonths = Array.from(new Set([
    ...sales.map(s => s.date.substring(0, 7)),
    ...expenses.map(e => e.date.substring(0, 7))
  ])).sort().reverse(); // Show latest months first

  allMonths.forEach(monthKey => {
    const monthSales = sales.filter(s => s.date.startsWith(monthKey));
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey));

    const totalSales = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = monthSales.reduce((sum, s) => sum + s.profit, 0);
    const totalQty = monthSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalExp = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalProfit - totalExp;

    // Determine the most requested province
    const provinceSalesMap: { [prov: string]: number } = {};
    monthSales.forEach(s => {
      provinceSalesMap[s.province] = (provinceSalesMap[s.province] || 0) + s.totalAmount;
    });

    const provinceRankings = Object.entries(provinceSalesMap)
      .map(([prov, amt]) => ({ province: prov, amount: amt }))
      .sort((a, b) => b.amount - a.amount);

    const mostRequestedProvince = provinceRankings[0]?.province || 'لا يوجد شحنات';

    monthlyReports[monthKey] = {
      monthKey,
      totalSales,
      totalProfit,
      totalQty,
      salesCount: monthSales.length,
      expenses: totalExp,
      netProfit,
      mostRequestedProvince,
      provinceRankings
    };
  });

  // Precompute chronologically propagated starting & closing capitals
  const chronologicalMonths = [...allMonths].sort(); // oldest first: e.g. "2026-05", "2026-06", "2026-07"
  
  const monthlyCalculations: { 
    [monthKey: string]: { 
      startingCapitalVal: number; 
      monthlyNetProfit: number; 
      closingBalance: number; 
      prodProfitTotal: number; 
      expensesTotal: number;
    } 
  } = {};

  let lastClosingBalance: number | null = null;
  
  chronologicalMonths.forEach((monthKey) => {
    const monthSales = sales.filter(s => s.date.startsWith(monthKey));
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey));

    const prodProfitTotal = monthSales.reduce((sum, s) => sum + s.profit, 0);
    const expensesTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthlyNetProfit = prodProfitTotal - expensesTotal;

    let currentStartingCapital = startingCapital;

    if (lastClosingBalance !== null) {
      // If there's an override for this month, use it. Otherwise, use previous month's closing capital
      currentStartingCapital = monthlyCapitals[monthKey] !== undefined 
        ? monthlyCapitals[monthKey] 
        : lastClosingBalance;
    } else {
      // First chronological month, check if there's an override, else default to startingCapital
      currentStartingCapital = monthlyCapitals[monthKey] !== undefined 
        ? monthlyCapitals[monthKey] 
        : startingCapital;
    }

    const closingBalance = currentStartingCapital + monthlyNetProfit;
    lastClosingBalance = closingBalance;

    monthlyCalculations[monthKey] = {
      startingCapitalVal: currentStartingCapital,
      monthlyNetProfit,
      closingBalance,
      prodProfitTotal,
      expensesTotal
    };
  });

  // Past Months Chronological Data for Recharts Line Chart
  const getPastMonths = (count: number) => {
    const list = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yKey = d.toISOString().substring(0, 7); // "YYYY-MM"
      list.push(yKey);
    }
    return list;
  };

  const chartMonthsData = getPastMonths(chartMonthsCount).map(mKey => {
    const rep = monthlyReports[mKey];
    return {
      monthKey: mKey,
      name: formatMonthName(mKey),
      'صافي الأرباح': rep ? rep.netProfit : 0,
      'إجمالي المبيعات': rep ? rep.totalSales : 0,
      'ربح الأصناف': rep ? rep.totalProfit : 0,
    };
  });

  // Low Stock products check
  // We index stock levels by productCode and gender composite key for precise alerts
  const stockMapForAlerts: { 
    [key: string]: { 
      code: string; 
      category: string; 
      gender: 'boys' | 'girls';
      totalIn: number; 
      totalOut: number; 
      currentStock: number; 
    } 
  } = {};

  purchases.forEach(p => {
    if (p.archivedFromInventory) return;
    const code = p.productCode.toUpperCase().trim();
    const g = p.gender || 'boys';
    const key = `${code}_${g}`;
    if (!stockMapForAlerts[key]) {
      stockMapForAlerts[key] = { 
        code, 
        category: p.category, 
        gender: g,
        totalIn: 0, 
        totalOut: 0, 
        currentStock: 0 
      };
    }
    stockMapForAlerts[key].totalIn += p.quantity;
    stockMapForAlerts[key].currentStock += p.quantity;
  });

  sales.forEach(s => {
    if (s.items && s.items.length > 0) {
      s.items.forEach(item => {
        const code = item.productCode.toUpperCase().trim();
        const g = item.gender || 'boys';
        const key = `${code}_${g}`;

        // Stock reset check: ignore sales prior to earliest active purchase date for this item
        const activePurchasesOfItem = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === code && (p.gender || 'boys') === g);
        if (activePurchasesOfItem.length > 0) {
          const isValidSale = activePurchasesOfItem.some(p => {
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
            return;
          }
        } else {
          return;
        }

        if (!stockMapForAlerts[key]) {
          stockMapForAlerts[key] = {
            code,
            category: item.category,
            gender: g,
            totalIn: 0,
            totalOut: 0,
            currentStock: 0
          };
        }
        stockMapForAlerts[key].totalOut += item.quantity;
        stockMapForAlerts[key].currentStock -= item.quantity;
      });
    } else {
      const code = s.productCode.toUpperCase().trim();
      const g = s.gender || 'boys';
      const key = `${code}_${g}`;

      // Stock reset check: ignore sales prior to earliest active purchase date for this item
      const activePurchasesOfItem = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === code && (p.gender || 'boys') === g);
      if (activePurchasesOfItem.length > 0) {
        const isValidSale = activePurchasesOfItem.some(p => {
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
          return;
        }
      } else {
        return;
      }

      if (!stockMapForAlerts[key]) {
        stockMapForAlerts[key] = { 
          code, 
          category: s.category, 
          gender: g,
          totalIn: 0, 
          totalOut: 0, 
          currentStock: 0 
        };
      }
      stockMapForAlerts[key].totalOut += s.quantity;
      stockMapForAlerts[key].currentStock -= s.quantity;
    }
  });

  const lowStockProducts = Object.values(stockMapForAlerts).filter(item => item.totalIn > 0 && item.currentStock < 15);

  // Add custom operational expense
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseName && expenseAmount > 0) {
      onAddExpense({
        name: expenseName,
        amount: expenseAmount,
        category: expenseCategory,
        date: expenseDate,
      });
      setExpenseName('');
      setExpenseAmount(0);
      setExpenseSuccess('تم تسجيل المصروف بنجاح!');
      setTimeout(() => setExpenseSuccess(''), 3000);
    }
  };

  // Call Gemini model
  const handleQueryAI = async () => {
    setLoadingAi(true);
    setAiReport('');
    setAiError('');

    // Prepare live calculated stocks
    const stockMap: { [code: string]: number } = {};
    purchases.forEach(p => {
      if (p.archivedFromInventory) return;
      stockMap[p.productCode] = (stockMap[p.productCode] || 0) + p.quantity;
    });
    sales.forEach(s => {
      if (s.items && s.items.length > 0) {
        s.items.forEach(item => {
          const itemCode = item.productCode;
          const activePurchases = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === itemCode.toUpperCase().trim());
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
            if (isValidSale) {
              stockMap[itemCode] = (stockMap[itemCode] || 0) - item.quantity;
            }
          }
        });
      } else {
        const itemCode = s.productCode;
        const activePurchases = purchases.filter(p => !p.archivedFromInventory && p.productCode.toUpperCase().trim() === itemCode.toUpperCase().trim());
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
          if (isValidSale) {
            stockMap[itemCode] = (stockMap[itemCode] || 0) - s.quantity;
          }
        }
      }
    });

    const calculatedInventory = Object.keys(stockMap).map(code => {
      const matchP = purchases.find(p => !p.archivedFromInventory && p.productCode === code) || purchases.find(p => p.productCode === code);
      return {
        productCode: code,
        category: matchP ? matchP.category : 'صنف مبيعات مباشر',
        quantity: stockMap[code],
      };
    });

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales,
          purchases,
          expenses,
          inventory: calculatedInventory,
        }),
      });

      const data = await response.json();
      if (data.success && data.report) {
        setAiReport(data.report);
      } else {
        setAiError(data.error || 'فشلت معالجة الخادم الذكي للطلب.');
      }
    } catch (err) {
      console.error(err);
      setAiError('انقطع الاتصال أو فشل إرسال البيانات للخادم المحاسبي.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Simple Markdown Renderer
  const renderMarkdownText = (rawText: string) => {
    return rawText.split('\n').map((line, index) => {
      const trimmed = line.trim();
      
      // Bold ** text handler
      const boldRegex = /\*\*(.*?)\*\*/g;
      const htmlLine = trimmed.replace(boldRegex, '<strong class="font-bold text-emerald-990">$1</strong>');

      // Headings
      if (trimmed.startsWith('###')) {
        return <h4 key={index} className="text-sm font-bold text-slate-800 mt-4 mb-2 border-r-4 border-emerald-500 pr-2" dangerouslySetInnerHTML={{ __html: htmlLine.replace('###', '') }} />;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={index} className="text-base font-bold text-slate-950 mt-5 mb-3 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-lg" dangerouslySetInnerHTML={{ __html: htmlLine.replace('##', '') }} />;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={index} className="text-lg font-bold text-slate-950 mt-6 mb-4 pb-1 border-b border-slate-200" dangerouslySetInnerHTML={{ __html: htmlLine.replace('#', '') }} />;
      }
      // List bullet
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <div key={index} className="flex items-start gap-2 text-xs text-slate-700 my-1 pr-3 list-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0"></span>
            <p className="flex-1" dangerouslySetInnerHTML={{ __html: htmlLine.substring(1) }} />
          </div>
        );
      }
      // Simple line spacing
      if (trimmed === '') {
        return <div key={index} className="h-2" />;
      }
      return <p key={index} className="text-xs text-slate-700 leading-relaxed my-1.5" dangerouslySetInnerHTML={{ __html: htmlLine }} />;
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Upper Navigation & Status Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Sub tabs switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 select-none">
          <button
            onClick={() => setDashboardSubTab('general')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dashboardSubTab === 'general' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            📊 التحليل العام والمصاريف
          </button>
          <button
            onClick={() => setDashboardSubTab('reports')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dashboardSubTab === 'reports' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            📅 التقارير والمقارنات الشهرية
          </button>
        </div>
      </div>

      {dashboardSubTab === 'general' ? (
        <>

          {/* Critical Stock Alerts list below 15 items */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col space-y-2 text-slate-800">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold font-sans">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>⚠️ تنبيه المستودع والأجهزة: أصناف ريبلا كيدز الحرجة (المخزون المتوفر أقل من 15 قطعة)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockProducts.map((p, pIdx) => (
              <div key={pIdx} className="bg-white/90 p-2.5 rounded-lg border border-amber-100 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0">{p.code}</span>
                  <span className={`px-1 rounded-[3px] text-[9px] font-bold shrink-0 ${p.gender === 'girls' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                    {p.gender === 'girls' ? 'بناتي' : 'صبياني'}
                  </span>
                  <span className="text-slate-500 text-[10px] truncate max-w-[80px]">{p.category}</span>
                </div>
                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] shrink-0 ${
                  p.currentStock < 0 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200 font-extrabold' 
                    : p.currentStock === 0 
                      ? 'bg-rose-100 text-rose-700 font-extrabold' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {p.currentStock < 0 
                    ? `جرد سالب (${p.currentStock} قطعة) ⚠️` 
                    : p.currentStock === 0 
                      ? 'نفذ تماماً! (0 قطعة)' 
                      : `${p.currentStock} قطعة متبقية`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Syrian B2B KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">

        {/* KPI: Capital (Standard Accounting style) */}
        <div className="bg-[#0f172a] text-white p-4 rounded-xl border border-slate-800 shadow-xs flex flex-col justify-between h-full min-h-[140px] col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-[#10b981] block uppercase tracking-wider leading-tight">رأس المال العام</span>
            </div>
            <div className="p-1.5 bg-slate-800 text-[#10b981] rounded-lg shrink-0">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-lg font-extrabold font-mono text-white block leading-none">${currentCapital.toFixed(1)}</span>
            
            <div className="text-[9px] text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-800 mt-1 flex flex-col">
              <div className="flex justify-between items-center">
                <span>رأس المال التأسيسي:</span>
                {isEditingCapital ? (
                  <input
                    type="number"
                    value={tempCapitalText}
                    onChange={e => setTempCapitalText(e.target.value)}
                    className="w-16 px-1 h-4 text-[10px] text-slate-900 rounded border border-emerald-300 outline-none text-right font-mono bg-white"
                    autoFocus
                    onBlur={() => {
                      const val = Number(tempCapitalText);
                      if (!isNaN(val) && val >= 0) {
                        setStartingCapital(val);
                        localStorage.setItem('rebila_starting_capital', String(val));
                      }
                      setIsEditingCapital(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = Number(tempCapitalText);
                        if (!isNaN(val) && val >= 0) {
                          setStartingCapital(val);
                          localStorage.setItem('rebila_starting_capital', String(val));
                        }
                        setIsEditingCapital(false);
                      }
                    }}
                  />
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setTempCapitalText(String(startingCapital));
                      setIsEditingCapital(true);
                    }}
                    className="font-mono bg-slate-800 hover:bg-slate-700 px-1 py-0.5 rounded text-[9px] text-emerald-300 flex items-center gap-0.5 cursor-pointer border border-slate-750 text-right"
                  >
                    ${startingCapital} ✏️
                  </button>
                )}
              </div>
              <div className="flex justify-between">
                <span>الأرباح المضافة:</span>
                <span className="font-mono text-emerald-400">{netProfitUSD >= 0 ? '+' : ''}${netProfitUSD.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI: Current Inventory Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">قيمة المخزون الحالي</span>
            </div>
            <div className="p-1.5 bg-indigo-50 text-[#4f46e5] rounded-lg shrink-0">
              <Archive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-lg font-extrabold font-mono text-[#4f46e5] block leading-none">${totalInventoryValueUSD.toFixed(1)}</span>
            <div className="pt-1.5 border-t border-slate-100 mt-1">
              <span className="text-[9px] text-slate-400 block font-sans leading-tight">كلفة البضاعة المتبقية بالمستودع</span>
            </div>
          </div>
        </div>

        {/* KPI: Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">مبيعات الشهر الحالي</span>
            </div>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-lg font-extrabold font-mono text-emerald-700 block leading-none">${monthlySalesUSD.toFixed(1)}</span>
            <div className="text-[9px] text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-100 mt-1">
              <div className="flex justify-between">
                <span>التراكمي العام:</span>
                <span className="font-mono font-bold">${totalSalesUSD.toFixed(1)}</span>
              </div>
              {totalSalesUSD > 0 && (
                <div className="flex justify-between border-t border-slate-100 pt-0.5 mt-0.5 text-slate-500">
                  <span>معدل النشاط العام:</span>
                  <span className="font-mono font-bold text-emerald-600">%{((grossProfitUSD / totalSalesUSD) * 100).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI: Monthly Purchases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">مشتريات الشهر الحالي</span>
            </div>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-lg font-extrabold font-mono text-indigo-700 block leading-none">${monthlyPurchasesUSD.toFixed(1)}</span>
            <div className="text-[9px] text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-100 mt-1">
              <div className="flex justify-between">
                <span>التراكمي المورد:</span>
                <span className="font-mono font-bold">${purchases.filter(p => !p.archivedFromInventory).reduce((acc, p) => acc + (p.quantity * p.price), 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI: Profits */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">الأرباح الشهرية التقديرية</span>
            </div>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-lg font-extrabold font-mono text-emerald-600 block leading-none">${monthlyProfitUSD.toFixed(1)}</span>
            <div className="text-[9px] text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-100 mt-1">
              <div className="flex justify-between">
                <span>الربح العام الحالي:</span>
                <span className="font-mono font-bold">${grossProfitUSD.toFixed(1)}</span>
              </div>
              {monthlySalesUSD > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold border-t border-slate-100 pt-0.5 mt-0.5">
                  <span>صافي ربح المبيعات:</span>
                  <span className="font-mono">%{((monthlyProfitUSD / monthlySalesUSD) * 100).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI: Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">المصاريف الكلية الصادرة</span>
            </div>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-lg font-extrabold font-mono text-rose-600 block leading-none">${totalExpensesUSD.toFixed(1)}</span>
            <div className="pt-1.5 border-t border-slate-100 mt-1">
              <span className="text-[9px] text-slate-400 block leading-tight">آجارات، لجان ورواتب</span>
            </div>
          </div>
        </div>

        {/* KPI: Net Profits after bills */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex justify-between items-start gap-1.5 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">صافي الربح الفعلي للتاجر</span>
            </div>
            <div className={`p-1.5 rounded-lg shrink-0 ${netProfitUSD >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <span className={`text-lg font-black font-mono block leading-none ${netProfitUSD >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${netProfitUSD.toFixed(1)}
            </span>
            <div className="pt-1.5 border-t border-slate-100 mt-1">
              <span className="text-[9px] text-slate-400 block leading-tight">الربح العام مطروحاً منه المصاريف</span>
            </div>
          </div>
        </div>
      </div>

          {/* Recharts Line Chart: Monthly Profit Development */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-4 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
                  مخطط الأداء وتطور الأرباح الشهرية (آخر {chartMonthsCount} {chartMonthsCount >= 3 && chartMonthsCount <= 10 ? 'أشهر' : 'شهراً'})
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">مقارنة بصرية واضحة لتطور الأرباح الصافية المحققة ومبيعات البضائع</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Months customizer input/selectors */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-[10px] font-bold text-slate-300">عرض:</span>
                  <button
                    type="button"
                    onClick={() => setChartMonthsCount(prev => Math.max(2, prev - 1))}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold w-5 h-5 flex items-center justify-center cursor-pointer transition-colors"
                    title="تقليل عدد الأشهر"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={chartMonthsCount}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val >= 2 && val <= 24) {
                        setChartMonthsCount(val);
                      }
                    }}
                    className="w-10 text-center text-xs font-bold bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-emerald-400 font-mono focus:outline-hidden text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setChartMonthsCount(prev => Math.min(24, prev + 1))}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold w-5 h-5 flex items-center justify-center cursor-pointer transition-colors"
                    title="زيادة عدد الأشهر"
                  >
                    +
                  </button>
                  <span className="text-[10px] text-slate-400">شهر</span>
                </div>

                {/* Predefined select options for ease of use */}
                <select
                  value={chartMonthsCount}
                  onChange={e => setChartMonthsCount(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg text-[10px] border border-slate-705 border-slate-750 border-slate-700 focus:border-emerald-500 outline-hidden bg-slate-800 text-slate-200 cursor-pointer"
                >
                  <option value={3}>آخر 3 أشهر</option>
                  <option value={6}>آخر 6 أشهر</option>
                  <option value={12}>آخر 12 شهر</option>
                  <option value={18}>آخر 18 شهر</option>
                  <option value={24}>آخر سنتين</option>
                </select>
              </div>
            </div>

            <div className="h-64 w-full pt-1" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartMonthsData} margin={{ top: 12, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      direction: 'rtl', 
                      textAlign: 'right', 
                      fontSize: '11px',
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                      backgroundColor: '#ffffff'
                    }} 
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={32} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', direction: 'rtl', paddingBottom: '10px' }}
                  />
                  <Line 
                    name="الأرباح الصافية ($)" 
                    type="monotone" 
                    dataKey="صافي الأرباح" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    name="مبيعات البضائع ($)" 
                    type="monotone" 
                    dataKey="إجمالي المبيعات" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    strokeDasharray="5 5" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Smart B2B Analysis Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                  <Brain className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    المستشار المحاسبي الذكي
                    <Sparkles className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    اضغط لتشغيل نموذج المحاسبة AI لتحليل الأصناف الأكثر طلباً، تنبيهات انخفاض مخزون البيجامات، وزبائن لم يطلبوا مؤخراً في سوريا.
                  </p>
                </div>
              </div>
              
              <button
                id="run-ai-analysis-btn"
                onClick={handleQueryAI}
                disabled={loadingAi}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-800/60 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
              >
                {loadingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    جارٍ تحليل البيانات...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-emerald-300" />
                    استخراج التقرير الذكي
                  </>
                )}
              </button>
            </div>

            {/* AI report container */}
            {loadingAi && (
              <div className="bg-slate-50 p-10 rounded-lg shadow-xs border border-slate-200 text-center text-xs text-slate-600 space-y-3 font-medium">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                <p>المساعد المحاسبي ريبلا كيدز يحلل كودات المستودعات وحركات الشحن مع المحافظات السورية اللوجستية...</p>
              </div>
            )}

            {aiError && (
              <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-800 rounded-lg border border-rose-100 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiReport && (
              <div className="bg-slate-50/55 p-6 rounded-xl border border-slate-200 shadow-xs relative max-h-96 overflow-y-auto">
                <div className="absolute top-4 left-4 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 rounded-md flex items-center gap-1 border border-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> تقرير مالي موثوق
                </div>
                <div className="prose prose-sm font-sans pr-1">
                  {renderMarkdownText(aiReport)}
                </div>
              </div>
            )}
          </div>

          {/* Main Grid: Statistics summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Customers list */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-600" />
                  أفضل وحجم زبائن الجملة
                </span>
                <span className="text-[10px] text-slate-400">بناءً على المشتريات</span>
              </h3>

              {topCustomers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لم يتم رصد طلبيات زبائن حتى الآن.</p>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((cust, index) => (
                    <div key={cust.name} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-150">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-4 w-4 bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold font-mono rounded-full flex items-center justify-center text-[10px] shrink-0">{index + 1}</span>
                          <span className="text-xs font-bold text-slate-800">{cust.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block pr-5">مركز الشحن: محافظة {cust.province}</span>
                      </div>
                      <div className="text-left">
                        <span className="font-extrabold font-mono text-emerald-600 block text-xs">${cust.totalSpent.toFixed(1)}</span>
                        <span className="text-[9px] text-slate-400 block">{cust.orderCount} طلبيات موثقة</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Clothing Categories */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  الأصناف الأكثر مبيعاً في المعرض
                </span>
                <span className="text-[10px] text-slate-400">الكمية المسحوبة</span>
              </h3>

              {topCategories.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لم يتم بيع أو تصنيف بضائع بعد.</p>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((item) => (
                    <div key={`${item.cat}_${item.productCode}_${item.gender}`} className="space-y-1.5 py-1">
                      <div className="flex justify-between items-center text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-805">{item.cat}</span>
                          {item.productCode && (
                            <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase">
                              #{item.productCode}
                            </span>
                          )}
                          <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                            item.gender === 'girls' 
                              ? 'bg-rose-50 text-rose-705 border-rose-100' 
                              : 'bg-indigo-50 text-indigo-705 border-indigo-100'
                          }`}>
                            {item.gender === 'girls' ? '👧 بناتي' : '👦 ولادي'}
                          </span>
                        </div>
                        <span className="font-bold font-mono text-slate-600 shrink-0">{item.unitsSold} قطعة</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (item.unitsSold / 50) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        <div className="space-y-6">
          
          {/* Card: Monthly Performance Analysis */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">التقرير المالي والمبيعات الشهري في ريبلا كيدز</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">جدول ملخص للأرباح وصافي عوائد التاجر مقسمة حسب الأشهر الجغرافية السورية</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-3 font-semibold text-right">الشهر</th>
                    <th className="p-3 font-semibold text-center">إجمالي المبيعات ($)</th>
                    <th className="p-3 font-semibold text-center">ربح الأصناف ($)</th>
                    <th className="p-3 font-semibold text-center">نسبة الربح (%)</th>
                    <th className="p-3 font-semibold text-center">المصاريف الشهرية ($)</th>
                    <th className="p-3 font-semibold text-center">صافي الأرباح العينية ($)</th>
                    <th className="p-3 font-semibold text-center">القطع المشحونة</th>
                    <th className="p-3 font-bold text-center text-emerald-800">المحافظة الأكثر طلباً</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {allMonths.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        لم يسجل أي فواتير بيع أو مشتريات أو مصاريف بالشهور السابقة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    allMonths.map(mKey => {
                      const rep = monthlyReports[mKey];
                      if (!rep) return null;
                      const monthProfitMargin = rep.totalSales > 0 ? (rep.totalProfit / rep.totalSales) * 100 : 0;
                      return (
                        <tr key={mKey} className="hover:bg-slate-50/50 leading-relaxed">
                          <td className="p-3 font-bold text-slate-900">{formatMonthName(mKey)}</td>
                          <td className="p-3 text-center font-bold font-mono text-slate-800">${rep.totalSales.toFixed(1)}</td>
                          <td className="p-3 text-center font-bold font-mono text-emerald-600">${rep.totalProfit.toFixed(1)}</td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                              %{monthProfitMargin.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-rose-600">${rep.expenses.toFixed(1)}</td>
                          <td className="p-3 text-center font-black font-mono">
                            <span className={`px-2 py-0.5 rounded-sm ${rep.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-110 border' : 'bg-rose-50 text-rose-700 border border-rose-110'}`}>
                              ${rep.netProfit.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-medium text-slate-500">{rep.totalQty} قطعة</td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-100 shadow-3xs">
                              {rep.mostRequestedProvince}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Monthly Balance Sheet & Custom Capital */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Landmark className="h-5 w-5 text-emerald-600" />
                كشف الأرصدة والمطابقات الشهرية لمصادر رأس المال
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تتبع التقييم المتراكم لرأس المال، حيث يتم ترحيل الرصيد الختامي لكل شهر ليكون هو رأس المال الافتتاحي للشهر التالي مع إضافة الأرباح الصافية تلقائياً.
              </p>
            </div>

            {/* Balances Sheet Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-3 font-semibold text-right">الشهر</th>
                    <th className="p-3 font-semibold text-center">رأس المال الافتتاحي ($)</th>
                    <th className="p-3 font-semibold text-center">صافي الأرباح العينية ($)</th>
                    <th className="p-3 font-semibold text-center">الرصيد الختامي ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {allMonths.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        لا يوجد حركات تجارية أو نفقات لحساب الأرصدة التراكمية.
                      </td>
                    </tr>
                  ) : (
                    allMonths.map(monthKey => {
                      const mCalc = monthlyCalculations[monthKey];
                      if (!mCalc) return null;

                      const { 
                        startingCapitalVal, 
                        monthlyNetProfit, 
                        closingBalance, 
                        prodProfitTotal, 
                        expensesTotal 
                      } = mCalc;

                      const isEditing = editingCapitals[monthKey] !== undefined;
                      const editingVal = editingCapitals[monthKey] || '';

                      return (
                        <tr key={monthKey} className="hover:bg-slate-50/50 leading-relaxed">
                          <td className="p-3 font-bold text-slate-900">{formatMonthName(monthKey)}</td>
                          
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5" dir="ltr">
                                <button
                                  onClick={() => handleSaveMonthlyCapital(monthKey, editingVal)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                                >
                                  حفظ
                                </button>
                                <input
                                  type="number"
                                  value={editingVal}
                                  onChange={e => setEditingCapitals(prev => ({
                                    ...prev,
                                    [monthKey]: e.target.value
                                  }))}
                                  className="w-20 px-2 py-1 text-xs text-slate-950 rounded border border-emerald-400 text-center font-mono focus:outline-hidden"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleSaveMonthlyCapital(monthKey, editingVal);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono font-bold text-slate-800">${startingCapitalVal.toLocaleString()}</span>
                                <button
                                  onClick={() => setEditingCapitals(prev => ({
                                    ...prev,
                                    [monthKey]: String(startingCapitalVal)
                                  }))}
                                  className="text-[10px] text-slate-400 hover:text-emerald-600 cursor-pointer"
                                  title="تعديل رأس مال الفتح للشهر"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <div className="space-y-0.5">
                              <span className={`font-mono font-bold block ${monthlyNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {monthlyNetProfit >= 0 ? '+' : ''}${monthlyNetProfit.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 block leading-none">
                                (ربح بضائع: ${prodProfitTotal} | نفقات: ${expensesTotal})
                              </span>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${closingBalance >= startingCapitalVal ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                              ${closingBalance.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Month-to-Month Comparator widget */}
          {allMonths.length >= 1 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs leading-relaxed">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">أداة المقارنة المباشرة وتحليل الفروقات بين الأشهر</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">اختر شهرين للحصول على مقارنة فنية شاملة لنسب المبيعات والأرباح والتوزيع اللوجستي</p>
              </div>

              {/* Selector Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">الشهر الأساسي (الشهر القديم للمقارنة):</label>
                  <select
                    value={compareMonthB || allMonths[1] || allMonths[0] || ''}
                    onChange={e => setCompareMonthB(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 outline-hidden bg-white text-slate-700 cursor-pointer text-right"
                  >
                    <option value="">اختر شهر...</option>
                    {allMonths.map(mKey => (
                      <option key={mKey} value={mKey}>{formatMonthName(mKey)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">شهر المقارنة المستهدف (الشهر الجديد):</label>
                  <select
                    value={compareMonthA || allMonths[0] || ''}
                    onChange={e => setCompareMonthA(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 outline-hidden bg-white text-slate-700 cursor-pointer text-right"
                  >
                    <option value="">اختر شهر...</option>
                    {allMonths.map(mKey => (
                      <option key={mKey} value={mKey}>{formatMonthName(mKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comparison Results Card */}
              {(() => {
                const mKeyA = compareMonthA || allMonths[0] || '';
                const mKeyB = compareMonthB || allMonths[1] || allMonths[0] || '';
                const reportA = monthlyReports[mKeyA];
                const reportB = monthlyReports[mKeyB];

                if (!reportA || !reportB || mKeyA === mKeyB) {
                  return (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-150 text-slate-400 text-xs font-sans">
                      يرجى اختيار شهرين مختلفين لتشغيل أداة مقارنة الأداء (يتطلب وجود سجل حركة في الفترتين).
                    </div>
                  );
                }

                // Calculations
                const salesDiff = reportA.totalSales - reportB.totalSales;
                const salesPercent = reportB.totalSales > 0 ? (salesDiff / reportB.totalSales) * 100 : (salesDiff > 0 ? 100 : 0);

                const profitDiff = reportA.netProfit - reportB.netProfit;
                const profitPercent = reportB.netProfit !== 0 ? (profitDiff / Math.abs(reportB.netProfit)) * 100 : (profitDiff > 0 ? 100 : 0);

                const qtyDiff = reportA.totalQty - reportB.totalQty;
                const qtyPercent = reportB.totalQty > 0 ? (qtyDiff / reportB.totalQty) * 100 : (qtyDiff > 0 ? 100 : 0);

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Metric Comparison: Sales */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <span className="text-[11px] text-slate-500 font-bold block mb-1">المبيعات الإجمالية</span>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="font-mono text-slate-400 text-xs">${reportB.totalSales.toFixed(1)}</span>
                          <span className="text-slate-350 font-light text-[10px]">مقارنة بـ</span>
                          <span className="font-mono text-emerald-800 font-extrabold text-sm">${reportA.totalSales.toFixed(1)}</span>
                        </div>
                        <div className={`mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold ${salesDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          <span>{salesDiff >= 0 ? '🎉 زيادة بالنمو' : '📉 تراجع بالنمو'}</span>
                          <span className="font-mono">{salesDiff >= 0 ? '+' : ''}${salesDiff.toFixed(1)} ({salesDiff >= 0 ? '+' : ''}{salesPercent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      {/* Metric Comparison: Net Profit */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <span className="text-[11px] text-slate-500 font-bold block mb-1">صافي الأرباح الفعلية</span>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="font-mono text-slate-400 text-xs">${reportB.netProfit.toFixed(1)}</span>
                          <span className="text-slate-350 font-light text-[10px]">مقارنة بـ</span>
                          <span className="font-mono text-emerald-800 font-extrabold text-sm">${reportA.netProfit.toFixed(1)}</span>
                        </div>
                        <div className={`mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold ${profitDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          <span>{profitDiff >= 0 ? '💰 تحسن بالربح' : '⚠️ تراجع بالأرباح'}</span>
                          <span className="font-mono">{profitDiff >= 0 ? '+' : ''}${profitDiff.toFixed(1)} ({profitDiff >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      {/* Metric Comparison: Quantity */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <span className="text-[11px] text-slate-500 font-bold block mb-1">قطع البيجامات المشحونة</span>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="font-mono text-slate-400 text-xs">{reportB.totalQty} قطعة</span>
                          <span className="text-slate-350 font-light text-[10px]">مقارنة بـ</span>
                          <span className="font-mono text-emerald-850 font-extrabold text-sm">{reportA.totalQty} قطعة</span>
                        </div>
                        <div className={`mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold ${qtyDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          <span>{qtyDiff >= 0 ? '📈 زيادة شحن' : '📉 نقص شحنات'}</span>
                          <span className="font-mono">{qtyDiff >= 0 ? '+' : ''}{qtyDiff} قطعة ({qtyDiff >= 0 ? '+' : ''}{qtyPercent.toFixed(1)}%)</span>
                        </div>
                      </div>

                    </div>

                    {/* Geographical Comparison */}
                    <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 block">تحليل الطلب المحوري الفارق:</span>
                        <p className="text-slate-650 text-xs leading-relaxed">
                          في شهر <b className="text-slate-900 font-semibold">{formatMonthName(mKeyB)}</b>، كانت المحافظة الأكثر طلباً في الشحنات هي <span className="text-emerald-800 font-extrabold">{reportB.mostRequestedProvince}</span>. 
                          ومع الانتقال لشهر <b className="text-slate-900 font-semibold">{formatMonthName(mKeyA)}</b>، تحول الطلب اللوجستي الرئيسي ليصبح في صالح <span className="text-emerald-800 font-extrabold">{reportA.mostRequestedProvince}</span>.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 block">التوزيع الجغرافي المتميز لشهر {formatMonthName(mKeyA)}:</span>
                        <div className="flex flex-wrap gap-2">
                          {reportA.provinceRankings.slice(0, 3).map((pr, idx) => (
                            <span key={pr.province} className="text-[10px] bg-white rounded-lg border border-slate-200 px-2 py-1 text-slate-800 flex items-center gap-1.5 shadow-3xs">
                              <b className="font-mono text-emerald-700">{idx+1}. {pr.province}</b>
                              <span className="text-[9px] text-slate-400">(${pr.amount.toFixed(0)})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Detailed monthly breakdown and statement extractor */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs leading-relaxed font-sans">
            <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">استخراج كشف حساب المبيعات والزبائن الشهري المفصل</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">اختر شهراً معيّناً للحصول على تقرير بياني دقيق متكامل بالزبائن، عدد الفساتين/البيجامات المباعة، والأرباح المحققة.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 leading-none">
                {/* Select dropdown from system recorded months */}
                <div className="relative flex-1 sm:w-48">
                  <select
                    value={selectedDetailedMonth || (allMonths[0] || '')}
                    onChange={e => setSelectedDetailedMonth(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-205 outline-hidden bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer text-right transition-colors"
                  >
                    <option value="">-- اختر من أشهر السيستم --</option>
                    {allMonths.map(mKey => (
                      <option key={mKey} value={mKey}>{formatMonthName(mKey)}</option>
                    ))}
                  </select>
                </div>
                
                {/* Manual date input for months */}
                <div className="flex items-center gap-1.5 border border-slate-205 bg-slate-50 hover:bg-slate-100 transition-all rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400">تحديد يدوي:</span>
                  <input
                    type="month"
                    value={selectedDetailedMonth || (allMonths[0] || '')}
                    onChange={e => setSelectedDetailedMonth(e.target.value)}
                    className="outline-hidden text-xs font-mono font-bold text-slate-705 cursor-pointer bg-transparent py-0.5"
                    title="حدد أو اكتب الشهر المطلوب يدوياً"
                  />
                </div>
              </div>
            </div>

            {(() => {
              const activeSelMonth = selectedDetailedMonth || (allMonths[0] || '');
              if (!activeSelMonth) {
                return (
                  <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-150 text-slate-400 text-xs">
                    يرجى تسجيل فواتير مبيعات أولاً لتتمكن من استخراج التقارير الشهرية المفصلة.
                  </div>
                );
              }

              // Filter sales for this specific month
              const selSales = sales.filter(s => s.date.startsWith(activeSelMonth));

              // Compute stats
              const selTotalSales = selSales.reduce((acc, s) => acc + s.totalAmount, 0);
              const selTotalProfit = selSales.reduce((acc, s) => acc + s.profit, 0);
              const selTotalQty = selSales.reduce((acc, s) => {
                if (s.items && s.items.length > 0) {
                  return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
                }
                return acc + s.quantity;
              }, 0);

              // Aggregate unique customers
              const selCustomersMap: {
                [id: string]: {
                  id: string;
                  name: string;
                  totalSpent: number;
                  totalQty: number;
                  totalProfit: number;
                  phone: string;
                  province: string;
                  ordersCount: number;
                }
              } = {};

              selSales.forEach(s => {
                const custId = s.customerId || s.customerName;
                if (!selCustomersMap[custId]) {
                  selCustomersMap[custId] = {
                    id: custId,
                    name: s.customerName,
                    totalSpent: 0,
                    totalQty: 0,
                    totalProfit: 0,
                    phone: s.customerPhone,
                    province: s.province,
                    ordersCount: 0
                  };
                }
                const qtyInSale = s.items && s.items.length > 0 
                  ? s.items.reduce((sum, item) => sum + item.quantity, 0)
                  : s.quantity;

                selCustomersMap[custId].totalSpent += s.totalAmount;
                selCustomersMap[custId].totalQty += qtyInSale;
                selCustomersMap[custId].totalProfit += s.profit;
                selCustomersMap[custId].ordersCount += 1;
              });

              const selCustomersList = Object.values(selCustomersMap);

              return (
                <div className="space-y-6">
                  
                  {/* Monthly Stats Bento Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-500 font-bold block leading-none mb-1">المبيعات الإجمالية</span>
                      <span className="font-extrabold font-mono text-emerald-800 text-sm">${selTotalSales.toFixed(2)}</span>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                      <span className="text-[10px] text-slate-500 font-bold block leading-none mb-1">الأرباح العينية الصافية</span>
                      <span className="font-extrabold font-mono text-indigo-800 text-sm">${selTotalProfit.toFixed(2)}</span>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                      <span className="text-[10px] text-slate-600 font-bold block leading-none mb-1">قطع الملابس المشحونة</span>
                      <span className="font-extrabold font-mono text-amber-800 text-sm">{selTotalQty} قطعة</span>
                    </div>
                    <div className="bg-purple-100/70 p-4 rounded-xl border border-purple-200">
                      <span className="text-[10px] text-purple-950 font-bold block leading-none mb-1">زبائن اشتروا بالشهر</span>
                      <span className="font-extrabold font-mono text-purple-900 text-sm">{selCustomersList.length} عميل</span>
                    </div>
                  </div>

                  {/* Customers list who bought in this month */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <span className="font-bold text-slate-900 text-xs">١. قائمة الزبائن والشركات المشترية خلال الشهر ({formatMonthName(activeSelMonth)})</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right divide-y divide-slate-150">
                        <thead className="bg-slate-50 text-slate-400 text-[10px]">
                          <tr>
                            <th className="p-2.5 font-bold">اسم الزبون / الشركة</th>
                            <th className="p-2.5 font-semibold">المحافظة الجغرافية</th>
                            <th className="p-2.5 font-semibold text-center font-mono">الفواتير</th>
                            <th className="p-2.5 font-semibold text-center font-mono">القطع المشحونة له</th>
                            <th className="p-2.5 font-semibold text-center font-mono font-bold text-emerald-800">إجمالي الشراء ($)</th>
                            <th className="p-2.5 font-semibold text-center font-mono font-bold text-indigo-800">صافي الربح المحقق منه ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {selCustomersList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                                لم يتم العثور على أي عمليات شراء زبائن في هذا الشهر.
                              </td>
                            </tr>
                          ) : (
                            selCustomersList.map((cust) => (
                              <tr key={cust.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5 font-bold text-slate-900">{cust.name}</td>
                                <td className="p-2.5 font-medium text-slate-650">{cust.province}</td>
                                <td className="p-2.5 text-center font-mono">{cust.ordersCount}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-700">{cust.totalQty} قطعة</td>
                                <td className="p-2.5 text-center font-bold font-mono text-emerald-600">${cust.totalSpent.toFixed(1)}</td>
                                <td className="p-2.5 text-center font-bold font-mono text-indigo-600">${cust.totalProfit.toFixed(1)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed sales transactions in the selected month */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <span className="font-bold text-slate-900 text-xs">٢. تفاصيل وحركة الفواتير المباعة خلال الشهر ({formatMonthName(activeSelMonth)})</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right divide-y divide-slate-150">
                        <thead className="bg-slate-50 text-slate-450 text-[10px]">
                          <tr>
                            <th className="p-2.5 font-semibold">تاريخ الفاتورة</th>
                            <th className="p-2.5 font-bold">اسم الزبون</th>
                            <th className="p-2.5 font-semibold">تفاصيل البضائع المشحونة والأكواد</th>
                            <th className="p-2.5 font-semibold text-center font-mono">القطع</th>
                            <th className="p-2.5 font-semibold text-center font-mono text-emerald-800">إجمالي الفاتورة ($)</th>
                            <th className="p-2.5 font-semibold text-center font-mono text-indigo-800">الربح المحقق ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-750">
                          {selSales.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">
                                لم تبع بضائع في هذا الشهر.
                              </td>
                            </tr>
                          ) : (
                            selSales.map((sale) => {
                              const itemQty = sale.items && sale.items.length > 0 
                                ? sale.items.reduce((sum, i) => sum + i.quantity, 0)
                                : sale.quantity;

                              return (
                                <tr key={sale.id} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{formatDateToShow(sale.date)}</td>
                                  <td className="p-2.5 font-bold text-slate-900">{sale.customerName}</td>
                                  <td className="p-2.5 text-slate-600">
                                    {sale.items && sale.items.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {sale.items.map((i, sIdx) => (
                                          <span key={sIdx} className="inline-block bg-slate-50 text-slate-700 border border-slate-200 rounded-sm px-1.5 py-0.5 text-[9px] font-medium leading-none font-mono">
                                            {i.productCode} ({i.quantity}ق - ${i.price} - {i.gender === 'girls' ? '👧' : '👦'})
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-slate-550">{sale.productCode} ({sale.quantity}ق - {sale.gender === 'girls' ? '👧' : '👦'})</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-800">{itemQty}</td>
                                  <td className="p-2.5 text-center font-bold font-mono text-emerald-600">${sale.totalAmount.toFixed(1)}</td>
                                  <td className="p-2.5 text-center font-bold font-mono text-indigo-650">${sale.profit.toFixed(1)}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
