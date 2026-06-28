/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sale } from '../types';
import { formatDateToShow } from '../utils';
import { Printer, Share2, LogOut, Download } from 'lucide-react';

interface InvoicePrintableProps {
  sale: Sale;
  onClose: () => void;
}

export function InvoicePrintable({ sale, onClose }: InvoicePrintableProps) {
  // Let's assume a unit cost calculation or price per piece
  const unitPrice = sale.quantity > 0 ? (sale.totalAmount / sale.quantity).toFixed(2) : '0.00';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTMLInvoice = () => {
    const renderHTMLItemsToPrint = () => {
      if (sale.items && sale.items.length > 0) {
        return sale.items.map(item => `
          <tr class="text-sm border-b border-slate-100">
            <td class="py-3 text-right font-semibold text-slate-900">
              ${item.category}
              <span class="inline-block mr-2 px-1.5 py-0.5 text-[9px] font-bold rounded ${item.gender === 'girls' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}">
                ${item.gender === 'girls' ? '👧 بناتي' : '👦 ولادي'}
              </span>
            </td>
            <td class="py-3 text-center font-mono text-xs font-bold uppercase tracking-wider">${item.productCode}</td>
            <td class="py-3 text-center font-mono text-slate-700">${item.quantity} قطعة</td>
            <td class="py-3 text-center font-mono text-slate-700">$${item.price.toFixed(2)}</td>
            <td class="py-3 text-left font-bold font-mono text-emerald-600">$${item.totalAmount.toFixed(2)}</td>
          </tr>
        `).join('');
      } else {
        return `
          <tr class="text-sm border-b border-slate-100">
            <td class="py-4 text-right font-semibold text-slate-900">${sale.category}</td>
            <td class="py-4 text-center font-mono text-xs font-bold uppercase tracking-wider">${sale.productCode}</td>
            <td class="py-4 text-center font-mono text-slate-700">${sale.quantity} قطعة</td>
            <td class="py-4 text-center font-mono text-slate-700">$${unitPrice}</td>
            <td class="py-4 text-left font-bold font-mono text-emerald-600">$${sale.totalAmount.toFixed(2)}</td>
          </tr>
        `;
      }
    };

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة مبيعات - ريبلا كيدز رقم ${sale.id}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;850;900&family=Inter:wght@450;600;700&display=swap');
    body {
      font-family: 'Cairo', 'Inter', sans-serif;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: white; color: black; }
      .print-shadow-none { box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body class="bg-slate-50 p-4 md:p-8 text-slate-800 antialiased">
  <div class="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-md border border-slate-200 relative print-shadow-none">
    
    <!-- Controls (Invisible during printing) -->
    <div class="flex flex-col gap-3 pb-6 border-b border-slate-100 mb-6 no-print">
      <div class="flex justify-between items-center w-full">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 class="font-bold text-slate-800 text-xs">تحميل الفاتورة PDF للمتصفح والجوال</h3>
        </div>
        <button onclick="window.print()" class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer border border-emerald-500 shadow-sm">
          🧾 طباعة مباشرة / حفظ PDF
        </button>
      </div>
      <div class="bg-emerald-50 border border-emerald-100/50 rounded-lg p-2.5 text-[11px] text-emerald-800 leading-relaxed">
        <strong>💡 لحفظ الفاتورة كملف PDF:</strong> انقر على زر "طباعة مباشرة" أعلاه، ثم من خيار الوجهة (Destination) اختر <strong>(حفظ بالصيغة بتنسيق PDF أو Save as PDF)</strong> لحفظ فاتورة ريبلا كيدز على جهازك فوراً.
      </div>
    </div>

    <!-- Invoice Header -->
    <div class="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-200">
      <div>
        <h1 class="text-xl font-black text-emerald-800 tracking-tight mb-1">ريبلا كيدز للألبسة ومبيعات الجملة</h1>
        <p class="text-xs text-slate-500">حلب، سوريا</p>
      </div>
      <div class="text-left font-mono">
        <div class="text-md font-bold text-slate-700">فاتورة مبيعات</div>
        <div class="text-xs text-slate-500">الرقم: ${sale.id}</div>
        <div class="text-xs text-slate-500">التاريخ: ${formatDateToShow(sale.date)}</div>
      </div>
    </div>

    <!-- Customer Details -->
    <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-6">
      <div>
        <span class="text-xs text-slate-500 block mb-0.5">الجهة المستلمة (الزبون):</span>
        <span class="font-bold text-slate-900 block text-sm">${sale.customerName}</span>
        <span class="text-xs text-slate-650 block">${sale.customerPhone}</span>
      </div>
      <div>
        <span class="text-xs text-slate-500 block mb-0.5">منطقة الشحن والتسليم:</span>
        <span class="font-semibold text-slate-900 block text-sm">محافظة ${sale.province}</span>
        <span class="text-xs text-slate-650 block">شحن بري لوجستي</span>
      </div>
    </div>

    <!-- Items Table -->
    <div class="overflow-x-auto mb-6">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr class="border-b border-slate-300 text-slate-500 text-xs">
            <th class="pb-3 pt-1 font-semibold text-right">الصنف</th>
            <th class="pb-3 pt-1 font-semibold text-center">كود الصنف</th>
            <th class="pb-3 pt-1 font-semibold text-center">الكمية</th>
            <th class="pb-3 pt-1 font-semibold text-center">سعر المبيع فردي</th>
            <th class="pb-3 pt-1 font-semibold text-left">الإجمالي ($)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${renderHTMLItemsToPrint()}
        </tbody>
      </table>
    </div>

    <!-- Totals & Notes -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-200">
      <div>
        <span class="text-xs text-slate-500 block mb-1">شروط الدفع والتسليم:</span>
        <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">${sale.notes || 'لا يوجد ملاحظات إضافية على الفاتورة الحالية.'}</p>
      </div>
      <div class="flex flex-col items-end justify-center">
        <div class="w-full max-w-xs space-y-2">
          <div class="flex justify-between text-xs text-slate-500">
            <span>المجموع الفرعي:</span>
            <span class="font-mono">$${sale.totalAmount.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-xs text-slate-500">
            <span>الضرائب والجمارك:</span>
            <span class="font-mono">$0.00</span>
          </div>
          <div class="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-lg text-slate-950">
            <span>المجموع النهائي:</span>
            <span class="text-emerald-600 font-mono font-black">$${sale.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer message -->
    <div class="mt-12 text-center text-xs text-slate-400 border-t border-dashed border-slate-200 pt-6">
      <p>© ريبلا كيدز للتجارة والصناعة. شكرًا لتعاملكم معنا!</p>
    </div>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `فاتورة_ريبلا_كيدز_رقم_${sale.id.slice(-5)}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWhatsAppShareLink = () => {
    const text = `🧾 *فاتورة مبيعات بالجملة - ريبلا كيدز ERP*
---------------------------------------
*رقم الفاتورة:* ${sale.id}
*التاريخ:* ${formatDateToShow(sale.date)}
*الزبون:* ${sale.customerName}
*الهاتف:* ${sale.customerPhone}
*المحافظة:* ${sale.province}
---------------------------------------
*التفاصيل:*
${sale.items && sale.items.length > 0 
  ? sale.items.map(item => `- *${item.category} (${item.productCode})*: ${item.quantity} قطعة × $${item.price.toFixed(1)}`).join('\n')
  : `- *الصنف:* ${sale.category}\n- *كود الصنف:* ${sale.productCode}\n- *الكمية:* ${sale.quantity} قطعة\n- *السعر الإفرادي:* $${unitPrice}`
}
---------------------------------------
*المبلغ الإجمالي:* $${sale.totalAmount}
*ملاحظات:* ${sale.notes || 'لا يوجد'}

شكراً لتعاملكم معنا! 🌸`;

    return `https://api.whatsapp.com/send?phone=${sale.customerPhone.replace(/^0/, '+963')}&text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 md:p-8 border border-slate-100 relative print-shadow-none print:p-0 print:absolute print:inset-0">
        
        {/* Actions Controls (hidden on print) */}
        <div className="flex flex-col gap-3 pb-6 border-b border-slate-100 mb-6 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="font-semibold text-slate-850">فاتورة زبون جاهزة للتصدير</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="download-pdf-fallback-btn"
                onClick={handleDownloadHTMLInvoice}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer border border-emerald-500 shadow-xs"
                title="تنزيل الفاتورة كملف PDF مستقل - متوافق مع الموبايل وإطارات الويب"
              >
                <Download className="h-4 w-4 animate-bounce" />
                تحميل ملف PDF المباشر 📥
              </button>
              <button
                id="print-invoice-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-205 text-slate-705 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                title="طباعة عبر المتصفح مباشرة (تعمل بشكل ممتاز عند فتح التطبيق بعلامة تبويب منفصلة)"
              >
                <Printer className="h-4 w-4" />
                طباعة سريعة 🖨️
              </button>
              <a
                id="whatsapp-share-btn"
                href={getWhatsAppShareLink()}
                target="_blank"
                rel="noopener referrer"
                referrerPolicy="no-referrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors border border-slate-950 shadow-xs"
              >
                <Share2 className="h-4 w-4" />
                واتساب
              </a>
              <button
                id="close-invoice-btn"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-205 text-slate-705 text-xs font-bold transition-all cursor-pointer border border-slate-250"
              >
                <LogOut className="h-4 w-4" />
                إغلاق
              </button>
            </div>
          </div>
          
          {/* Guide helper for PDF output */}
          <div className="bg-emerald-50/70 border border-emerald-100/55 rounded-lg p-3 text-[11px] text-emerald-850 flex items-start gap-2 leading-relaxed">
            <span className="text-sm">💡</span>
            <p>
              <strong>حل مشكلة تحميل الـ PDF في المعاينة:</strong> اضغط على الزر الأخضر المضيء <strong>"تحميل ملف PDF المباشر 📥"</strong> لتنزيل الفاتورة كملف تفاعلي مخصص على جهازك. عند فتحه، ستقوم طابعة متصفحك تلقائياً بحفظه كـ PDF عربي عالي الدقة دون تفكّك الحروف أو تأثّره بالحظر!
            </p>
          </div>
        </div>

        {/* Invoice Body (styled for elegant high contrast print) */}
        <div className="text-slate-800 print:text-black">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-200">
            <div>
              <h1 className="text-xl font-bold text-emerald-800 tracking-tight mb-1">ريبلا كيدز للألبسة ومبيعات الجملة</h1>
              <p className="text-xs text-slate-500 print:text-slate-600">حلب، سوريا</p>
            </div>
            <div className="text-left font-mono">
              <div className="text-md font-bold text-slate-700 print:text-black">فاتورة مبيعات</div>
              <div className="text-xs text-slate-500">الرقم: {sale.id}</div>
              <div className="text-xs text-slate-500">التاريخ: {formatDateToShow(sale.date)}</div>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-6 print:bg-white print:border print:border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">الجهة المستلمة (الزبون):</span>
              <span className="font-bold text-slate-900 block text-sm">{sale.customerName}</span>
              <span className="text-xs text-slate-600 block">{sale.customerPhone}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">منطقة الشحن والتسليم:</span>
              <span className="font-semibold text-slate-900 block text-sm">محافظة {sale.province}</span>
              <span className="text-xs text-slate-600 block">شحن بري لوجستي</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-xs">
                  <th className="pb-3 pt-1 font-semibold text-right">الصنف والنوع</th>
                  <th className="pb-3 pt-1 font-semibold text-center">كود الصنف</th>
                  <th className="pb-3 pt-1 font-semibold text-center">الكمية (قطعة)</th>
                  <th className="pb-3 pt-1 font-semibold text-center">سعر المبيع بالدولار</th>
                  <th className="pb-3 pt-1 font-semibold text-left">الإجمالي ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item, idx) => (
                    <tr key={idx} className="text-sm">
                      <td className="py-3 font-semibold text-slate-900">
                        {item.category}
                        <span className={`mr-2 px-1 text-[9px] font-bold rounded ${item.gender === 'girls' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                          {item.gender === 'girls' ? '👧 بناتي' : '👦 ولادي'}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono text-xs font-bold uppercase tracking-wider">{item.productCode}</td>
                      <td className="py-3 text-center font-mono text-slate-700">{item.quantity} قطعة</td>
                      <td className="py-3 text-center font-mono text-slate-700">${item.price.toFixed(2)}</td>
                      <td className="py-3 text-left font-bold font-mono text-emerald-600">${item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="text-sm">
                    <td className="py-4 font-semibold text-slate-900">{sale.category}</td>
                    <td className="py-4 text-center font-mono text-xs uppercase tracking-wider">{sale.productCode}</td>
                    <td className="py-4 text-center font-mono text-slate-700">{sale.quantity} قطعة</td>
                    <td className="py-4 text-center font-mono text-slate-700">${unitPrice}</td>
                    <td className="py-4 text-left font-bold font-mono text-emerald-600">${sale.totalAmount.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block mb-1">شروط الدفع والتسليم:</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg print:p-0 print:bg-white">{sale.notes || 'لا يوجد ملاحظات إضافية على الفاتورة الحالية.'}</p>
            </div>
            <div className="flex flex-col items-end justify-center">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono">${sale.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>الضرائب والجمارك:</span>
                  <span className="font-mono">$0.00</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-lg text-slate-900">
                  <span>المجموع النهائي:</span>
                  <span className="text-emerald-600 font-mono">${sale.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer message */}
          <div className="mt-12 text-center text-xs text-slate-400 border-t border-dashed border-slate-200 pt-6">
            <p>© ريبلا كيدز للتجارة والصناعة. شكرًا لتعاملكم معنا!</p>
          </div>
        </div>

      </div>
    </div>
  );
}
