/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, Sale } from '../types';
import { 
  Plus, Trash2, Wallet, Landmark, DollarSign, Calendar, FileText, CheckCircle2, TrendingUp, Sparkles, RefreshCcw 
} from 'lucide-react';

interface ExpenseManagerProps {
  sales: Sale[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

export function ExpenseManager({
  sales,
  expenses,
  onAddExpense,
  onDeleteExpense
}: ExpenseManagerProps) {
  // Expense Form State
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  
  // Monthly value input: "YYYY-MM" (Defaults to current month)
  const [expenseMonth, setExpenseMonth] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  });

  // Dedicated View/Query month: allows manual monthly search choice (Defaults to current month)
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  });

  const [expenseSuccess, setExpenseSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper: Format Month YYYY-MM into beautiful Arabic description
  const formatMonthNameAr = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'long' });
  };

  // Safe handler: submit expense with Date representing the first of the month
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseName.trim() && expenseAmount > 0 && expenseMonth) {
      // Save as YYYY-MM-01 format to maintain SQL compatibility
      const targetDate = `${expenseMonth}-01`;
      onAddExpense({
        name: expenseName.trim(),
        amount: expenseAmount,
        category: 'other', // Default to other to satisfy database type safely
        date: targetDate
      });
      setExpenseName('');
      setExpenseAmount(0);
      setViewMonth(expenseMonth); // Automatically jump view to the added month for instant confirmation!
      setExpenseSuccess('تم تدوين المصروف الشهري بنجاح في هذا الشهر!');
      setTimeout(() => setExpenseSuccess(''), 3000);
    }
  };

  // Filter expenses list to only show the currently selected view month
  const monthExps = expenses.filter(e => e.date.startsWith(viewMonth));
  const monthExpSum = monthExps.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 max-w-xl mx-auto" dir="rtl">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs text-center">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center justify-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          إدارة وتسجيل المصاريف التشغيلية الشهرية
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          قسم مخصص لتدوين النفقات والرواتب والإيجارات لخصمها تلقائياً من الأرصدة والمطابقات التقاريرية للموسم.
        </p>
      </div>

      {/* Main Form Box: Add Expense */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-3xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-emerald-600" />
            تسجيل مصروف شهري جديد
          </h3>
          <p className="text-[10px] text-slate-400 leading-normal mb-2">
            حدد الشهر لوضع قيد المصروف في حسابات هذا الشهر تحديدا.
          </p>
        </div>

        {expenseSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{expenseSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmitExpense} className="space-y-4">
          {/* Month Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">الشهر المستهدف للتقييد المالي للأرباح:</label>
            <input
              type="month"
              value={expenseMonth}
              onChange={e => setExpenseMonth(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 outline-hidden bg-white text-right font-mono"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">الأرصدة والمصاريف تُسجل شهرياً بناءً على اختيارك هنا.</span>
          </div>

          {/* Expense Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">بيان البند أو الغرض:</label>
            <input
              type="text"
              value={expenseName}
              onChange={e => setExpenseName(e.target.value)}
              placeholder="مثال: رواتب ورشة الشحن والتوضيب أو آجار مستودع صيفي"
              required
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 outline-hidden bg-white text-right"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">القيمة الإجمالية للمبلغ ($):</label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={expenseAmount || ''}
              onChange={e => setExpenseAmount(Number(e.target.value))}
              placeholder="0.00"
              required
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 outline-hidden bg-white text-right font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            حفظ المصروف الشهري
          </button>
        </form>
      </div>

      {/* List of expenses for the selected month */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs leading-relaxed space-y-4">
        
        {/* Dynamic selector to explicitly choose month query */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150">
          <div>
            <span className="text-xs font-bold text-slate-700 block">بحث في أرشيف مصروفات شهر آخر:</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">اختر الشهر للتصفية ومعاينة المصروفات التابعة له فقط...</span>
          </div>
          <input
            type="month"
            value={viewMonth}
            onChange={e => setViewMonth(e.target.value)}
            className="px-3 py-1 text-xs border border-slate-200 rounded-md outline-hidden font-mono bg-white text-slate-850 cursor-pointer"
          />
        </div>

        <h3 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2.5 mb-4 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-emerald-600" />
            سجل المصروفات المضافة لشهر {formatMonthNameAr(viewMonth)}
          </span>
          <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full font-mono font-bold">
            مجموع الشهر المعروض: ${monthExpSum.toLocaleString()}
          </span>
        </h3>

        {monthExps.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">لا يوجد قيود نفقات أو مصاريف تشغيلية مدونة لهذا الشهر حالياً.</p>
        ) : (
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-right divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-400 text-[10px]">
                <tr>
                  <th className="p-3 font-semibold text-right">بيان البند أو الغرض</th>
                  <th className="p-3 font-semibold text-center">المبلغ ($)</th>
                  <th className="p-3 font-semibold text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {monthExps.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/40">
                    <td className="p-3 font-semibold text-slate-800">{e.name}</td>
                    <td className="p-3 text-center font-bold font-mono text-rose-600 text-xs">${e.amount.toLocaleString()}</td>
                    <td className="p-3 text-center">
                      {deleteConfirmId === e.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              onDeleteExpense(e.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            تأكيد حذف
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] transition-colors cursor-pointer border border-slate-200"
                          >
                            تراجع
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(e.id)}
                          className="p-1 px-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
