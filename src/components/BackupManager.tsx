/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Customer, Sale, Purchase, Expense } from '../types';
import { Database, Download, Upload, CheckCircle2, AlertTriangle, RefreshCw, Settings, Cloud, Code, Check, Github } from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  pushDataToSupabase,
  pullDataFromSupabase,
  SUPABASE_SQL_SCHEMA
} from '../supabaseClient';

interface BackupManagerProps {
  customers: Customer[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  onImportState: (data: {
    customers: Customer[];
    purchases: Purchase[];
    sales: Sale[];
    expenses: Expense[];
  }) => void;
}

export function BackupManager({
  customers,
  purchases,
  sales,
  expenses,
  onImportState
}: BackupManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Supabase connection state variables
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseCredentials().url);
  const [supabaseKey, setSupabaseKey] = useState(() => getSupabaseCredentials().key);
  const [isSyncingPush, setIsSyncingPush] = useState(false);
  const [isSyncingPull, setIsSyncingPull] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [autoSync, setAutoSync] = useState(() => {
    return localStorage.getItem('supabase_auto_sync') === 'true';
  });

  // GitHub connection state variables
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_backup_token') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('github_backup_repo') || '');
  const [githubPath, setGithubPath] = useState(() => localStorage.getItem('github_backup_path') || 'backups/erp_backup.json');
  const [githubBranch, setGithubBranch] = useState(() => localStorage.getItem('github_backup_branch') || 'main');
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        customers,
        purchases,
        sales,
        expenses
      }, null, 2);

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pajamas_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMsg('تم تصدير نسخة احتياطية من البيانات بنجاح!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('فشل تصدير البيانات. الرجاء المحاولة مجدداً.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (
          parsed &&
          Array.isArray(parsed.customers) &&
          Array.isArray(parsed.purchases) &&
          Array.isArray(parsed.sales) &&
          Array.isArray(parsed.expenses)
        ) {
          onImportState({
            customers: parsed.customers,
            purchases: parsed.purchases,
            sales: parsed.sales,
            expenses: parsed.expenses
          });
          setSuccessMsg('تم استيراد النسخة الاحتياطية وتحديث قواعد البيانات بنجاح!');
          setTimeout(() => setSuccessMsg(''), 4000);
        } else {
          setErrorMsg('صيغة الملف غير متوافقة أو تالفة. الرجاء للتأكد من بنية ملف ERP.');
          setTimeout(() => setErrorMsg(''), 4000);
        }
      } catch (err) {
        setErrorMsg('فشل قراءة الملف. يرجى التأكد من اختيار ملف JSON صحيح.');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Save changes to Supabase Config
  const handleSaveCredentials = () => {
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    // Reload the page or instantiating dynamically after updating localStorage
    try {
      setSuccessMsg('تم حفظ إعدادات الاتصال بـ Supabase Cloud بنجاح وتعيين النطاق النشط!');
      setTimeout(() => {
        setSuccessMsg('');
        window.location.reload(); // Refresh to re-initialize supabase client
      }, 1500);
    } catch (e) {
      setSuccessMsg('تم تحديث إعدادات سوبابيس للربط سحابياً!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Push LocalStorage data to Supabase table schema
  const handlePushToCloud = async () => {
    setIsSyncingPush(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await pushDataToSupabase(customers, purchases, sales, expenses);
      setSuccessMsg('🚀 تم رفع ومزامنة كافة السجلات بنجاح إلى قاعدة بيانات Supabase Cloud!');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء محاولة الرفع السحابي.');
    } finally {
      setIsSyncingPush(false);
    }
  };

  // Pull remote data from Supabase Cloud
  const handlePullFromCloud = async () => {
    setIsSyncingPull(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const data = await pullDataFromSupabase();
      onImportState(data);
      setSuccessMsg('📥 تمت بنجاح مزامنة وتنزيل جميع بياناتك من سحابة Supabase Cloud!');
      setTimeout(() => setSuccessMsg(''), 6500);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء جلب البيانات من السحابة.');
    } finally {
      setIsSyncingPull(false);
    }
  };

  // Copy Supabase SQL DDL Schema code to Clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleToggleAutoSync = () => {
    const newVal = !autoSync;
    setAutoSync(newVal);
    localStorage.setItem('supabase_auto_sync', String(newVal));
    if (newVal) {
      setSuccessMsg('تم تفعيل ميزة المزامنة السحابية الفورية عند أي عملية إدخال جديدة!');
    } else {
      setSuccessMsg('تم إلغاء تفعيل المزامنة التلقائية. يمكنك الضغط على "رفع السجلات" يدوياً.');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportToGithub = async () => {
    if (!githubToken || !githubRepo || !githubPath) {
      setErrorMsg('الرجاء إدخال رمز الوصول (Token)، اسم المستودع، ومسار الملف أولاً.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setIsSyncingGithub(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Save settings to localStorage
      localStorage.setItem('github_backup_token', githubToken);
      localStorage.setItem('github_backup_repo', githubRepo);
      localStorage.setItem('github_backup_path', githubPath);
      localStorage.setItem('github_backup_branch', githubBranch);

      // 2. Prepare data payload
      const dataStr = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        customers,
        purchases,
        sales,
        expenses
      }, null, 2);

      // 3. Encode content correctly with support for Arabic characters
      const toBase64 = (str: string) => {
        return btoa(unescape(encodeURIComponent(str)));
      };
      const base64Content = toBase64(dataStr);

      const repoClean = githubRepo.trim().replace(/\/$/, '');
      const pathClean = githubPath.trim().replace(/^\//, '');
      const branchClean = githubBranch.trim() || 'main';

      // 4. Check if file already exists to get its SHA (to overwrite/update)
      let existingSha = '';
      try {
        const checkRes = await fetch(`https://api.github.com/repos/${repoClean}/contents/${pathClean}?ref=${branchClean}`, {
          headers: {
            'Authorization': `token ${githubToken.trim()}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          existingSha = checkData.sha;
        }
      } catch (checkErr) {
        console.log('File does not exist or fetch error, creating new file.', checkErr);
      }

      // 5. Commit/Push to GitHub
      const commitRes = await fetch(`https://api.github.com/repos/${repoClean}/contents/${pathClean}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `تحديث النسخة الاحتياطية من نظام المحاسبة ريبلا كيدز - ${new Date().toLocaleDateString('ar-SY')}`,
          content: base64Content,
          sha: existingSha || undefined,
          branch: branchClean
        })
      });

      if (!commitRes.ok) {
        const errData = await commitRes.json();
        throw new Error(errData.message || 'فشلت عملية الرفع إلى GitHub. يرجى التحقق من صحة البيانات والرمز الصلاحي.');
      }

      setSuccessMsg(`🚀 تم تصدير النسخة الاحتياطية بنجاح إلى مستودع GitHub الخاص بك!\nالمسار: ${pathClean} على الفرع ${branchClean}`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تصدير الملف إلى GitHub. تأكد من اتصال الإنترنت وصلاحية الـ Token.');
      setTimeout(() => setErrorMsg(''), 6000);
    } finally {
      setIsSyncingGithub(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-205 p-6 shadow-xs max-w-4xl mx-auto space-y-8">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">إدارة قواعد البيانات والنسخ الاحتياطي</h2>
          <p className="text-xs text-slate-500">حماية وتأمين بيانات شركتك وحفظها واستعادتها بلمحة بصر</p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-800 rounded-xl mb-4 text-sm font-medium border border-emerald-100">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="whitespace-pre-wrap">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-800 rounded-xl mb-4 text-xs font-semibold leading-relaxed border border-rose-100">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="whitespace-pre-wrap">{errorMsg}</span>
        </div>
      )}

      {/* Grid of Local Data Sync */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-slate-550 border border-slate-200 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 mb-2 font-mono flex items-center gap-1.5 text-xs uppercase text-emerald-700">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-650" />
              أوفلاين بالكامل مع استقرار محلي
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              يعمل نظام المحاسبة هذا باعتماده كلياً على الذاكرة المحلية والآمنة لمتصفحك (**LocalStorage**). وهي مثالية للتجار في سوريا لمواجهة مشكلة تقطع الكهرباء والانترنت.
            </p>
            <ul className="list-disc pl-0 pr-4 mt-3 text-xs text-slate-500 space-y-1">
              <li>البيانات لا تضيع مع إغلاق المتصفح أو انقطاع الاتصال.</li>
              <li>نقوم بحفظ كل عملية بيع أو شراء فور إدخالها.</li>
              <li>للحفاظ على سلامة حساباتك دائماً، يرجى القيام بتحميل وتصدير نسخة احتياطية دورياً (مثلا نهاية كل يوم عمل).</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>الزبائن: {customers.length} زابونًا</span>
            <span>العمليات: {sales.length + purchases.length} حركة</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col justify-center gap-4">
          <div className="border border-slate-200 rounded-xl p-4 hover:border-emerald-200 transition-all flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm mb-1">حفظ نسخة احتياطية (تصدير)</h4>
              <p className="text-xs text-slate-500 font-medium">قم بتحميل ملف مشفر يحتوي على كافة التقارير المالية للشركة.</p>
            </div>
            <button
              id="export-backup-btn"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              تصدير البيانات
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-205 transition-all flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm mb-1">استرجاع نسخة احتياطية (استيراد)</h4>
              <p className="text-[11px] text-orange-600/95 font-semibold">⚠️ تحذير: استرجاع البيانات سيستبدل سجلاتك الحالية بالملف المستورد.</p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                id="import-backup-btn"
                onClick={triggerFileInput}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Upload className="h-4 w-4" />
                استيراد البيانات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Sync Section */}
      <div className="border-t border-slate-100 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">الربط والشبكة السحابية بـ Supabase Cloud</h3>
              <p className="text-xs text-slate-500">مزامنة البيانات بين الأجهزة وحفظها سحابياً بشكل فوري لتفادي فقدان البيانات</p>
            </div>
          </div>
          
          <button
            onClick={handleToggleAutoSync}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
              autoSync
                ? 'bg-teal-500 text-white border-teal-500 hover:bg-teal-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${autoSync ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
            <span>{autoSync ? 'ميزة المزامنة الفورية نشطة' : 'تفعيل المزامنة الفورية'}</span>
          </button>
        </div>

        {/* Content Box of Supabase Cloud Integration */}
        <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Col 1 & 2: Cloud Sync Actions & Credentials */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Sync Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1">
                  💡 إدارة رفع وتنزيل البيانات سحابياً
                </h4>
                <p className="text-xs text-slate-500">
                  يمكنك مزامنة قاعدة البيانات السحابية في Supabase بالكامل بضغطة زر واحدة.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePullFromCloud}
                  disabled={isSyncingPull}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isSyncingPull ? 'animate-spin' : ''}`} />
                  <span>{isSyncingPull ? 'جاري السحب...' : 'جلب من السحابة'}</span>
                </button>

                <button
                  onClick={handlePushToCloud}
                  disabled={isSyncingPush}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-650 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  <span>{isSyncingPush ? 'جاري الرفع...' : 'رفع السجلات'}</span>
                </button>
              </div>
            </div>

            {/* Connection settings input fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Settings className="h-4 w-4 text-slate-400" />
                  تفاصيل ربط وإعدادات سوبابيس (Supabase Cloud)
                </h4>
                <button 
                  onClick={() => {
                    setSupabaseUrl('https://dnbdrdgoxzazcdbpjeey.supabase.co');
                    setSupabaseKey('sb_publishable_Vgbo0oKER2rBjWWMoC-AlQ_9jGdibtj');
                  }}
                  className="text-[10px] text-teal-600 font-semibold hover:underline bg-transparent border-0 cursor-pointer"
                >
                  إعادة ضبط للمقاييس الافتراضية
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Supabase Project URL</label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    dir="ltr"
                    className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="https://your-project.supabase.co"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Supabase Anon Key (API key)</label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    dir="ltr"
                    className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="eyJhbGciOi..."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveCredentials}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
                >
                  حفظ وتطبيق إعدادات الاتصال
                </button>
              </div>
            </div>

          </div>

          {/* Col 3: SQL Script Generator */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                <Code className="h-4 w-4 text-teal-600" />
                تجهيز الجداول في سوبابيس (SQL Script)
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                لربط المزامنة بشكل دائم، يرجى تشغيل وتطبيق هذا الأكواد في تبويب **SQL Editor** داخل لوحة تحكم Supabase الخاصة بك لإنشاء جداول النظام الأربعة بنقاء:
              </p>

              <button
                onClick={handleCopySql}
                className="w-full flex items-center justify-center gap-1.5 py-1.5.5 rounded-lg border border-slate-200 hover:border-teal-200 hover:bg-teal-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer mb-2"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Database className="h-3.5 w-3.5 text-slate-400" />}
                <span>{copiedSql ? 'تم نسخ الأكواد!' : 'نسخ كود إنشاء الجداول'}</span>
              </button>

              <button
                onClick={() => setShowSql(!showSql)}
                className="w-full text-center text-[10px] text-slate-500 font-bold hover:text-slate-800 py-1 transition-colors cursor-pointer"
              >
                {showSql ? 'إخفاء الأكواد التفصيلية' : 'معاينة كود الـ SQL المكتوب'}
              </button>
            </div>

            {showSql && (
              <pre className="mt-2 p-2 bg-slate-900 text-white rounded-lg text-[9px] font-mono leading-normal overflow-auto max-h-40 text-left" dir="ltr">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            )}

            <div className="pt-3 border-t border-slate-100 text-[10px] leading-normal text-slate-400 font-medium">
              * بمجرد إقامة الجداول، يمكنك إدخال البيانات ومزامنتها بكل سلاسة وأريحية تامة.
            </div>
          </div>

        </div>
      </div>

      {/* GitHub Export Section */}
      <div className="border-t border-slate-100 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-900 text-white border border-slate-200">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">تصدير وحفظ النسخة الاحتياطية على GitHub</h3>
              <p className="text-xs text-slate-500">حفظ ملف البيانات الاحتياطي مباشرة في مستودع GitHub الخاص بك لتأمين ملفات المحاسبة</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">GitHub Personal Token (PAT)</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                dir="ltr"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Repository (اسم المستودع)</label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                dir="ltr"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="username/repo-name"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">File Path (مسار حفظ الملف)</label>
              <input
                type="text"
                value={githubPath}
                onChange={(e) => setGithubPath(e.target.value)}
                dir="ltr"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="backups/erp_backup.json"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Branch (الفرع)</label>
              <input
                type="text"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                dir="ltr"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="main"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
            <p className="text-[11px] text-slate-500 leading-normal max-w-xl">
              * يتم حفظ إعدادات GitHub محلياً وبشكل آمن في متصفحك فقط. تأكد من توفير صلاحيات <code className="font-mono bg-slate-200 px-1 rounded text-slate-800">repo</code> للـ Token لتتمكن من رفع وتحديث الملف بنجاح.
            </p>
            <button
              onClick={handleExportToGithub}
              disabled={isSyncingGithub}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Github className="h-4 w-4" />
              <span>{isSyncingGithub ? 'جاري الرفع إلى GitHub...' : 'تصدير وحفظ على GitHub'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

