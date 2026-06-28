/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Customer, Sale, SYRIAN_PROVINCES } from '../types';
import { formatDateToShow } from '../utils';
import { Users, Search, MapPin, UserPlus, Phone, Calendar, ShoppingBag, DollarSign, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

interface CustomerManagerProps {
  customers: Customer[];
  sales: Sale[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export function CustomerManager({
  customers,
  sales,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer
}: CustomerManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string>('');
  const [inquirySearchText, setInquirySearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Form states for editing
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState(SYRIAN_PROVINCES[0]);
  const [success, setSuccess] = useState('');

  // Handle addition or updates
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    if (editingId) {
      const existing = customers.find(c => c.id === editingId);
      if (existing) {
        onEditCustomer({
          ...existing,
          name,
          phone,
          province
        });
        setSuccess('تم تحديث بيانات الزبون بنجاح!');
      }
      setEditingId(null);
    }

    // Reset controls
    setName('');
    setPhone('');
    setProvince(SYRIAN_PROVINCES[0]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleStartEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setProvince(customer.province);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setProvince(SYRIAN_PROVINCES[0]);
  };

  // Compute stats per customer
  const getCustomerStats = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    const totalSpent = customerSales.reduce((acc, current) => acc + current.totalAmount, 0);
    const totalProfit = customerSales.reduce((acc, current) => acc + current.profit, 0);
    const lastOrderDate = customerSales.length > 0 
      ? customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
      : 'لا يوجد طلبيات حتى الآن';

    return {
      orderCount: customerSales.length,
      totalSpent,
      totalProfit,
      lastOrderDate,
      salesRecord: customerSales
    };
  };

  // Show all customers directly in the grid as requested
  const filteredCustomers = customers;

  // For detailed customer inquiry lookup
  const inquiryCustomer = customers.find(c => c.id === selectedInquiryId);
  const inquiryStats = inquiryCustomer ? getCustomerStats(inquiryCustomer.id) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-205 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">إدارة زبائن الجملة والاستعلام</h2>
            <p className="text-xs text-slate-500">مراقبة سجل مشتريات زبائن المعرض والمحافظات السورية والبحث عن الفواتير والأرباح المحققة</p>
          </div>
        </div>
        <div className="text-xs bg-slate-50 border border-slate-200 text-slate-600 font-mono px-3.5 py-1.5 rounded-full self-start md:self-center">
          إجمالي عدد الزبائن المسجلين: {customers.length}
        </div>
      </div>

      {/* Advanced Search & Detailed Inquiry Feature */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs leading-relaxed space-y-4">
        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-xs">
          <Search className="h-4.5 w-4.5 text-emerald-600" />
          <span>البحث السريع واستعلام فواتير عميل معين بالتفصيل</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end relative">
          {showDropdown && (
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowDropdown(false)} 
            />
          )}
          <div className="md:col-span-3 relative z-50">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">اكتب اسم الزبون، رقمه، أو محافظته للبحث الفوري والاستعلام عن فواتيره:</label>
            <div className="relative">
              <input
                type="text"
                value={inquirySearchText}
                onChange={e => {
                  setInquirySearchText(e.target.value);
                  setShowDropdown(true);
                  if (e.target.value === '') {
                    setSelectedInquiryId('');
                  } else {
                    const matched = customers.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                    if (matched) {
                      setSelectedInquiryId(matched.id);
                    }
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="🔍 اكتب هنا للبحث بالاسم أو رقم الهاتف أو المحافظة..."
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-205 outline-hidden bg-white text-right font-sans focus:border-emerald-500 transition-colors"
                id="customer-inquiry-input"
              />
              {selectedInquiryId && (
                <span className="absolute left-3.5 top-2.5 text-emerald-600 text-xs font-bold font-sans flex items-center gap-1">
                  ✓ عميل محدد
                </span>
              )}
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-right text-xs">
                {customers.filter(c => {
                  const query = inquirySearchText.toLowerCase();
                  return !query || 
                         c.name.toLowerCase().includes(query) || 
                         c.phone.includes(query) || 
                         c.province.toLowerCase().includes(query);
                }).length === 0 ? (
                  <div className="p-3 text-slate-400">لا يوجد زبائن مطابقين للبحث، يمكنك الاستمرار في الكتابة.</div>
                ) : (
                  customers.filter(c => {
                    const query = inquirySearchText.toLowerCase();
                    return !query || 
                           c.name.toLowerCase().includes(query) || 
                           c.phone.includes(query) || 
                           c.province.toLowerCase().includes(query);
                  }).map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedInquiryId(c.id);
                        setInquirySearchText(`${c.name} (${c.province}) - ${c.phone}`);
                        setShowDropdown(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({c.province}) - {c.phone}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 relative z-50">
            {selectedInquiryId && (
              <button
                onClick={() => {
                  setSelectedInquiryId('');
                  setInquirySearchText('');
                  setShowDropdown(false);
                }}
                className="py-1.5 px-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer w-full"
              >
                إلغاء الاستعلام
              </button>
            )}
          </div>
        </div>

        {selectedInquiryId && inquiryCustomer && inquiryStats && (
          <div className="mt-4 p-5 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-5 transition-all">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-emerald-400">{inquiryCustomer.name}</h4>
                <div className="flex gap-4 mt-2 text-xs text-slate-300 font-mono">
                  <span>📱 هاتف: {inquiryCustomer.phone}</span>
                  <span>📍 المحافظة: {inquiryCustomer.province}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-slate-800/80 p-2 rounded-lg text-center border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">عدد الفواتير</span>
                  <span className="font-bold font-mono text-xs">{inquiryStats.orderCount} فواتير</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg text-center border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي المبيعات</span>
                  <span className="font-bold font-mono text-xs text-emerald-400">${inquiryStats.totalSpent.toFixed(1)}</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg text-center border border-slate-700/60 font-medium">
                  <span className="text-[10px] text-slate-400 block mb-0.5">صافي الأرباح منه</span>
                  <span className="font-bold font-mono text-xs text-teal-400">${inquiryStats.totalProfit.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-300 block">تفاصيل وتواريخ الفواتير الصادرة للعميل والربح المحقق من كل منها:</span>
              {inquiryStats.salesRecord.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد أي طلبيات مسجلة له بعد.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right divide-y divide-slate-800 text-xs">
                    <thead>
                      <tr className="text-slate-400 text-[10px] bg-slate-800/30">
                        <th className="p-2 font-bold">التاريخ</th>
                        <th className="p-2 font-bold">رقم الفاتورة</th>
                        <th className="p-2 font-semibold">الأصناف المشتراة</th>
                        <th className="p-2 font-semibold text-center">الكمية الإجمالية</th>
                        <th className="p-2 font-semibold text-center">مبلغ الفاتورة</th>
                        <th className="p-2 font-bold text-center text-teal-400">الربح المحقق منها</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {inquiryStats.salesRecord.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/20 font-mono">
                          <td className="p-2 text-slate-300">{formatDateToShow(s.date)}</td>
                          <td className="p-2 text-slate-400">{s.id}</td>
                          <td className="p-2 font-sans font-semibold text-white">
                            {s.items && s.items.length > 0 ? (
                              <div className="flex flex-wrap gap-1 leading-normal">
                                {s.items.map((it, i) => (
                                  <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                                    {it.category} ({it.gender === 'boys' ? 'ولادي' : 'بناتي'}) كود {it.productCode}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>{s.category} ({s.gender === 'boys' ? 'ولادي' : s.gender === 'girls' ? 'بناتي' : 'غير محدد'}) كود {s.productCode}</span>
                            )}
                          </td>
                          <td className="p-2 text-center text-slate-300">{s.quantity} قطعة</td>
                          <td className="p-2 text-center font-bold text-emerald-400">${s.totalAmount.toFixed(1)}</td>
                          <td className="p-2 text-center font-black text-teal-400 bg-teal-500/5">${s.profit.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Render editing form ONLY if editingId exists */}
        {editingId && (
          <div className="bg-white rounded-xl p-5 border border-slate-205 shadow-xs h-fit leading-relaxed">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2 text-xs">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              تعديل بيانات زبون حالي
            </h3>

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg mb-4 text-xs font-bold border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الزبون / الشركة مبيعاً بالجملة:</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="مثال: ألبسة الفرح لدمشق بالجملة"
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden tracking-tight transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم هاتف الزبون (أو واتساب للشحن):</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="مثال: 0933XXXXXX"
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden tracking-normal font-mono text-right transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المحور / المحافظة الجغرافية لشركته:</label>
                <select
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-emerald-500 outline-hidden transition-colors cursor-pointer"
                >
                  {SYRIAN_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 font-bold text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Right Section: Customers List */}
        <div className={`${editingId ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>

          {/* Customer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200 text-slate-400">
                <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">لم يتم العثور على أي زبائن مسجلين يطابقون شروط البحث.</p>
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const stats = getCustomerStats(customer.id);
                // Alert if inactive (no orders since 30 days)
                const isInactive = stats.orderCount > 0 
                  ? (new Date().getTime() - new Date(stats.lastOrderDate).getTime()) > (30 * 24 * 60 * 60 * 1000) 
                  : true;

                return (
                  <div key={customer.id} className="bg-white p-5 rounded-xl border border-slate-205 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    
                    {/* Customer Header Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        {isInactive && stats.orderCount > 0 && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold mb-2">
                            ⚠️ عميل خامل (منذ 30 يوم)
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 text-xs">{customer.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          <span>شحنات محافظة {customer.province}</span>
                        </div>
                      </div>
                      
                      {/* Action buttons on customer profile */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedInquiryId(customer.id);
                            setInquirySearchText(`${customer.name} (${customer.province}) - ${customer.phone}`);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2 py-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold text-[10px] transition-colors cursor-pointer"
                          title="استعلام تفصيلي للفواتير"
                        >
                          👁️ فواتيره
                        </button>
                        <button
                          onClick={() => handleStartEdit(customer)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="تعديل بيانات الزبون"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        {deleteConfirmId === customer.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onDeleteCustomer(customer.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
                              title="موافق، احذف"
                            >
                              تأكيد
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-[10px] transition-colors cursor-pointer border border-slate-200"
                              title="تراجع"
                            >
                              تراجع
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(customer.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="حذف زبون الجملة"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats Boxes */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 block leading-tight">طلبيات سابقة</span>
                          <span className="font-bold font-mono text-slate-800 text-[11px]">{stats.orderCount} طلبيات</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <div>
                          <span className="text-[10px] text-slate-400 block leading-tight">قيمة المشتريات</span>
                          <span className="font-bold font-mono text-emerald-700 text-[11px]">${stats.totalSpent.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Logistics and contact info */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-2 font-mono">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>رقم الاتصال: {customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>آخر فاتورة: {formatDateToShow(stats.lastOrderDate)}</span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
