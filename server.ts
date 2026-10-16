import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Ensure data directory exists for persistent configuration
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create data dir:', e);
  }
}

const CONFIG_FILE = path.resolve(DATA_DIR, 'ai-engine-config.json');
const FAILOVER_FILE = path.resolve(DATA_DIR, 'ai-failover-history.json');
const PRODUCTS_FILE = path.resolve(DATA_DIR, 'products.json');
const PROMPTS_FILE = path.resolve(DATA_DIR, 'prompts.json');
const FORBIDDEN_FILE = path.resolve(DATA_DIR, 'forbidden.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');

// Memory storage for persistent data (keeping these for now to avoid breaking existing code, but they will be synced with DB)
let products: any[] = [];
let prompts: any[] = [];
let forbiddenRule: any = {
  id: 'forbidden-rules-default',
  isActive: true,
  forbiddenWords: ['تحضير', 'التحضير', 'علاج الأمراض', 'دواء شافي'],
  guidelines: '',
};
let settings: any = {
  logoConfig: null,
  welcomeSettings: null,
  categories: [],
  pwaSettings: null,
  sharingSettings: {
    shareMessage: 'جرب المستشار الذكي هيربولايف! سيساعدك في الوصول لأهدافك الصحية.',
    shortLink: '',
    buttonTitle: 'إهداء المستشار لصديق',
    shareImageUrl: null
  }
};

// --- Database Setup Placeholder ---
// We will transition to Cloud SQL (PostgreSQL) for relational data persistence.
async function initDb() {
  console.log('[DB] Preparing for Cloud SQL transition...');
}

initDb().catch(err => console.error('[DB] Failed to initialize:', err));

// ... existing code ...

// API ENDPOINTS

// 0. Dynamic PWA Manifest
app.get('/manifest.json', (_req: Request, res: Response) => {
  const pwa = settings.pwaSettings || {};
  res.json({
    id: '/',
    name: 'المستشار الذكي هيربولايف',
    short_name: 'هيربولايف',
    description: 'نظام الاستشارات الذكي المعتمد من هيربولايف للإقناع والمبيعات.',
    theme_color: '#00873D',
    background_color: '#FFFFFF',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: pwa.appIconUrl || '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: pwa.appIconUrl || '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: pwa.appIconUrl || '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  });
});

// Helper to load/save JSON
function loadJson(file: string, fallback: any) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.warn(`Could not read ${file}:`, e);
  }
  return fallback;
}

function saveJson(file: string, data: any): boolean {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`Could not save ${file}:`, e);
    return false;
  }
}

// Initial load
products = loadJson(PRODUCTS_FILE, []);
prompts = loadJson(PROMPTS_FILE, []);
forbiddenRule = loadJson(FORBIDDEN_FILE, forbiddenRule);
settings = loadJson(SETTINGS_FILE, settings);

// Helper to detect API keys and environment variable names
function getGeminiKey(): { key: string | null; envName: string | null } {
  const explicit = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_KEY'];
  for (const name of explicit) {
    if (process.env[name] && process.env[name]!.trim()) {
      return { key: process.env[name]!.trim(), envName: name };
    }
  }
  for (const k of Object.keys(process.env)) {
    if (/^(gemini_api|google_api)/i.test(k) && process.env[k]?.trim()) {
      return { key: process.env[k]!.trim(), envName: k };
    }
  }
  return { key: null, envName: null };
}

function getDeepSeekKey(): { key: string | null; envName: string | null } {
  const explicit = [
    'DEEP_API_KEY',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_KEY',
    'DEEP_SEEK_API_KEY',
    'DEEPSEEK_TOKEN',
    'DEEPSEEK_SECRET',
    'DEEP_SEEK_KEY',
  ];
  for (const name of explicit) {
    if (process.env[name] && process.env[name]!.trim()) {
      return { key: process.env[name]!.trim(), envName: name };
    }
  }
  for (const k of Object.keys(process.env)) {
    if (/^(deepseek|deep_seek|deep_api)/i.test(k) && process.env[k]?.trim()) {
      return { key: process.env[k]!.trim(), envName: k };
    }
  }
  return { key: null, envName: null };
}

function getAisaKey(): { key: string | null; envName: string | null } {
  const explicit = ['AISA_API_KEY', 'AISA_KEY', 'AISA_TOKEN'];
  for (const name of explicit) {
    if (process.env[name] && process.env[name]!.trim()) {
      return { key: process.env[name]!.trim(), envName: name };
    }
  }
  for (const k of Object.keys(process.env)) {
    if (/^aisa/i.test(k) && process.env[k]?.trim()) {
      return { key: process.env[k]!.trim(), envName: k };
    }
  }
  return { key: null, envName: null };
}

type AIProviderId = 'gemini' | 'deepseek' | 'aisa';

// Default Configuration: Prefer DeepSeek if key is present, else Gemini
interface EngineConfig {
  primaryProvider: AIProviderId;
  autoFailover: boolean;
  failoverOrder: AIProviderId[];
  disabledProviders: AIProviderId[];
  models: {
    gemini: string;
    deepseek: string;
    aisa: string;
  };
}

let engineConfig: EngineConfig = {
  primaryProvider: getDeepSeekKey().key ? 'deepseek' : 'gemini',
  autoFailover: true,
  failoverOrder: ['deepseek', 'gemini', 'aisa'],
  disabledProviders: [],
  models: {
    gemini: 'gemini-2.5-flash',
    deepseek: 'deepseek-chat',
    aisa: 'gpt-4o-mini',
  },
};

// Load saved config if exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    engineConfig = { ...engineConfig, ...parsed };
  }
} catch (e) {
  console.warn('Could not read ai-engine-config.json:', e);
}

function saveEngineConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(engineConfig, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save ai-engine-config.json:', e);
  }
}

// Failover Incident Tracking
interface FailoverIncident {
  id: string;
  timestamp: number;
  originalProvider: 'gemini' | 'deepseek' | 'aisa';
  fallbackProvider: 'gemini' | 'deepseek' | 'aisa';
  reason: string;
  resolved: boolean;
}

let activeFailoverIncident: FailoverIncident | null = null;
let failoverHistory: FailoverIncident[] = [];

try {
  if (fs.existsSync(FAILOVER_FILE)) {
    const raw = fs.readFileSync(FAILOVER_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.activeIncident) activeFailoverIncident = parsed.activeIncident;
    if (Array.isArray(parsed.history)) failoverHistory = parsed.history;
  }
} catch (e) {
  console.warn('Could not read failover history:', e);
}

function saveFailoverState() {
  try {
    fs.writeFileSync(
      FAILOVER_FILE,
      JSON.stringify(
        {
          activeIncident: activeFailoverIncident,
          history: failoverHistory.slice(-30),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (e) {
    console.warn('Could not save failover history:', e);
  }
}

// Provider Call Implementations

async function callGemini(
  messages: { role: string; content: string; imageUrl?: string }[],
  systemInstruction?: string,
  modelName: string = 'gemini-3.8-flash'
): Promise<{ text: string }> {
  const { key } = getGeminiKey();
  if (!key) {
    throw new Error('مفتاح Gemini API غير مهيأ في متغيرات البيئة (GEMINI_API_KEY)');
  }

  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const contents = messages.map((m: any) => {
    const parts: any[] = [];
    if (m.content) parts.push({ text: m.content });
    if (m.imageUrl) {
      // imageUrl should be a base64 string "data:image/png;base64,..."
      const match = m.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
    return {
      role: m.role === 'assistant' ? 'model' : m.role,
      parts,
    };
  });

  const candidateModels = [modelName, 'gemini-3.8-flash', 'gemini-3.1-pro-preview'].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  let lastErr: any = null;
  for (const m of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents,
        config: {
          systemInstruction:
            systemInstruction || 'أنت مستشار هيربولايف الذكي وخبير التغذية ونمط الحياة الصحي.',
          temperature: 0.7,
        },
      });

      if (response.text) {
        return { text: response.text };
      }
    } catch (err: any) {
      lastErr = err;
      const errMsg = err?.message || String(err);
      if (errMsg.includes('ResourceExhausted') || errMsg.includes('quota') || errMsg.includes('429')) {
        throw new Error('نفاد الحصة أو الرصيد في Google Gemini (Quota Exceeded / 429)');
      }
      console.warn(`Gemini model ${m} failed:`, errMsg);
      continue;
    }
  }

  throw lastErr || new Error('فشلت جميع نماذج Gemini في توليد الرد');
}

async function callDeepSeek(
  messages: { role: string; content: string }[],
  systemInstruction?: string,
  modelName: string = 'deepseek-chat'
): Promise<{ text: string }> {
  const { key } = getDeepSeekKey();
  if (!key) {
    throw new Error('مفتاح DeepSeek API غير مهيأ في متغيرات البيئة (DEEP_API_KEY أو DEEPSEEK_API_KEY)');
  }

  const formattedMessages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  for (const m of messages) {
    formattedMessages.push({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName || 'deepseek-chat',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errDetail = data?.error?.message || JSON.stringify(data);
      if (res.status === 402 || errDetail.toLowerCase().includes('balance') || errDetail.toLowerCase().includes('insufficient')) {
        throw new Error('نفاد الرصيد المالي في حساب DeepSeek (Insufficient Balance / 402)');
      }
      if (res.status === 401) {
        throw new Error('مفتاح DeepSeek API غير مصرح به أو منتهي الصلاحية (401 Unauthorized)');
      }
      if (res.status === 429) {
        throw new Error('تجاوز حد الطلبات المسموح في DeepSeek (Rate Limit / 429)');
      }
      throw new Error(`خطأ DeepSeek (${res.status}): ${errDetail}`);
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error('لم يتم استلام محتوى صالح من DeepSeek');
    }

    return { text: reply };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة انتظار استجابة خوادم DeepSeek (Timeout)');
    }
    throw err;
  }
}

async function callAisa(
  messages: { role: string; content: string }[],
  systemInstruction?: string,
  modelName: string = 'gpt-4o-mini'
): Promise<{ text: string }> {
  const { key } = getAisaKey();
  if (!key) {
    throw new Error('مفتاح AISA API غير مهيأ في متغيرات البيئة (AISA_API_KEY)');
  }

  const formattedMessages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  for (const m of messages) {
    formattedMessages.push({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch('https://api.aisa.one/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName || 'gpt-4o-mini',
        messages: formattedMessages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errDetail = data?.error?.message || JSON.stringify(data);
      if (res.status === 401) {
        throw new Error('مفتاح AISA API غير صالح أو غير مصرح به (401 Unauthorized)');
      }
      if (res.status === 402 || errDetail.toLowerCase().includes('quota') || errDetail.toLowerCase().includes('balance')) {
        throw new Error('نفاد رصيد حساب AISA المالي (Insufficient Quota / 402)');
      }
      throw new Error(`خطأ AISA (${res.status}): ${errDetail}`);
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error('لم يتم استلام محتوى صالح من AISA');
    }

    return { text: reply };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة انتظار استجابة خوادم AISA (Timeout)');
    }
    throw err;
  }
}

// Router dispatcher for a single provider
async function callProvider(
  provider: 'gemini' | 'deepseek' | 'aisa',
  messages: { role: string; content: string }[],
  systemInstruction?: string
): Promise<{ text: string }> {
  switch (provider) {
    case 'gemini':
      return callGemini(messages, systemInstruction, engineConfig.models.gemini);
    case 'deepseek':
      return callDeepSeek(messages, systemInstruction, engineConfig.models.deepseek);
    case 'aisa':
      return callAisa(messages, systemInstruction, engineConfig.models.aisa);
    default:
      throw new Error(`مزود ذكاء اصطناعي غير مدعوم: ${provider}`);
  }
}

// --- SAFETY & PRIVACY GUARDRAILS ---
const TECHNICAL_LEAK_PHRASES = [
  'systeminstruction',
  'prompttext',
  'neuromarketingconcept',
  'أنا نموذج ذكاء اصطناعي',
  'بصفتي ذكاء اصطناعي',
  'بصفتي نموذج لغوي',
  'as an ai language model',
  'as an ai',
  'i am an ai',
  'أنا برنامج حاسوبي',
  'أنا روبوت',
];

function sanitizeAIOutput(text: string): string {
  let sanitized = text;
  const lowerText = text.toLowerCase();
  
  // Check for identity leaks (like "as an ai model")
  const foundLeak = TECHNICAL_LEAK_PHRASES.some((key) => 
    lowerText.includes(key.toLowerCase())
  );

  if (foundLeak) {
    console.warn('[Safety Monitor] Technical leak detected and sanitized.');
    // Remove robotic self-introductions if present
    sanitized = sanitized.replace(/(?:بصفتي نموذج ذكاء اصطناعي|أنا نموذج ذكاء اصطناعي|بصفتي ذكاء اصطناعي|as an ai language model|as an ai)[,،.]?\s*/gi, '');
  }

  return sanitized;
}

const GLOBAL_PRIVACY_INSTRUCTION = `
🔒 إشعار أمني وإرشادات جودة الرد والارتباط بقاعدة المعرفة: 
1. الارتباط الوثيق بقاعدة المعرفة (KB): لديك وصول كامل وشامل لكافة البيانات والمعلومات والمستندات والدليل المعرفي للمنتجات والأسئلة الشائعة وطريقة الاستخدام والفيديوهات المرفقة في قاعدة المعرفة. أجب مباشرة وبدقة عن استفسارات العميل بناءً على هذه البيانات الموثوقة دون إنكار أو تجاهل لها.
2. منع كشف الهوية والأسماء التقنية: يُمنع منعاً باتاً ذكر اسمك البرمجي (Gemini, DeepSeek, etc.) أو أي مصطلحات برمجية. تصرف دائماً كبشر (مستشار خبير متخصص في المنتجات الصحية المعتمدة) ولا تلمح لكونك ذكاء اصطناعي تحت أي ظرف.
3. منع التكرار والنمطية (Anti-AI Slop): 
   - ممنوع تماماً استخدام عبارات روبوتية مثل "أفهمك"، "أتفهم رغبتك"، "أنا هنا لمساعدتك"، "بناءً على طلبك" في بداية الحوار.
   - ادخل في صلب الموضوع مباشرة كشخص خبير حقيقي يتحدث مع عميل مهتم.
4. سرية المستندات والبيانات: استفد من محتوى المستندات والأبحاث والأسئلة الشائعة للإجابة عن الأسئلة بدقة، دون عرض المستندات كملفات خام للتحميل.
5. مقاطع الفيديو والتشغيل المباشر: عندما يطلب العميل فيديو أو يسأل عن طريقة الاستخدام أو يرغب في رؤية مقطع توضيحي، ضع فوراً الوسم [RECOMMEND_VIDEO: video_id] المناسب ليعرض له النظام مشغل الفيديو التفاعلي فوراً.
6. دقة النية والتدرج الطبيعي (Intent Precision): أجب بدقة على قدر سؤال العميل واحتياجه الفعلي دون استباق، واذكر الأسعار فقط عند السؤال عنها أو طلب الشراء.
`;

// API ENDPOINTS

// 1. Get status of all AI providers and current configuration
app.get('/api/ai-providers/status', async (_req: Request, res: Response) => {
  const geminiKey = getGeminiKey();
  const deepSeekKey = getDeepSeekKey();
  const aisaKey = getAisaKey();

  const providers = [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      arabicName: 'ديب سيك',
      company: 'DeepSeek AI',
      description: 'محرك فائق الذكاء وسريع الاستجابة ومتفوق في المحادثات العربية المعقدة والإقناع.',
      isConfigured: !!deepSeekKey.key,
      envKeyFound: deepSeekKey.envName,
      supportedModels: ['deepseek-chat', 'deepseek-reasoner'],
      activeModel: engineConfig.models.deepseek || 'deepseek-chat',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      arabicName: 'جيميناي',
      company: 'Google DeepMind',
      description: 'محرك جوجل المتطور، فائق السرعة، ومعتمد في معالجة الاستفسارات الصحية والغذائية.',
      isConfigured: !!geminiKey.key,
      envKeyFound: geminiKey.envName,
      supportedModels: ['gemini-2.5-flash', 'gemini-3.8-flash'],
      activeModel: engineConfig.models.gemini || 'gemini-2.5-flash',
    },
    {
      id: 'aisa',
      name: 'AISA Unified',
      arabicName: 'أيسا (AISA.one)',
      company: 'AISA One Gateway',
      description: 'بوابة موحدة تمنحك الوصول لأكثر من 100 نموذج (Kimi, Qwen, GPT-4o, Claude 3.5) بمفتاح واحد.',
      isConfigured: !!aisaKey.key,
      envKeyFound: aisaKey.envName,
      supportedModels: [
        'gpt-6-astra',
        'gpt-5.6-luna',
        'gpt-4o',
        'gpt-4o-mini',
        'claude-opus-5-5',
        'claude-sonnet-5-5',
        'claude-haiku-4-5-20251001',
        'gemini-3.5-flash',
        'deepseek-v4.1-flash',
        'deepseek-v4-pro',
        'deepseek-r1',
        'deepseek-v3.2',
        'kimi-k3',
        'kimi-k2.6',
        'qwen3.8-max',
        'qwen3.7-plus',
        'qwen3-coder-plus',
        'seed-2-0-pro-260328',
        'glm-5.3',
        'MiniMax-M3',
        'step-3.7-flash',
      ],
      activeModel: engineConfig.models.aisa || 'gpt-4o-mini',
    },
  ];

  res.json({
    config: engineConfig,
    providers,
    activeFailover: activeFailoverIncident,
    failoverHistory: failoverHistory.slice(-10),
  });
});

// --- AUTHENTICATION ROUTES ---

// Simple session store (in-memory for this applet)
const sessions: Record<string, { userId: number; email: string; role: string }> = {};

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    return;
  }

  try {
    // const user = await dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);
    const user: any = email === 'ameer4muk@gmail.com' ? { id: 1, email, password: await bcrypt.hash('771857157%', 10), role: 'admin' } : null;
    if (!user) {
      res.status(401).json({ error: 'بيانات الاعتماد غير صالحة' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'بيانات الاعتماد غير صالحة' });
      return;
    }

    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessions[sessionId] = { userId: user.id, email: user.email, role: user.role };

    res.json({ success: true, sessionId, user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم أثناء تسجيل الدخول' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  const session = sessions[sessionId];
  if (!session) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }
  res.json({ user: session });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) delete sessions[sessionId];
  res.json({ success: true });
});

app.get('/api/auth/users', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessions[sessionId]) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  try {
    // const users = await dbAll('SELECT id, email, role, recovery_email FROM users');
    const users: any[] = [];
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب المستخدمين' });
  }
});

app.post('/api/auth/users', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessions[sessionId]) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  const { email, password, role = 'admin', recovery_email } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // await dbRun('INSERT INTO users (email, password, role, recovery_email) VALUES (?, ?, ?, ?)', [email, hashedPassword, role, recovery_email]);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'البريد الإلكتروني موجود بالفعل' });
    } else {
      res.status(500).json({ error: 'خطأ في إنشاء المستخدم' });
    }
  }
});

app.delete('/api/auth/users/:id', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessions[sessionId]) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  const { id } = req.params;
  try {
    // await dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف المستخدم' });
  }
});

app.post('/api/auth/change-password', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  const session = sessions[sessionId];
  if (!session) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, session.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تغيير كلمة المرور' });
  }
});

app.post('/api/auth/setup-totp', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  const session = sessions[sessionId];
  if (!session) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  const secret = generateSecret();
  const otpauth = generateURI({ secret, label: session.email, issuer: 'Herbalife Smart Admin' });
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    // await dbRun('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, session.userId]);
    res.json({ success: true, secret, qrCodeDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إعداد TOTP' });
  }
});

app.post('/api/auth/verify-totp', async (req: Request, res: Response) => {
  const { email, token } = req.body;
  try {
    // const user = await dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);
    const user: any = null; // Mock
    if (!user || !user.totp_secret) {
      res.status(400).json({ error: 'لم يتم إعداد المصادقة الثنائية لهذا الحساب' });
      return;
    }

    const isValid = verifySync({ token, secret: user.totp_secret });
    if (!isValid) {
      res.status(400).json({ error: 'رمز المصادقة غير صحيح' });
      return;
    }

    // Return a temporary reset token or just allow resetting now
    const resetSessionId = Math.random().toString(36).substring(2) + 'reset';
    sessions[resetSessionId] = { userId: user.id, email: user.email, role: 'reset_pending' };
    
    res.json({ success: true, resetSessionId });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التحقق من الرمز' });
  }
});

// 2. Test a specific provider live with latency measurement
app.post('/api/ai-providers/test', async (req: Request, res: Response) => {
  const { provider, model } = req.body;
  if (!provider || !['gemini', 'deepseek', 'aisa'].includes(provider)) {
    res.status(400).json({ error: 'المزود غير محدد أو غير صالح' });
    return;
  }

  const startTime = Date.now();
  const testMessages = [{ role: 'user', content: 'مرحباً، أجب في 3 كلمات فقط للتأكد من الاتصال.' }];

  try {
    let result: { text: string };
    if (provider === 'gemini') {
      result = await callGemini(testMessages, 'أنت نظام اختبار.', model || engineConfig.models.gemini);
    } else if (provider === 'deepseek') {
      result = await callDeepSeek(testMessages, 'أنت نظام اختبار.', model || engineConfig.models.deepseek);
    } else {
      result = await callAisa(testMessages, 'أنت نظام اختبار.', model || engineConfig.models.aisa);
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      provider,
      latencyMs,
      reply: result.text.trim(),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err?.message || 'فشل الاتصال بالمحرك';
    res.status(200).json({
      success: false,
      provider,
      latencyMs,
      error: errorMsg,
    });
  }
});

// 3. Save engine configuration (active engine, autoFailover, priority order, models)
app.post('/api/ai-providers/config', (req: Request, res: Response) => {
  const { primaryProvider, autoFailover, failoverOrder, models } = req.body;

  if (primaryProvider && ['gemini', 'deepseek', 'aisa'].includes(primaryProvider)) {
    engineConfig.primaryProvider = primaryProvider;
  }

  if (typeof autoFailover === 'boolean') {
    engineConfig.autoFailover = autoFailover;
  }

  if (Array.isArray(failoverOrder)) {
    engineConfig.failoverOrder = failoverOrder.filter((p) =>
      ['gemini', 'deepseek', 'aisa'].includes(p)
    );
  }

  if (models && typeof models === 'object') {
    engineConfig.models = { ...engineConfig.models, ...models };
  }

  saveEngineConfig();

  res.json({
    success: true,
    message: 'تم حفظ إعدادات محركات الذكاء الاصطناعي بنجاح',
    config: engineConfig,
  });
});

// 4. Resolve/Acknowledge failover incident alert
app.post('/api/ai-providers/resolve-failover', (_req: Request, res: Response) => {
  if (activeFailoverIncident) {
    activeFailoverIncident.resolved = true;
    activeFailoverIncident = null;
    saveFailoverState();
  }
  res.json({ success: true, message: 'تمت تسوية وتأكيد حالة التحويل' });
});

// 4.1. Simulate Failover for testing and demonstration
app.post('/api/ai-providers/simulate-failover', (req: Request, res: Response) => {
  const {
    originalProvider = engineConfig.primaryProvider,
    fallbackProvider = engineConfig.primaryProvider === 'deepseek' ? 'gemini' : 'deepseek',
    reason = 'محاكاة اختبارية: نفاد الرصيد المالي في المحرك المختار (402 Insufficient Balance / Quota Exceeded)',
  } = req.body;

  activeFailoverIncident = {
    id: `sim-failover-${Date.now()}`,
    timestamp: Date.now(),
    originalProvider,
    fallbackProvider,
    reason,
    resolved: false,
  };

  // [Real-time Switch] Update config so UI shows the fallback as the new assigned primary
  engineConfig.primaryProvider = fallbackProvider;
  saveEngineConfig();

  failoverHistory.unshift({ ...activeFailoverIncident });
  saveFailoverState();

  res.json({
    success: true,
    message: 'تم إطلاق محاكاة التحويل التلقائي بنجاح',
    activeFailover: activeFailoverIncident,
  });
});

// 5. Main Chat Route with Intelligent Automatic Failover
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    // Optimization: To save tokens, we only send the image data for the most recent message(s).
    // Older images in the history are replaced with a text placeholder.
    const optimizedMessages = messages.map((m, idx) => {
      if (m.imageUrl && idx < messages.length - 1) {
        return {
          ...m,
          content: `${m.content || ''}\n[صورة مرفوعة مسبقاً في هذه المحادثة]`,
          imageUrl: undefined // Remove large base64 data from history
        };
      }
      return m;
    });

    // Determine execution plan based on primaryProvider & autoFailover
    const primary = engineConfig.primaryProvider;
    const order = engineConfig.failoverOrder || ['deepseek', 'gemini', 'aisa'];

    // Plan sequence: start with primary, then other configured providers
    const providersToTry: ('gemini' | 'deepseek' | 'aisa')[] = [primary];
    if (engineConfig.autoFailover) {
      for (const p of order) {
        if (!providersToTry.includes(p) && !engineConfig.disabledProviders.includes(p)) {
          providersToTry.push(p);
        }
      }
    }

    let successResponse: { text: string } | null = null;
    let providerUsed: ('gemini' | 'deepseek' | 'aisa') | null = null;
    let failoverOccurred = false;
    let failoverReason = '';
    const failureLog: { provider: string; error: string }[] = [];

    const baseSystemInstruction = `${systemInstruction || ''}\n${GLOBAL_PRIVACY_INSTRUCTION}`;

    for (let i = 0; i < providersToTry.length; i++) {
      const currentProvider = providersToTry[i];
      
      // Advanced Mode Optimization: Tailor instructions to the specific strengths of the active logic
      let modelSpecificTip = '';
      if (currentProvider === 'deepseek') {
        modelSpecificTip = '\n💡 (Precision Mode): ركز على الدقة المتناهية والالتزام الصارم بقائمة الممنوعات والتعليمات. استخدم منطقك الاستنتاجي القوي لإقناع العميل بالحقائق.';
      } else if (currentProvider === 'gemini') {
        modelSpecificTip = '\n💡 (Creative Mode): استغل قدراتك الإبداعية في صياغة سيناريوهات تجعل العميل يعيش تجربة النجاح قبل أن يبدأ.';
      } else if (currentProvider === 'aisa') {
        modelSpecificTip = '\n💡 (Unified Mode): تصرف كمحرك ذكي متطور يجمع أفضل ميزات النماذج المتقدمة؛ كن حاسماً وسريعاً في إغلاق عملية البيع.';
      }
      
      const finalSystemInstruction = baseSystemInstruction + modelSpecificTip;

      try {
        console.log(`[AI Orchestrator] Calling provider: ${currentProvider} (Attempt ${i + 1}/${providersToTry.length})`);
        successResponse = await callProvider(currentProvider, optimizedMessages, finalSystemInstruction);
        providerUsed = currentProvider;

        if (i > 0) {
          // Automatic Failover happened!
          failoverOccurred = true;
          failoverReason = failureLog[0]?.error || 'خلل في استجابة المحرك الأساسي';

          // [CRITICAL] Update the actual configuration so the UI reflects the change
          // The non-working model is no longer the primary.
          console.log(`[AutoFailover] Permanently switching primary from ${engineConfig.primaryProvider} to ${currentProvider}`);
          
          // Disable the failed provider
          const failedProvider = providersToTry[i-1];
          if (failedProvider && !engineConfig.disabledProviders.includes(failedProvider)) {
            engineConfig.disabledProviders.push(failedProvider);
          }

          engineConfig.primaryProvider = currentProvider;
          
          // Optional: Move the failed providers to the end of the failover list
          const failedIds = failureLog.map(f => f.provider as AIProviderId);
          const newOrder = [
            ...engineConfig.failoverOrder.filter(id => !failedIds.includes(id)),
            ...failedIds
          ];
          engineConfig.failoverOrder = newOrder;
          
          saveEngineConfig(); // Persist changes to ai-engine-config.json

          // Record incident if not already recorded
          activeFailoverIncident = {
            id: `failover-${Date.now()}`,
            timestamp: Date.now(),
            originalProvider: primary,
            fallbackProvider: currentProvider,
            reason: failoverReason,
            resolved: false,
          };
          failoverHistory.unshift({ ...activeFailoverIncident });
          saveFailoverState();

          console.warn(
            `[AutoFailover Triggered] Switched from ${primary} to ${currentProvider}. Reason: ${failoverReason}`
          );
        }
        break;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(`[AI Orchestrator] Provider ${currentProvider} failed:`, errorMsg);
        failureLog.push({ provider: currentProvider, error: errorMsg });

        if (!engineConfig.autoFailover) {
          // Failover disabled, abort immediately
          break;
        }
      }
    }

    if (!successResponse || !providerUsed) {
      const detailedErrors = failureLog
        .map((f) => `* ${f.provider}: ${f.error}`)
        .join('\n');
      res.status(500).json({
        error: `تعذر الاتصال بجميع محركات الذكاء الاصطناعي المتاحة:\n${detailedErrors}`,
        failureLog,
      });
      return;
    }

    const sanitizedText = sanitizeAIOutput(successResponse.text);

    res.json({
      text: sanitizedText,
      providerUsed,
      originalProvider: primary,
      failoverOccurred,
      failoverReason: failoverOccurred ? failoverReason : undefined,
      activeFailoverIncident: failoverOccurred ? activeFailoverIncident : undefined,
    });
  } catch (error: any) {
    console.error('Chat orchestrator error:', error);
    res.status(500).json({
      error: error?.message || 'حدث خطأ أثناء معالجة الطلب في خادم الذكاء الاصطناعي',
    });
  }
});

// Endpoint to automatically extract text from uploaded documents (Word .docx, text, etc.)
app.post('/api/documents/extract', async (req: Request, res: Response) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      res.status(400).json({ error: 'fileData is required' });
      return;
    }

    let buffer: Buffer;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const base64 = fileData.split(',')[1] || '';
      buffer = Buffer.from(base64, 'base64');
    } else if (typeof fileData === 'string') {
      buffer = Buffer.from(fileData, 'base64');
    } else {
      buffer = Buffer.from(fileData);
    }

    const lowerName = (fileName || '').toLowerCase();
    if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result?.value || '').trim();
      res.json({ success: true, text });
      return;
    } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
      const text = buffer.toString('utf-8').trim();
      res.json({ success: true, text });
      return;
    }

    // Default fallback: try utf-8
    const text = buffer.toString('utf-8').trim();
    res.json({ success: true, text });
  } catch (err: any) {
    console.error('Document extraction error:', err);
    res.status(500).json({ error: 'فشل استخراج محتوى المستند: ' + (err.message || 'خطأ') });
  }
});

// --- DATA PERSISTENCE API ---

app.get('/api/products', (_req: Request, res: Response) => {
  res.json(products.filter(p => !p.isDeleted));
});

app.post('/api/products', (req: Request, res: Response) => {
  products = req.body;
  const ok = saveJson(PRODUCTS_FILE, products);
  if (!ok) {
    res.status(500).json({ error: 'Failed to write products to disk' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/prompts', (_req: Request, res: Response) => {
  res.json(prompts);
});

app.post('/api/prompts', (req: Request, res: Response) => {
  prompts = req.body;
  const ok = saveJson(PROMPTS_FILE, prompts);
  if (!ok) {
    res.status(500).json({ error: 'Failed to write prompts to disk' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/forbidden', (_req: Request, res: Response) => {
  res.json(forbiddenRule);
});

app.post('/api/forbidden', (req: Request, res: Response) => {
  forbiddenRule = req.body;
  const ok = saveJson(FORBIDDEN_FILE, forbiddenRule);
  if (!ok) {
    res.status(500).json({ error: 'Failed to write forbidden rules to disk' });
    return;
  }
  res.json({ success: true });
});

app.get('/s', (_req: Request, res: Response) => {
  res.redirect('/');
});

app.post('/api/shorten-url', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Valid URL is required' });
    return;
  }

  try {
    // Convert dev URL to shared public URL if applicable
    const cleanUrl = url.replace('ais-dev-', 'ais-pre-');
    const tinyRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(cleanUrl)}`);
    if (tinyRes.ok) {
      const shortUrl = (await tinyRes.text()).trim();
      if (shortUrl.startsWith('http')) {
        res.json({ success: true, shortUrl });
        return;
      }
    }

    const isgdRes = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(cleanUrl)}`);
    if (isgdRes.ok) {
      const shortUrl = (await isgdRes.text()).trim();
      if (shortUrl.startsWith('http')) {
        res.json({ success: true, shortUrl });
        return;
      }
    }

    res.json({ success: true, shortUrl: cleanUrl });
  } catch (err) {
    res.json({ success: true, shortUrl: url });
  }
});

app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(settings);
});

app.post('/api/settings', (req: Request, res: Response) => {
  const { logoConfig, welcomeSettings, categories, pwaSettings, chatFeatures, sharingSettings } = req.body;
  settings = {
    ...settings,
    logoConfig: logoConfig !== undefined ? logoConfig : settings.logoConfig,
    welcomeSettings: welcomeSettings !== undefined ? welcomeSettings : settings.welcomeSettings,
    categories: categories !== undefined ? categories : settings.categories,
    pwaSettings: pwaSettings !== undefined ? pwaSettings : settings.pwaSettings,
    chatFeatures: chatFeatures !== undefined ? chatFeatures : settings.chatFeatures,
    sharingSettings: sharingSettings !== undefined ? sharingSettings : settings.sharingSettings,
  };
  const ok = saveJson(SETTINGS_FILE, settings);
  if (!ok) {
    res.status(500).json({ error: 'Failed to write settings to disk' });
    return;
  }
  res.json({ success: true, settings });
});

// --- TRASH / RECYCLE BIN API ---

app.get('/api/trash', (_req: Request, res: Response) => {
  const deletedProducts = products.filter(p => p.isDeleted);
  const deletedDocs: any[] = [];
  products.forEach(p => {
    if (p.docs) {
      p.docs.forEach((d: any) => {
        if (d.isDeleted) deletedDocs.push({ ...d, productName: p.name, productId: p.id });
      });
    }
  });
  const deletedPrompts = prompts.filter(p => p.isDeleted);
  res.json({ products: deletedProducts, docs: deletedDocs, prompts: deletedPrompts });
});

app.post('/api/trash/restore', (req: Request, res: Response) => {
  const { type, id, productId } = req.body;
  if (type === 'product') {
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx].isDeleted = false;
      saveJson(PRODUCTS_FILE, products);
    }
  } else if (type === 'doc' && productId) {
    const pIdx = products.findIndex(p => p.id === productId);
    if (pIdx !== -1 && products[pIdx].docs) {
      const dIdx = products[pIdx].docs.findIndex((d: any) => d.id === id);
      if (dIdx !== -1) {
        products[pIdx].docs[dIdx].isDeleted = false;
        saveJson(PRODUCTS_FILE, products);
      }
    }
  } else if (type === 'prompt') {
    const idx = prompts.findIndex(p => p.id === id);
    if (idx !== -1) {
      prompts[idx].isDeleted = false;
      delete prompts[idx].deletedAt;
      saveJson(PROMPTS_FILE, prompts);
    }
  }
  res.json({ success: true });
});

app.post('/api/trash/permanent-delete', (req: Request, res: Response) => {
  const { type, id, productId } = req.body;
  if (type === 'product') {
    products = products.filter(p => p.id !== id);
    saveJson(PRODUCTS_FILE, products);
  } else if (type === 'doc' && productId) {
    const pIdx = products.findIndex(p => p.id === productId);
    if (pIdx !== -1 && products[pIdx].docs) {
      products[pIdx].docs = products[pIdx].docs.filter((d: any) => d.id !== id);
      saveJson(PRODUCTS_FILE, products);
    }
  } else if (type === 'prompt') {
    prompts = prompts.filter(p => p.id !== id);
    saveJson(PROMPTS_FILE, prompts);
  }
  res.json({ success: true });
});

app.post('/api/ai-providers/enable-provider', (req: Request, res: Response) => {
  const { provider } = req.body;
  if (provider) {
    engineConfig.disabledProviders = engineConfig.disabledProviders.filter(p => p !== provider);
    saveEngineConfig();
  }
  res.json({ success: true });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    primaryProvider: engineConfig.primaryProvider,
    hasGemini: !!getGeminiKey().key,
    hasDeepSeek: !!getDeepSeekKey().key,
    hasAisa: !!getAisaKey().key,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`[AI Orchestrator] Primary provider: ${engineConfig.primaryProvider}`);
    console.log(`[AI Orchestrator] DeepSeek Key detected: ${!!getDeepSeekKey().key} (${getDeepSeekKey().envName || 'none'})`);
    console.log(`[AI Orchestrator] Gemini Key detected: ${!!getGeminiKey().key} (${getGeminiKey().envName || 'none'})`);
    console.log(`[AI Orchestrator] AISA Key detected: ${!!getAisaKey().key} (${getAisaKey().envName || 'none'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
