/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Derive __dirname safely in both ES module (tsx dev) and CommonJS (esbuild prod) environments
const getAppDirname = () => {
  try {
    // If running in CommonJS, __dirname is already available as a global
    if (typeof __dirname !== 'undefined' && __dirname) {
      return __dirname;
    }
  } catch (e) {}

  try {
    // Hide import.meta.url from esbuild CJS parsing inside an eval block
    const metaUrl = eval('import.meta.url');
    if (metaUrl) {
      return path.dirname(fileURLToPath(metaUrl));
    }
  } catch (e) {}

  return process.cwd();
};

const __dirname = getAppDirname();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini Client initialization to prevent crashing on server startup when API key is not configured yet
let aiClient: any = null;

async function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please set it in Settings.');
    }
    // Dynamically import @google/genai to prevent ERR_REQUIRE_ESM in CommonJS production builds
    const genAIModule = await (eval('import("@google/genai")') as Promise<any>);
    const GoogleGenAIClass = genAIModule.GoogleGenAI;
    aiClient = new GoogleGenAIClass({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Server-side Gemini B2B Analysis API Endpoint
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { sales, purchases, expenses, inventory } = req.body;
    
    // Get the lazily initialized client safely
    const ai = await getAiClient();

    // Build the analysis context to prompt Gemini
    const prompt = `
أنت مستشار مالي ومحاسبي وخبير في سوق تجارة الألبسة وبيجامات الأطفال بالجملة (B2B) في سوريا.
يتوفر لديك البيانات التالية عن الشركة حالياً:

1. المخزون الحالي:
${JSON.stringify((inventory || []).slice(0, 40), null, 2)}

2. المبيعات الأخيرة:
${JSON.stringify((sales || []).slice(0, 30), null, 2)}

3. فواتير الوارد والمشتريات الأخيرة:
${JSON.stringify((purchases || []).slice(0, 30), null, 2)}

4. المصاريف والتشغيل:
${JSON.stringify((expenses || []).slice(0, 30), null, 2)}

يرجى تحليل هذه البيانات وتقديم تقرير محاسبي ذكي وتوصيات عملية باللغة العربية للتاجر السوري. يجب أن يحتوي التقرير على الأقسام التالية مع كتابتها بأسلوب مهني ومحاسبي دقيق ومقنع:

- **تحليل الربحية والمبيعات**: تقييم إجمالي للمبيعات والربح بالدولار مقارنة بالمصاريف.
- **توقعات ونمو المبيعات**: حساب نمو شهري تقريبي استناداً للبيانات، وتوقعات للفترة القادمة.
- **إدارة المخزون والتنبيهات**:
  - تنبيهات بالسرعة للأصناف منخفضة المخزون لتحذير التاجر من نفادها (تنبيه عند كمية أقل من 15).
  - تحديد الأصناف الأكثر طلباً وأسماء كوداتها.
  - تحديد الأصناف الراكدة (التي لم يُبع منها شيء أو مبيعاتها منخفضة جداً مقارنة مع الكمية المتوفرة) لاقتراح تخفيضات أو عروض عليها.
- **تقييم أداء الزبائن**:
  - تحديد الزبائن الأكثر شراءً لتقديرهم بعروض خاصة.
  - تنبيه بالزبائن الراكدين الذين لم يتم تسجيل طلبيات جديدة لهم بالفترة الأخيرة (أكثر من 30 يوماً).
- **توصيات تشغيلية ذكية**: نصائح مخصصة لرفع الأرباح وتقليل المصاريف وتفادي الخسائر الناتجة عن سعر الصرف والتضخم في سوريا.

يرجى إعطاء الإجابة بصيغة Markdown منسقة ومنظمة بشكل يسهل قراءته على الهاتف والمحمول والأنظمة اللوجستية.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      report: response.text,
    });
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء إجراء التحليل الذكي',
    });
  }
});

// Configure Vite and static assets
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('dist');

  if (!isProduction) {
    const { createServer } = await (eval('import("vite")') as Promise<any>);
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Determine build folder strictly, bypassing Electron issues related to process.cwd()
    const distPath = path.basename(__dirname) === 'dist' 
      ? __dirname 
      : path.join(__dirname, 'dist');
    
    console.log(`[Production] Static files path set to: ${distPath}`);
    
    // Defensive check to verify file existence and output useful logs on boot
    try {
      if (!fs.existsSync(distPath)) {
        console.error(`[CRITICAL ERROR] distPath directory does not exist: ${distPath}`);
      } else if (!fs.existsSync(path.join(distPath, 'index.html'))) {
        console.error(`[CRITICAL ERROR] index.html was not found inside: ${distPath}`);
      } else {
        console.log('[Success] Production static files directory and index.html successfully verified.');
      }
    } catch (fsErr: any) {
      console.error('[Warning] Failed to verify distPath existence defensively:', fsErr.message);
    }

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
