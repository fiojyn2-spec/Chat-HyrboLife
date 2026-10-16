export interface ProductVideo {
  id: string;
  title: string;
  description: string; // تفاصيل عامة تظهر للمستخدم عند مشاهدة الفيديو ("تفاصيل:")
  contextAndTrigger: string; // 🔒 سري ومحمي: خاص بالذكاء الاصطناعي والإدارة فقط (متى يرسله للإقناع)
  videoUrl: string;
  duration?: string;
  thumbnailUrl?: string;
  isYouTube?: boolean;
}

export interface ProductImage {
  id: string;
  title: string; // اسم/عنوان الصورة (مثال: صورة المنتج الرئيسية، جدول الحقائق الغذائية، صورة العرض المخفض)
  imageUrl: string; // رابط الصورة أو Data URL مرفوعة من الجهاز
  aiDescription: string; // حقل تعريفي للذكاء الاصطناعي يوضح له بدقة ما في الصورة
  displayTrigger: string; // حقل متى تظهر للمستخدم (سياق ودواعي الإرسال)
  dependsOnImageId?: string; // شرط اختياري متى ترسل: 'none' (مباشرة)، 'main' (بعد صورة المنتج الرئيسية)، أو معرف صورة سابقة
  isMain?: boolean; // هل هي صورة المنتج الأساسية
  uploadedAt?: string;
}

export interface AttachedDoc {
  id: string;
  name: string;
  size: number;
  type: 'word' | 'pdf' | 'text' | 'other';
  extractedText?: string;
  fileData?: string; // Data URL أو رابط لتنزيل الملف واستعراضه
  uploadedAt: string;
  isDeleted?: boolean;
}

export interface ForbiddenItem {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
}

export interface AlternativeItem {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  shortDesc: string;
  fullDesc: string;
  benefits: string[];
  usageInstructions: string; // نص طريقة الاستخدام
  usageVideoUrl?: string; // رابط فيديو طريقة الاستخدام (يوتيوب أو مباشر)
  keyIngredients: string;
  targetAudience: string; // الفئة المستهدفة والمشكلة التي يعالجها
  marketingHooks?: string[]; // 🔒 هندسة "أسئلة الهوك": قائمة بأسئلة مشوقة مخصصة لهذا المنتج (خطوات الشيطان للإقناع)
  price: string; // السعر الإجمالي الموحد (مثلاً: 215 ر.س | 58$ | 34,000 ر.ي)
  priceYER?: string; // السعر بالريال اليمني - عملة جديدة (YER)
  priceUSD?: string; // السعر بالدولار الأمريكي
  priceSAR?: string; // السعر بالريال السعودي
  priceIQD?: string; // اختياري / بديل
  imageUrl: string;
  images?: ProductImage[]; // ألبوم صور المنتج التفاعلي والذكي
  docs: AttachedDoc[];
  videos: ProductVideo[];
  forbiddenItems?: ForbiddenItem[]; // قائمة الممنوعات مع الصور
  alternativeItems?: AlternativeItem[]; // قائمة البدائل للممنوعات
  isDeleted?: boolean; // حقل سلة المهملات
  createdAt: string;
}

export interface PersuasionPrompt {
  id: string;
  title: string;
  description: string;
  tone: string; // نبرة الصوت
  neuromarketingConcept: string; // المفهوم التسويقي العصبي
  promptText: string;
  isSystemDefault: boolean;
  isActive: boolean;
  isDeleted?: boolean; // حقل سلة المهملات
  deletedAt?: number;
}

export interface ForbiddenRule {
  id: string;
  forbiddenWords: string[];
  mandatoryWords: string[]; // 🔒 الكلمات الإجبارية التي يجب استخدامها في الرد
  guidelines: string;
  isActive: boolean;
}

export type AdminDashboardTab =
  | 'products'
  | 'ai-engine'
  | 'response-rules' // Consolidates prompts, rules, restrictions
  | 'backup'
  | 'trash'
  | 'users'
  | 'security'
  | 'general' // Consolidates welcome, text size, app settings, branding
  | 'analytics-ai'; // New combined Analytics & AI Knowledge tab

export interface UnansweredQuery {
  id: string;
  query: string;
  timestamp: number;
  sessionId: string;
  suggestedAnswer: string;
  status: 'pending' | 'approved' | 'rejected';
  adminEditedAnswer?: string;
}

export interface AIGuidanceSettings {
  prompt: string;
  allowedDomains: string[];
  answerBoundaries: string;
  autoAutonomous: boolean;
}

export interface PWASettings {
  appIconUrl: string | null;
  introLogoUrl: string | null;
  introBackgroundUrl: string | null;
  introLogoSize: number;
  introText: string;
  introTextSize: number;
  introTextColor: string;
  introTextAnimation: 'fade' | 'slide' | 'zoom' | 'none';
  showIntroText: boolean;
  introColors: {
    background: string;
    text: string;
    accent: string;
  };
  introAnimation: 'fade' | 'slide' | 'zoom' | 'none';
  showIntro: boolean;
  installPromptConfig: {
    title: string;
    description: string;
    buttonText: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
  recommendedProductIds?: string[];
  recommendedVideoIds?: string[];
  recommendedImageIds?: string[];
  recommendedDocIds?: string[];
  suggestedQuestions?: string[];
  providerUsed?: AIProviderId;
  failoverOccurred?: boolean;
  failoverReason?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type MedicalFontSize = 'small' | 'normal' | 'large' | 'medical';

export interface LogoStyleSettings {
  hasBackground: boolean;
  backgroundColor: string; // لون الخلفية (أبيض، أخضر، ذهبي، أسود، مخصص)
  hasBorder: boolean; // مع إطار أو بدون إطار
  borderColor: string; // لون الإطار (ذهبي، أخضر، أبيض، أسود، مخصص)
  size: number; // الحجم بالبكسل (e.g. 36px)
  colorMode: 'original' | 'emerald'; // لون الشعار: أخضر زمردي أو اللون الأصلي
  shape: 'rounded' | 'circle' | 'square';
}

export interface AppLogoConfig {
  logoUrl: string | null;
  headerLogo: LogoStyleSettings;
  menuLogo: LogoStyleSettings;
}

export interface WelcomeSettings {
  title: string;
  description: string;
  promptSuggestionsTitle: string;
  quickSuggestions: string[];
  showWelcomeHero: boolean;
}

export type AIProviderId = 'gemini' | 'deepseek' | 'aisa';

export interface AIProviderStatus {
  id: AIProviderId;
  name: string;
  arabicName: string;
  company: string;
  description: string;
  isConfigured: boolean; // مفتاح الربط متوفر في البيئة الآمنة (Secrets)
  envKeyFound?: string; // اسم المتغير البيئي المكتشف
  isOnline: boolean; // استجابة المحرك بنجاح عند الفحص
  lastLatencyMs?: number;
  lastTestedAt?: number;
  lastError?: string | null;
  supportedModels: string[];
  activeModel: string;
}

export interface AIEngineConfig {
  primaryProvider: AIProviderId;
  autoFailover: boolean;
  failoverOrder: AIProviderId[];
  disabledProviders?: AIProviderId[];
  models: {
    gemini: string;
    deepseek: string;
    aisa: string;
  };
}

export interface FailoverIncident {
  id: string;
  timestamp: number;
  originalProvider: AIProviderId;
  fallbackProvider: AIProviderId;
  reason: string;
  resolved: boolean;
}
export interface ChatFeatures {
  showUploadButton: boolean;
  showVoiceButton: boolean;
  showSearchInSideMenu: boolean;
}

export interface SharingSettings {
  shareMessage: string;
  shortLink: string;
  buttonTitle?: string;
  shareImageUrl?: string | null;
}

export interface AppSettings {
  logoConfig: AppLogoConfig | null;
  welcomeSettings: WelcomeSettings | null;
  pwaSettings: PWASettings | null;
  categories: string[];
  chatFeatures: ChatFeatures;
  sharingSettings?: SharingSettings;
}
