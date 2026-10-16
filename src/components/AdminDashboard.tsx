import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Database,
  Brain,
  ShieldAlert,
  Type,
  Upload,
  Film,
  FileText,
  Sparkles,
  Palette,
  MessageSquareHeart,
  Minus,
  RotateCcw,
  RefreshCw,
  Ban,
  Copy,
  Eye,
  Lock,
  Check,
  ChevronLeft,
  Play,
  Settings,
  ExternalLink,
  Search,
  Users,
  Fingerprint,
  ShieldCheck,
  Key,
  Smartphone,
  LogOut,
  Mail,
  Image as ImageIcon,
  Star,
  Layers,
  ArrowDown,
  Coins,
  Download,
  Cpu,
  Info,
  ShoppingBag,
  Paperclip,
  Mic,
  Zap,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Product,
  ProductVideo,
  ProductImage,
  AttachedDoc,
  PersuasionPrompt,
  ForbiddenRule,
  MedicalFontSize,
  AppLogoConfig,
  WelcomeSettings,
  AdminDashboardTab,
  AIProviderId,
  PWASettings,
  ChatFeatures,
  AppSettings,
  SharingSettings,
  AIGuidanceSettings,
  UnansweredQuery,
} from '../types';
import { 
  restoreItem, 
  permanentDeleteItem, 
  TrashData, 
  fetchTrash, 
  enableProvider, 
  saveSettings,
  savePrompts,
  saveForbiddenRule,
  saveProducts
} from '../services/productService';
import { LoginOverlay } from './LoginOverlay';
import { DEFAULT_APP_LOGO_CONFIG, DEFAULT_WELCOME_SETTINGS, DEFAULT_CHAT_FEATURES } from '../data/defaultData';
import {
  getVideoThumbnail,
  isYouTubeShorts,
  isYouTubeUrl,
  getYouTubeVideoId,
  processVideoFile,
} from '../utils/videoUtils';
import { VideoModal } from './VideoModal';
import { compressImageFile } from '../utils/imageCompressor';
import { AIEngineManager } from './AIEngineManager';
import { fetchAIProvidersStatus } from '../services/aiProviderService';

const COLORS = ['#00873D', '#D4AF37', '#0284c7', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

const parseProductPrices = (priceStr?: string, prod?: Partial<Product>) => {
  // 1. Direct fields from product if available
  let directSar = prod?.priceSAR?.trim() || '';
  let directUsd = prod?.priceUSD?.trim() || '';
  let directYer = prod?.priceYER?.trim() || '';
  if (!directYer && prod?.priceIQD?.trim()) {
    directYer = prod.priceIQD.trim().replace('د.ع', 'ر.ي');
  }

  // 2. Parse from priceStr if direct fields are missing
  const effectiveStr = priceStr || prod?.price || '';
  let partSar = '';
  let partUsd = '';
  let partYer = '';

  if (effectiveStr) {
    const parts = effectiveStr.split(/[|/]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      partSar = parts[0];
      partUsd = parts[1];
      partYer = parts[2].replace('د.ع', 'ر.ي');
    } else if (parts.length === 2) {
      partSar = parts[0];
      partUsd = parts[1];
    } else if (parts.length === 1) {
      partSar = parts[0];
    }
  }

  const rawSar = directSar || partSar;
  const rawUsd = directUsd || partUsd;
  const rawYer = directYer || partYer;

  const formatSar = (val: string) => {
    if (!val) return '—';
    return val.includes('ر.س') || val.includes('SAR') ? val : `${val} ر.س`;
  };
  const formatUsd = (val: string) => {
    if (!val) return '—';
    return val.includes('$') || val.includes('USD') ? val : `${val} $`;
  };
  const formatYer = (val: string) => {
    if (!val) return '—';
    const clean = val.replace('د.ع', 'ر.ي');
    return clean.includes('ر.ي') || clean.includes('YER') ? clean : `${clean} ر.ي`;
  };

  return {
    sar: formatSar(rawSar),
    usd: formatUsd(rawUsd),
    yer: formatYer(rawYer),
    rawSar,
    rawUsd,
    rawYer,
  };
};

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AdminDashboardTab;
  products: Product[];
  onSaveProducts: (products: Product[]) => void;
  prompts: PersuasionPrompt[];
  onSavePrompts: (prompts: PersuasionPrompt[]) => void;
  forbiddenRule: ForbiddenRule;
  onSaveForbiddenRule: (rule: ForbiddenRule) => void;
  medicalFontSize: MedicalFontSize;
  onSetMedicalFontSize: (size: MedicalFontSize) => void;
  logoConfig: AppLogoConfig;
  onSaveLogoConfig: (config: AppLogoConfig) => void;
  welcomeSettings: WelcomeSettings;
  onSaveWelcomeSettings: (settings: WelcomeSettings) => void;
  pwaSettings: PWASettings;
  onSavePwaSettings: (settings: PWASettings) => void;
  categories?: string[];
  onSaveCategories?: (cats: string[]) => void;
  chatFeatures: ChatFeatures;
  onSaveChatFeatures: (features: ChatFeatures) => void;
  sharingSettings: SharingSettings;
  onSaveSharingSettings: (settings: SharingSettings) => void;
  productRecommendationStats: Array<{ id: string; name: string; fullName: string; count: number }>;
  aiGuidance: AIGuidanceSettings;
  onSaveAiGuidance: (settings: AIGuidanceSettings) => void;
  unansweredQueries: UnansweredQuery[];
  onApproveUnansweredQuery: (queryId: string, editedAnswer: string) => void;
  onDeleteUnansweredQuery: (queryId: string) => void;
  aiGeneratedKb: Array<{ id: string; question: string; answer: string; approvedAt: number }>;
  onAddManualAiQa?: (question: string, answer: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  initialTab = 'products',
  products,
  onSaveProducts,
  prompts,
  onSavePrompts,
  forbiddenRule,
  onSaveForbiddenRule,
  medicalFontSize,
  onSetMedicalFontSize,
  logoConfig,
  onSaveLogoConfig,
  welcomeSettings,
  onSaveWelcomeSettings,
  pwaSettings,
  onSavePwaSettings,
  categories: categoriesProp,
  onSaveCategories,
  chatFeatures,
  onSaveChatFeatures,
  sharingSettings,
  onSaveSharingSettings,
  productRecommendationStats,
  aiGuidance,
  onSaveAiGuidance,
  unansweredQueries,
  onApproveUnansweredQuery,
  onDeleteUnansweredQuery,
  aiGeneratedKb,
  onAddManualAiQa,
}) => {
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>(initialTab);
  const [activeEngine, setActiveEngine] = useState<AIProviderId>('deepseek');
  const [hasFailoverAlert, setHasFailoverAlert] = useState<boolean>(false);
  const [tempAiGuidance, setTempAiGuidance] = useState<AIGuidanceSettings>(aiGuidance);

  React.useEffect(() => {
    setTempAiGuidance(aiGuidance);
  }, [aiGuidance]);

  React.useEffect(() => {
    if (isOpen) {
      fetchAIProvidersStatus()
        .then((res) => {
          if (res?.config?.primaryProvider) {
            setActiveEngine(res.config.primaryProvider);
          }
          setHasFailoverAlert(!!res?.activeFailover);
        })
        .catch(() => {});
    }
  }, [isOpen, activeTab]);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    if (logoConfig) {
      setLocalLogoConfig({
        logoUrl: logoConfig.logoUrl,
        headerLogo: { ...logoConfig.headerLogo },
        menuLogo: { ...logoConfig.menuLogo },
      });
    }
  }, [logoConfig]);

  React.useEffect(() => {
    if (welcomeSettings) {
      setLocalWelcome({
        ...welcomeSettings,
        quickSuggestions: [...welcomeSettings.quickSuggestions],
      });
    }
  }, [welcomeSettings]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- Trash State ---
  const [trashData, setTrashData] = useState<{ products: Product[]; docs: any[]; prompts: PersuasionPrompt[] }>({ products: [], docs: [], prompts: [] });
  const [isTrashLoading, setIsTrashLoading] = useState(false);

  const loadTrash = async () => {
    setIsTrashLoading(true);
    try {
      const data = await fetchTrash();
      setTrashData(data);
    } catch (err) {
      showToast('⚠️ تعذر تحميل سلة المهملات');
    } finally {
      setIsTrashLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab]);

  const handleRestoreProduct = async (id: string) => {
    try {
      await restoreItem('product', id);
      const updated = products.map((p) =>
        p.id === id ? { ...p, isDeleted: false } : p
      );
      onSaveProducts(updated);
      showToast('✅ تم استعادة المنتج بنجاح');
      loadTrash();
    } catch (err) {
      showToast('❌ فشل استعادة المنتج');
    }
  };

  const handlePermanentDeleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await permanentDeleteItem('product', id);
        const updated = products.filter((p) => p.id !== id);
        onSaveProducts(updated);
        showToast('🗑️ تم حذف المنتج نهائياً');
        loadTrash();
      } catch (err) {
        showToast('❌ فشل الحذف النهائي');
      }
    }
  };

  const handleRestorePrompt = async (id: string) => {
    try {
      await restoreItem('prompt', id);
      const updated = prompts.map((p) =>
        p.id === id ? { ...p, isDeleted: false } : p
      );
      onSavePrompts(updated);
      showToast('✅ تم استعادة البرومبت بنجاح إلى قائمة البرومبتات');
      loadTrash();
    } catch (err) {
      console.error(err);
      showToast('❌ فشل استعادة البرومبت');
    }
  };

  const handlePermanentDeletePrompt = async (id: string) => {
    if (confirm('هل أنت متأكد من الحذف النهائي لهذا البرومبت؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await permanentDeleteItem('prompt', id);
        const updated = prompts.filter((p) => p.id !== id);
        onSavePrompts(updated);
        showToast('🗑️ تم حذف البرومبت نهائياً');
        loadTrash();
      } catch (err) {
        console.error(err);
        showToast('❌ فشل الحذف النهائي');
      }
    }
  };

  const handleRestoreDoc = async (id: string, productId: string) => {
    try {
      await restoreItem('doc', id, productId);
      const updated = products.map((p) => {
        if (p.id === productId && p.docs) {
          return {
            ...p,
            docs: p.docs.map((d) => (d.id === id ? { ...d, isDeleted: false } : d)),
          };
        }
        return p;
      });
      onSaveProducts(updated);
      showToast('✅ تم استعادة المستند بنجاح');
      loadTrash();
    } catch (err) {
      showToast('❌ فشل استعادة المستند');
    }
  };

  const handlePermanentDeleteDoc = async (id: string, productId: string) => {
    if (confirm('هل أنت متأكد من حذف المستند نهائياً؟')) {
      try {
        await permanentDeleteItem('doc', id, productId);
        const updated = products.map((p) => {
          if (p.id === productId && p.docs) {
            return {
              ...p,
              docs: p.docs.filter((d) => d.id !== id),
            };
          }
          return p;
        });
        onSaveProducts(updated);
        showToast('🗑️ تم حذف المستند نهائياً');
        loadTrash();
      } catch (err) {
        showToast('❌ فشل الحذف النهائي');
      }
    }
  };

  // --- Dynamic Categories Management ---
  const [categories, setCategories] = useState<string[]>(() => {
    const baseDefaults = [
      'إدارة الوزن والتغذية اليومية',
      'حرق الدهون والتمثيل الغذائي',
      'صحة الجهاز الهضمي والترطيب',
      'بناء العضلات ومضاعفة الشبع',
      'بناء العضلات واللياقة الرياضية',
      'المناعة وصحة القلب',
    ];
    const set = new Set<string>(baseDefaults);
    if (categoriesProp && categoriesProp.length > 0) {
      categoriesProp.forEach((c) => c && set.add(c.trim()));
    }
    const saved = localStorage.getItem('herbalife_categories') || localStorage.getItem('herbalife_ai_categories_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((c) => c && set.add(c.trim()));
        }
      } catch {
        // use default
      }
    }
    if (Array.isArray(products)) {
      products.forEach((p) => p.category && set.add(p.category.trim()));
    }
    return Array.from(set);
  });

  React.useEffect(() => {
    if (categoriesProp && categoriesProp.length > 0) {
      setCategories((prev) => {
        const set = new Set([...prev, ...categoriesProp]);
        return Array.from(set);
      });
    }
  }, [categoriesProp]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('herbalife_categories', JSON.stringify(newCats));
    if (onSaveCategories) {
      onSaveCategories(newCats);
    }
  };

  const handleAddCategory = (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast('⚠️ هذا التصنيف موجود بالفعل');
      return;
    }
    const updated = [...categories, trimmed];
    saveCategories(updated);
    setNewCategoryInput('');
    showToast(`تمت إضافة تصنيف "${trimmed}" بنجاح`);
  };

  const handleUpdateCategory = (idx: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldName = categories[idx];
    if (oldName === trimmed) {
      setEditingCategoryIdx(null);
      return;
    }
    if (categories.includes(trimmed)) {
      showToast('⚠️ يوجد تصنيف آخر بنفس هذا الاسم');
      return;
    }
    const updated = [...categories];
    updated[idx] = trimmed;
    saveCategories(updated);

    // Update any products with old category
    const updatedProducts = products.map((p) =>
      p.category === oldName ? { ...p, category: trimmed } : p
    );
    onSaveProducts(updatedProducts);

    if (productForm.category === oldName) {
      setProductForm((prev) => ({ ...prev, category: trimmed }));
    }
    setEditingCategoryIdx(null);
    showToast(`تم تحديث التصنيف إلى "${trimmed}"`);
  };

  const handleDeleteCategory = (idx: number) => {
    const catToDelete = categories[idx];
    if (categories.length <= 1) {
      showToast('⚠️ يجب الإبقاء على تصنيف واحد على الأقل في النظام');
      return;
    }
    const updated = categories.filter((_, i) => i !== idx);
    saveCategories(updated);

    const fallbackCat = updated[0];
    const updatedProducts = products.map((p) =>
      p.category === catToDelete ? { ...p, category: fallbackCat } : p
    );
    onSaveProducts(updatedProducts);

    if (productForm.category === catToDelete) {
      setProductForm((prev) => ({ ...prev, category: fallbackCat }));
    }
    showToast(`تم حذف تصنيف "${catToDelete}" بنجاح`);
  };

  // --- Controlled Video Album Management ---
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [isAddingNewVideo, setIsAddingNewVideo] = useState<boolean>(false);
  const [videoSourceMode, setVideoSourceMode] = useState<'url' | 'upload'>('url');
  const [isVideoProcessing, setIsVideoProcessing] = useState<boolean>(false);
  const [videoDraft, setVideoDraft] = useState<ProductVideo>({
    id: '',
    title: '',
    description: '',
    contextAndTrigger: '',
    videoUrl: '',
    duration: '',
    thumbnailUrl: '',
  });
  const [previewVideoForModal, setPreviewVideoForModal] = useState<ProductVideo | null>(null);

  const handleStartAddVideo = () => {
    setEditingVideoIndex(null);
    setVideoSourceMode('url');
    setVideoDraft({
      id: `vid-${Date.now()}`,
      title: '',
      description: '',
      contextAndTrigger: '',
      videoUrl: '',
      duration: '',
      thumbnailUrl: '',
    });
    setIsAddingNewVideo(true);
  };

  const handleStartEditVideo = (idx: number) => {
    setIsAddingNewVideo(false);
    setEditingVideoIndex(idx);
    const targetVid = productForm.videos[idx];
    setVideoDraft({ ...targetVid });
    setVideoSourceMode(targetVid.videoUrl.startsWith('data:video') ? 'upload' : 'url');
  };

  const handleCancelVideoEdit = () => {
    setIsAddingNewVideo(false);
    setEditingVideoIndex(null);
    setIsVideoProcessing(false);
    setVideoDraft({
      id: '',
      title: '',
      description: '',
      contextAndTrigger: '',
      videoUrl: '',
      duration: '',
      thumbnailUrl: '',
    });
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    if (file.size > 80 * 1024 * 1024) {
      alert('حجم ملف الفيديو كبير جداً (أكثر من 80 ميجابايت). يرجى اختيار فيديو بحجم أصغر، أو استخدام رابط يوتيوب/شورتس.');
      return;
    }

    try {
      setIsVideoProcessing(true);
      showToast('⏳ جاري استخراج ومعالجة الفيديو والصورة المصغرة...');
      const { dataUrl, thumbnailUrl, duration } = await processVideoFile(file);
      setVideoDraft((prev) => ({
        ...prev,
        videoUrl: dataUrl,
        thumbnailUrl: thumbnailUrl || prev.thumbnailUrl,
        duration: duration || prev.duration,
        title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, ''),
      }));
      showToast('✅ تم رفع ومعالجة الفيديو بنجاح! يمكنك الآن مراجعته وحفظه بالألبوم');
    } catch (err: any) {
      console.error('Failed to process video file:', err);
      alert('فشل معالجة ملف الفيديو: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleSaveVideoToAlbum = async () => {
    if (!videoDraft.title.trim()) {
      showToast('⚠️ يرجى إدخال عنوان للفيديو');
      return;
    }
    if (!videoDraft.videoUrl.trim()) {
      showToast('⚠️ يرجى إدخال رابط يوتيوب/شورتس أو رفع مقطع فيديو من جهازك');
      return;
    }

    let updatedVideos: ProductVideo[];
    if (editingVideoIndex !== null) {
      updatedVideos = [...(productForm.videos || [])];
      updatedVideos[editingVideoIndex] = { ...videoDraft };
    } else {
      const newVid: ProductVideo = {
        ...videoDraft,
        id: videoDraft.id || `vid-${Date.now()}`,
      };
      updatedVideos = [...(productForm.videos || []), newVid];
    }

    setProductForm(prev => ({ ...prev, videos: updatedVideos }));

    // CRITICAL: Immediate Auto-Save to Backend and LocalStorage if editing an existing product!
    if (editingProductId) {
      try {
        const updatedProducts = products.map((p) =>
          p.id === editingProductId ? { ...p, videos: updatedVideos } : p
        );
        onSaveProducts(updatedProducts);
        await saveProducts(updatedProducts);
        try { localStorage.setItem('herbalife_ai_products_v1', JSON.stringify(updatedProducts)); } catch {}
        showToast('✅ تم حفظ الفيديو وتثبيته في ألبوم المنتج وقاعدة المعرفة بنجاح!');
      } catch (err) {
        console.error('Failed to auto-save video:', err);
        showToast('✅ تم إضافة الفيديو إلى الألبوم محلياً');
      }
    } else {
      showToast('✅ تم إضافة الفيديو إلى الألبوم (سيُعتمد نهائياً عند حفظ المنتج)');
    }
    handleCancelVideoEdit();
  };

  const handleDeleteVideoFromAlbum = async (idx: number) => {
    const updatedVideos = (productForm.videos || []).filter((_, i) => i !== idx);
    setProductForm(prev => ({ ...prev, videos: updatedVideos }));
    if (editingVideoIndex === idx) {
      handleCancelVideoEdit();
    }

    if (editingProductId) {
      try {
        const updatedProducts = products.map((p) =>
          p.id === editingProductId ? { ...p, videos: updatedVideos } : p
        );
        onSaveProducts(updatedProducts);
        await saveProducts(updatedProducts);
        try { localStorage.setItem('herbalife_ai_products_v1', JSON.stringify(updatedProducts)); } catch {}
        showToast('🗑️ تم حذف الفيديو وتحديث ألبوم المنتج بنجاح');
      } catch {
        showToast('تم حذف الفيديو من الألبوم محلياً');
      }
    } else {
      showToast('تم حذف الفيديو من ألبوم المنتج بنجاح');
    }
  };

  const handleClearAllVideos = async () => {
    if (!confirm('هل أنت متأكد من تفريغ ألبوم الفيديوهات بالكامل لهذا المنتج؟')) return;
    setProductForm(prev => ({ ...prev, videos: [] }));
    handleCancelVideoEdit();

    if (editingProductId) {
      try {
        const updatedProducts = products.map((p) =>
          p.id === editingProductId ? { ...p, videos: [] } : p
        );
        onSaveProducts(updatedProducts);
        await saveProducts(updatedProducts);
        try { localStorage.setItem('herbalife_ai_products_v1', JSON.stringify(updatedProducts)); } catch {}
        showToast('🗑️ تم تفريغ ألبوم الفيديوهات وتحديث السيرفر بنجاح');
      } catch {
        showToast('تم تفريغ ألبوم الفيديوهات');
      }
    } else {
      showToast('تم تفريغ ألبوم الفيديوهات بالكامل');
    }
  };

  // --- Controlled Smart Images Album Management (ألبوم صور المنتج التفاعلي مع شروط الذكاء الاصطناعي) ---
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [isAddingNewImage, setIsAddingNewImage] = useState<boolean>(false);
  const [previewImageForModal, setPreviewImageForModal] = useState<ProductImage | null>(null);
  const [imageDraft, setImageDraft] = useState<ProductImage>({
    id: '',
    title: '',
    imageUrl: '',
    aiDescription: '',
    displayTrigger: '',
    dependsOnImageId: 'none',
    isMain: false,
  });

  const handleStartAddImage = () => {
    setEditingImageIndex(null);
    const isFirst = (!productForm.images || productForm.images.length === 0);
    setImageDraft({
      id: `img-${Date.now()}`,
      title: isFirst ? 'صورة المنتج الرئيسية' : '',
      imageUrl: '',
      aiDescription: '',
      displayTrigger: '',
      dependsOnImageId: isFirst ? 'none' : 'main',
      isMain: isFirst,
    });
    setIsAddingNewImage(true);
  };

  const handleStartEditImage = (idx: number) => {
    const currentList = productForm.images || [];
    if (!currentList[idx]) return;
    setIsAddingNewImage(false);
    setEditingImageIndex(idx);
    setImageDraft({ ...currentList[idx] });
  };

  const handleCancelImageEdit = () => {
    setIsAddingNewImage(false);
    setEditingImageIndex(null);
    setImageDraft({
      id: '',
      title: '',
      imageUrl: '',
      aiDescription: '',
      displayTrigger: '',
      dependsOnImageId: 'none',
      isMain: false,
    });
  };

  const handleSaveImageToAlbum = () => {
    if (!imageDraft.imageUrl.trim()) {
      showToast('⚠️ يرجى رفع صورة أو إدخال رابط الصورة أولاً');
      return;
    }
    const finalTitle = imageDraft.title.trim() || 'صورة المنتج';

    const currentImages = productForm.images ? [...productForm.images] : [];
    let updatedImages: ProductImage[];

    if (editingImageIndex !== null) {
      updatedImages = [...currentImages];
      updatedImages[editingImageIndex] = { ...imageDraft, title: finalTitle };
    } else {
      const newImg: ProductImage = {
        ...imageDraft,
        title: finalTitle,
        id: imageDraft.id || `img-${Date.now()}`,
      };
      updatedImages = [...currentImages, newImg];
    }

    // If marked as main, ensure only this one has isMain: true and update productForm.imageUrl
    if (imageDraft.isMain) {
      const targetIdx = editingImageIndex !== null ? editingImageIndex : updatedImages.length - 1;
      updatedImages = updatedImages.map((img, idx) => ({
        ...img,
        isMain: idx === targetIdx,
      }));
      setProductForm({
        ...productForm,
        imageUrl: imageDraft.imageUrl,
        images: updatedImages,
      });
    } else {
      // If no main image exists, mark the first one as main
      const hasMain = updatedImages.some((img) => img.isMain);
      if (!hasMain && updatedImages.length > 0) {
        updatedImages[0].isMain = true;
        setProductForm({
          ...productForm,
          imageUrl: updatedImages[0].imageUrl,
          images: updatedImages,
        });
      } else {
        setProductForm({
          ...productForm,
          images: updatedImages,
        });
      }
    }

    showToast(editingImageIndex !== null ? 'تم تحديث بيانات الصورة في الألبوم بنجاح' : 'تمت إضافة الصورة الجديدة للألبوم بنجاح');
    handleCancelImageEdit();
  };

  const handleDeleteImageFromAlbum = (idx: number) => {
    const currentImages = productForm.images ? [...productForm.images] : [];
    const deletedWasMain = currentImages[idx]?.isMain;
    const updated = currentImages.filter((_, i) => i !== idx);

    let newMainUrl = productForm.imageUrl;
    if (deletedWasMain && updated.length > 0) {
      updated[0].isMain = true;
      newMainUrl = updated[0].imageUrl;
    } else if (updated.length === 0) {
      newMainUrl = '';
    }

    setProductForm({
      ...productForm,
      imageUrl: newMainUrl,
      images: updated,
    });

    if (editingImageIndex === idx) {
      handleCancelImageEdit();
    }
    showToast('تم حذف الصورة من ألبوم المنتج بنجاح');
  };

  const handleClearAllImages = () => {
    setProductForm({
      ...productForm,
      imageUrl: '',
      images: [],
    });
    handleCancelImageEdit();
    showToast('تم تفريغ ألبوم الصور بالكامل');
  };

  const handleSetAsMainImage = (idx: number) => {
    const currentImages = productForm.images ? [...productForm.images] : [];
    if (!currentImages[idx]) return;

    const updated = currentImages.map((img, i) => ({
      ...img,
      isMain: i === idx,
    }));

    setProductForm({
      ...productForm,
      imageUrl: currentImages[idx].imageUrl,
      images: updated,
    });
    showToast(`تم تعيين "${currentImages[idx].title}" كصورة رئيسية للمنتج ⭐`);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = ''; // Reset so uploading another image or same file works every time

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    try {
      showToast('جاري ضغط ومعالجة الصورة لضمان السرعة الفائقة...');
      const compressedDataUrl = await compressImageFile(file, 960, 960, 0.78);
      const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'صورة المنتج';

      const currentImages = productForm.images ? [...productForm.images] : [];
      const isFirst = currentImages.length === 0;
      const newImgId = `img-${Date.now()}`;

      const newImg: ProductImage = {
        id: newImgId,
        title: autoTitle,
        imageUrl: compressedDataUrl,
        aiDescription: '',
        displayTrigger: isFirst
          ? 'تُعرض كصورة أساسية للتعريف بالمنتج ومظهره.'
          : 'تُعرض عند توضيح تفاصيل إضافية عن المنتج.',
        dependsOnImageId: isFirst ? 'none' : 'main',
        isMain: isFirst,
      };

      const updatedImages = [...currentImages, newImg];
      setProductForm({
        ...productForm,
        imageUrl: isFirst || !productForm.imageUrl ? compressedDataUrl : productForm.imageUrl,
        images: updatedImages,
      });

      // Keep draft open so user can adjust details if desired
      setImageDraft(newImg);
      setEditingImageIndex(updatedImages.length - 1);
      setIsAddingNewImage(false);

      showToast(`✅ تم رفع وحفظ صورة "${autoTitle}" في الألبوم بنجاح!`);
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى');
    }
  };

  const handleUploadMainProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    try {
      showToast('جاري ضغط ومعالجة صورة الغلاف الأساسية...');
      const compressedDataUrl = await compressImageFile(file, 960, 960, 0.78);
      const autoTitle = 'صورة الغلاف الأساسية للمنتج';

      const currentImages = productForm.images ? [...productForm.images] : [];
      let updatedImages: ProductImage[];
      const mainIdx = currentImages.findIndex((im) => im.isMain);

      if (mainIdx >= 0) {
        updatedImages = currentImages.map((im, i) =>
          i === mainIdx ? { ...im, imageUrl: compressedDataUrl } : im
        );
      } else {
        const newMainImg: ProductImage = {
          id: `img-${Date.now()}-main`,
          title: autoTitle,
          imageUrl: compressedDataUrl,
          aiDescription: `صورة العبوة الأساسية لمنتج ${productForm.name || 'المنتج'} تبرز التصميم الرسمي.`,
          displayTrigger: 'تُعرض كصورة أولية وأساسية للتعريف بالمنتج.',
          dependsOnImageId: 'none',
          isMain: true,
        };
        updatedImages = [newMainImg, ...currentImages];
      }

      setProductForm({
        ...productForm,
        imageUrl: compressedDataUrl,
        images: updatedImages,
      });
      showToast('⭐ تم تعيين ورفع صورة الغلاف الأساسية للمنتج بنجاح');
    } catch (err) {
      console.error('Main image upload error:', err);
      showToast('حدث خطأ أثناء معالجة الصورة');
    }
  };

  // --- Product Search and Filtering ---
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');


  // --- Forbidden & Alternative Items State ---
  const [isAddingForbidden, setIsAddingForbidden] = useState(false);
  const [editingForbiddenIndex, setEditingForbiddenIndex] = useState<number | null>(null);
  const [forbiddenDraft, setForbiddenDraft] = useState({ id: '', name: '', imageUrl: '', description: '' });

  const [isAddingAlternative, setIsAddingAlternative] = useState(false);
  const [editingAlternativeIndex, setEditingAlternativeIndex] = useState<number | null>(null);
  const [alternativeDraft, setAlternativeDraft] = useState({ id: '', name: '', imageUrl: '', description: '' });

  const handleStartAddForbidden = () => {
    setForbiddenDraft({ id: `forbidden-${Date.now()}`, name: '', imageUrl: '', description: '' });
    setIsAddingForbidden(true);
    setEditingForbiddenIndex(null);
  };

  const handleCancelForbiddenEdit = () => {
    setIsAddingForbidden(false);
    setEditingForbiddenIndex(null);
  };

  const handleSaveForbiddenItem = () => {
    if (!forbiddenDraft.name.trim()) {
      showToast('⚠️ يرجى كتابة اسم الممنوع أولاً');
      return;
    }
    
    setProductForm((prev) => {
      const currentForbidden = prev.forbiddenItems || [];
      let updated;
      if (editingForbiddenIndex !== null) {
        updated = currentForbidden.map((f, i) => i === editingForbiddenIndex ? forbiddenDraft : f);
      } else {
        updated = [...currentForbidden, forbiddenDraft];
      }
      return { ...prev, forbiddenItems: updated };
    });

    handleCancelForbiddenEdit();
    showToast('✅ تم حفظ الممنوع في القائمة');
  };

  const handleStartAddAlternative = () => {
    setAlternativeDraft({ id: `alt-${Date.now()}`, name: '', imageUrl: '', description: '' });
    setIsAddingAlternative(true);
    setEditingAlternativeIndex(null);
  };

  const handleCancelAlternativeEdit = () => {
    setIsAddingAlternative(false);
    setEditingAlternativeIndex(null);
  };

  const handleSaveAlternative = () => {
    if (!alternativeDraft.name.trim()) {
      showToast('⚠️ يرجى كتابة اسم البديل أولاً');
      return;
    }
    
    setProductForm((prev) => {
      const currentAlts = prev.alternativeItems || [];
      let updated;
      if (editingAlternativeIndex !== null) {
        updated = currentAlts.map((a, i) => i === editingAlternativeIndex ? alternativeDraft : a);
      } else {
        updated = [...currentAlts, alternativeDraft];
      }
      return { ...prev, alternativeItems: updated };
    });

    handleCancelAlternativeEdit();
    showToast('✅ تم حفظ البديل في القائمة');
  };

  const handleForbiddenImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    try {
      showToast('جاري معالجة صورة الممنوع...');
      const compressedDataUrl = await compressImageFile(file, 600, 600, 0.7);
      setForbiddenDraft(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      showToast('✅ تم رفع صورة الممنوع');
    } catch (err) {
      showToast('❌ خطأ في رفع الصورة');
    }
  };

  const handleAlternativeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    try {
      showToast('جاري معالجة صورة البديل...');
      const compressedDataUrl = await compressImageFile(file, 600, 600, 0.7);
      setAlternativeDraft(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      showToast('✅ تم رفع صورة البديل');
    } catch (err) {
      showToast('❌ خطأ في رفع الصورة');
    }
  };

  const filteredProducts = products.filter((prod) => {
    // Show only non-deleted products in the main list
    const belongsToTrash = !!prod.isDeleted;
    if (belongsToTrash) return false;

    const query = productSearchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      prod.name.toLowerCase().includes(query) ||
      prod.shortDesc.toLowerCase().includes(query) ||
      prod.fullDesc.toLowerCase().includes(query) ||
      prod.benefits.some((b) => b.toLowerCase().includes(query));
    const matchesCat =
      productCategoryFilter === 'ALL' || prod.category === productCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // --- Product Editing State ---
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, 'id' | 'createdAt'>>({
    name: '',
    category: 'إدارة الوزن والتغذية اليومية',
    shortDesc: '',
    fullDesc: '',
    benefits: [''],
    usageInstructions: '',
    usageVideoUrl: '',
    keyIngredients: '',
    targetAudience: '',
    price: '',
    priceSAR: '',
    priceUSD: '',
    priceIQD: '',
    priceYER: '',
    imageUrl: '',
    marketingHooks: [''],
    images: [],
    docs: [],
    videos: [],
    forbiddenItems: [],
    alternativeItems: [],
    isDeleted: false,
  });

  // Dynamic available categories list combining registered categories, all product categories, and current form category
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => c && set.add(c.trim()));
    if (Array.isArray(products)) {
      products.forEach((p) => p.category && set.add(p.category.trim()));
    }
    if (productForm.category) {
      set.add(productForm.category.trim());
    }
    return Array.from(set);
  }, [categories, products, productForm.category]);

  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    handleCancelVideoEdit();
    handleCancelImageEdit();
    setProductForm({
      name: '',
      category: categories[0] || 'إدارة الوزن والتغذية اليومية',
      shortDesc: '',
      fullDesc: '',
      benefits: [''],
      usageInstructions: '',
      usageVideoUrl: '',
      keyIngredients: '',
      targetAudience: '',
      price: '',
      priceSAR: '',
      priceUSD: '',
      priceIQD: '',
      priceYER: '',
      imageUrl: '',
      marketingHooks: [''],
      images: [],
      docs: [],
      videos: [],
      forbiddenItems: [],
      alternativeItems: [],
    });
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    handleCancelVideoEdit();
    handleCancelImageEdit();

    // Ensure the product's category is registered in categories list so the select doesn't fall back
    const prodCategory = (prod.category || '').trim();
    if (prodCategory && !categories.includes(prodCategory)) {
      const updatedCats = [...categories, prodCategory];
      saveCategories(updatedCats);
    }

    const parsedPrices = parseProductPrices(prod.price, prod);

    const existingImages: ProductImage[] =
      prod.images && prod.images.length > 0
        ? prod.images.map((img) => ({ ...img }))
        : prod.imageUrl
        ? [
            {
              id: `img-${prod.id}-main`,
              title: 'صورة المنتج الرئيسية',
              imageUrl: prod.imageUrl,
              aiDescription: `صورة العبوة الأساسية لمنتج ${prod.name} تظهر الهوية والتصميم الأصلي.`,
              displayTrigger: 'تُعرض في بداية المحادثة وعند التعريف الأولي بالمنتج للمستخدم.',
              dependsOnImageId: 'none',
              isMain: true,
            },
          ]
        : [];

    setProductForm({
      name: prod.name || '',
      category: prodCategory || categories[0] || 'إدارة الوزن والتغذية اليومية',
      shortDesc: prod.shortDesc || '',
      fullDesc: prod.fullDesc || '',
      benefits: prod.benefits && prod.benefits.length > 0 ? [...prod.benefits] : [''],
      usageInstructions: prod.usageInstructions || '',
      usageVideoUrl: prod.usageVideoUrl || '',
      keyIngredients: prod.keyIngredients || '',
      targetAudience: prod.targetAudience || '',
      price: prod.price || '',
      priceSAR: prod.priceSAR || parsedPrices.rawSar || '',
      priceUSD: prod.priceUSD || parsedPrices.rawUsd || '',
      priceYER: prod.priceYER || parsedPrices.rawYer || '',
      priceIQD: prod.priceIQD || '',
      imageUrl: prod.imageUrl || (existingImages[0]?.imageUrl || ''),
      marketingHooks: prod.marketingHooks && prod.marketingHooks.length > 0 ? [...prod.marketingHooks] : [''],
      images: existingImages,
      docs: prod.docs ? [...prod.docs] : [],
      videos: prod.videos ? prod.videos.map((v) => ({ ...v })) : [],
      forbiddenItems: prod.forbiddenItems ? [...prod.forbiddenItems] : [],
      alternativeItems: prod.alternativeItems ? [...prod.alternativeItems] : [],
      isDeleted: !!prod.isDeleted,
    });
    setIsEditingProduct(true);
  };

  const handleToggleTrash = (id: string) => {
    const targetProd = products.find(p => p.id === id);
    const updated = products.map((p) =>
      p.id === id ? { ...p, isDeleted: true, deletedAt: Date.now() } : p
    );
    onSaveProducts(updated);
    showToast(`🗑️ تم نقل منتج "${targetProd?.name || ''}" إلى سلة المهملات`);
  };

  const handleEmptyTrash = () => {
    if (confirm('هل أنت متأكد من إفراغ سلة المهملات؟ سيتم حذف جميع المنتجات بداخلها نهائياً.')) {
      onSaveProducts(products.filter((p) => !p.isDeleted));
      showToast('✅ تم إفراغ سلة المهملات');
    }
  };

  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const handleSaveProductForm = async () => {
    if (!productForm.name.trim()) {
      showToast('⚠️ يرجى كتابة اسم المنتج أولاً');
      return;
    }

    // Determine main image
    const mainImg =
      productForm.images?.find((img) => img.isMain)?.imageUrl ||
      productForm.images?.[0]?.imageUrl ||
      productForm.imageUrl ||
      '';

    // Auto compose unified price string from the 3 currencies
    const priceParts: string[] = [];
    if (productForm.priceSAR?.trim()) priceParts.push(productForm.priceSAR.trim());
    if (productForm.priceUSD?.trim()) priceParts.push(productForm.priceUSD.trim());
    if (productForm.priceYER?.trim()) priceParts.push(productForm.priceYER.trim());
    else if (productForm.priceIQD?.trim()) priceParts.push(productForm.priceIQD.trim());
    const composedPrice =
      priceParts.length > 0
        ? priceParts.join(' | ')
        : (productForm.price?.trim() || '');

    // Ensure usageVideoUrl is also registered in the videos album for direct interactive playback
    let finalVideos = [...(productForm.videos || [])];
    if (productForm.usageVideoUrl?.trim()) {
      const exists = finalVideos.some((v) => v.videoUrl === productForm.usageVideoUrl?.trim());
      if (!exists) {
        finalVideos.unshift({
          id: `vid-${editingProductId || Date.now()}-usage`,
          title: `فيديو شرح وطريقة استخدام ${productForm.name}`,
          description: `شرح تفصيلي لطريقة استخدام ${productForm.name}`,
          contextAndTrigger: 'طريقة استخدام المنتج والجرعات ومقاطع الفيديو التوضيحية المباشرة',
          videoUrl: productForm.usageVideoUrl.trim(),
          isYouTube: true,
          duration: '0:59',
        });
      }
    }

    const finalProductData = {
      ...productForm,
      category: productForm.category.trim(),
      priceSAR: productForm.priceSAR?.trim() || '',
      priceUSD: productForm.priceUSD?.trim() || '',
      priceYER: productForm.priceYER?.trim() || '',
      priceIQD: productForm.priceIQD?.trim() || (productForm.priceYER?.trim() ? productForm.priceYER.trim().replace('ر.ي', 'د.ع') : ''),
      videos: finalVideos,
      price: composedPrice,
      imageUrl: mainImg,
      benefits: productForm.benefits.filter((b) => b.trim() !== ''),
      marketingHooks: (productForm.marketingHooks || []).filter((h) => h.trim() !== ''),
    };

    setIsSavingProduct(true);
    try {
      let updated: Product[];
      if (editingProductId) {
        updated = products.map((p) =>
          p.id === editingProductId
            ? {
                ...p,
                ...finalProductData,
              }
            : p
        );
      } else {
        const newProd: Product = {
          id: `prod-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          ...finalProductData,
        };
        updated = [newProd, ...products];
      }

      await saveProducts(updated);
      try { localStorage.setItem('herbalife_ai_products_v1', JSON.stringify(updated)); } catch {}
      onSaveProducts(updated);
      showToast(editingProductId ? '✅ تم تحديث بيانات المنتج وحفظها في الخادم بنجاح' : '✅ تم حفظ المنتج الجديد في قاعدة المعرفة والخادم بنجاح');
      handleCancelVideoEdit();
      handleCancelImageEdit();
      setIsEditingProduct(false);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert('حدث خطأ أثناء حفظ المنتج في الخادم: ' + (err.message || 'خطأ'));
    } finally {
      setIsSavingProduct(false);
    }
  };



  // Document Knowledge Management State
  const [editingDocIndex, setEditingDocIndex] = useState<number | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState<boolean>(false);
  const [previewDocForModal, setPreviewDocForModal] = useState<AttachedDoc | null>(null);
  const [docDraft, setDocDraft] = useState<AttachedDoc>({
    id: '',
    name: '',
    size: 0,
    type: 'pdf',
    uploadedAt: new Date().toISOString().split('T')[0],
    extractedText: '',
  });

  const handleStartAddDoc = () => {
    setEditingDocIndex(null);
    setDocDraft({
      id: `doc-${Date.now()}`,
      name: '',
      size: 0,
      type: 'pdf',
      uploadedAt: new Date().toISOString().split('T')[0],
      extractedText: '',
    });
    setIsAddingDoc(true);
  };

  const handleStartEditDoc = (idx: number) => {
    const list = productForm.docs || [];
    if (!list[idx]) return;
    setIsAddingDoc(false);
    setEditingDocIndex(idx);
    setDocDraft({ ...list[idx] });
  };

  const handleCancelDocEdit = () => {
    setIsAddingDoc(false);
    setEditingDocIndex(null);
    setDocDraft({
      id: '',
      name: '',
      size: 0,
      type: 'pdf',
      uploadedAt: new Date().toISOString().split('T')[0],
      extractedText: '',
    });
  };

  const handleSaveDocDraft = () => {
    if (!docDraft.name.trim()) {
      showToast('⚠️ يرجى كتابة عنوان أو اسم المستند');
      return;
    }
    
    setProductForm((prev) => {
      const currentDocs = prev.docs ? [...prev.docs] : [];
      let updated: AttachedDoc[];

      if (editingDocIndex !== null) {
        updated = [...currentDocs];
        updated[editingDocIndex] = { ...docDraft };
      } else {
        updated = [
          ...currentDocs,
          {
            ...docDraft,
            id: docDraft.id || `doc-${Date.now()}`,
          },
        ];
      }
      return { ...prev, docs: updated };
    });

    showToast(editingDocIndex !== null ? 'تم تحديث بيانات ومحتوى المستند بنجاح' : 'تم حفظ المستند في قاعدة المعرفة بنجاح');
    handleCancelDocEdit();
  };

  // Document Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    e.target.value = ''; // Reset so the same file can be selected again

    const fileType: 'pdf' | 'word' | 'text' | 'other' = file.name.endsWith('.pdf')
      ? 'pdf'
      : file.name.endsWith('.docx') || file.name.endsWith('.doc')
      ? 'word'
      : file.name.endsWith('.txt') || file.name.endsWith('.md')
      ? 'text'
      : 'other';

    if (fileType === 'text') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = (event.target?.result as string) || '';
        const newDoc: AttachedDoc = {
          id: `doc-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: 'text',
          uploadedAt: new Date().toISOString().split('T')[0],
          extractedText: textContent.trim() || 'ملف نصي معتمد يحتوي على بيانات ومعلومات المنتج.',
          fileData: textContent,
        };

        const currentDocs = productForm.docs ? [...productForm.docs] : [];
        const updated = [...currentDocs, newDoc];
        setProductForm((prev) => ({
          ...prev,
          docs: updated,
        }));
        setDocDraft(newDoc);
        setEditingDocIndex(updated.length - 1);
        setIsAddingDoc(false);
        showToast(`✅ تم رفع واستخراج بيانات الملف [${file.name}] بنجاح`);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = (event.target?.result as string) || '';
        showToast(`⏳ جاري استخراج محتوى وقراءة نصوص [${file.name}]...`);
        let extracted = '';
        try {
          const res = await fetch('/api/documents/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: dataUrl, fileName: file.name }),
          });
          const json = await res.json();
          if (json.success && json.text && json.text.trim().length > 0) {
            extracted = json.text.trim();
          }
        } catch (e) {
          console.warn('Extraction fallback:', e);
        }

        const initialSummary = extracted || `مستند وأبحاث معتمدة [${file.name}] لدعم منتج ${productForm.name || 'المنتج'}. يحتوي على أبحاث مخبرية وسريرية تؤكد الجودة والفعالية.`;
        const newDoc: AttachedDoc = {
          id: `doc-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: fileType,
          uploadedAt: new Date().toISOString().split('T')[0],
          extractedText: initialSummary,
          fileData: dataUrl,
        };

        const currentDocs = productForm.docs ? [...productForm.docs] : [];
        const updated = [...currentDocs, newDoc];
        setProductForm((prev) => ({
          ...prev,
          docs: updated,
        }));
        setDocDraft(newDoc);
        setEditingDocIndex(updated.length - 1);
        setIsAddingDoc(false);
        showToast(
          extracted
            ? `✅ تم استخراج ${extracted.length} حرف من [${file.name}] وربطها بالذكاء الاصطناعي بنجاح!`
            : `✅ تم رفع وحفظ [${file.name}] بنجاح!`
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveDoc = (id: string) => {
    const updatedDocs = productForm.docs.map((d) => (d.id === id ? { ...d, isDeleted: true } : d));
    setProductForm((prev) => ({
      ...prev,
      docs: updatedDocs,
    }));
    
    // Also update the main products list to reflect this soft-deletion in real-time
    const updatedProducts = products.map(p => {
      if (p.id === editingProductId) {
        return { ...p, docs: updatedDocs };
      }
      return p;
    });
    onSaveProducts(updatedProducts);

    if (editingDocIndex !== null) {
      handleCancelDocEdit();
    }
    showToast('🗑️ تم نقل المستند إلى سلة المهملات');
  };

  const handleClearAllDocs = () => {
    setProductForm((prev) => ({
      ...prev,
      docs: [],
    }));
    handleCancelDocEdit();
    showToast('تم تفريغ جميع المستندات المرفقة بالمنتج');
  };

  // --- Prompts Management State ---
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptSearchQuery, setPromptSearchQuery] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptIsActive, setPromptIsActive] = useState(false);
  const [promptForm, setPromptForm] = useState<Omit<PersuasionPrompt, 'id' | 'isSystemDefault' | 'isActive'>>({
    title: '',
    description: '',
    tone: '',
    neuromarketingConcept: '',
    promptText: '',
  });

  const handleTestPrompt = (p: PersuasionPrompt) => {
    handleActivatePrompt(p.id);
    onClose();
    showToast(`🚀 تم تفعيل برومبت "${p.title}" والبدء في تجربة حية الآن`);
  };

  const filteredPrompts = prompts.filter(p => 
    !p.isDeleted && (
      p.title.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
      p.promptText.toLowerCase().includes(promptSearchQuery.toLowerCase())
    )
  );

  const handleActivatePrompt = async (id: string) => {
    const updated = prompts.map((p) => ({
      ...p,
      isActive: p.id === id,
    }));
    try {
      await savePrompts(updated);
      try { localStorage.setItem('herbalife_ai_prompts_v1', JSON.stringify(updated)); } catch {}
      onSavePrompts(updated);
      showToast('✅ تم تفعيل البرومبت المختار وحفظه بشكل دائم في الخادم');
    } catch (err: any) {
      console.error('Failed to activate prompt on server:', err);
      onSavePrompts(updated);
      showToast('⚠️ تم التفعيل محلياً، يرجى فحص الاتصال بالخادم');
    }
  };

  const handleOpenAddPrompt = () => {
    setEditingPromptId(null);
    setPromptIsActive(false);
    setPromptForm({
      title: 'برومبت تسويقي عصبي مخصص',
      description: 'وصف للأسلوب التكتيكي والإقناعي',
      tone: 'دافئ، محفز، مباشر ومقنع',
      neuromarketingConcept: 'التركيز على المكافأة الفورية واستثارة هرمون الدوبامين',
      promptText: 'أنت مستشار هيربولايف... تحدث بثقة وشجع العميل على اتخاذ خطوة التغيير اليوم.',
    });
    setIsEditingPrompt(true);
  };

  const handleOpenEditPrompt = (p: PersuasionPrompt) => {
    setEditingPromptId(p.id);
    setPromptIsActive(!!p.isActive);
    setPromptForm({
      title: p.title,
      description: p.description,
      tone: p.tone,
      neuromarketingConcept: p.neuromarketingConcept,
      promptText: p.promptText,
    });
    setIsEditingPrompt(true);
  };

  const handleSavePromptForm = async (forceActivate?: boolean) => {
    if (!promptForm.title.trim() || !promptForm.promptText.trim()) {
      alert('يرجى ملء عنوان البرومبت ونصه بالكامل');
      return;
    }

    setIsSavingPrompt(true);
    try {
      const willBeActive = forceActivate !== undefined ? forceActivate : promptIsActive;
      const targetId = editingPromptId || `prompt-${Date.now()}`;
      let updated: PersuasionPrompt[];

      if (editingPromptId) {
        updated = prompts.map((p) =>
          p.id === editingPromptId
            ? {
                ...p,
                ...promptForm,
                isActive: willBeActive ? true : (editingPromptId ? p.isActive : false),
              }
            : willBeActive ? { ...p, isActive: false } : p
        );
      } else {
        const newPrompt: PersuasionPrompt = {
          id: targetId,
          isSystemDefault: false,
          isActive: willBeActive,
          ...promptForm,
        };
        const baseList = willBeActive ? prompts.map((p) => ({ ...p, isActive: false })) : prompts;
        updated = [...baseList, newPrompt];
      }

      // If active, ensure other prompts are inactive
      if (willBeActive) {
        updated = updated.map((p) => ({
          ...p,
          isActive: p.id === targetId,
        }));
      }

      // 1. Persist directly to backend API
      await savePrompts(updated);

      // 2. Safe local storage write
      try {
        localStorage.setItem('herbalife_ai_prompts_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('localStorage error:', e);
      }

      // 3. Update React parent state
      onSavePrompts(updated);

      showToast(
        willBeActive
          ? '✅ تم حفظ وتفعيل البرومبت بنجاح وبشكل دائم في الخادم'
          : '✅ تم حفظ التعديلات على البرومبت بنجاح وبشكل دائم في الخادم'
      );
      setIsEditingPrompt(false);
    } catch (err: any) {
      console.error('Failed to save prompt:', err);
      alert('حدث خطأ أثناء حفظ البرومبت في الخادم: ' + (err.message || 'خطأ في الاتصال'));
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleClonePrompt = async (p: PersuasionPrompt) => {
    const clone: PersuasionPrompt = {
      ...p,
      id: `prompt-${Date.now()}`,
      title: `نسخة من: ${p.title}`,
      isSystemDefault: false,
      isActive: false,
    };
    const updated = [...prompts, clone];
    try {
      await savePrompts(updated);
      try { localStorage.setItem('herbalife_ai_prompts_v1', JSON.stringify(updated)); } catch {}
      onSavePrompts(updated);
      showToast('✅ تم استنساخ البرومبت وحفظه في الخادم');
    } catch {
      onSavePrompts(updated);
      showToast('تم استنساخ البرومبت محلياً');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const target = prompts.find((p) => p.id === id);
    if (target?.isSystemDefault) {
      alert('لا يمكن حذف البرومبت الافتراضي للنظام');
      return;
    }
    if (target?.isActive) {
      alert('لا يمكن حذف البرومبت النشط حالياً؛ يرجى تفعيل برومبت آخر أولاً');
      return;
    }
    if (confirm(`هل أنت متأكد من نقل البرومبت "${target?.title}" إلى سلة المهملات؟`)) {
      const updated = prompts.map((p) =>
        p.id === id
          ? {
              ...p,
              isDeleted: true,
              deletedAt: Date.now(),
            }
          : p
      );
      try {
        await savePrompts(updated);
        try { localStorage.setItem('herbalife_ai_prompts_v1', JSON.stringify(updated)); } catch {}
        onSavePrompts(updated);
        showToast('🗑️ تم نقل البرومبت إلى سلة المهملات بنجاح');
        loadTrash();
      } catch (err) {
        console.error('Failed to move prompt to trash:', err);
        onSavePrompts(updated);
        showToast('تم نقل البرومبت إلى السلة محلياً');
      }
    }
  };

  // --- Global Rules State ---
  const [newForbiddenWord, setNewForbiddenWord] = useState('');
  const [newMandatoryWord, setNewMandatoryWord] = useState('');
  const [forbiddenGuidelines, setForbiddenGuidelines] = useState(forbiddenRule.guidelines);
  const [forbiddenIsActive, setForbiddenIsActive] = useState(forbiddenRule.isActive);
  const [forbiddenWordsList, setForbiddenWordsList] = useState<string[]>([...forbiddenRule.forbiddenWords]);
  const [mandatoryWordsList, setMandatoryWordsList] = useState<string[]>([...(forbiddenRule.mandatoryWords || [])]);

  const handleAddForbiddenWord = () => {
    if (!newForbiddenWord.trim()) return;
    const word = newForbiddenWord.trim();
    if (forbiddenWordsList.includes(word)) {
      alert('هذه الكلمة مضافة بالفعل في قائمة القواعد والقيود');
      return;
    }
    if (mandatoryWordsList.includes(word)) {
      alert('⚠️ تنبيه: لا يمكنك منع هذه الكلمة لأنها موجودة حالياً في قائمة الكلمات الإجبارية. يرجى حذفها من الكلمات الإجبارية أولاً.');
      return;
    }
    setForbiddenWordsList([...forbiddenWordsList, word]);
    setNewForbiddenWord('');
  };

  const handleRemoveForbiddenWord = (word: string) => {
    setForbiddenWordsList(forbiddenWordsList.filter((w) => w !== word));
  };

  const handleAddMandatoryWord = () => {
    if (!newMandatoryWord.trim()) return;
    const word = newMandatoryWord.trim();
    if (mandatoryWordsList.includes(word)) {
      alert('هذه الكلمة مضافة بالفعل في قائمة الكلمات الإجبارية');
      return;
    }
    if (forbiddenWordsList.includes(word)) {
      alert('⚠️ تنبيه: لا يمكنك إضافة هذه الكلمة لأنها موجودة حالياً في قائمة القواعد والقيود. يرجى حذفها أولاً.');
      return;
    }
    setMandatoryWordsList([...mandatoryWordsList, word]);
    setNewMandatoryWord('');
  };

  const handleRemoveMandatoryWord = (word: string) => {
    setMandatoryWordsList(mandatoryWordsList.filter((w) => w !== word));
  };

  const [isSavingForbidden, setIsSavingForbidden] = useState(false);

  const handleSaveForbidden = async () => {
    setIsSavingForbidden(true);
    const updatedRule: ForbiddenRule = {
      ...forbiddenRule,
      isActive: forbiddenIsActive,
      forbiddenWords: forbiddenWordsList,
      mandatoryWords: mandatoryWordsList,
      guidelines: forbiddenGuidelines,
    };
    try {
      await saveForbiddenRule(updatedRule);
      try { localStorage.setItem('herbalife_ai_forbidden_v1', JSON.stringify(updatedRule)); } catch {}
      onSaveForbiddenRule(updatedRule);
      showToast('✅ تم حفظ التعليمات والقيود والكلمات الإجبارية وتطبيقها بشكل دائم في الخادم');
    } catch (err: any) {
      console.error('Failed to save forbidden rules:', err);
      alert('حدث خطأ أثناء حفظ القواعد في الخادم: ' + (err.message || 'خطأ'));
    } finally {
      setIsSavingForbidden(false);
    }
  };

  // --- Logo Settings State ---
  const [localLogoConfig, setLocalLogoConfig] = useState<AppLogoConfig>({
    logoUrl: logoConfig.logoUrl,
    headerLogo: { ...logoConfig.headerLogo },
    menuLogo: { ...logoConfig.menuLogo },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const updated = { ...localLogoConfig, logoUrl: result };
      setLocalLogoConfig(updated);
      onSaveLogoConfig(updated);
      showToast('تم رفع صورة الشعار بنجاح');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogoConfig = () => {
    onSaveLogoConfig(localLogoConfig);
    showToast('تم حفظ وتطبيق خيارات الشعار بنجاح');
  };

  const handleResetLogoConfig = () => {
    setLocalLogoConfig(DEFAULT_APP_LOGO_CONFIG);
    onSaveLogoConfig(DEFAULT_APP_LOGO_CONFIG);
    showToast('تمت استعادة إعدادات الشعار الافتراضية');
  };

  // --- Welcome Settings State ---
  const [localWelcome, setLocalWelcome] = useState<WelcomeSettings>({
    ...welcomeSettings,
    quickSuggestions: [...welcomeSettings.quickSuggestions],
  });

  React.useEffect(() => {
    if (welcomeSettings) {
      setLocalWelcome({
        ...welcomeSettings,
        quickSuggestions: [...welcomeSettings.quickSuggestions],
      });
    }
  }, [welcomeSettings]);

  const [localPwa, setLocalPwa] = useState<PWASettings>(() => ({
    ...pwaSettings,
    introColors: { ...(pwaSettings.introColors || { background: '#00873D', text: '#FFFFFF', accent: '#D4AF37' }) },
    installPromptConfig: { ...(pwaSettings.installPromptConfig || { title: '', description: '', buttonText: '' }) },
  }));

  React.useEffect(() => {
    if (pwaSettings) {
      setLocalPwa({
        ...pwaSettings,
        introColors: { ...(pwaSettings.introColors || { background: '#00873D', text: '#FFFFFF', accent: '#D4AF37' }) },
        installPromptConfig: { ...(pwaSettings.installPromptConfig || { title: '', description: '', buttonText: '' }) },
      });
    }
  }, [pwaSettings]);

  const [localChatFeatures, setLocalChatFeatures] = useState<ChatFeatures>({ ...chatFeatures });

  React.useEffect(() => {
    if (chatFeatures) {
      setLocalChatFeatures({ ...chatFeatures });
    }
  }, [chatFeatures]);

  const [localSharingSettings, setLocalSharingSettings] = useState<SharingSettings>({ ...sharingSettings });

  React.useEffect(() => {
    if (sharingSettings) {
      setLocalSharingSettings({ ...sharingSettings });
    }
  }, [sharingSettings]);
  const [newSuggestionInput, setNewSuggestionInput] = useState('');

  const handleAddSuggestion = () => {
    if (!newSuggestionInput.trim()) return;
    setLocalWelcome({
      ...localWelcome,
      quickSuggestions: [...localWelcome.quickSuggestions, newSuggestionInput.trim()],
    });
    setNewSuggestionInput('');
  };

  const handleRemoveSuggestion = (idx: number) => {
    const updated = localWelcome.quickSuggestions.filter((_, i) => i !== idx);
    setLocalWelcome({ ...localWelcome, quickSuggestions: updated });
  };

  const handleUpdateSuggestion = (idx: number, val: string) => {
    const updated = [...localWelcome.quickSuggestions];
    updated[idx] = val;
    setLocalWelcome({ ...localWelcome, quickSuggestions: updated });
  };

  const handlePwaIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ يرجى اختيار ملف صورة صالح');
      return;
    }
    try {
      showToast('جاري معالجة الأيقونة...');
      const result = await compressImageFile(file, 512, 512, 0.8);
      setLocalPwa((prev) => ({ ...prev, appIconUrl: result }));
      showToast('✅ تم رفع أيقونة التطبيق بنجاح');
    } catch (err) {
      showToast('❌ فشل رفع الأيقونة');
    }
  };

  const handlePwaIntroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ يرجى اختيار ملف صورة صالح');
      return;
    }
    try {
      showToast('جاري معالجة شعار الانترو...');
      const result = await compressImageFile(file, 800, 800, 0.8);
      setLocalPwa((prev) => ({ ...prev, introLogoUrl: result }));
      showToast('✅ تم رفع شعار الانترو بنجاح');
    } catch (err) {
      showToast('❌ فشل رفع شعار الانترو');
    }
  };

  const handlePwaBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ يرجى اختيار ملف صورة صالح');
      return;
    }
    try {
      showToast('جاري معالجة خلفية الانترو...');
      const result = await compressImageFile(file, 1920, 1080, 0.75);
      setLocalPwa((prev) => ({ ...prev, introBackgroundUrl: result }));
      showToast('✅ تم رفع خلفية الانترو بنجاح');
    } catch (err) {
      showToast('❌ فشل رفع خلفية الانترو');
    }
  };

  const handleExportData = () => {
    const data = {
      products,
      prompts,
      forbiddenRule,
      logoConfig,
      welcomeSettings,
      categories,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `herbalife-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('🚀 تم تصدير النسخة الاحتياطية بنجاح');
  };

  const handleDownloadKBMD = () => {
    let md = `# Herbalife AI Knowledge Base (MD Optimized)\n\n`;
    products.forEach((p) => {
      md += `## [${p.id}] ${p.name}\n`;
      md += `- Price: ${p.priceSAR || ''} SAR | ${p.priceUSD || ''} USD | ${p.priceYER || p.priceIQD || ''} YER\n`;
      md += `- Description: ${p.fullDesc}\n`;
      md += `- Benefits: ${p.benefits.join(' • ')}\n`;
      md += `- Usage: ${p.usageInstructions}\n\n`;
    });
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kb-optimized-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📄 تم تحميل ملف MD المخصص لتقليل التوكنات بنجاح');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products) onSaveProducts(data.products);
        if (data.prompts) onSavePrompts(data.prompts);
        if (data.forbiddenRule) onSaveForbiddenRule(data.forbiddenRule);
        if (data.logoConfig) onSaveLogoConfig(data.logoConfig);
        if (data.welcomeSettings) onSaveWelcomeSettings(data.welcomeSettings);
        if (data.categories) saveCategories(data.categories);
        showToast('✅ تم استيراد البيانات وتحديث النظام بنجاح');
      } catch (err) {
        showToast('❌ فشل استيراد الملف؛ تأكد من أنه ملف نسخة احتياطية صالح');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetWelcome = () => {
    setLocalWelcome(DEFAULT_WELCOME_SETTINGS);
    onSaveWelcomeSettings(DEFAULT_WELCOME_SETTINGS);
    showToast('تمت استعادة الشاشة الترحيبية الافتراضية');
  };

  const handleSaveWelcome = () => {
    onSaveWelcomeSettings(localWelcome);
    showToast('تم حفظ إعدادات الشاشة الترحيبية بنجاح');
  };

  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // --- Authentication & User Management State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);

  const fetchUsers = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/auth/users', {
        headers: { 'x-session-id': sessionId }
      });
      if (res.ok) setDbUsers(await res.json());
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      fetchUsers();
    }
  }, [isAuthenticated, activeTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-id': sessionId 
        },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword })
      });
      if (res.ok) {
        setNewUserEmail('');
        setNewUserPassword('');
        setIsAddingUser(false);
        fetchUsers();
        showToast('✅ تم إضافة المستخدم بنجاح');
      } else {
        const data = await res.json();
        alert(data.error || 'فشل إضافة المستخدم');
      }
    } catch (err) {
      alert('خطأ في الاتصال');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!sessionId || !confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId }
      });
      if (res.ok) {
        fetchUsers();
        showToast('🗑️ تم حذف المستخدم');
      }
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const handleSetupTotp = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/auth/setup-totp', {
        method: 'POST',
        headers: { 'x-session-id': sessionId }
      });
      if (res.ok) setTotpSetup(await res.json());
    } catch (err) {
      alert('خطأ في إعداد المصادقة الثنائية');
    }
  };

  const handleLogout = () => {
    if (sessionId) {
      fetch('/api/auth/logout', { 
        method: 'POST', 
        headers: { 'x-session-id': sessionId } 
      });
    }
    setSessionId(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleSaveAllGeneral = async () => {
    setIsSavingGeneral(true);
    try {
      const payload: AppSettings = {
        logoConfig: localLogoConfig,
        welcomeSettings: localWelcome,
        categories,
        pwaSettings: localPwa,
        chatFeatures: localChatFeatures,
        sharingSettings: localSharingSettings,
      };
      await saveSettings(payload);
      try {
        localStorage.setItem('herbalife_ai_logo_config_v1', JSON.stringify(localLogoConfig));
        localStorage.setItem('herbalife_ai_welcome_v1', JSON.stringify(localWelcome));
        localStorage.setItem('herbalife_ai_pwa_v1', JSON.stringify(localPwa));
        localStorage.setItem('herbalife_ai_chat_features_v1', JSON.stringify(localChatFeatures));
        localStorage.setItem('herbalife_ai_sharing_settings_v1', JSON.stringify(localSharingSettings));
      } catch (e) {
        console.warn('localStorage save warning:', e);
      }
      onSavePwaSettings(localPwa);
      onSaveWelcomeSettings(localWelcome);
      onSaveLogoConfig(localLogoConfig);
      onSaveChatFeatures(localChatFeatures);
      onSaveSharingSettings(localSharingSettings);
      showToast('✅ تم حفظ وتثبيت كافة الإعدادات العامة بنجاح في الخادم');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      alert('حدث خطأ أثناء حفظ الإعدادات في الخادم: ' + (err.message || 'خطأ'));
    } finally {
      setIsSavingGeneral(false);
    }
  };

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <LoginOverlay 
        onLogin={(sid, user) => {
          setSessionId(sid);
          setCurrentUser(user);
          setIsAuthenticated(true);
        }} 
        onClose={onClose}
      />
    );
  }

  return (
    <div
      role="region"
      aria-label="لوحة التحكم"
      className="fixed inset-0 z-50 w-full h-full bg-[#FAFCFB] flex flex-col animate-in fade-in duration-150 select-none overflow-hidden"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl border border-emerald-500/40 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          {toastMessage}
        </div>
      )}

      {/* Dashboard Top Bar - High Contrast Professional Healthcare SaaS Header */}
      <header className="px-4 sm:px-8 xl:px-12 py-4 bg-white border-b-2 border-slate-300 flex items-center justify-between shrink-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border-2 border-[#00873D]/30 text-[#00873D] flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-6 h-6 text-[#00873D]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight">
                لوحة التحكم المركزية
              </h2>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00873D]" />
              <span className="text-xs sm:text-sm text-emerald-950 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-md hidden sm:inline border border-emerald-300">
                النظام الصحي المتكامل 360°
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-bold mt-1 hidden sm:block">
              إدارة قاعدة المعرفة، تخصيص المظهر والشعار، وتوجيهات الذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95 border border-rose-200"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-950 hover:bg-black text-white font-black rounded-xl text-sm sm:text-base flex items-center gap-2 shadow-xs transition-colors active:scale-98"
            aria-label="العودة لشاشة الدردشة"
          >
            <span>العودة لشاشة الدردشة</span>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout: Professional Right Sidebar Navigation + Content Area */}
      <div dir="rtl" className="flex-1 flex flex-row overflow-hidden bg-[#F8FAF9]">
        {/* Professional Enterprise Right-Hand Vertical Sidebar Navigation */}
        <aside className="w-72 sm:w-80 bg-white border-l-2 border-slate-300 shrink-0 flex flex-col shadow-xs overflow-y-auto select-none p-4 space-y-6 z-10">
          {/* Section 1: Content & Knowledge */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 block">
              المحتوى والمعرفة
            </span>
            <button
              type="button"
              onClick={() => { setActiveTab('products'); setIsEditingProduct(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'products'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className={`w-5 h-5 ${activeTab === 'products' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>قاعدة المعرفة</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trash')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'trash'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trash2 className={`w-5 h-5 ${activeTab === 'trash' ? 'text-rose-600' : 'text-slate-500'}`} />
                <span>سلة المهملات</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900">
                {products.filter(p => p.isDeleted).length + prompts.filter(p => p.isDeleted).length}
              </span>
            </button>
          </div>

          {/* Section 2: AI Suite & Analytics */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 block">
              منظومة الذكاء الاصطناعي
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('ai-engine')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'ai-engine'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Cpu className={`w-5 h-5 ${activeTab === 'ai-engine' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>مشغل الذكاء الاصطناعي</span>
              </div>
              {hasFailoverAlert ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                  ⚠️ طوارئ
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                  نشط ⚡
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('response-rules'); setIsEditingPrompt(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'response-rules'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Brain className={`w-5 h-5 ${activeTab === 'response-rules' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>قواعد الرد والبرومبت</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                {prompts.filter(p => !p.isDeleted).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics-ai')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'analytics-ai'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className={`w-5 h-5 ${activeTab === 'analytics-ai' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>تحليلات وذكاء المعرفة</span>
              </div>
              {unansweredQueries.filter(q => q.status === 'pending').length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                  {unansweredQueries.filter(q => q.status === 'pending').length}
                </span>
              )}
            </button>
          </div>

          {/* Section 3: System & Settings */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 block">
              النظام والإعدادات
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'backup'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Download className={`w-5 h-5 ${activeTab === 'backup' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>النسخ الاحتياطي</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'general'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className={`w-5 h-5 ${activeTab === 'general' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>إعدادات عامة</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'users'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${activeTab === 'users' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>المستخدمين</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'security'
                  ? 'bg-emerald-50 text-[#00873D] border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-5 h-5 ${activeTab === 'security' ? 'text-[#00873D]' : 'text-slate-500'}`} />
                <span>الأمان</span>
              </div>
            </button>
          </div>
        </aside>

        {/* Tab Body Content Area (Main, on the left of the right sidebar) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:px-12">
          <div className="w-full">
            {/* TAB 1: PRODUCTS & KNOWLEDGE BASE */}
          {activeTab === 'products' && (
            <div>
              {!isEditingProduct ? (
                <div className="space-y-6">
                  {/* Clean High-Contrast Search, Filter & Actions Toolbar */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-300 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-950">
                          قاعدة المعرفة والمنتجات
                        </h3>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          البيانات والمستندات والفيديوهات المعتمدة التي يستند عليها الذكاء الاصطناعي في الإجابات والإقناع
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-sm border-2 border-slate-300 shadow-2xs flex items-center gap-2 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-[#00873D]" />
                          <span>إدارة التصنيفات ({categories.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenAddProduct}
                          className="px-5 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white font-bold rounded-xl text-sm sm:text-base shadow-xs flex items-center gap-2 transition-all active:scale-95"
                        >
                          <Plus className="w-5 h-5" />
                          <span>إضافة منتج جديد</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search Bar - High Contrast */}
                    <div className="flex flex-col md:flex-row items-center gap-3 pt-3 border-t border-slate-200">
                      <div className="relative flex-1 w-full">
                        <Search className="w-5 h-5 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          placeholder="ابحث عن منتج بالاسم، الوصف، أو الفوائد..."
                          className="w-full pr-12 pl-4 py-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 placeholder:text-slate-500 transition-all outline-hidden shadow-2xs"
                        />
                        {productSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setProductSearchQuery('')}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                          value={productCategoryFilter}
                          onChange={(e) => setProductCategoryFilter(e.target.value)}
                          className="w-full md:w-64 py-3 px-4 bg-white border-2 border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-950 focus:border-[#00873D] outline-hidden shadow-2xs"
                        >
                          <option value="ALL">كل التصنيفات ({products.length})</option>
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>

                        <span className="text-sm text-slate-900 whitespace-nowrap font-bold px-1 shrink-0">
                          عرض {filteredProducts.length} من {products.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Products Grid - Full Width Responsive Grid on Desktop */}
                  {filteredProducts.length === 0 ? (
                    <div className="p-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-300 text-slate-700 space-y-3">
                      <Database className="w-12 h-12 text-slate-400 mx-auto" />
                      <p className="text-base sm:text-lg font-black text-slate-950">لا توجد نتائج مطابقة لبحثك</p>
                      <p className="text-sm font-semibold text-slate-800">
                        جرب تغيير كلمات البحث أو اختيار تصنيف مختلف
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearchQuery('');
                          setProductCategoryFilter('ALL');
                        }}
                        className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-950 font-bold rounded-xl text-sm transition-colors"
                      >
                        إعادة ضبط الفلترة
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 w-full">
                      {filteredProducts.map((prod) => {
                        const prices = parseProductPrices(prod.price, prod);
                        const imagesCount = prod.images ? prod.images.length : (prod.imageUrl ? 1 : 0);
                        return (
                          <div
                            key={prod.id}
                            className="w-full bg-white rounded-2xl border-2 border-slate-200 hover:border-[#00873D] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 group"
                          >
                            {/* Right Section (in RTL): Image + Product Details */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl border border-slate-200 shadow-2xs group-hover:scale-102 transition-transform bg-slate-50"
                                />
                                {imagesCount > 1 && (
                                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs">
                                    <ImageIcon className="w-3 h-3 text-[#D4AF37]" />
                                    <span>{imagesCount} صور</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-[#00873D] border border-emerald-300">
                                    {prod.category}
                                  </span>
                                  {prod.targetAudience && (
                                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                      {prod.targetAudience}
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-[#00873D] transition-colors leading-snug">
                                  {prod.name}
                                </h4>

                                <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-2 leading-relaxed max-w-3xl">
                                  {prod.shortDesc || prod.fullDesc}
                                </p>

                                {/* Media & Resources Status Bar */}
                                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-700 font-bold">
                                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900">
                                    <Film className="w-3.5 h-3.5 text-[#00873D]" />
                                    <span>{prod.videos ? prod.videos.length : 0} فيديوهات</span>
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900">
                                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                                    <span>{prod.docs ? prod.docs.length : 0} مستندات</span>
                                  </span>
                                  {prod.usageVideoUrl ? (
                                    <span className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[#00873D]">
                                      <span>فيديو الاستخدام: متوفر 🎬</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">فيديو الاستخدام: غير مدرج</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Center Section: 3-Currency Price Box */}
                            <div className="shrink-0 w-full lg:w-64 bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                  <Coins className="w-4 h-4 text-[#00873D]" />
                                  <span>الأسعار بالعملات المعتمدة</span>
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-600">🇸🇦 الريال السعودي:</span>
                                  <span className="font-black text-emerald-800 font-mono text-sm">{prices.sar}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-600">🇺🇸 الدولار:</span>
                                  <span className="font-black text-slate-900 font-mono text-sm">{prices.usd}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-600">🇾🇪 الريال اليمني (عملة جديدة):</span>
                                  <span className="font-black text-amber-900 font-mono text-sm">{prices.yer}</span>
                                </div>
                              </div>
                            </div>

                            {/* Left Section (in RTL): Action Controls */}
                            <div className="flex items-center lg:flex-col justify-end gap-2.5 shrink-0 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(prod)}
                                className="flex-1 lg:flex-none px-5 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>تعديل المنتج</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTrash(prod.id)}
                                className="flex-1 lg:flex-none px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-200 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>نقل للسلة</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* PRODUCT FORM (ADD/EDIT) - High Contrast & Large Clear Text */
                <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h3 className="text-lg sm:text-xl font-black text-slate-950 flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-[#00873D]" />
                      {editingProductId ? 'تعديل بيانات المنتج' : 'إنشاء قسم منتج جديد بالكامل'}
                    </h3>
                    <button
                      onClick={() => setIsEditingProduct(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-950 text-sm font-bold rounded-xl border border-slate-300 transition-colors"
                    >
                      إلغاء والعودة
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-1">
                      <label className="text-sm font-bold text-slate-950 block mb-2">اسم المنتج: *</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductForm(prev => ({ ...prev, name: val }));
                        }}
                        placeholder="مثال: شيك فورمولا 1 - نكهة الفراولة"
                        className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors shadow-2xs"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-sm font-bold text-slate-950 block mb-2">صورة المنتج الرئيسية (الغلاف):</label>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative group">
                          {productForm.imageUrl ? (
                            <img src={productForm.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                          <label className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <input type="file" accept="image/*" onChange={handleUploadMainProductImage} className="hidden" />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => handleUploadMainProductImage(e);
                            input.click();
                          }}
                          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold rounded-xl text-xs border border-slate-300 flex items-center justify-center gap-2 transition-all"
                        >
                          <Upload className="w-4 h-4 text-[#00873D]" />
                          <span>رفع صورة الغلاف</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm sm:text-base font-bold text-slate-950">التصنيف: *</label>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="text-xs sm:text-sm font-bold text-[#00873D] hover:underline flex items-center gap-1.5"
                          title="إضافة، تعديل أو حذف التصنيفات"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>إدارة التصنيفات</span>
                        </button>
                      </div>
                      <div>
                        <select
                          value={productForm.category}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductForm(prev => ({ ...prev, category: val }));
                          }}
                          className="w-full p-3.5 bg-white border-2 border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-950 focus:border-[#00873D] outline-hidden shadow-2xs"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* تسعير المنتج بالعملات الثلاث المعتمدة (ريال سعودي - دولار أمريكي - ريال يمني عملة جديدة) */}
                  <div className="p-5 sm:p-6 bg-emerald-50/40 rounded-2xl border-2 border-emerald-300 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-[#00873D]" />
                          <h4 className="text-base sm:text-lg font-black text-slate-950">
                            تسعير المنتج بالعملات الثلاث المعتمدة
                          </h4>
                          <span className="px-2.5 py-0.5 bg-[#00873D] text-white text-xs font-black rounded-full shadow-2xs">
                            3 عملات رسمية
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 font-bold mt-1">
                          حدد السعر بالعملات الثلاث ليتمكن المستشار الذكي من الإجابة بدقة حسب عملة أو استفسار العميل.
                        </p>
                      </div>

                      {/* Live Combined Summary Preview */}
                      {(productForm.priceSAR || productForm.priceUSD || productForm.priceYER || productForm.priceIQD || productForm.price) && (
                        <div className="bg-white px-3.5 py-1.5 rounded-xl border border-emerald-300 text-xs sm:text-sm font-black text-emerald-900 shadow-2xs flex items-center gap-2 self-start sm:self-center">
                          <span className="text-slate-500 font-bold">معاينة السعر الموحد:</span>
                          <span className="text-[#00873D]">
                            {[productForm.priceSAR, productForm.priceUSD, productForm.priceYER || productForm.priceIQD].filter(Boolean).join(' | ') || productForm.price}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 1. الريال السعودي */}
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-300 focus-within:border-[#00873D] transition-colors shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                            <span>الريال السعودي (SAR)</span>
                          </label>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-black rounded-md flex items-center gap-1">
                            <span>🇸🇦 ر.س</span>
                          </span>
                        </div>
                        <input
                          type="text"
                          value={productForm.priceSAR || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductForm(prev => ({ ...prev, priceSAR: val }));
                          }}
                          placeholder="مثال: 215 ر.س"
                          className="w-full p-3 bg-slate-50 border border-slate-300 focus:border-[#00873D] rounded-lg text-sm sm:text-base font-black text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                          السعر المعتمد للسوق السعودي والخليج
                        </span>
                      </div>

                      {/* 2. الدولار الأمريكي */}
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-300 focus-within:border-[#00873D] transition-colors shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                            <span>الدولار الأمريكي (USD)</span>
                          </label>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-950 border border-blue-300 text-[11px] font-black rounded-md flex items-center gap-1">
                            <span>💵 USD $</span>
                          </span>
                        </div>
                        <input
                          type="text"
                          value={productForm.priceUSD || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductForm(prev => ({ ...prev, priceUSD: val }));
                          }}
                          placeholder="مثال: 58$"
                          className="w-full p-3 bg-slate-50 border border-slate-300 focus:border-[#00873D] rounded-lg text-sm sm:text-base font-black text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                          السعر العالمي والمبيعات بالدولار
                        </span>
                      </div>

                      {/* 3. الريال اليمني (عملة جديدة) */}
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-300 focus-within:border-[#00873D] transition-colors shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                            <span>الريال اليمني - عملة جديدة (YER)</span>
                          </label>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black rounded-md flex items-center gap-1">
                            <span>🇾🇪 ر.ي (جديدة)</span>
                          </span>
                        </div>
                        <input
                          type="text"
                          value={productForm.priceYER || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductForm(prev => ({ ...prev, priceYER: val, priceIQD: val.replace('ر.ي', 'د.ع') }));
                          }}
                          placeholder="مثال: 34,000 ر.ي"
                          className="w-full p-3 bg-slate-50 border border-slate-300 focus:border-[#00873D] rounded-lg text-sm sm:text-base font-black text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                          السعر المعتمد بالريال اليمني (عملة جديدة)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm sm:text-base font-bold text-slate-950 block mb-2">الوصف المختصر: *</label>
                      <input
                        type="text"
                        value={productForm.shortDesc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductForm(prev => ({ ...prev, shortDesc: val }));
                        }}
                        placeholder="سطر مشوق يلخص القيمة العظمى للمنتج"
                        className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-sm sm:text-base font-bold text-slate-950 block mb-2">الوصف الكامل والبيانات التفصيلية:</label>
                      <textarea
                        rows={4}
                        value={productForm.fullDesc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductForm(prev => ({ ...prev, fullDesc: val }));
                        }}
                        placeholder="اكتب هنا كافة تفاصيل وبيانات المنتج ليفهمها الذكاء الاصطناعي بدقة..."
                        className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 placeholder:text-slate-400 outline-hidden leading-relaxed transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm sm:text-base font-bold text-slate-950 block mb-2">
                      الفوائد الرئيسية (نقاط الإقناع):
                    </label>
                    <div className="space-y-2.5">
                      {productForm.benefits.map((b, idx) => (
                        <div key={idx} className="flex gap-2.5">
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => {
                              const updated = [...productForm.benefits];
                              updated[idx] = e.target.value;
                              setProductForm({ ...productForm, benefits: updated });
                            }}
                            placeholder={`فائدة إقناعية ${idx + 1}`}
                            className="flex-1 p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 outline-hidden shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = productForm.benefits.filter((_, i) => i !== idx);
                              setProductForm({ ...productForm, benefits: updated });
                            }}
                            className="p-3 text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
                            title="حذف هذه الفائدة"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm({
                            ...productForm,
                            benefits: [...productForm.benefits, ''],
                          })
                        }
                        className="text-sm font-bold text-[#00873D] hover:text-[#007033] flex items-center gap-1.5 mt-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة فائدة جديدة</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm sm:text-base font-bold text-slate-950 block mb-2">
                      هندسة "أسئلة الهوك" الإقناعية (خطوات الشيطان):
                    </label>
                    <p className="text-xs text-slate-600 font-bold mb-3">
                      اكتب أسئلة تثير الفضول وتدفع العميل لمشاهدة الفيديوهات أو طلب المنتج (اقتراحات ذكية).
                    </p>
                    <div className="space-y-2.5">
                      {productForm.marketingHooks?.map((hook, idx) => (
                        <div key={idx} className="flex gap-2.5">
                          <input
                            type="text"
                            value={hook}
                            onChange={(e) => {
                              const updated = [...(productForm.marketingHooks || [])];
                              updated[idx] = e.target.value;
                              setProductForm({ ...productForm, marketingHooks: updated });
                            }}
                            placeholder={`سؤال هوك إقناعي ${idx + 1}`}
                            className="flex-1 p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 outline-hidden shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (productForm.marketingHooks || []).filter((_, i) => i !== idx);
                              setProductForm({ ...productForm, marketingHooks: updated });
                            }}
                            className="p-3 text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
                            title="حذف هذا الهوك"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm({
                            ...productForm,
                            marketingHooks: [...(productForm.marketingHooks || []), ''],
                          })
                        }
                        className="text-sm font-bold text-[#00873D] hover:text-[#007033] flex items-center gap-1.5 mt-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة سؤال هوك جديد</span>
                      </button>
                    </div>
                  </div>

                  {/* ألبوم صور المنتج التفاعلي مع الذكاء الاصطناعي (Smart Product Images Album) */}
                  <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <ImageIcon className="w-6 h-6 text-[#00873D]" />
                          <h4 className="text-base sm:text-lg font-black text-slate-950">
                            ألبوم صور المنتج التفاعلي مع الذكاء الاصطناعي (Smart Images Album)
                          </h4>
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black rounded-full">
                            {(productForm.images || []).length} صور
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 font-bold mt-1">
                          ارفع عدة صور للمنتج، وضّح للذكاء الاصطناعي ما بداخل كل صورة، وحدد متى يرسلها للمستخدم وشرط التسلسل الاختياري.
                        </p>
                      </div>

                      {!isAddingNewImage && editingImageIndex === null && (
                        <div className="flex items-center gap-2">
                          {(productForm.images || []).length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllImages}
                              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                              title="حذف وتفريغ جميع الصور من الألبوم دفعة واحدة"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>تفريغ الصور ({(productForm.images || []).length})</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleStartAddImage}
                            className="px-4 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white text-sm font-black rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>رفع / إضافة صورة جديدة</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* IMAGE ADD / EDIT FORM */}
                    {(isAddingNewImage || editingImageIndex !== null) && (
                      <div className="bg-emerald-50/50 p-5 sm:p-6 rounded-2xl border-2 border-[#00873D] space-y-5 shadow-xs animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                          <h5 className="text-base font-black text-slate-950 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#00873D]" />
                            {editingImageIndex !== null ? 'تعديل بيانات الصورة التفاعلية' : 'إضافة ورفع صورة جديدة لألبوم المنتج'}
                          </h5>
                          <button
                            type="button"
                            onClick={handleCancelImageEdit}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>

                        {/* Image Upload & URL with Live Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-bold text-slate-950 block mb-2">
                                مصدر الصورة: (رفع مباشر من الجهاز أو رابط ويب) *
                              </label>
                              
                              {/* Direct File Upload */}
                              <div className="relative border-2 border-dashed border-slate-300 hover:border-[#00873D] bg-white rounded-xl p-4 text-center cursor-pointer transition-colors group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageFileUpload}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center justify-center gap-1.5">
                                  <div className="w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-[#00873D] transition-colors">
                                    <Upload className="w-5 h-5" />
                                  </div>
                                  <span className="text-xs sm:text-sm font-bold text-slate-950">
                                    اضغط لرفع صورة من الحاسوب (أو اسحبها وأفلتها هنا)
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700">
                                    يدعم صيغ PNG, JPG, WebP, GIF حتى 5 ميجابايت
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Direct URL input fallback */}
                            <div>
                              <label className="text-xs font-bold text-slate-800 block mb-1">
                                أو أدخل رابط الصورة المباشر (URL):
                              </label>
                              <input
                                type="text"
                                value={imageDraft.imageUrl}
                                onChange={(e) => setImageDraft({ ...imageDraft, imageUrl: e.target.value })}
                                placeholder="https://..."
                                className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors"
                              />
                            </div>

                            {/* Image Title */}
                            <div>
                              <label className="text-sm font-bold text-slate-950 block mb-1.5">
                                اسم أو عنوان الصورة: *
                              </label>
                              <input
                                type="text"
                                value={imageDraft.title}
                                onChange={(e) => setImageDraft({ ...imageDraft, title: e.target.value })}
                                placeholder="مثال: صورة عبوة المنتج الرئيسية، جدول الحقائق الغذائية، صورة العرض المخفض..."
                                className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-950 placeholder:text-slate-400 outline-hidden transition-colors shadow-2xs"
                              />
                              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                                هذا الاسم هو المعرف الذي سيظهر في القوائم والشروط التسلسلية.
                              </p>
                            </div>
                          </div>

                          {/* Live Image Preview */}
                          <div>
                            <label className="text-sm font-bold text-slate-950 block mb-2">
                              معاينة الصورة الحية:
                            </label>
                            <div className="w-full h-56 bg-slate-950 rounded-2xl border-2 border-slate-300 overflow-hidden flex items-center justify-center relative shadow-inner">
                              {imageDraft.imageUrl ? (
                                <>
                                  <img
                                    src={imageDraft.imageUrl}
                                    alt={imageDraft.title || 'معاينة'}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80';
                                    }}
                                  />
                                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-bold">
                                    معاينة فورية
                                  </div>
                                </>
                              ) : (
                                <div className="text-center p-4 text-slate-400">
                                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                  <span className="text-xs font-bold block">
                                    ارفع صورة أو ضع رابطاً لمشاهدة المعاينة هنا
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Is Main Image Checkbox */}
                            <label className="mt-3.5 p-3 bg-white rounded-xl border-2 border-slate-300 flex items-center gap-3 cursor-pointer hover:border-[#00873D] transition-colors">
                              <input
                                type="checkbox"
                                checked={imageDraft.isMain}
                                onChange={(e) => setImageDraft({ ...imageDraft, isMain: e.target.checked })}
                                className="w-4 h-4 text-[#00873D] rounded border-slate-300 focus:ring-[#00873D]"
                              />
                              <div className="flex items-center gap-1.5">
                                <Star className={`w-4 h-4 ${imageDraft.isMain ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                                <span className="text-xs sm:text-sm font-bold text-slate-950">
                                  تعيين هذه الصورة كصورة رئيسية للمنتج (تظهر كغلاف في الواجهة والمتجر)
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Fields 2 & 3: AI Description + When to Show */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-emerald-200">
                          <div>
                            <label className="text-sm font-bold text-slate-950 block mb-1">
                              حقل تعريفي للذكاء الاصطناعي (توضيح ما تحتويه هذه الصورة بالتفصيل): *
                            </label>
                            <textarea
                              rows={3}
                              value={imageDraft.aiDescription}
                              onChange={(e) => setImageDraft({ ...imageDraft, aiDescription: e.target.value })}
                              placeholder="اشرح هنا للذكاء الاصطناعي ما يظهر في الصورة بدقة (مثال: صورة تفصيلية لجدول القيم الغذائية توضح احتواء الوجبة على 21 فيتامين و17 جرام بروتين و220 سعرة فقط بدون سكر مضاف)..."
                              className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 placeholder:text-slate-400 outline-hidden leading-relaxed transition-colors shadow-2xs"
                            />
                            <p className="text-[11px] font-semibold text-slate-700 mt-1">
                              يفهم الذكاء الاصطناعي من هذا الحقل تفاصيل الصورة ليصفها بدقة ويقنع العميل بمحتواها.
                            </p>
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-950 block mb-1">
                              متى تظهر للمستخدم هذه الصورة؟ (سياق ودواعي الإرسال): *
                            </label>
                            <textarea
                              rows={3}
                              value={imageDraft.displayTrigger}
                              onChange={(e) => setImageDraft({ ...imageDraft, displayTrigger: e.target.value })}
                              placeholder="حدد الظرف أو السؤال الذي يدفع الذكاء الاصطناعي لاقتراح هذه الصورة (مثال: تُرسل عندما يسأل العميل عن السعرات أو يطلب رؤية جدول المكونات أو عند التردد في الشراء بسبب السعر لعرض الباقة التوفيرية)..."
                              className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 placeholder:text-slate-400 outline-hidden leading-relaxed transition-colors shadow-2xs"
                            />
                            <p className="text-[11px] font-semibold text-slate-700 mt-1">
                              يربط الذكاء الاصطناعي بين أسئلة العميل وهذا الشرط لاقتراح الصورة في اللحظة المناسبة.
                            </p>
                          </div>
                        </div>

                        {/* Field 4: Optional Sequential Condition Dropdown */}
                        <div className="pt-2 border-t border-emerald-200">
                          <label className="text-sm font-bold text-slate-950 block mb-1.5">
                            شرط الإرسال الاختياري (تظهر بعد إرسال أي صورة سابقة؟):
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <select
                              value={imageDraft.dependsOnImageId || 'none'}
                              onChange={(e) => setImageDraft({ ...imageDraft, dependsOnImageId: e.target.value })}
                              className="flex-1 p-3.5 bg-white border-2 border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-950 focus:border-[#00873D] outline-hidden shadow-2xs"
                            >
                              <option value="none">
                                بدون شرط تسلسلي (مستقلة - تُرسل مباشرة بناءً على سياق الحوار)
                              </option>
                              <option value="main">
                                تُرسل فقط بعد إرسال: صورة المنتج الرئيسية
                              </option>
                              {(productForm.images || [])
                                .filter((img) => img.id !== imageDraft.id && img.title.trim() !== '')
                                .map((otherImg) => (
                                  <option key={otherImg.id} value={otherImg.id}>
                                    تُرسل فقط بعد إرسال: {otherImg.title}
                                  </option>
                                ))}
                            </select>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveImageToAlbum}
                                className="px-6 py-3.5 bg-[#00873D] hover:bg-[#007033] text-white font-black text-sm rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
                              >
                                <Check className="w-4 h-4" />
                                <span>حفظ الصورة في الألبوم</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelImageEdit}
                                className="px-4 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-sm rounded-xl transition-colors shrink-0"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-700 mt-1.5">
                            💡 يتيح لك تنظيم تسلسل الصور بحيث يفهم الذكاء الاصطناعي مثلاً ألا يرسل صورة العرض الترويجي أو صورة الحقائق الغذائية إلا بعد أن يكون قد أرسل صورة المنتج الرئيسية أو بعد صورة معينة سابقة.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ALBUM IMAGES LIST / CARDS */}
                    {(!productForm.images || productForm.images.length === 0) ? (
                      <div className="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                        <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-60" />
                        <h5 className="text-sm sm:text-base font-black text-slate-950">
                          لا توجد صور مضافة للمنتج حتى الآن
                        </h5>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 mb-4">
                          ارفع صورة المنتج الرئيسية وأي صور إضافية (جدول غذائي، عروض، صور استخدام) ليتمكن الذكاء الاصطناعي من إرسالها للعملاء.
                        </p>
                        <button
                          type="button"
                          onClick={handleStartAddImage}
                          className="px-5 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white text-sm font-black rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>رفع أول صورة للمنتج الآن</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {productForm.images.map((img, idx) => {
                          // Find dependency name if any
                          const depImage =
                            img.dependsOnImageId === 'main'
                              ? { title: 'صورة المنتج الرئيسية' }
                              : (productForm.images || []).find((other) => other.id === img.dependsOnImageId);

                          return (
                            <div
                              key={img.id || idx}
                              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                                img.isMain
                                  ? 'bg-emerald-50/30 border-emerald-500'
                                  : 'bg-white border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  {/* Thumbnail with quick preview trigger */}
                                  <div
                                    onClick={() => setPreviewImageForModal(img)}
                                    className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-300 shrink-0 cursor-pointer group shadow-2xs"
                                    title="اضغط لمعاينة الصورة بحجم كامل"
                                  >
                                    <img
                                      src={img.imageUrl}
                                      alt={img.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Eye className="w-5 h-5 text-white" />
                                    </div>
                                  </div>

                                  <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between gap-2">
                                      {img.isMain ? (
                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 font-black text-xs rounded-lg border border-amber-300 flex items-center gap-1">
                                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                          الصورة الرئيسية
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleSetAsMainImage(idx)}
                                          className="text-xs font-bold text-slate-700 hover:text-amber-700 underline flex items-center gap-1"
                                          title="تعيين كصورة الغلاف الأساسية لهذا المنتج"
                                        >
                                          <Star className="w-3 h-3 text-slate-400" />
                                          تعيين كرئيسية
                                        </button>
                                      )}

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditImage(idx)}
                                          className="p-1.5 text-slate-700 hover:text-[#00873D] hover:bg-emerald-50 rounded-lg transition-colors"
                                          title="تعديل بيانات وشروط الصورة"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteImageFromAlbum(idx)}
                                          className="p-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                                          title="حذف الصورة من الألبوم"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <h5 className="text-sm sm:text-base font-black text-slate-950 mt-1 truncate">
                                      {img.title}
                                    </h5>

                                    {/* Sequence dependency badge */}
                                    <div className="mt-1">
                                      {depImage ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                          <Layers className="w-3 h-3 text-blue-700" />
                                          تُرسل بعد: {depImage.title}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                          ✨ مستقلة (حسب سياق الحديث)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* AI Description Box */}
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-950 font-semibold space-y-0.5">
                                  <div className="font-bold text-slate-950 flex items-center gap-1">
                                    <Brain className="w-3.5 h-3.5 text-[#00873D]" />
                                    <span>توضيح الذكاء الاصطناعي:</span>
                                  </div>
                                  <p className="text-slate-800 line-clamp-2">
                                    {img.aiDescription || 'لا يوجد وصف محدد'}
                                  </p>
                                </div>

                                {/* Display Trigger Box */}
                                <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-semibold space-y-0.5">
                                  <div className="font-bold text-[#00873D] flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5 text-[#00873D]" />
                                    <span>متى تظهر للمستخدم:</span>
                                  </div>
                                  <p className="text-emerald-900 line-clamp-2">
                                    {img.displayTrigger || 'تُرسل حسب السياق العام للمنتج'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* قسم القواعد والقيود والبدائل مع الصور (Rules & Alternatives) */}
                  <div className="p-5 sm:p-6 bg-rose-50/30 rounded-2xl border-2 border-rose-200 space-y-5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-rose-100">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Ban className="w-6 h-6 text-rose-600" />
                          <h4 className="text-base sm:text-lg font-black text-slate-950">
                            القواعد والقيود والبدائل لهذا المنتج
                          </h4>
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-950 border border-rose-300 text-xs font-black rounded-full">
                            {(productForm.forbiddenItems || []).length} قاعدة وقيد
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 font-bold mt-1">
                          حدد الأشياء الممنوع تناولها مع هذا المنتج، وأضف صوراً توضيحية لضمان فهم العميل بدقة، مع توفير البدائل الصحية.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 1. Forbidden Items List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm sm:text-base font-black text-rose-900 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            قائمة القواعد والقيود:
                          </h5>
                          {!isAddingForbidden && (
                            <button
                              type="button"
                              onClick={handleStartAddForbidden}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة قاعدة/قيد</span>
                            </button>
                          )}
                        </div>

                        {isAddingForbidden && (
                          <div className="p-4 bg-white rounded-xl border-2 border-rose-500 space-y-3 shadow-md animate-in fade-in zoom-in-95 duration-200">
                            <div>
                              <label className="text-[11px] font-bold text-rose-900 mb-1 block">اسم القاعدة أو القيد:</label>
                              <input
                                type="text"
                                value={forbiddenDraft.name}
                                onChange={(e) => setForbiddenDraft({...forbiddenDraft, name: e.target.value})}
                                placeholder="مثلاً: البسر (التمر غير الناضج)"
                                className="w-full p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg text-sm font-bold outline-hidden focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            
                            <div>
                              <label className="text-[11px] font-bold text-rose-900 mb-1 block">الصورة التوضيحية:</label>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleForbiddenImageUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                  />
                                  <div className="p-2.5 border-2 border-dashed border-rose-200 rounded-lg text-center text-xs font-bold text-rose-700 bg-rose-50/30 hover:bg-rose-50 transition-colors">
                                    {forbiddenDraft.imageUrl ? 'تغيير الصورة' : 'رفع صورة توضيحية'}
                                  </div>
                                </div>
                                {forbiddenDraft.imageUrl && (
                                  <div className="relative group">
                                    <img src={forbiddenDraft.imageUrl} className="w-14 h-14 rounded-lg object-cover border-2 border-rose-200 shadow-sm" />
                                    <button 
                                      onClick={() => setForbiddenDraft({...forbiddenDraft, imageUrl: ''})}
                                      className="absolute -top-1 -left-1 bg-rose-600 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-rose-900 mb-1 block">توضيح إضافي (اختياري):</label>
                              <textarea
                                rows={2}
                                value={forbiddenDraft.description}
                                onChange={(e) => setForbiddenDraft({...forbiddenDraft, description: e.target.value})}
                                placeholder="اكتب هنا توضيحاً مختصراً يظهر للعميل عند السؤال عن هذا الممنوع..."
                                className="w-full p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg text-xs font-semibold outline-hidden focus:ring-1 focus:ring-rose-500"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-rose-100">
                              <button 
                                onClick={handleCancelForbiddenEdit} 
                                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                إلغاء
                              </button>
                              <button 
                                onClick={handleSaveForbiddenItem} 
                                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm"
                              >
                                حفظ القاعدة/القيد
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          {(productForm.forbiddenItems || []).length === 0 && !isAddingForbidden && (
                            <div className="text-center py-6 px-4 bg-white/50 rounded-xl border border-dashed border-rose-200">
                              <p className="text-xs font-bold text-rose-400">لا توجد ممنوعات مضافة لهذا المنتج بعد</p>
                            </div>
                          )}
                          {(productForm.forbiddenItems || []).map((f, i) => (
                            <div key={f.id || i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-rose-100 shadow-2xs hover:shadow-sm transition-all group">
                              <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0 overflow-hidden shadow-inner">
                                {f.imageUrl ? (
                                  <img src={f.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <Ban className="w-5 h-5 text-rose-300" />
                                )}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <h6 className="text-sm font-black text-rose-950 truncate">{f.name}</h6>
                                {f.description ? (
                                  <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">{f.description}</p>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">بدون وصف إضافي</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForbiddenDraft({
                                      id: f.id,
                                      name: f.name,
                                      imageUrl: f.imageUrl || '',
                                      description: f.description || '',
                                    });
                                    setEditingForbiddenIndex(i);
                                    setIsAddingForbidden(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = productForm.forbiddenItems?.filter((_, idx) => idx !== i);
                                    setProductForm({...productForm, forbiddenItems: updated});
                                  }}
                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. Alternative Items List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm sm:text-base font-black text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            البدائل المتاحة (المسموحة):
                          </h5>
                          {!isAddingAlternative && (
                            <button
                              type="button"
                              onClick={handleStartAddAlternative}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة بديل</span>
                            </button>
                          )}
                        </div>

                        {isAddingAlternative && (
                          <div className="p-4 bg-white rounded-xl border-2 border-emerald-500 space-y-3 shadow-md animate-in fade-in zoom-in-95 duration-200">
                            <div>
                              <label className="text-[11px] font-bold text-emerald-900 mb-1 block">اسم البديل الصحي:</label>
                              <input
                                type="text"
                                value={alternativeDraft.name}
                                onChange={(e) => setAlternativeDraft({...alternativeDraft, name: e.target.value})}
                                placeholder="مثلاً: التمر الناضج (خلاص أو سكري)"
                                className="w-full p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-sm font-bold outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-emerald-900 mb-1 block">الصورة التوضيحية للبديل:</label>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAlternativeImageUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                  />
                                  <div className="p-2.5 border-2 border-dashed border-emerald-200 rounded-lg text-center text-xs font-bold text-emerald-700 bg-emerald-50/30 hover:bg-emerald-50 transition-colors">
                                    {alternativeDraft.imageUrl ? 'تغيير الصورة' : 'رفع صورة البديل'}
                                  </div>
                                </div>
                                {alternativeDraft.imageUrl && (
                                  <div className="relative group">
                                    <img src={alternativeDraft.imageUrl} className="w-14 h-14 rounded-lg object-cover border-2 border-emerald-200 shadow-sm" />
                                    <button 
                                      onClick={() => setAlternativeDraft({...alternativeDraft, imageUrl: ''})}
                                      className="absolute -top-1 -left-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-emerald-900 mb-1 block">لماذا يعتبر هذا بديلاً جيداً؟:</label>
                              <textarea
                                rows={2}
                                value={alternativeDraft.description}
                                onChange={(e) => setAlternativeDraft({...alternativeDraft, description: e.target.value})}
                                placeholder="اشرح للعميل لماذا يفضل هذا البديل وكيف يتكامل مع المنتج..."
                                className="w-full p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs font-semibold outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-emerald-100">
                              <button 
                                onClick={handleCancelAlternativeEdit} 
                                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                إلغاء
                              </button>
                              <button 
                                onClick={handleSaveAlternative} 
                                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                              >
                                حفظ البديل
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          {(productForm.alternativeItems || []).length === 0 && !isAddingAlternative && (
                            <div className="text-center py-6 px-4 bg-white/50 rounded-xl border border-dashed border-emerald-200">
                              <p className="text-xs font-bold text-emerald-400">لا توجد بدائل مضافة لهذا المنتج بعد</p>
                            </div>
                          )}
                          {(productForm.alternativeItems || []).map((alt, i) => (
                            <div key={alt.id || i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs hover:shadow-sm transition-all group">
                              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0 overflow-hidden shadow-inner">
                                {alt.imageUrl ? (
                                  <img src={alt.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <Sparkles className="w-5 h-5 text-emerald-300" />
                                )}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <h6 className="text-sm font-black text-slate-950 truncate">{alt.name}</h6>
                                {alt.description ? (
                                  <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">{alt.description}</p>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">بدون وصف إضافي</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAlternativeDraft({
                                      id: alt.id,
                                      name: alt.name,
                                      imageUrl: alt.imageUrl || '',
                                      description: alt.description || '',
                                    });
                                    setEditingAlternativeIndex(i);
                                    setIsAddingAlternative(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = productForm.alternativeItems?.filter((_, idx) => idx !== i);
                                    setProductForm({...productForm, alternativeItems: updated});
                                  }}
                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* طريقة الاستخدام (نص + رابط فيديو مع معاينة حية) - High Contrast & Large Text */}
                  <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <label className="text-sm sm:text-base font-black text-slate-950 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#00873D]" />
                        طريقة الاستخدام
                      </label>
                      <span className="text-xs sm:text-sm text-slate-700 font-bold">
                        شرح نصي مع إمكانية ربط فيديو يوتيوب أو مباشر
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-sm font-bold text-slate-950 block mb-2">
                          الشرح النصي لطريقة الاستخدام:
                        </label>
                        <textarea
                          rows={3}
                          value={productForm.usageInstructions}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductForm(prev => ({ ...prev, usageInstructions: val }));
                          }}
                          placeholder="مثال: يُمزج مكيالين (26غ) مع 250 مل ماء بارد أو حليب خالي الدسم، ويُرج جيداً..."
                          className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 leading-relaxed outline-hidden transition-colors shadow-2xs placeholder:text-slate-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-950 block mb-2">
                          رابط فيديو طريقة الاستخدام (يوتيوب أو رابط مباشر):
                        </label>
                        <input
                          type="text"
                          value={productForm.usageVideoUrl || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductForm(prev => ({ ...prev, usageVideoUrl: val }));
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 outline-hidden transition-colors shadow-2xs placeholder:text-slate-400"
                        />

                        {/* Live Video Preview if URL provided */}
                        {productForm.usageVideoUrl ? (
                          <div className="p-3.5 bg-white rounded-xl border-2 border-slate-300 flex items-center gap-3.5 shadow-2xs">
                            <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                              <img
                                src={getVideoThumbnail(productForm.usageVideoUrl)}
                                alt="معاينة فيديو الاستخدام"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Play className="w-5 h-5 fill-white text-white" />
                              </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <span className="text-sm font-black text-slate-950 block truncate">
                                تم ربط فيديو طريقة الاستخدام
                              </span>
                              <span className="text-xs sm:text-sm text-slate-700 font-bold block">
                                يمكن للمستخدمين مشاهدة المعاينة وتشغيل الفيديو مباشرة
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewVideoForModal({
                                    id: 'preview-usage',
                                    title: `فيديو طريقة الاستخدام - ${productForm.name || 'المنتج'}`,
                                    description: productForm.usageInstructions,
                                    contextAndTrigger: '',
                                    videoUrl: productForm.usageVideoUrl || '',
                                  })
                                }
                                className="px-3.5 py-2 bg-[#00873D] hover:bg-[#007033] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                              >
                                <Play className="w-4 h-4 fill-white" />
                                معاينة
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm({ ...productForm, usageVideoUrl: '' });
                                  showToast('تم مسح رابط فيديو الاستخدام');
                                }}
                                className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
                                title="مسح رابط فيديو طريقة الاستخدام"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-normal">
                            ضع رابط يوتيوب هنا لتمكين المستخدم من مشاهدة شرح عملي بالفيديو لطريقة الاستخدام.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* المكونات الأساسية والفئة المستهدفة */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-bold text-slate-950 block mb-2">المكونات الأساسية:</label>
                      <textarea
                        rows={2}
                        value={productForm.keyIngredients}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductForm(prev => ({ ...prev, keyIngredients: val }));
                        }}
                        placeholder="المكونات الطبيعية والمغذيات..."
                        className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 outline-hidden transition-colors shadow-2xs placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-950 block mb-2">
                        الفئة المستهدفة والمشكلة التي يعالجها:
                      </label>
                      <textarea
                        rows={2}
                        value={productForm.targetAudience}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductForm(prev => ({ ...prev, targetAudience: val }));
                        }}
                        placeholder="مثال: من يعانون من كسل الأيض، احتباس السوائل، والدهون المتراكمة في الخصر..."
                        className="w-full p-3.5 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm sm:text-base font-semibold text-slate-950 outline-hidden transition-colors shadow-2xs placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* ATTACHED DOCUMENTS SECTION (المستندات والأبحاث المعتمدة) */}
                  <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-slate-950 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#00873D]" />
                          المستندات والأبحاث المرفقة ({productForm.docs.length})
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 font-bold mt-1">
                          تُستخرج بيانات المستندات ليعتمد عليها الذكاء الاصطناعي كمرجع علمي دقيق لدعم إجاباته
                        </p>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {productForm.docs.length > 0 && !isAddingDoc && editingDocIndex === null && (
                          <button
                            type="button"
                            onClick={handleClearAllDocs}
                            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                            title="حذف جميع المستندات"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>تفريغ المستندات</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleStartAddDoc}
                          disabled={isAddingDoc || editingDocIndex !== null}
                          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors border-2 shadow-2xs ${
                            isAddingDoc || editingDocIndex !== null
                              ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                              : 'bg-white hover:bg-emerald-50 text-slate-950 border-slate-300 hover:border-[#00873D]'
                          }`}
                        >
                          <Plus className="w-4 h-4 text-[#00873D]" />
                          <span>إضافة مستند يدوياً</span>
                        </button>

                        <label className="cursor-pointer px-4 py-2 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-2xs transition-colors">
                          <Upload className="w-4 h-4 text-white" />
                          <span>رفع ملف للمنتج (PDF / Word / TXT)</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* DEDICATED DOCUMENT EDITOR PANEL */}
                    {(isAddingDoc || editingDocIndex !== null) && (
                      <div className="p-5 sm:p-6 bg-white rounded-2xl border-2 border-[#00873D] shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-sm sm:text-base font-black text-slate-950 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-[#00873D]" />
                            {editingDocIndex !== null
                              ? `تعديل بيانات ومحتوى المستند #${editingDocIndex + 1}`
                              : 'إضافة مستند أو ملخص دراسة علمية جديد'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelDocEdit}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs sm:text-sm font-bold"
                          >
                            إلغاء والعودة
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="text-sm font-bold text-slate-950 block mb-1.5">
                              اسم أو عنوان المستند المعتمد: *
                            </label>
                            <input
                              type="text"
                              value={docDraft.name}
                              onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })}
                              placeholder="مثال: دراسة_المؤشر_الجلايسيمي_المنخفض_لفورمولا1.pdf"
                              className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 outline-hidden transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-950 block mb-1.5">
                              نوع الملف:
                            </label>
                            <select
                              value={docDraft.type}
                              onChange={(e) =>
                                setDocDraft({
                                  ...docDraft,
                                  type: e.target.value as 'pdf' | 'word' | 'text' | 'other',
                                })
                              }
                              className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-950 outline-hidden"
                            >
                              <option value="pdf">مستند PDF (تقرير/شهادة)</option>
                              <option value="word">مستند Word (كتيب/وصفات)</option>
                              <option value="text">ملف نصي Text / بيانات</option>
                              <option value="other">أخرى</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-bold text-slate-950 block mb-1.5 flex items-center gap-1.5">
                            <Brain className="w-4 h-4 text-[#00873D]" />
                            محتوى وخلاصة المستند الموجهة للذكاء الاصطناعي (المرجع العلمي المعتمد): *
                          </label>
                          <textarea
                            rows={4}
                            value={docDraft.extractedText || ''}
                            onChange={(e) => setDocDraft({ ...docDraft, extractedText: e.target.value })}
                            placeholder="اكتب هنا التفاصيل والأرقام والنتائج السريرية الواردة في هذا المستند، ليعتمد عليها الذكاء الاصطناعي بدقة تامة عند الإجابة على استفسارات العملاء..."
                            className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 outline-hidden leading-relaxed"
                          />
                          <p className="text-[11px] font-semibold text-slate-600 mt-1">
                            💡 يقوم الذكاء الاصطناعي بقراءة هذا المحتوى وإبرازه عند استفسار العميل عن الأبحاث أو التراخيص أو الأدلة الإكلينيكية.
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={handleCancelDocEdit}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-colors"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDocDraft}
                            className="px-6 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl text-sm font-black transition-colors shadow-2xs flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>حفظ المستند في قاعدة المعرفة</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {productForm.docs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {productForm.docs.map((doc, idx) => (
                          <div
                            key={doc.id || idx}
                            className="p-4 bg-white rounded-xl border-2 border-slate-300 hover:border-slate-400 flex flex-col justify-between gap-3 shadow-2xs transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 bg-emerald-50 text-[#00873D] rounded-xl border border-emerald-200 shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="overflow-hidden flex-1">
                                <p className="text-sm font-black text-slate-950 truncate">{doc.name}</p>
                                <span className="text-xs font-bold text-slate-600 block mt-0.5">
                                  {doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'ملف معتمد'} · {doc.type.toUpperCase()}
                                </span>
                                {doc.extractedText && (
                                  <p className="text-xs text-slate-700 font-semibold line-clamp-2 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <span className="font-bold text-[#00873D]">الخلاصة: </span>
                                    {doc.extractedText}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                              <button
                                type="button"
                                onClick={() => setPreviewDocForModal(doc)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00873D] rounded-lg font-bold flex items-center gap-1 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>معاينة وقراءة</span>
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditDoc(idx)}
                                  className="p-1.5 text-slate-600 hover:text-[#00873D] hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="تعديل ملخص المستند"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc(doc.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="حذف المستند"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-700 font-semibold text-center py-4 bg-white/70 rounded-xl border border-slate-200">
                        لا توجد مستندات مرفقة لهذا المنتج حتى الآن. يمكنك رفع ملفات PDF أو Word أو إضافة أبحاث علمية يدوياً لدعم إجابات الذكاء الاصطناعي.
                      </p>
                    )}
                  </div>

                  {/* PRODUCT VIDEOS ALBUM (ألبوم فيديوهات المنتج المنظم) */}
                  <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-4">
                    {/* Album Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                          <Film className="w-5 h-5 text-[#00873D]" />
                          ألبوم فيديوهات المنتج ({productForm.videos.length})
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 font-bold mt-1">
                          ألبوم مرئي احترافي يتيح معاينة كل مقطع مع لوحة تحكم مستقلة لكل فيديو
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {productForm.videos.length > 0 && !isAddingNewVideo && editingVideoIndex === null && (
                          <button
                            type="button"
                            onClick={handleClearAllVideos}
                            className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                            title="حذف وتفريغ جميع الفيديوهات من الألبوم دفعة واحدة"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>تفريغ الألبوم ({productForm.videos.length})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleStartAddVideo}
                          disabled={isAddingNewVideo || editingVideoIndex !== null}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-2xs ${
                            isAddingNewVideo || editingVideoIndex !== null
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-[#00873D] hover:bg-[#007033] text-white active:scale-98'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة فيديو جديد للألبوم</span>
                        </button>
                      </div>
                    </div>

                    {/* Notice if editor is open */}
                    {(isAddingNewVideo || editingVideoIndex !== null) && (
                      <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-sm text-amber-950 font-bold flex items-center gap-2.5 animate-in fade-in">
                        <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          يرجى حفظ الفيديو الحالي أو إلغاء التحرير قبل إضافة فيديو آخر لضمان تنظيم الألبوم.
                        </span>
                      </div>
                    )}

                    {/* DEDICATED VIDEO EDITOR PANEL */}
                    {(isAddingNewVideo || editingVideoIndex !== null) && (
                      <div className="p-5 sm:p-6 bg-white rounded-2xl border-2 border-[#00873D] shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-sm sm:text-base font-black text-slate-950 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-[#00873D]" />
                            {editingVideoIndex !== null
                              ? `تعديل بيانات الفيديو #${editingVideoIndex + 1}`
                              : 'إضافة فيديو جديد إلى الألبوم'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelVideoEdit}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs sm:text-sm font-bold"
                          >
                            إلغاء والعودة
                          </button>
                        </div>

                        {/* Title Field */}
                        <div>
                          <label className="text-sm font-bold text-slate-950 block mb-1.5">
                            عنوان الفيديو التوضيحي: *
                          </label>
                          <input
                            type="text"
                            value={videoDraft.title}
                            onChange={(e) => setVideoDraft({ ...videoDraft, title: e.target.value })}
                            placeholder="مثال: طريقة إعداد شيك فورمولا 1 في 90 ثانية أو تجربة حية"
                            className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 outline-hidden transition-colors"
                          />
                        </div>

                        {/* Source Mode Selector (URL vs Upload) */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-950 block">
                            مصدر الفيديو: *
                          </label>
                          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setVideoSourceMode('url')}
                              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                                videoSourceMode === 'url'
                                  ? 'bg-white text-[#00873D] shadow-xs border border-slate-200'
                                  : 'text-slate-700 hover:text-black'
                              }`}
                            >
                              <Film className="w-4 h-4 text-red-600" />
                              <span>رابط (YouTube / Shorts / مباشر)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setVideoSourceMode('upload')}
                              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                                videoSourceMode === 'upload'
                                  ? 'bg-white text-[#00873D] shadow-xs border border-slate-200'
                                  : 'text-slate-700 hover:text-black'
                              }`}
                            >
                              <Upload className="w-4 h-4 text-blue-600" />
                              <span>رفع ملف فيديو من جهازك (MP4 / WebM)</span>
                            </button>
                          </div>
                        </div>

                        {/* Mode 1: URL Input */}
                        {videoSourceMode === 'url' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              رابط مقطع الفيديو:
                            </label>
                            <input
                              type="text"
                              value={videoDraft.videoUrl}
                              onChange={(e) => setVideoDraft({ ...videoDraft, videoUrl: e.target.value })}
                              placeholder="مثال: https://www.youtube.com/watch?v=... أو https://youtube.com/shorts/..."
                              className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 outline-hidden transition-colors"
                            />
                            {/* Format Detection Badges */}
                            {videoDraft.videoUrl && (
                              <div className="flex items-center gap-2 pt-1 text-xs font-bold">
                                {isYouTubeShorts(videoDraft.videoUrl) ? (
                                  <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg flex items-center gap-1 border border-red-200">
                                    ⚡ تم التعرف على رابط يوتيوب شورتس (YouTube Shorts) بنجاح
                                  </span>
                                ) : isYouTubeUrl(videoDraft.videoUrl) ? (
                                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1 border border-emerald-200">
                                    ▶️ تم التعرف على رابط فيديو يوتيوب بنجاح
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg flex items-center gap-1 border border-blue-200">
                                    🌐 رابط فيديو مباشر
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mode 2: Local Video File Upload */}
                        {videoSourceMode === 'upload' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              اختر ملف فيديو من هاتفك أو حاسوبك:
                            </label>
                            <label
                              htmlFor="local-video-file-input"
                              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                                isVideoProcessing
                                  ? 'bg-amber-50 border-amber-400 animate-pulse'
                                  : videoDraft.videoUrl && videoDraft.videoUrl.startsWith('data:video')
                                  ? 'bg-emerald-50/50 border-emerald-400'
                                  : 'bg-slate-50 border-slate-300 hover:border-[#00873D] hover:bg-emerald-50/20'
                              }`}
                            >
                              <input
                                id="local-video-file-input"
                                type="file"
                                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                onChange={handleVideoFileUpload}
                                disabled={isVideoProcessing}
                                className="hidden"
                              />
                              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00873D] flex items-center justify-center">
                                {isVideoProcessing ? (
                                  <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                                ) : (
                                  <Upload className="w-6 h-6" />
                                )}
                              </div>
                              <div className="text-center">
                                <span className="text-sm font-black text-slate-900 block">
                                  {isVideoProcessing
                                    ? 'جاري معالجة الفيديو واستخراج المصغرة...'
                                    : videoDraft.videoUrl && videoDraft.videoUrl.startsWith('data:video')
                                    ? 'تم رفع ملف الفيديو بنجاح! اضغط لاختيار فيديو آخر بديل'
                                    : 'اضغط هنا لرفع مقطع فيديو من الجهاز (MP4 / WebM / MOV)'}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold mt-1 block">
                                  يدعم مقاطع الشرح والاستخدام والنتائج بدقة عالية
                                </span>
                              </div>
                            </label>
                          </div>
                        )}

                        {/* Live Thumbnail Preview in Editor */}
                        {videoDraft.videoUrl && (
                          <div className="p-3.5 bg-slate-50 rounded-xl border-2 border-slate-300 flex items-center justify-between gap-3.5">
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                              <div className="relative w-28 h-18 rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-2xs border border-slate-200">
                                <img
                                  src={getVideoThumbnail(videoDraft.videoUrl, videoDraft.thumbnailUrl)}
                                  alt="معاينة الفيديو"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                  <Play className="w-5 h-5 fill-white text-white" />
                                </div>
                                {isYouTubeShorts(videoDraft.videoUrl) && (
                                  <span className="absolute bottom-1 right-1 bg-red-600 text-white text-[9px] font-bold px-1 rounded-sm">
                                    Shorts ⚡
                                  </span>
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <span className="text-sm font-black text-slate-950 block truncate">
                                  {videoDraft.title || 'معاينة المقطع'}
                                </span>
                                <span className="text-xs text-emerald-800 font-bold block mt-0.5">
                                  ✓ جاهز للتشغيل المباشر داخل الدردشة والألبوم
                                </span>
                                {videoDraft.duration && (
                                  <span className="text-[11px] text-slate-500 font-bold">
                                    المدة: {videoDraft.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewVideoForModal({ ...videoDraft })}
                              className="px-4 py-2 bg-[#00873D] hover:bg-[#007033] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>تشغيل تجريبي</span>
                            </button>
                          </div>
                        )}

                        {/* Public Details Field */}
                        <div>
                          <label className="text-sm font-bold text-slate-950 block mb-1.5 flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-slate-700" />
                            تفاصيل ومحتوى الفيديو (يظهر للمستخدم):
                          </label>
                          <textarea
                            rows={2}
                            value={videoDraft.description}
                            onChange={(e) => setVideoDraft({ ...videoDraft, description: e.target.value })}
                            placeholder="اكتب هنا تفاصيل ومحتوى الفيديو العامة التي سيراها المستخدم..."
                            className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 leading-relaxed outline-hidden transition-colors"
                          />
                        </div>

                        {/* Secret Criteria Field */}
                        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                              <Lock className="w-4 h-4 text-amber-700" />
                              سياق ودواعي الإرسال التكتيكية (خاص بالذكاء الاصطناعي والإدارة فقط):
                            </label>
                            <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                              سري للإدارة
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={videoDraft.contextAndTrigger}
                            onChange={(e) => setVideoDraft({ ...videoDraft, contextAndTrigger: e.target.value })}
                            placeholder="اكتب هنا معايير الإرسال السرية: مثلاً يُرسل عندما يسأل العميل عن طريقة التحضير، أو يتردد في الشراء، أو يطلب مشاهدة النتائج..."
                            className="w-full p-3 bg-white border-2 border-amber-300 focus:border-amber-500 rounded-xl text-sm font-semibold text-slate-950 leading-relaxed outline-hidden transition-colors"
                          />
                          <p className="text-xs sm:text-sm text-amber-950 font-bold leading-normal">
                            هذا النص خاص بتوجيه الذكاء الاصطناعي لمعرفة التوقيت الأنسب لإرسال الفيديو أثناء المحادثة، ولن يظهر للمستخدم.
                          </p>
                        </div>

                        {/* Action buttons inside editor */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={handleCancelVideoEdit}
                            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950"
                          >
                            إلغاء التحرير
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveVideoToAlbum}
                            disabled={isVideoProcessing}
                            className="px-6 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-sm shadow-xs transition-colors flex items-center gap-2 active:scale-95 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>حفظ وتثبيت الفيديو في الألبوم ✓</span>
                          </button>
                        </div>
                      </div>
                    )}


                    {/* ALBUM VIDEOS GALLERY / GRID */}
                    {productForm.videos.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-xl border-2 border-dashed border-slate-300 text-slate-600 space-y-2">
                        <Film className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm sm:text-base font-bold text-slate-900">ألبوم الفيديوهات فارغ لهذا المنتج حالياً.</p>
                        <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                          اضغط على زر "إضافة فيديو جديد للألبوم" أعلاه لإضافة أول مقطع فيديو توضيحي مع المعاينة.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        {productForm.videos.map((vid, idx) => (
                          <div
                            key={vid.id || idx}
                            className="bg-white rounded-xl border-2 border-slate-300 shadow-2xs hover:border-slate-400 transition-all overflow-hidden flex flex-col justify-between"
                          >
                            {/* Card Content */}
                            <div className="p-4 space-y-3">
                              {/* Video Thumbnail + Title */}
                              <div className="flex items-start gap-3.5">
                                <div
                                  onClick={() => setPreviewVideoForModal(vid)}
                                  className="relative w-28 h-18 rounded-lg overflow-hidden bg-slate-900 shrink-0 cursor-pointer group shadow-2xs"
                                  title="اضغط لمعاينة وتشغيل الفيديو"
                                >
                                  <img
                                    src={getVideoThumbnail(vid.videoUrl, vid.thumbnailUrl)}
                                    alt={vid.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-[#00873D] text-white flex items-center justify-center shadow-xs">
                                      <Play className="w-3.5 h-3.5 fill-white mr-0.5" />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className="text-xs font-black text-[#00873D]">
                                      فيديو #{idx + 1}
                                    </span>
                                    {vid.duration && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                        {vid.duration}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-sm sm:text-base font-black text-slate-950 line-clamp-2 leading-tight">
                                    {vid.title}
                                  </h5>
                                </div>
                              </div>

                              {/* Public Details */}
                              {vid.description && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed font-semibold">
                                  <span className="font-black text-slate-950 block mb-0.5">
                                    تفاصيل عامة:
                                  </span>
                                  <p className="line-clamp-2">
                                    {vid.description}
                                  </p>
                                </div>
                              )}

                              {/* Secret Criteria Indicator */}
                              {vid.contextAndTrigger && (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-xs sm:text-sm text-amber-950 leading-normal font-semibold">
                                  <span className="font-bold flex items-center gap-1 mb-0.5 text-amber-900">
                                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                                    سياق الإرسال (سري):
                                  </span>
                                  <p className="line-clamp-2">
                                    {vid.contextAndTrigger}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* DEDICATED CONTROL PANEL FOR THIS VIDEO */}
                            <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 text-xs sm:text-sm">
                              <button
                                type="button"
                                onClick={() => setPreviewVideoForModal(vid)}
                                className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-[#00873D] border border-slate-300 hover:border-emerald-300 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <Play className="w-3.5 h-3.5 fill-[#00873D]" />
                                <span>معاينة وتشغيل</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditVideo(idx)}
                                  className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-950 border border-slate-300 rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                  title="تعديل هذا الفيديو"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVideoFromAlbum(idx)}
                                  className="p-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-800 border border-slate-300 hover:border-rose-300 rounded-lg shadow-2xs transition-colors"
                                  title="حذف هذا الفيديو"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t-2 border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingProduct(false)}
                      className="px-5 py-2.5 text-sm font-bold text-slate-800 hover:text-slate-950"
                    >
                      إلغاء والعودة
                    </button>
                    <button
                      type="button"
                      disabled={isSavingProduct}
                      onClick={handleSaveProductForm}
                      className="px-7 py-3 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-sm sm:text-base shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingProduct ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>جاري الحفظ في الخادم...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>حفظ المنتج في قاعدة المعرفة</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AI ENGINE ORCHESTRATOR & FAILOVER */}
          {activeTab === 'ai-engine' && (
            <AIEngineManager
              showToast={showToast}
              onActiveEngineChange={(prov) => {
                setActiveEngine(prov);
              }}
            />
          )}

          {/* TAB 4: RESPONSE RULES (Consolidates Prompts, Rules, and Neuro-Marketing Lab) */}
          {activeTab === 'response-rules' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* SECTION A: SYSTEM PROMPTS */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-[#00873D]" />
                    <div>
                      <h3 className="text-lg font-black text-slate-950">1. البرومبتات وهندسة الأوامر (System Prompts)</h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">إدارة الأساليب الإقناعية ونبرة الصوت للذكاء الاصطناعي</p>
                    </div>
                  </div>
                  {!isEditingPrompt && (
                    <button
                      onClick={handleOpenAddPrompt}
                      className="px-4 py-2 bg-[#00873D] hover:bg-[#007033] text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة برومبت جديد</span>
                    </button>
                  )}
                </div>

                {!isEditingPrompt ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredPrompts.map((p) => (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          p.isActive
                            ? 'bg-emerald-50/30 border-[#00873D] shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleActivatePrompt(p.id)}
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                p.isActive
                                  ? 'bg-[#00873D] text-white ring-2 ring-[#00873D]/20'
                                  : 'border-2 border-slate-300'
                              }`}
                            >
                              {p.isActive && <Check className="w-3 h-3" />}
                            </button>
                            <h4 className="text-sm sm:text-base font-black text-slate-950">{p.title}</h4>
                          </div>
                          {p.isActive && (
                            <span className="text-[10px] font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              نشط ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-bold mb-3 line-clamp-1">{p.description}</p>
                        
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTestPrompt(p)}
                            className="p-2 bg-white text-[#00873D] border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="تجربة حية"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditPrompt(p)}
                            className="p-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!p.isSystemDefault && (
                            <button
                              onClick={() => handleDeletePrompt(p.id)}
                              className="p-2 bg-white text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-50 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* THE ACTUAL PROMPT EDITING FORM UI - MOVED INSIDE THE TAB BODY */
                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-300">
                      <h4 className="font-black text-slate-900">{editingPromptId ? 'تعديل البرومبت المختار' : 'بناء برومبت تسويقي جديد'}</h4>
                      <button onClick={() => setIsEditingPrompt(false)} className="text-xs font-bold text-slate-500 hover:text-black">إلغاء</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5">العنوان:*</label>
                        <input
                          type="text"
                          value={promptForm.title}
                          onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5">النبرة:*</label>
                        <input
                          type="text"
                          value={promptForm.tone}
                          onChange={(e) => setPromptForm({ ...promptForm, tone: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1.5">التعليمات البرمجية (System Instructions):*</label>
                      <textarea
                        rows={8}
                        value={promptForm.promptText}
                        onChange={(e) => setPromptForm({ ...promptForm, promptText: e.target.value })}
                        className="w-full p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border-2 border-slate-800"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none bg-emerald-50/50 hover:bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200/80 transition-all">
                        <input
                          type="checkbox"
                          checked={promptIsActive}
                          onChange={(e) => setPromptIsActive(e.target.checked)}
                          className="w-4 h-4 text-[#00873D] rounded border-slate-300 focus:ring-[#00873D]"
                        />
                        <span className="text-xs font-black text-emerald-950">
                          تفعيل هذا البرومبت فوراً كمحرك نشط للمحادثة (Active Engine)
                        </span>
                      </label>
                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingPrompt(false)}
                          disabled={isSavingPrompt}
                          className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                        >
                          تراجع
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePromptForm(true)}
                          disabled={isSavingPrompt}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>حفظ وتفعيل فوراً</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePromptForm()}
                          disabled={isSavingPrompt}
                          className="px-6 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                          {isSavingPrompt ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>جاري الحفظ الدائم...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>حفظ التعديلات</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: RULES & RESTRICTIONS (Consolidates Rules and Restrictions) */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h3 className="text-lg font-black text-slate-950">2. القواعد، القيود والكلمات الإجبارية</h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">منع المصطلحات المحظورة وفرض الكلمات الإجبارية لتعزيز الهوية</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-600 px-2">نظام الحماية:</span>
                    <button
                      onClick={() => setForbiddenIsActive(!forbiddenIsActive)}
                      className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                        forbiddenIsActive ? 'bg-[#00873D]' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform ${
                          forbiddenIsActive ? '-translate-x-4.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Forbidden Words */}
                  <div className="space-y-4">
                    <label className="text-sm font-black text-rose-800 flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      القيود والممنوعات (يُمنع التلفظ بها):
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-rose-50/20 rounded-2xl border border-rose-100 min-h-[80px]">
                      {forbiddenWordsList.map((word, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-rose-200 text-rose-800 rounded-lg text-xs font-bold">
                          {word}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveForbiddenWord(word)} />
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newForbiddenWord}
                        onChange={(e) => setNewForbiddenWord(e.target.value)}
                        placeholder="أضف قيداً..."
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                      />
                      <button onClick={handleAddForbiddenWord} className="p-2.5 bg-rose-600 text-white rounded-xl"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Mandatory Words */}
                  <div className="space-y-4">
                    <label className="text-sm font-black text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      الكلمات الإجبارية (يجب ذكرها):
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/20 rounded-2xl border border-emerald-100 min-h-[80px]">
                      {mandatoryWordsList.map((word, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                          {word}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveMandatoryWord(word)} />
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMandatoryWord}
                        onChange={(e) => setNewMandatoryWord(e.target.value)}
                        placeholder="أضف كلمة إلزامية..."
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                      />
                      <button onClick={handleAddMandatoryWord} className="p-2.5 bg-[#00873D] text-white rounded-xl"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-black text-slate-950">توجيهات السلوك العام (Guidelines):</label>
                  <textarea
                    rows={3}
                    value={forbiddenGuidelines}
                    onChange={(e) => setForbiddenGuidelines(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold leading-relaxed"
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingForbidden}
                    onClick={handleSaveForbidden}
                    className="px-6 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                  >
                    {isSavingForbidden ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ والتطبيق...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حفظ وتطبيق القواعد فوراً</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* TAB 7: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-xs animate-in fade-in duration-300">
              <div className="space-y-1 pb-4 border-b border-slate-200">
                <h3 className="text-lg sm:text-xl font-black text-slate-950 flex items-center gap-2.5">
                  <Download className="w-6 h-6 text-[#00873D]" />
                  النسخ الاحتياطي وإدارة البيانات
                </h3>
                <p className="text-sm font-bold text-slate-700">
                  قم بتصدير كامل قاعدة المعرفة والإعدادات والبرومبتات للحفاظ عليها أو نقلها لنظام آخر
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-white text-[#00873D] rounded-2xl flex items-center justify-center shadow-sm">
                    <Download className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black text-emerald-950">تصدير البيانات (Export)</h4>
                  <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                    سيتم تجميع كافة بيانات المنتجات، الصور، الفيديوهات، البرومبتات، وقواعد الذكاء في ملف واحد بصيغة JSON يمكنك الاحتفاظ به.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="w-full py-3 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 mb-2"
                  >
                    <Download className="w-4 h-4" />
                    تصدير النسخة الاحتياطية الآن (JSON)
                  </button>
                  <button
                    onClick={handleDownloadKBMD}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    تحميل قاعدة المعرفة بصيغة MD (للتوكنات)
                  </button>
                </div>

                <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-white text-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black text-slate-950">استيراد البيانات (Import)</h4>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    اختر ملف نسخة احتياطية سابقة لرفعها وتحديث النظام الحالي بها. تنبيه: سيتم استبدال البيانات الحالية بالبيانات الموجودة في الملف.
                  </p>
                  <label className="w-full py-3 bg-slate-800 hover:bg-black text-white font-black rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-center">
                    <Upload className="w-4 h-4" />
                    استيراد نسخة احتياطية
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}


          {/* TAB 8: GENERAL SETTINGS (Welcome Screen, Text Size, PWA/App Identity, Branding) */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* HEADER: Unified Action Bar */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00873D] flex items-center justify-center shadow-inner">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-950">إعدادات عامة (General Settings)</h3>
                    <p className="text-sm font-bold text-slate-600">تخصيص الشاشة الترحيبية، حجم الخط، إعدادات التطبيق، وهوية الهوية البصرية.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (confirm('هل أنت متأكد من حذف الذاكرة المؤقتة وملفات التطبيق؟ سيتم إعادة تحميل الصفحة.')) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm transition-all border border-rose-200 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الذاكرة والملفات</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingGeneral}
                    onClick={handleSaveAllGeneral}
                    className="px-8 py-3.5 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingGeneral ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>جاري الحفظ الدائم...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>حفظ التعديلات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* 1. WELCOME SCREEN SECTION */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5">
                      <MessageSquareHeart className="w-6 h-6 text-[#00873D]" />
                      1. الشاشة الترحيبية
                    </h4>
                    <button
                      type="button"
                      onClick={handleResetWelcome}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-colors"
                    >
                      الافتراضي
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-bold text-slate-950 block mb-2">العنوان الترحيبي:</label>
                      <input
                        type="text"
                        value={localWelcome.title}
                        onChange={(e) => setLocalWelcome({ ...localWelcome, title: e.target.value })}
                        className="w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-950 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-950 block mb-2">النص التعريفي:</label>
                      <textarea
                        rows={2}
                        value={localWelcome.description}
                        onChange={(e) => setLocalWelcome({ ...localWelcome, description: e.target.value })}
                        className="w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-[#00873D] rounded-xl text-sm font-semibold text-slate-950 leading-relaxed outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. TEXT SIZE SECTION */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6">
                  <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5">
                    <Type className="w-6 h-6 text-[#00873D]" />
                    2. حجم النص والرؤية
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { id: 'small', label: 'صغير', size: '14px' },
                      { id: 'normal', label: 'عادي', size: '16px' },
                      { id: 'large', label: 'كبير', size: '18px' },
                      { id: 'medical', label: 'طبي', size: '21px', badge: 'معتمد' }
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => onSetMedicalFontSize(opt.id as any)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          medicalFontSize === opt.id
                            ? 'border-[#00873D] bg-emerald-50/50 shadow-sm ring-2 ring-[#00873D]/30'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-black text-slate-950">{opt.label}</span>
                          {opt.badge && <span className="text-[9px] font-black text-emerald-950 bg-emerald-200 px-1.5 py-0.5 rounded">{opt.badge}</span>}
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">{opt.size}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#00873D] shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                      يتم تطبيق حجم الخط المختار على كافة نصوص المحادثة لضمان أفضل تجربة قراءة لكافة الفئات العمرية.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. BRANDING & LOGO SECTION */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5">
                    <Palette className="w-6 h-6 text-[#D4AF37]" />
                    3. تخصيص شعار الهيدر والقائمة (Branding)
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetLogoConfig}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    الافتراضي
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Header Logo Config */}
                  <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#00873D]">شعار شريط الهيدر العلوي:</span>
                      <label className="cursor-pointer px-3 py-1.5 bg-[#00873D] hover:bg-[#007033] text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95">
                        <Upload className="w-3 h-3" />
                        <span>رفع شعار</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {localLogoConfig.logoUrl ? (
                          <img src={localLogoConfig.logoUrl} className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={localLogoConfig.logoUrl || ''}
                        onChange={(e) => setLocalLogoConfig({ ...localLogoConfig, logoUrl: e.target.value })}
                        placeholder="رابط الشعار المباشر..."
                        className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-500">حجم الشعار (px):</span>
                        <input
                          type="number"
                          value={localLogoConfig.headerLogo.size}
                          onChange={(e) => setLocalLogoConfig({
                            ...localLogoConfig,
                            headerLogo: { ...localLogoConfig.headerLogo, size: parseInt(e.target.value) || 36 }
                          })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-500">لون الخلفية:</span>
                        <input
                          type="color"
                          value={localLogoConfig.headerLogo.backgroundColor}
                          onChange={(e) => setLocalLogoConfig({
                            ...localLogoConfig,
                            headerLogo: { ...localLogoConfig.headerLogo, backgroundColor: e.target.value }
                          })}
                          className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Menu Logo Config */}
                  <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-4">
                    <span className="text-sm font-black text-[#00873D] block">شعار القائمة الجانبية:</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-500">حجم الشعار (px):</span>
                        <input
                          type="number"
                          value={localLogoConfig.menuLogo.size}
                          onChange={(e) => setLocalLogoConfig({
                            ...localLogoConfig,
                            menuLogo: { ...localLogoConfig.menuLogo, size: parseInt(e.target.value) || 36 }
                          })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-500">وضع اللون:</span>
                        <select
                          value={localLogoConfig.menuLogo.colorMode}
                          onChange={(e) => setLocalLogoConfig({
                            ...localLogoConfig,
                            menuLogo: { ...localLogoConfig.menuLogo, colorMode: e.target.value as any }
                          })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          <option value="original">اللون الأصلي</option>
                          <option value="emerald">أخضر زمردي</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700">تفعيل خلفية الشعار:</span>
                      <button
                        onClick={() => setLocalLogoConfig({
                          ...localLogoConfig,
                          menuLogo: { ...localLogoConfig.menuLogo, hasBackground: !localLogoConfig.menuLogo.hasBackground }
                        })}
                        className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${localLogoConfig.menuLogo.hasBackground ? 'bg-[#00873D]' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${localLogoConfig.menuLogo.hasBackground ? '-translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. PWA & APP IDENTITY SECTION */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-8">
                <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5 pb-4 border-b border-slate-200">
                  <Smartphone className="w-6 h-6 text-[#00873D]" />
                  4. هوية التطبيق (App Identity & PWA)
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Left: Icons & Logos */}
                  <div className="space-y-6 border-l border-slate-100 pr-5 text-right">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-slate-900">أيقونة سطح المكتب (App Icon):</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-[#00873D] hover:bg-[#007033] text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95">
                          <Upload className="w-3 h-3" />
                          <span>رفع أيقونة</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePwaIconUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {localPwa.appIconUrl ? (
                            <img src={localPwa.appIconUrl} className="w-full h-full object-cover" />
                          ) : (
                            <Smartphone className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        <input
                          type="text"
                          value={localPwa.appIconUrl || ''}
                          onChange={(e) => setLocalPwa({ ...localPwa, appIconUrl: e.target.value })}
                          placeholder="رابط الأيقونة (512x512)..."
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-slate-900">شعار شاشة البداية (Splash Logo):</label>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-[#00873D] hover:bg-[#007033] text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95">
                            <Upload className="w-3 h-3" />
                            <span>رفع شعار</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePwaIntroUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {localPwa.introLogoUrl ? (
                            <img src={localPwa.introLogoUrl} className="w-full h-full object-contain p-2" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={localPwa.introLogoUrl || ''}
                            onChange={(e) => setLocalPwa({ ...localPwa, introLogoUrl: e.target.value })}
                            placeholder="رابط شعار الانترو..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                          />
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">حجم الشعار:</span>
                            <input
                              type="range"
                              min="40"
                              max="300"
                              value={localPwa.introLogoSize}
                              onChange={(e) => setLocalPwa({ ...localPwa, introLogoSize: parseInt(e.target.value) })}
                              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00873D]"
                            />
                            <span className="text-[10px] font-black text-slate-900 w-8">{localPwa.introLogoSize}px</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                          <Info className="w-3 h-3" />
                          نصيحة: يفضل استخدام صور PNG بخلفية شفافة لتندمج مع خلفية الشاشة بشكل احترافي.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-slate-900">خلفية شاشة البداية (Splash Background):</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95">
                          <Upload className="w-3 h-3" />
                          <span>رفع خلفية</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePwaBackgroundUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-12 rounded-lg bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {localPwa.introBackgroundUrl ? (
                            <img src={localPwa.introBackgroundUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={localPwa.introBackgroundUrl || ''}
                          onChange={(e) => setLocalPwa({ ...localPwa, introBackgroundUrl: e.target.value })}
                          placeholder="رابط صورة الخلفية (اختياري)..."
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-slate-900">نص شاشة البداية (Splash Text):</label>
                        <button
                          onClick={() => setLocalPwa({ ...localPwa, showIntroText: !localPwa.showIntroText })}
                          className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${localPwa.showIntroText ? 'bg-[#00873D]' : 'bg-slate-300'}`}
                        >
                          <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${localPwa.showIntroText ? '-translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {localPwa.showIntroText && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={localPwa.introText || ''}
                            onChange={(e) => setLocalPwa({ ...localPwa, introText: e.target.value })}
                            placeholder="اكتب النص هنا (مثلاً: هيربولايف الذكي)..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-slate-500">حجم الخط:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="12"
                                  max="60"
                                  value={localPwa.introTextSize}
                                  onChange={(e) => setLocalPwa({ ...localPwa, introTextSize: parseInt(e.target.value) })}
                                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00873D]"
                                />
                                <span className="text-[10px] font-black text-slate-900 w-8">{localPwa.introTextSize}px</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-slate-500">لون الخط:</span>
                              <input
                                type="color"
                                value={localPwa.introTextColor || localPwa.introColors.text}
                                onChange={(e) => setLocalPwa({ ...localPwa, introTextColor: e.target.value })}
                                className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-500">مؤثر ظهور النص:</span>
                            <div className="grid grid-cols-4 gap-2">
                              {['fade', 'slide', 'zoom', 'none'].map((anim) => (
                                <button
                                  key={anim}
                                  onClick={() => setLocalPwa({ ...localPwa, introTextAnimation: anim as any })}
                                  className={`p-1.5 rounded-lg border text-[9px] font-black transition-all ${
                                    localPwa.introTextAnimation === anim
                                      ? 'border-[#00873D] bg-emerald-50 text-[#00873D]'
                                      : 'border-slate-200 bg-white text-slate-500'
                                  }`}
                                >
                                  {anim === 'fade' ? 'تلاشي' : anim === 'slide' ? 'انزلاق' : anim === 'zoom' ? 'تكبير' : 'بدون'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Animation & Appearance */}
                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-black text-slate-900 block mb-3">مؤثر انترو الظهور (Animation):</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['fade', 'slide', 'zoom', 'none'].map((anim) => (
                          <button
                            key={anim}
                            onClick={() => setLocalPwa({ ...localPwa, introAnimation: anim as any })}
                            className={`p-2.5 rounded-xl border-2 text-[10px] font-black transition-all ${
                              localPwa.introAnimation === anim
                                ? 'border-[#00873D] bg-emerald-50 text-[#00873D]'
                                : 'border-slate-200 bg-white text-slate-500'
                            }`}
                          >
                            {anim === 'fade' ? 'تلاشي' : anim === 'slide' ? 'انزلاق' : anim === 'zoom' ? 'تكبير' : 'بدون'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <span className="text-[11px] font-black text-slate-500">لون الخلفية:</span>
                        <input
                          type="color"
                          value={localPwa.introColors.background}
                          onChange={(e) => setLocalPwa({ ...localPwa, introColors: { ...localPwa.introColors, background: e.target.value }})}
                          className="w-full h-10 rounded-xl border border-slate-300 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[11px] font-black text-slate-500">لون العناصر:</span>
                        <input
                          type="color"
                          value={localPwa.introColors.text}
                          onChange={(e) => setLocalPwa({ ...localPwa, introColors: { ...localPwa.introColors, text: e.target.value }})}
                          className="w-full h-10 rounded-xl border border-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200 mt-4">
                      <span className="text-sm font-bold text-emerald-950">تفعيل الانترو (Splash Screen):</span>
                      <button
                        onClick={() => setLocalPwa({ ...localPwa, showIntro: !localPwa.showIntro })}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${localPwa.showIntro ? 'bg-[#00873D]' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${localPwa.showIntro ? '-translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. CHAT INTERFACE FEATURES */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6 mt-8">
                  <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5 pb-4 border-b border-slate-200">
                    <Zap className="w-6 h-6 text-amber-500" />
                    5. مميزات واجهة الدردشة (Chat Features)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Toggle File Upload */}
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 transition-all hover:border-[#00873D]/30 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Paperclip className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 block">زر إرفاق الملفات والصور</span>
                          <p className="text-[10px] font-bold text-slate-500">إتاحة إمكانية رفع الصور والمستندات في الدردشة</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLocalChatFeatures({ ...localChatFeatures, showUploadButton: !localChatFeatures.showUploadButton })}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${localChatFeatures.showUploadButton ? 'bg-[#00873D]' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${localChatFeatures.showUploadButton ? '-translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle Voice Recording */}
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 transition-all hover:border-[#00873D]/30 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Mic className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 block">زر التسجيل الصوتي</span>
                          <p className="text-[10px] font-bold text-slate-500">تفعيل التعرف على الصوت وتحويله لنص</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLocalChatFeatures({ ...localChatFeatures, showVoiceButton: !localChatFeatures.showVoiceButton })}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${localChatFeatures.showVoiceButton ? 'bg-[#00873D]' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${localChatFeatures.showVoiceButton ? '-translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle Smart Search in Sidebar */}
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 transition-all hover:border-[#00873D]/30 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Search className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 block">حقل البحث الذكي</span>
                          <p className="text-[10px] font-bold text-slate-500">تفعيل حقل البحث في سجل المحادثات بالقائمة الجانبية</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLocalChatFeatures({ ...localChatFeatures, showSearchInSideMenu: !localChatFeatures.showSearchInSideMenu })}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${localChatFeatures.showSearchInSideMenu ? 'bg-[#00873D]' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${localChatFeatures.showSearchInSideMenu ? '-translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 mt-4">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      تحكم في ظهور أزرار الإدخال للمستخدمين لتبسيط الواجهة أو توفير خيارات إدخال متقدمة حسب الحاجة.
                    </p>
                  </div>
                </div>

                {/* 6. SHARING SETTINGS SECTION */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xs space-y-6 mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <h4 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5">
                      <Sparkles className="w-6 h-6 text-[#00873D]" />
                      6. تخصيص إهداء ومشاركة التطبيق (Smart Share & Short Link)
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        {
                          label: 'دعوة صحية راقية',
                          text: '🌿 أنصحك بتجربة المستشار الذكي لهيربولايف — دليلك الشخصي للتغذية المتوازنة والوصول لوزنك المثالي بنشاط وبدون حرمان:',
                        },
                        {
                          label: 'رشاقة وحرق دهون',
                          text: '⚡ إذا كنت تبحث عن خطة ذكية لخسارة الوزن ورفع طاقتك اليومية بدون جوع، جرب المحادثة المباشرة مع مستشار هيربولايف الذكي:',
                        },
                        {
                          label: 'هدية استشارة مجانية',
                          text: '🎁 أهديك رابط المستشار الغذائي الذكي من هيربولايف.. اسأله عن أي هدف صحي أو منتج وسيجيبك فوراً بالصور والفيديو:',
                        },
                      ].map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setLocalSharingSettings({
                              ...localSharingSettings,
                              shareMessage: tpl.text,
                            })
                          }
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#00873D] border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-800 block mb-1.5">
                          عنوان الزر الثابت أسفل القائمة الجانبية:
                        </label>
                        <input
                          type="text"
                          value={localSharingSettings.buttonTitle ?? ''}
                          onChange={(e) =>
                            setLocalSharingSettings({
                              ...localSharingSettings,
                              buttonTitle: e.target.value,
                            })
                          }
                          placeholder="مثلاً: إهداء المستشار لصديق"
                          className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#00873D] rounded-xl text-xs font-bold text-slate-950 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-800 block mb-1.5">
                          رسالة الدعوة المرفقة مع الرابط:
                        </label>
                        <textarea
                          rows={3}
                          value={localSharingSettings.shareMessage}
                          onChange={(e) =>
                            setLocalSharingSettings({
                              ...localSharingSettings,
                              shareMessage: e.target.value,
                            })
                          }
                          placeholder="اكتب الرسالة التي سيتم إرسالها مع الرابط..."
                          className="w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-[#00873D] rounded-xl text-xs sm:text-sm font-semibold text-slate-950 leading-relaxed outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-800 block mb-1.5">
                          الرابط المختصر للتطبيق:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            dir="ltr"
                            value={localSharingSettings.shortLink}
                            onChange={(e) =>
                              setLocalSharingSettings({
                                ...localSharingSettings,
                                shortLink: e.target.value,
                              })
                            }
                            placeholder="يتم توليد رابط مختصر تلقائياً..."
                            className="flex-1 p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#00873D] rounded-xl text-xs font-mono font-bold text-slate-950 outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                showToast('⏳ جاري توليد رابط مختصر قصير للتطبيق...');
                                const targetUrl = window.location.origin.replace('ais-dev-', 'ais-pre-');
                                const res = await fetch('/api/shorten-url', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ url: targetUrl }),
                                });
                                const data = await res.json();
                                if (data?.shortUrl) {
                                  setLocalSharingSettings({
                                    ...localSharingSettings,
                                    shortLink: data.shortUrl,
                                  });
                                  try {
                                    localStorage.setItem('herbalife_cached_short_url_v1', data.shortUrl);
                                  } catch {}
                                  showToast('✅ تم توليد الرابط المختصر بنجاح!');
                                }
                              } catch {
                                showToast('⚠️ تعذر الاتصال بخدمة الاختصار');
                              }
                            }}
                            className="px-3.5 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white font-black rounded-xl text-xs transition-all shrink-0 shadow-xs"
                          >
                            توليد رابط مختصر
                          </button>
                        </div>
                      </div>
                    </div>

                      <div>
                        <label className="text-xs font-black text-slate-800 block mb-1.5">
                          رابط صورة المشاركة (اختياري):
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            dir="ltr"
                            value={localSharingSettings.shareImageUrl || ''}
                            onChange={(e) =>
                              setLocalSharingSettings({
                                ...localSharingSettings,
                                shareImageUrl: e.target.value,
                              })
                            }
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#00873D] rounded-xl text-xs font-bold text-slate-950 outline-hidden"
                          />
                          <label className="cursor-pointer px-3 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95">
                            <Upload className="w-3.5 h-3.5" />
                            <span>رفع صورة</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  showToast('جاري ضغط ومعالجة صورة المشاركة...');
                                  const compressed = await compressImageFile(file, 800, 800, 0.8);
                                  setLocalSharingSettings({
                                    ...localSharingSettings,
                                    shareImageUrl: compressed,
                                  });
                                  showToast('✅ تم رفع صورة المشاركة بنجاح');
                                } catch (err) {
                                  showToast('❌ فشل معالجة الصورة');
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {localSharingSettings.shareImageUrl && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setLocalSharingSettings({ ...localSharingSettings, shareImageUrl: null })}
                              className="text-[10px] font-bold text-rose-600 hover:underline"
                            >
                              إزالة الصورة
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Preview Box */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#004d23] via-[#006830] to-[#003d1b] text-white border border-[#D4AF37]/40 flex flex-col justify-between space-y-4 shadow-md">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-xs font-black text-[#D4AF37] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          معاينة شكل الرسالة عند الإرسال لصديق
                        </span>
                        <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-emerald-100">
                          واتساب / تيليجرام / جوال
                        </span>
                      </div>

                      <div className="bg-black/25 p-3 rounded-xl border border-white/10 space-y-3 text-right" dir="rtl">
                        {localSharingSettings.shareImageUrl && (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900/50 border border-white/5">
                            <img
                              src={localSharingSettings.shareImageUrl}
                              alt="Share Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <p className="text-xs text-emerald-50 leading-relaxed whitespace-pre-wrap font-medium">
                          {localSharingSettings.shareMessage || 'رسالة الدعوة تظهر هنا...'}
                        </p>
                        <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                          <span dir="ltr" className="text-xs font-mono text-[#D4AF37] underline truncate">
                            {localSharingSettings.shortLink || 'https://tinyurl.com/herbalife-ai'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-100/90 font-medium leading-relaxed">
                        💡 زر <strong>"{localSharingSettings.buttonTitle || 'مشاركة التطبيق'}"</strong> مثبت بشكل دائم أسفل القائمة الجانبية ليتمكن الزوار من مشاركة التطبيق بضغطة واحدة. يتم إرسال الصورة المرفقة (إن وجدت) كملف حقيقي في تطبيقات التواصل الاجتماعي.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {activeTab === 'users' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-3 text-right" dir="rtl">
                      <Users className="w-7 h-7 text-[#00873D]" />
                      إدارة المشرفين والصلاحيات
                    </h3>
                    <p className="text-sm text-slate-500 font-bold mt-1 text-right" dir="rtl">
                      إضافة أو حذف المستخدمين الذين لديهم صلاحية الوصول للوحة التحكم
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingUser(!isAddingUser)}
                    className="px-5 py-2.5 bg-[#00873D] text-white rounded-xl font-black text-sm flex items-center gap-2 shadow-md hover:bg-[#007033] transition-all active:scale-95"
                  >
                    {isAddingUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{isAddingUser ? 'إلغاء' : 'إضافة مشرف جديد'}</span>
                  </button>
                </div>

                {isAddingUser && (
                  <form onSubmit={handleAddUser} className="bg-white p-6 rounded-3xl border-2 border-[#00873D]/30 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right" dir="rtl">
                        <label className="text-xs font-black text-slate-700 pr-1">البريد الإلكتروني:</label>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-[#00873D] outline-none text-left"
                          required
                          placeholder="example@gmail.com"
                        />
                      </div>
                      <div className="space-y-1.5 text-right" dir="rtl">
                        <label className="text-xs font-black text-slate-700 pr-1">كلمة المرور المؤقتة:</label>
                        <input
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-[#00873D] outline-none text-left"
                          required
                          placeholder="*******"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" className="px-8 py-3 bg-[#00873D] text-white rounded-xl font-black text-sm shadow-md hover:bg-[#007032]">
                        تأكيد إنشاء الحساب
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {dbUsers.map((u) => (
                    <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-[#00873D]/20 transition-all">
                      <div className="flex items-center gap-4 text-right" dir="rtl">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00873D] flex items-center justify-center font-black">
                          {u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 block">{u.email}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              رقم التعريف: #{u.id}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role === 'admin' ? 'مشرف رئيسي' : 'محرر محتوى'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {u.email !== currentUser?.email && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="حذف هذا الحساب"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-right" dir="rtl">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-[#00873D]" />
                    إعدادات الأمان واسترداد الحساب
                  </h3>
                  <p className="text-sm text-slate-500 font-bold mt-1">
                    تأمين حسابك عبر المصادقة الثنائية وتغيير كلمات المرور
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* TOTP Setup Card */}
                  <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 text-right" dir="rtl">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D4AF37] flex items-center justify-center shadow-sm">
                        <Fingerprint className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-slate-900 block">المصادقة الثنائية (TOTP)</span>
                        <p className="text-[10px] font-bold text-slate-500">استخدم تطبيقات مثل Google Authenticator</p>
                      </div>
                    </div>

                    {!totpSetup ? (
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3 text-right" dir="rtl">
                        <p className="text-xs text-slate-600 font-bold leading-relaxed">
                          هذه الميزة تسمح لك باسترداد حسابك في حال نسيان كلمة المرور عبر رمز متغير يتم توليده على هاتفك الشخصي.
                        </p>
                        <button
                          onClick={handleSetupTotp}
                          className="w-full py-3 bg-[#00873D] text-white rounded-xl font-black text-sm shadow-md hover:bg-[#007032] transition-all"
                        >
                          تفعيل وإعداد الرمز الآن
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-center bg-white p-3 rounded-2xl border border-slate-100 shadow-inner">
                          <img src={totpSetup.qrCodeDataUrl} alt="QR Code" className="w-40 h-40" />
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[10px] font-black text-amber-800 text-center mb-1">الرمز السري الاحتياطي:</p>
                          <p className="text-sm font-mono font-black text-slate-900 text-center select-all">{totpSetup.secret}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold text-center leading-tight">
                          قم بمسح الكود أعلاه عبر هاتفك. هذا الكود هو وسيلتك الوحيدة لاستعادة الحساب إذا فقدت كلمة المرور.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Password Change Card */}
                  <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 text-right" dir="rtl">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-slate-900 block">تغيير كلمة المرور</span>
                        <p className="text-[10px] font-bold text-slate-500">قم بتحديث كلمة المرور الخاصة بك بشكل دوري</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5 text-right" dir="rtl">
                        <label className="text-[11px] font-black text-slate-500 pr-1">كلمة المرور الجديدة:</label>
                        <input
                          type="password"
                          id="newAdminPass"
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-[#00873D] outline-none text-left"
                          placeholder="أدخل كلمة مرور قوية..."
                        />
                      </div>
                      <div className="space-y-1.5 text-right" dir="rtl">
                        <label className="text-[11px] font-black text-slate-500 pr-1">إيميل الاسترداد:</label>
                        <input
                          type="email"
                          id="recoveryEmail"
                          defaultValue={currentUser?.email}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-[#00873D] outline-none text-left"
                          placeholder="email@example.com"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          const input = document.getElementById('newAdminPass') as HTMLInputElement;
                          const recoveryInput = document.getElementById('recoveryEmail') as HTMLInputElement;
                          try {
                            if (input.value) {
                              await fetch('/api/auth/change-password', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'x-session-id': sessionId || ''
                                },
                                body: JSON.stringify({ newPassword: input.value })
                              });
                            }
                            // Add logic to save recovery email if needed, but for now just password
                            showToast('✅ تم تحديث بيانات الأمان');
                            if (input) input.value = '';
                          } catch (err) {
                            alert('خطأ في العملية');
                          }
                        }}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm shadow-md hover:bg-black transition-all active:scale-95"
                      >
                        تحديث بيانات الأمان
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics-ai' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header */}
              <div className="bg-gradient-to-br from-emerald-900 via-[#007033] to-[#005224] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#D4AF37]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black">تحليلات المنتجات وذكاء المعرفة الآلي</h3>
                  </div>
                  <p className="text-sm sm:text-base text-emerald-100 font-medium max-w-3xl leading-relaxed">
                    مراقب ذكي يرصد تفاعل الزوار، يعرض إحصائيات المنتجات الأكثر طلباً عبر رسوم بيانية تفاعلية (Recharts)، ويتيح لك توجيه الذكاء الاصطناعي لاكتشاف ومعالجة الأسئلة الجديدة غير المتاحة في قاعدة المعرفة.
                  </p>
                </div>
              </div>

              {/* 1. RECHARTS ANALYTICS SECTION */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00873D] flex items-center justify-center font-black">
                      📊
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">رسوم بيانية لمدى تكرار اقتراح المنتجات</h4>
                      <p className="text-xs font-bold text-slate-500">إحصائيات حية مبنية على المحادثات الفعّالة لمساعدة الإدارة في معرفة المنتجات الأكثر طلباً.</p>
                    </div>
                  </div>
                </div>

                {productRecommendationStats.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                    <p className="text-sm font-bold text-slate-500">لا توجد بيانات تفاعلية كافية بعد. ابدأ محادثات جديدة مع العملاء لتظهر الإحصائيات هنا!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Bar Chart */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h5 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>📈</span>
                        <span>مخطط الأعمدة التكراري (Bar Chart)</span>
                      </h5>
                      <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productRecommendationStats} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} 
                              interval={0}
                              angle={-25}
                              textAnchor="end"
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="count" name="عدد مرات الاقتراح" fill="#00873D" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h5 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>🥧</span>
                        <span>مخطط النسب المئوية (Pie Chart)</span>
                      </h5>
                      <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={productRecommendationStats.filter(p => p.count > 0)}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={105}
                              innerRadius={50}
                              paddingAngle={4}
                              label={({ name, percent }) => `${name} (${(((percent as number) || 0) * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {productRecommendationStats.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. AI GUIDANCE PROMPT EDITOR */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                      🤖
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">برومت وتوجيهات المسؤول للذكاء الاصطناعي</h4>
                      <p className="text-xs font-bold text-slate-500">حدد الشروط والضوابط التي يتبعها الذكاء الاصطناعي في رصد الأسئلة الجديدة وتوليد الإجابات.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-800 block mb-2">
                      التوجيهات والتعليمات الأساسية للذكاء الاصطناعي (Prompt):
                    </label>
                    <textarea
                      rows={4}
                      value={tempAiGuidance.prompt}
                      onChange={(e) => setTempAiGuidance({ ...tempAiGuidance, prompt: e.target.value })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-300 focus:border-[#00873D] rounded-2xl text-sm font-bold text-slate-900 outline-hidden transition-all shadow-2xs"
                      placeholder="اكتب التعليمات التي يلتزم بها الذكاء الاصطناعي في التعامل مع الاستفسارات الجديدة..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-800 block mb-2">
                        الدومينات والمصادر المسموحة لجلب الإجابات (مفصولة بفواصل):
                      </label>
                      <input
                        type="text"
                        value={tempAiGuidance.allowedDomains.join(', ')}
                        onChange={(e) => setTempAiGuidance({
                          ...tempAiGuidance,
                          allowedDomains: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-900 outline-hidden transition-all"
                        placeholder="herbalife.com, nutrition.org..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-800 block mb-2">
                        حدود الإجابة ونطاق الصلاحيات (Answer Boundaries):
                      </label>
                      <input
                        type="text"
                        value={tempAiGuidance.answerBoundaries}
                        onChange={(e) => setTempAiGuidance({ ...tempAiGuidance, answerBoundaries: e.target.value })}
                        className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-900 outline-hidden transition-all"
                        placeholder="الالتزام بالمنتجات الصحية وعدم تقديم وصفات طبية..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSaveAiGuidance(tempAiGuidance);
                        showToast('✅ تم حفظ توجيهات الذكاء الاصطناعي بنجاح');
                      }}
                      className="px-6 py-3 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>حفظ توجيهات الذكاء الاصطناعي</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. UNANSWERED / MISSING QUERIES QUEUE & KB MIGRATION */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                      ❓
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">الأسئلة الجديدة غير المتاحة ومقترحات الذكاء الاصطناعي</h4>
                      <p className="text-xs font-bold text-slate-500">الأسئلة التي سألها المستخدمون ولم تكن مغطاة بقاعدة المعرفة. يمكنك مراجعة الإجابة المقترحة واعتمادها لترحيلها فوراً للقاعدة.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
                    قيد المراجعة: {unansweredQueries.filter(q => q.status === 'pending').length}
                  </span>
                </div>

                {unansweredQueries.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                    <p className="text-sm font-bold text-slate-500">لا توجد أسئلة جديدة غير معتمدة حالياً. النظام رصد كافة استفسارات الزوار بنجاح!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unansweredQueries.map((uq) => (
                      <div key={uq.id} className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-4 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg text-xs font-black">
                              سؤال زائر جديد
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {new Date(uq.timestamp).toLocaleDateString('ar-SA')} ({new Date(uq.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                          {uq.status === 'approved' && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> تم الاعتماد والترحيل لقاعدة المعرفة
                            </span>
                          )}
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-300 text-slate-900 text-sm font-bold">
                          "{uq.query}"
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-700 block">
                            الإجابة المقترحة من الذكاء الاصطناعي (قابل للتعديل قبل الاعتماد):
                          </label>
                          <textarea
                            rows={3}
                            defaultValue={uq.adminEditedAnswer || uq.suggestedAnswer}
                            id={`ans-input-${uq.id}`}
                            className="w-full p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => onDeleteUnansweredQuery(uq.id)}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black transition-colors"
                          >
                            حذف الاستفسار
                          </button>
                          {uq.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                const textareaEl = document.getElementById(`ans-input-${uq.id}`) as HTMLTextAreaElement;
                                const val = textareaEl ? textareaEl.value : uq.suggestedAnswer;
                                onApproveUnansweredQuery(uq.id, val);
                                showToast('✅ تم اعتماد السؤال وترحيله إلى قاعدة المعرفة بنجاح');
                              }}
                              className="px-5 py-2 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>اعتماد وترحيل لقاعدة المعرفة</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Q&A Addition */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00873D] flex items-center justify-center font-black">
                        ✍️
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-950">إضافة سؤال وجواب بشكل يدوي</h4>
                        <p className="text-xs font-bold text-slate-500">أضف أسئلة متوقعة مع إجاباتها المعتمدة لتغذية قاعدة المعرفة الفورية للذكاء الاصطناعي.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-slate-800 block mb-2">السؤال:</label>
                      <input
                        type="text"
                        id="manual-qa-question"
                        className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-900 outline-hidden"
                        placeholder="مثال: ما هي طريقة استخدام منتج فورمولا 1 بشكل صحيح؟"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-800 block mb-2">الجواب المعتمد:</label>
                      <textarea
                        rows={3}
                        id="manual-qa-answer"
                        className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                        placeholder="اكتب الإجابة المفصلة والدقيقة التي سيجيب بها الذكاء الاصطناعي..."
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const qInput = document.getElementById('manual-qa-question') as HTMLInputElement;
                          const aInput = document.getElementById('manual-qa-answer') as HTMLTextAreaElement;
                          if (!qInput || !qInput.value.trim() || !aInput || !aInput.value.trim()) {
                            showToast('⚠️ يرجى تعبئة حقل السؤال والإجابة');
                            return;
                          }
                          if (onAddManualAiQa) {
                            onAddManualAiQa(qInput.value.trim(), aInput.value.trim());
                            qInput.value = '';
                            aInput.value = '';
                            showToast('✅ تمت إضافة السؤال والجواب يدوياً إلى قاعدة المعرفة بنجاح');
                          }
                        }}
                        className="px-6 py-3 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة وإدراج لقاعدة المعرفة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Generated KB Archive */}
                {aiGeneratedKb.length > 0 && (
                  <div className="pt-6 border-t-2 border-slate-200 space-y-4">
                    <h5 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>📚</span>
                      <span>ملف قاعدة المعرفة المولد بالذكاء الاصطناعي والمصادق عليه ({aiGeneratedKb.length})</span>
                    </h5>
                    <div className="space-y-3">
                      {aiGeneratedKb.map((kb) => (
                        <div key={kb.id} className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                            <span>سؤال: {kb.question}</span>
                            <span className="font-mono">{new Date(kb.approvedAt).toLocaleDateString('ar-SA')}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">الجواب المعتمد: {kb.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'trash' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-950">سلة المهملات (Recycle Bin)</h3>
                    <p className="text-sm font-bold text-slate-600">استعادة العناصر المحذوفة أو تصفية قاعدة المعرفة نهائياً.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Products Trash */}
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4 flex flex-col">
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                    المنتجات المحذوفة ({(trashData.products || []).length})
                  </h4>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 flex-1">
                    {isTrashLoading ? (
                      <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : (trashData.products || []).length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-xs font-bold text-slate-400">لا توجد منتجات في السلة</p>
                      </div>
                    ) : (trashData.products.map(p => (
                      <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 group hover:border-rose-300 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 grayscale opacity-60" />
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-black text-slate-900 truncate">{p.name}</h4>
                            <span className="text-[10px] text-slate-500 font-bold">{p.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestoreProduct(p.id)}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shadow-sm"
                            title="استعادة المنتج"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteProduct(p.id)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors shadow-sm"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )))}
                  </div>
                </div>

                {/* Docs Trash */}
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4 flex flex-col">
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                    <FileText className="w-5 h-5 text-blue-600" />
                    المستندات المحذوفة ({(trashData.docs || []).length})
                  </h4>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 flex-1">
                    {isTrashLoading ? (
                      <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : (trashData.docs || []).length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-xs font-bold text-slate-400">لا توجد مستندات في السلة</p>
                      </div>
                    ) : (trashData.docs.map(d => (
                      <div key={d.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 group hover:border-rose-300 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 grayscale opacity-60">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-black text-slate-900 truncate">{d.name}</h4>
                            <span className="text-[10px] text-slate-500 font-bold">منتج: {d.productName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestoreDoc(d.id, d.productId)}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                            title="استعادة المستند"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteDoc(d.id, d.productId)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors shadow-sm"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )))}
                  </div>
                </div>

                {/* Prompts Trash */}
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4 flex flex-col">
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Brain className="w-5 h-5 text-purple-600" />
                    البرومبتات المحذوفة ({(trashData.prompts || []).length})
                  </h4>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 flex-1">
                    {isTrashLoading ? (
                      <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : (trashData.prompts || []).length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-xs font-bold text-slate-400">لا توجد برومبتات في السلة</p>
                      </div>
                    ) : (trashData.prompts.map(pr => (
                      <div key={pr.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 group hover:border-purple-300 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0 grayscale opacity-60">
                            <Brain className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-black text-slate-900 truncate">{pr.title}</h4>
                            <span className="text-[10px] text-slate-500 font-bold truncate block">نبرة: {pr.tone || 'افتراضية'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestorePrompt(pr.id)}
                            className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors shadow-sm"
                            title="استعادة البرومبت"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDeletePrompt(pr.id)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors shadow-sm"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* CATEGORY MANAGEMENT MODAL */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-white border-b-2 border-slate-200 text-slate-950">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-[#00873D]" />
                <h3 className="text-base sm:text-lg font-black">إدارة تصنيفات قاعدة المعرفة</h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-950 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed">
                تحكم كامل في تصنيفات قاعدة المعرفة: أضف تصنيفات جديدة، عدّل أسماءها، أو احذف غير المرغوب فيه بحرية تامة دون قيود.
              </p>

              {/* Add New Category */}
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory(newCategoryInput);
                    }
                  }}
                  placeholder="اكتب اسم التصنيف الجديد..."
                  className="flex-1 p-3 bg-white border-2 border-slate-300 focus:border-[#00873D] rounded-xl text-sm font-bold text-slate-950 outline-hidden transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddCategory(newCategoryInput)}
                  className="px-5 py-3 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl text-sm font-black shadow-2xs flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Categories List */}
              <div className="space-y-2.5 pt-3 border-t-2 border-slate-200">
                <span className="text-sm font-bold text-slate-950 block">
                  التصنيفات المعتمدة حالياً ({categories.length}):
                </span>
                <div className="space-y-2.5">
                  {categories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-xl border-2 border-slate-300 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      {editingCategoryIdx === idx ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingCategoryValue}
                            onChange={(e) => setEditingCategoryValue(e.target.value)}
                            className="flex-1 p-2.5 bg-white border-2 border-[#00873D] rounded-xl text-sm font-black text-slate-950"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCategory(idx, editingCategoryValue)}
                            className="px-4 py-2 bg-[#00873D] text-white text-xs sm:text-sm font-bold rounded-lg shadow-2xs"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryIdx(null)}
                            className="px-3 py-2 text-xs sm:text-sm text-slate-700 hover:text-slate-950 font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00873D] shrink-0" />
                            <span className="text-sm font-black text-slate-950 truncate">{cat}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryIdx(idx);
                                setEditingCategoryValue(cat);
                              }}
                              className="p-2 text-slate-700 hover:text-[#00873D] hover:bg-emerald-50 rounded-lg transition-colors"
                              title="تعديل اسم التصنيف"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(idx)}
                              className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف التصنيف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-950 font-black rounded-xl text-sm transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {previewVideoForModal && (
        <VideoModal
          video={previewVideoForModal}
          onClose={() => setPreviewVideoForModal(null)}
        />
      )}

      {/* SMART IMAGE PREVIEW LIGHTBOX MODAL */}
      {previewImageForModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImageForModal(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border-2 border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#00873D]" />
                <h4 className="text-base sm:text-lg font-black text-slate-950 truncate">
                  {previewImageForModal.title}
                </h4>
                {previewImageForModal.isMain && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black rounded-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    رئيسية
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageForModal(null)}
                className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Container */}
            <div className="bg-slate-950 flex items-center justify-center p-4 max-h-[60vh] overflow-hidden">
              <img
                src={previewImageForModal.imageUrl}
                alt={previewImageForModal.title}
                className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Smart Image Details */}
            <div className="p-5 space-y-3 bg-white">
              <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 text-sm space-y-1">
                <div className="flex items-center gap-2 font-black text-slate-950">
                  <Brain className="w-4 h-4 text-[#00873D]" />
                  <span>توضيح الذكاء الاصطناعي لمحتوى هذه الصورة:</span>
                </div>
                <p className="text-slate-800 font-semibold leading-relaxed">
                  {previewImageForModal.aiDescription || 'لا يوجد توضيح مخصص'}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border-2 border-emerald-200 text-sm space-y-1">
                <div className="flex items-center gap-2 font-black text-emerald-950">
                  <Eye className="w-4 h-4 text-[#00873D]" />
                  <span>متى يقترح الذكاء الاصطناعي إظهار هذه الصورة للمستخدم:</span>
                </div>
                <p className="text-emerald-900 font-semibold leading-relaxed">
                  {previewImageForModal.displayTrigger || 'حسب تقدير المساعد الذكي'}
                </p>
              </div>

              {previewImageForModal.dependsOnImageId && previewImageForModal.dependsOnImageId !== 'none' && (
                <div className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-700" />
                  <span>
                    الشرط التسلسلي: تُرسل هذه الصورة فقط بعد إرسال الصورة التأسيسية السابقة المحددة.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDocForModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewDocForModal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border-2 border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                <FileText className="w-5 h-5 text-[#00873D] shrink-0" />
                <h4 className="text-base sm:text-lg font-black text-slate-950 truncate">
                  {previewDocForModal.name}
                </h4>
                <span className="px-2 py-0.5 bg-emerald-100 text-[#00873D] text-xs font-bold rounded-md shrink-0">
                  {previewDocForModal.type.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocForModal(null)}
                className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center transition-colors shrink-0 mr-2"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <Brain className="w-4 h-4 text-[#00873D]" />
                  <span>الخلاصة العلمية وبيانات المستند الموجهة للذكاء الاصطناعي:</span>
                </div>
                <p className="text-sm text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap">
                  {previewDocForModal.extractedText || 'لا توجد نصوص أو ملخصات مسجلة لهذا المستند.'}
                </p>
              </div>

              {previewDocForModal.fileData && (
                <div className="flex justify-end pt-2">
                  <a
                    href={previewDocForModal.fileData}
                    download={previewDocForModal.name}
                    className="px-5 py-2.5 bg-[#00873D] hover:bg-[#007033] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الملف الأصلي</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
