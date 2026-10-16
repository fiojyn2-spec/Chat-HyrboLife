import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Film,
  Database,
  Type,
  ChevronLeft,
  ShoppingBag,
  ExternalLink,
  Flame,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Play,
  Image as ImageIcon,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ChevronRight,
  Info,
  FileText,
  Brain,
  Cpu,
  AlertTriangle,
  MessageSquarePlus,
  Zap,
  Share2,
  Copy,
  Smartphone,
  Trash2,
  Paperclip,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  ChatMessage,
  Product,
  ProductVideo,
  ProductImage,
  AttachedDoc,
  MedicalFontSize,
  PersuasionPrompt,
  AppLogoConfig,
  WelcomeSettings,
  AdminDashboardTab,
  AIProviderId,
  ChatFeatures,
} from '../types';
import {
  getVideoThumbnail,
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
  isYouTubeShorts,
  isYouTubeUrl,
} from '../utils/videoUtils';
import { renderFormattedText } from '../utils/textFormatter';
import { fetchAIProvidersStatus } from '../services/aiProviderService';
import { compressImageFile } from '../utils/imageCompressor';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, imageUrl?: string) => void;
  onOpenSideMenu: () => void;
  onOpenDashboard: (tab?: AdminDashboardTab) => void;
  products: Product[];
  onOpenVideoModal: (video: ProductVideo) => void;
  onOpenProductModal: (product: Product) => void;
  medicalFontSize: MedicalFontSize;
  onToggleMedicalFontSize: () => void;
  activePrompt: PersuasionPrompt;
  onNewChat: () => void;
  logoConfig: AppLogoConfig;
  welcomeSettings: WelcomeSettings;
  chatFeatures: ChatFeatures;
  highlightedMessageId?: string | null;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onOpenSideMenu,
  onOpenDashboard,
  products,
  onOpenVideoModal,
  onOpenProductModal,
  medicalFontSize,
  onToggleMedicalFontSize,
  activePrompt,
  onNewChat,
  logoConfig,
  welcomeSettings,
  chatFeatures,
  highlightedMessageId,
}) => {
  const { isInstallable, isInstalled, isInstalling, installProgress, isIOS, install, uninstall } = usePWAInstall();
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeViewerImage, setActiveViewerImage] = useState<{
    img: ProductImage;
    prod?: Product;
    gallery: { img: ProductImage; prod?: Product }[];
    index: number;
  } | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasPanned, setHasPanned] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetZoomAndPan = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setHasPanned(false);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [playingInlineVideoId, setPlayingInlineVideoId] = useState<string | null>(null);

  const [activeEngine, setActiveEngine] = useState<AIProviderId>('deepseek');
  const [hasFailoverAlert, setHasFailoverAlert] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
      setTimeout(() => {
        messageRefs.current[highlightedMessageId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, [highlightedMessageId]);

  useEffect(() => {
    const updateStatus = () => {
      fetchAIProvidersStatus()
        .then((res) => {
          if (res?.config?.primaryProvider) setActiveEngine(res.config.primaryProvider);
          setHasFailoverAlert(!!res?.activeFailover);
        })
        .catch(() => {});
    };

    updateStatus();
    const interval = setInterval(updateStatus, 15000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Success effect after install
  useEffect(() => {
    if (isInstalled && !localStorage.getItem('pwa_install_toast_shown')) {
      showToast('✅ تم تثبيت التطبيق بنجاح! يمكنك الآن استخدامه من الشاشة الرئيسية.');
      localStorage.setItem('pwa_install_toast_shown', 'true');
    }
  }, [isInstalled]);

  // Global mouse & touch move listeners for smooth image panning/dragging when zoomed
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPanPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setPanPosition({
          x: e.touches[0].clientX - dragStartRef.current.x,
          y: e.touches[0].clientY - dragStartRef.current.y,
        });
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Keyboard navigation & zoom for image viewer (ESC to close, Left/Right to flip, +/- to zoom)
  useEffect(() => {
    const handleViewerKeyDown = (e: KeyboardEvent) => {
      if (!activeViewerImage) return;

      if (e.key === 'Escape') {
        setActiveViewerImage(null);
        resetZoomAndPan();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const nextIdx = (activeViewerImage.index + 1) % activeViewerImage.gallery.length;
        const nextItem = activeViewerImage.gallery[nextIdx];
        setActiveViewerImage({
          ...nextItem,
          gallery: activeViewerImage.gallery,
          index: nextIdx,
        });
        resetZoomAndPan();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const prevIdx =
          (activeViewerImage.index - 1 + activeViewerImage.gallery.length) %
          activeViewerImage.gallery.length;
        const prevItem = activeViewerImage.gallery[prevIdx];
        setActiveViewerImage({
          ...prevItem,
          gallery: activeViewerImage.gallery,
          index: prevIdx,
        });
        resetZoomAndPan();
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((prev) => Math.min(prev + 0.5, 3.5));
      } else if (e.key === '-') {
        setZoomScale((prev) => {
          const next = Math.max(prev - 0.5, 1);
          if (next === 1) setPanPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        resetZoomAndPan();
      }
    };

    window.addEventListener('keydown', handleViewerKeyDown);
    return () => window.removeEventListener('keydown', handleViewerKeyDown);
  }, [activeViewerImage]);

  const handleDownloadImage = (url: string, title: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'herbalife-image'}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if ((!inputText.trim() && !pendingImage) || isLoading) return;
    
    if (inputText.trim().toLowerCase() === '/hyrbolife-db') {
      setInputText('');
      onOpenDashboard('products');
      return;
    }

    onSendMessage(inputText.trim(), pendingImage || undefined);
    setInputText('');
    setPendingImage(null);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file);
      setPendingImage(compressed);
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('فشل في معالجة الصورة');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Web Speech API for voice recording
  const handleToggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('التعرف على الصوت غير مدعوم في متصفحك الحالي، يمكنك الكتابة في المربع.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Font class mapping
  const getTextClass = () => {
    if (medicalFontSize === 'small') {
      return 'text-[13px] sm:text-[14px] leading-tight';
    }
    if (medicalFontSize === 'medical') {
      return 'text-lg sm:text-xl leading-relaxed tracking-normal font-medium';
    }
    if (medicalFontSize === 'large') {
      return 'text-base sm:text-lg leading-relaxed';
    }
    return 'text-sm sm:text-base leading-normal';
  };

  // Helper to find video by ID across all products
  const findVideoById = (vidId: string): { video: ProductVideo; product: Product } | null => {
    for (const p of products) {
      if (p.videos) {
        const found = p.videos.find((v) => v.id === vidId);
        if (found) return { video: found, product: p };
      }
    }
    return null;
  };

  // Helper to find product by ID
  const findProductById = (prodId: string): Product | null => {
    return products.find((p) => p.id === prodId) || null;
  };

  const { headerLogo, logoUrl } = logoConfig;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#FAFCFB] overflow-hidden">
      {/* NATIVE APP TOP BAR (No Browser Chrome) */}
      <header className="shrink-0 h-14 sm:h-16 px-3 sm:px-4 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 flex items-center justify-between z-20 shadow-2xs">
        {/* Right side: Hamburger & Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSideMenu}
            className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-[#00873D] flex items-center justify-center transition-colors active:scale-95"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            {/* Logo badge configured dynamically */}
            <div
              style={{
                width: `${headerLogo.size}px`,
                height: `${headerLogo.size}px`,
                backgroundColor: headerLogo.hasBackground ? headerLogo.backgroundColor : 'transparent',
                border:
                  headerLogo.hasBorder !== false
                    ? `1.5px solid ${headerLogo.borderColor || '#D4AF37'}`
                    : 'none',
              }}
              className="relative rounded-2xl flex items-center justify-center p-1 shadow-xs overflow-hidden shrink-0 transition-all"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="شعار هيربولايف"
                  className="w-full h-full object-contain"
                  style={{
                    filter:
                      headerLogo.colorMode === 'emerald'
                        ? 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1212%) hue-rotate(119deg)'
                        : 'none',
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill={headerLogo.colorMode === 'emerald' ? '#00873D' : '#FFFFFF'}
                >
                  <path d="M50 10 C35 30 35 60 50 85 C65 60 65 30 50 10 Z" />
                  <path d="M45 50 C25 40 10 60 25 80 C40 85 45 65 45 50 Z" />
                  <path d="M55 50 C75 40 90 60 75 80 C60 85 55 65 55 50 Z" />
                </svg>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                المساعد الذكي
              </h1>
            </div>
          </div>
        </div>

        {/* Left side actions */}
        <div className="flex items-center gap-1.5">
          {/* Medical Font Quick Switcher */}
          <button
            onClick={onToggleMedicalFontSize}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              medicalFontSize === 'medical'
                ? 'bg-[#00873D] text-white shadow-xs'
                : 'bg-emerald-50 text-[#00873D] hover:bg-emerald-100'
            }`}
            title="تبديل حجم الخط الطبي لضعاف النظر"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* New Chat fast action */}
          <button
            onClick={onNewChat}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title="محادثة جديدة"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          {/* MORPHING BUTTON: INSTALL -> DELETE */}
          {isInstalled ? (
            <button
              onClick={uninstall}
              className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-rose-200/60 active:scale-95 shadow-sm"
              title="حذف التطبيق"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">حذف</span>
              <span className="sm:hidden text-[10px]">حذف</span>
            </button>
          ) : (
            <button
              onClick={isIOS ? () => onOpenDashboard('general') : install}
              disabled={isInstalling || (!isInstallable && !isIOS)}
              className={`relative h-9 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 overflow-hidden group ${
                isInstallable || isIOS 
                  ? 'bg-[#00873D] hover:bg-[#007033] text-white' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
              }`}
              title={isIOS ? 'تعليمات التثبيت للايفون' : 'تثبيت التطبيق على الهاتف'}
            >
              {/* Circular Progress Overlay */}
              {isInstalling && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#00873D]/40 backdrop-blur-[1px]">
                  <svg className="w-7 h-7 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="12"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="white"
                      strokeWidth="12"
                      strokeDasharray="264"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 264 }}
                      animate={{ strokeDashoffset: 264 - (264 * installProgress) / 100 }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                  </svg>
                </div>
              )}
              
              <div className={`flex items-center gap-1.5 transition-opacity ${isInstalling ? 'opacity-0' : 'opacity-100'}`}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">تثبيت</span>
                <span className="sm:hidden">تثبيت</span>
              </div>
              
              {isInstalling && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black z-20">
                  %{installProgress}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* CHAT MESSAGES SCROLL AREA (Scrollbars hidden) */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          /* EMPTY STATE HERO */
          <div className="max-w-xl mx-auto py-6 sm:py-10 text-center space-y-6 animate-in fade-in duration-300">
            <div className="relative inline-block">
              <div
                style={{
                  backgroundColor: headerLogo.hasBackground ? headerLogo.backgroundColor : '#00873D',
                  border:
                    headerLogo.hasBorder !== false
                      ? `2px solid ${headerLogo.borderColor || '#D4AF37'}`
                      : 'none',
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl p-3 shadow-xl flex items-center justify-center overflow-hidden transition-all"
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="شعار"
                    className="w-full h-full object-contain"
                    style={{
                      filter:
                        headerLogo.colorMode === 'emerald'
                          ? 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1212%) hue-rotate(119deg)'
                          : 'none',
                    }}
                  />
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    fill={headerLogo.colorMode === 'emerald' ? '#00873D' : '#FFFFFF'}
                  >
                    <path d="M50 10 C35 30 35 60 50 85 C65 60 65 30 50 10 Z" />
                    <path d="M45 50 C25 40 10 60 25 80 C40 85 45 65 45 50 Z" />
                    <path d="M55 50 C75 40 90 60 75 80 C60 85 55 65 55 50 Z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h2
                style={{
                  fontFamily: 'Noto Kufi Arabic, sans-serif',
                  lineHeight: '26px',
                  fontSize: '16px',
                }}
                className="font-black text-slate-900"
              >
                {welcomeSettings.title}
              </h2>
              <p
                style={{
                  fontFamily: 'Noto Kufi Arabic, sans-serif',
                  lineHeight: '26px',
                  fontSize: '16px',
                }}
                className="text-slate-600 max-w-md mx-auto font-medium"
              >
                {welcomeSettings.description}
              </p>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 block">
                {welcomeSettings.promptSuggestionsTitle}
              </span>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {welcomeSettings.quickSuggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(chip)}
                    className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#00873D] border border-slate-200/80 hover:border-emerald-300 rounded-2xl text-xs font-bold shadow-2xs transition-all active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* CONVERSATION STREAM */
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              if (isUser) {
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { messageRefs.current[msg.id] = el; }}
                    className={`flex flex-col items-end w-full animate-in fade-in duration-150 transition-all ${
                      highlightedMessageId === msg.id ? 'scale-[1.02] z-10' : ''
                    }`}
                  >
                    <div className={`relative max-w-[85%] sm:max-w-[80%] rounded-3xl rounded-br-xs p-3.5 sm:p-4 bg-gradient-to-br from-[#00873D] to-[#006e32] text-white shadow-xs transition-all ${
                      highlightedMessageId === msg.id ? 'ring-4 ring-[#D4AF37] ring-offset-4 shadow-xl' : ''
                    }`}>
                      <div className={`${getTextClass()} whitespace-pre-wrap selection:bg-[#D4AF37]/30 select-text`}>
                        {renderFormattedText(msg.content)}
                      </div>
                      <div className="text-[10px] mt-1 text-left text-emerald-100/80">
                        {new Date(msg.timestamp).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant Response: Free-flow text, NOT inside a bubble
              return (() => {
                // 1. Resolve images for this message
                const messageImages = (msg.recommendedImageIds || [])
                  .map((imgId) => {
                    let foundImg: ProductImage | undefined;
                    let parentProd: Product | undefined;
                    for (const p of products) {
                      const match = (p.images || []).find((im) => im.id === imgId);
                      if (match) {
                        foundImg = match;
                        parentProd = p;
                        break;
                      }

                      // Check Forbidden Items for images
                      const forbiddenMatch = (p.forbiddenItems || []).find((f) => f.id === imgId);
                      if (forbiddenMatch && forbiddenMatch.imageUrl) {
                        foundImg = {
                          id: forbiddenMatch.id,
                          title: `تنبيه: ${forbiddenMatch.name} (ممنوع)`,
                          imageUrl: forbiddenMatch.imageUrl,
                          aiDescription: forbiddenMatch.description || '',
                          displayTrigger: 'توضيح الشيء الممنوع بالصورة لضمان معرفته.',
                        };
                        parentProd = p;
                        break;
                      }

                      // Check Alternative Items for images
                      const altMatch = (p.alternativeItems || []).find((a) => a.id === imgId);
                      if (altMatch && altMatch.imageUrl) {
                        foundImg = {
                          id: altMatch.id,
                          title: `بديل صحي: ${altMatch.name}`,
                          imageUrl: altMatch.imageUrl,
                          aiDescription: altMatch.description || '',
                          displayTrigger: 'عرض البديل الصحي المقترح.',
                        };
                        parentProd = p;
                        break;
                      }

                      if (
                        imgId === p.id ||
                        imgId === `img-${p.id}-main` ||
                        imgId === `${p.id}-main` ||
                        imgId === `${p.id}-cover`
                      ) {
                        foundImg = {
                          id: `img-${p.id}-main`,
                          title: `صورة عبوة ${p.name}`,
                          imageUrl: p.imageUrl,
                          aiDescription: p.shortDesc || p.fullDesc,
                          displayTrigger: 'صورة المنتج الرسمية عالية الدقة',
                          isMain: true,
                        };
                        parentProd = p;
                        break;
                      }
                    }
                    return foundImg ? { img: foundImg, prod: parentProd } : null;
                  })
                  .filter(Boolean) as { img: ProductImage; prod?: Product }[];

                // Fallback: If no explicit image tags were parsed but the text or query requested an image
                if (messageImages.length === 0 && msg.recommendedProductIds && msg.recommendedProductIds.length > 0) {
                  for (const pid of msg.recommendedProductIds) {
                    const p = findProductById(pid);
                    if (p) {
                      if (p.images && p.images.length > 0) {
                        messageImages.push({ img: p.images[0], prod: p });
                      } else if (p.imageUrl) {
                        messageImages.push({
                          img: {
                            id: `img-${p.id}-main`,
                            title: `صورة عبوة ${p.name}`,
                            imageUrl: p.imageUrl,
                            aiDescription: p.shortDesc || p.fullDesc,
                            displayTrigger: 'صورة المنتج الرسمية عالية الدقة',
                            isMain: true,
                          },
                          prod: p,
                        });
                      }
                    }
                  }
                }

                // 2. Track all product IDs whose photos are displayed in this message
                const displayedProductIds = new Set<string>();
                for (const item of messageImages) {
                  if (item.prod) {
                    displayedProductIds.add(item.prod.id);
                  }
                }

                // 3. Filter recommended products: NEVER recommend the product whose image is already shown
                const otherRecommendedProductIds = (msg.recommendedProductIds || []).filter(
                  (prodId) => !displayedProductIds.has(prodId)
                );

                const isSingleImage = messageImages.length === 1;

                return (
                  <div
                    key={msg.id}
                    ref={(el) => { messageRefs.current[msg.id] = el; }}
                    className={`flex flex-col items-start w-full py-2.5 animate-in fade-in duration-150 group transition-all ${
                      highlightedMessageId === msg.id ? 'bg-emerald-50/80 rounded-2xl p-4 ring-4 ring-emerald-200 ring-offset-2 scale-[1.01] shadow-lg' : ''
                    }`}
                  >
                    <div className="w-full text-slate-800">
                      {/* Assistant Header: Failover Info Only */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {msg.failoverOccurred && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3" />
                              <span>تحويل تلقائي للطوارئ</span>
                            </span>
                          )}
                        </div>
                        
                        {/* Action Buttons: WhatsApp Share & Copy */}
                        <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              const text = msg.content;
                              const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                              window.open(url, '_blank');
                            }}
                            className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                            title="مشاركة عبر واتساب"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              showToast('تم نسخ النص إلى الحافظة');
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            title="نسخ النص"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text Body with Cairo styling - NO BUBBLE - Real bold without asterisks */}
                      <div
                        style={{
                          fontFamily: 'Noto Kufi Arabic, sans-serif',
                          lineHeight: '26px',
                          fontSize:
                            medicalFontSize === 'medical'
                              ? '20px'
                              : medicalFontSize === 'large'
                              ? '18px'
                              : medicalFontSize === 'small'
                              ? '14px'
                              : '16px',
                        }}
                        className={`${getTextClass()} whitespace-pre-wrap selection:bg-[#D4AF37]/30 text-slate-800 font-medium select-text`}
                      >
                        {renderFormattedText(msg.content)}
                      </div>

                      {/* 1. INTERACTIVE SMART PRODUCT IMAGES (SHOWN DIRECTLY BELOW TEXT) */}
                      {messageImages.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-200/70">
                          {isSingleImage ? (
                            <div className="w-full max-w-xl">
                              <div
                                onClick={() =>
                                  setActiveViewerImage({
                                    img: messageImages[0].img,
                                    prod: messageImages[0].prod,
                                    gallery: messageImages,
                                    index: 0,
                                  })
                                }
                                className="relative rounded-2xl overflow-hidden bg-white border-2 border-slate-200 hover:border-[#00873D] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group"
                              >
                                {/* Photo Container with Non-Cropped Display */}
                                <div className="relative min-h-[220px] max-h-[380px] w-full bg-slate-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                                  <img
                                    src={messageImages[0].img.imageUrl}
                                    alt={messageImages[0].img.title}
                                    className="max-h-[340px] w-auto max-w-full object-contain rounded-lg group-hover:scale-103 transition-transform duration-300 ease-out"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80';
                                    }}
                                  />

                                  {/* Quick Zoom Hint Overlay */}
                                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                    <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                                    <span>تكبير</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* MULTIPLE IMAGES GRID */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl">
                              {messageImages.map((item, idx) => (
                                <div
                                  key={item.img.id || idx}
                                  onClick={() =>
                                    setActiveViewerImage({
                                      img: item.img,
                                      prod: item.prod,
                                      gallery: messageImages,
                                      index: idx,
                                    })
                                  }
                                  className="relative rounded-2xl overflow-hidden bg-white border-2 border-slate-200 hover:border-[#00873D] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group"
                                >
                                  {/* Photo Frame */}
                                  <div className="relative min-h-[190px] max-h-[260px] w-full bg-slate-50 flex items-center justify-center p-2.5 overflow-hidden">
                                    <img
                                      src={item.img.imageUrl}
                                      alt={item.img.title}
                                      className="max-h-[220px] w-auto max-w-full object-contain rounded-lg group-hover:scale-104 transition-transform duration-300"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80';
                                      }}
                                    />

                                    {/* Quick Zoom Hint Overlay */}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-white text-[11px] font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                      <Eye className="w-3 h-3 text-[#D4AF37]" />
                                      <span>تكبير</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. INTERACTIVE VIDEO CARDS WITH VISUAL THUMBNAIL PREVIEW */}
                      {msg.recommendedVideoIds && msg.recommendedVideoIds.length > 0 && (
                        <div className="mt-5 pt-3 border-t border-slate-200/70 space-y-3">
                          <div className="grid grid-cols-1 gap-3.5">
                            {msg.recommendedVideoIds.map((vidId) => {
                              const found = findVideoById(vidId);
                              if (!found) return null;
                              const { video, product } = found;
                              const isPlayingInline = playingInlineVideoId === video.id;
                              const ytId = getYouTubeVideoId(video.videoUrl);
                              const isYoutube = !!ytId;
                              const isShorts = isYouTubeShorts(video.videoUrl);
                              const isUploadedFile = video.videoUrl.startsWith('data:video');
                              const embedUrl = isYoutube ? getYouTubeEmbedUrl(video.videoUrl, true) : null;

                              return (
                                <div
                                  key={video.id}
                                  className="bg-white rounded-2xl border-2 border-amber-200/90 shadow-sm overflow-hidden flex flex-col transition-all hover:border-emerald-400"
                                >
                                  {/* Top Info Bar */}
                                  <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-50/90 via-emerald-50/50 to-white flex items-center justify-between gap-2 border-b border-amber-100">
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                      <div className="w-6 h-6 rounded-lg bg-[#00873D] text-white flex items-center justify-center shrink-0">
                                        <Film className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="overflow-hidden">
                                        <h5 className="text-xs sm:text-sm font-black text-slate-950 truncate">
                                          {video.title}
                                        </h5>
                                      </div>
                                    </div>

                                    {/* Duration Badge if available */}
                                    {video.duration && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                          {video.duration}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Direct Interactive Player OR Interactive Poster */}
                                  {isPlayingInline ? (
                                    <div className="relative bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
                                      {/* Player Toolbar */}
                                      <div className="w-full bg-slate-900/90 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold border-b border-white/10 z-10">
                                        <button
                                          type="button"
                                          onClick={() => setPlayingInlineVideoId(null)}
                                          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[11px] flex items-center gap-1 transition-colors"
                                          title="إيقاف والعودة لصورة البطاقة"
                                        >
                                          <X className="w-3 h-3" />
                                          <span>إغلاق المشغل</span>
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => onOpenVideoModal(video)}
                                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] flex items-center gap-1 transition-colors"
                                            title="تكبير على كامل الشاشة 100%"
                                          >
                                            <Maximize2 className="w-3 h-3" />
                                            <span>تكبير 100%</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Video Stream Container */}
                                      <div className={`w-full ${isShorts ? 'aspect-[9/16] max-w-[300px] mx-auto py-2' : 'aspect-video'} bg-black`}>
                                        {isYoutube ? (
                                          <iframe
                                            src={embedUrl || ''}
                                            title={video.title}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                          />
                                        ) : (
                                          <video
                                            src={video.videoUrl}
                                            controls
                                            autoPlay
                                            loop
                                            playsInline
                                            className="w-full h-full object-contain"
                                            onEnded={(e) => {
                                              e.currentTarget.currentTime = 0;
                                              e.currentTarget.play().catch(() => {});
                                            }}
                                          >
                                            متصفحك لا يدعم تشغيل هذا المقطع.
                                          </video>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Video Poster with Direct 100% Fullscreen Play Action */
                                    <div
                                      onClick={() => onOpenVideoModal(video)}
                                      className="relative w-full aspect-video bg-slate-900 cursor-pointer group overflow-hidden"
                                    >
                                      <img
                                        src={getVideoThumbnail(video.videoUrl, video.thumbnailUrl)}
                                        alt={video.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                                        loading="lazy"
                                      />
                                      {/* Dark overlay */}
                                      <div className="absolute inset-0 bg-slate-950/35 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                                        {/* Big Centered Play Button */}
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#00873D] text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-active:scale-95 transition-all ring-4 ring-white/30">
                                            <Play className="w-6 h-6 fill-white mr-1" />
                                          </div>

                                        </div>
                                      </div>

                                      {/* Bottom badges */}
                                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold pointer-events-none">
                                        <span className="bg-black/80 px-2 py-0.5 rounded backdrop-blur-xs">
                                          {product ? product.name.slice(0, 30) : 'هيربولايف'}
                                        </span>
                                        {video.duration && (
                                          <span className="bg-black/80 px-2 py-0.5 rounded backdrop-blur-xs">
                                            {video.duration}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Description & Action Footer */}
                                  <div className="p-3 bg-gradient-to-b from-white to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100">
                                    <p className="text-xs text-slate-700 leading-relaxed font-medium flex-1">
                                      <span className="font-bold text-[#00873D]">عن المقطع: </span>
                                      {video.description || 'مقطع فيديو توضيحي واستشاري معتمد يوضح طريقة الاستخدام وتجربة النتائج.'}
                                    </p>

                                    <div className="flex items-center gap-2 shrink-0">

                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. INTERACTIVE KNOWLEDGE DOCUMENTS (Clinical Studies & Certifications) */}
                      {msg.recommendedDocIds && msg.recommendedDocIds.length > 0 && (
                        <div className="mt-5 pt-3 border-t border-slate-200/70 space-y-3">
                          <div className="flex items-center gap-2 mb-3 bg-white/50 p-2 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center shadow-sm border border-blue-200/50 shrink-0">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 Cairo">
                                مستندات وأبحاث معتمدة:
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                دراسات سريرية وشهادات جودة عالمية
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.recommendedDocIds.map((docId) => {
                              // Find doc across all products
                              let foundDoc: AttachedDoc | null = null;
                              let parentProdName = '';
                              for (const p of products) {
                                const d = (p.docs || []).find(d => d.id === docId);
                                if (d) {
                                  foundDoc = d;
                                  parentProdName = p.name;
                                  break;
                                }
                              }
                              
                              if (!foundDoc) return null;

                              return (
                                <div
                                  key={foundDoc.id}
                                  className="bg-white p-3 rounded-2xl border-2 border-blue-100/80 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-300 transition-all group"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                      <h5 className="text-xs font-black text-slate-900 truncate">
                                        {foundDoc.name}
                                      </h5>
                                      <p className="text-[10px] text-slate-500 font-bold">
                                        {foundDoc.type.toUpperCase()} • {(foundDoc.size / 1024).toFixed(1)} KB • {parentProdName}
                                      </p>
                                    </div>
                                  </div>
                                  {foundDoc.fileData ? (
                                    <a
                                      href={foundDoc.fileData}
                                      download={foundDoc.name}
                                      className="shrink-0 p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
                                      title="تحميل الملف"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  ) : (
                                    <div className="shrink-0 p-2 text-slate-300" title="ملف مرجعي">
                                      <Info className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. OTHER COMPLEMENTARY PRODUCTS */}
                      {otherRecommendedProductIds.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-200/70 space-y-3">
                          <div className="flex items-center gap-2 mb-3 bg-white/50 p-2 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center shadow-sm border border-emerald-200/50 shrink-0">
                              <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 Cairo">
                                منتجات مكملة وموصى بها:
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                اخترنا لك هذه المنتجات لنتائج أسرع وأفضل
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {otherRecommendedProductIds.map((prodId) => {
                              const prod = findProductById(prodId);
                              if (!prod) return null;

                              return (
                                <div
                                  key={prod.id}
                                  onClick={() => onOpenProductModal(prod)}
                                  className="bg-white hover:bg-emerald-50/50 p-2.5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 cursor-pointer transition-all flex items-center gap-2.5 shadow-2xs group"
                                >
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                  />
                                  <div className="overflow-hidden flex-1">
                                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-[#00873D] truncate transition-colors">
                                      {prod.name}
                                    </h5>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="text-xs font-black text-[#00873D]">
                                        {prod.price}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 5. SUGGESTED QUESTIONS (من 0 إلى 6 أسئلة مقترحة تفاعلية قابلة للنقر للبدء في الإجابة) */}
                      {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-200/90 space-y-2.5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                              <span className="w-5 h-5 rounded-lg bg-emerald-100/80 text-[#00873D] flex items-center justify-center shadow-2xs">
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                              </span>
                              <span>أسئلة مقترحة للمتابعة:</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#00873D] border border-emerald-200/60">
                                {msg.suggestedQuestions.length} {msg.suggestedQuestions.length === 1 ? 'سؤال مقترح' : msg.suggestedQuestions.length === 2 ? 'سؤالان مقترحان' : 'أسئلة مقترحة'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                              اضغط للبدء فوراً
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.suggestedQuestions.map((question, qIdx) => (
                              <button
                                key={qIdx}
                                type="button"
                                onClick={() => onSendMessage(question)}
                                disabled={isLoading}
                                title="اضغط لطرح هذا السؤال والحصول على الإجابة فوراً"
                                className="group relative text-right text-xs sm:text-[13px] font-bold p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-emerald-50/70 text-slate-800 hover:text-[#00873D] border border-slate-200/90 hover:border-[#00873D]/60 shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-98 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2.5 cursor-pointer overflow-hidden"
                              >
                                <span className="w-6 h-6 rounded-xl bg-slate-100 group-hover:bg-[#00873D] text-slate-600 group-hover:text-white flex items-center justify-center text-[11px] font-black transition-colors shrink-0 shadow-2xs">
                                  {qIdx + 1}
                                </span>
                                <span className="flex-1 leading-snug line-clamp-2">
                                  {question}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 group-hover:text-[#00873D] transition-all shrink-0 group-hover:-translate-x-0.5">
                                  <span className="hidden group-hover:inline transition-opacity duration-150">اسأل</span>
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] mt-2 text-slate-400 font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })();
            })}

            {/* SMART AI THINKING INDICATOR (مؤثر التفكير الذكي) */}
            {isLoading && (
              <div className="w-full py-3.5 animate-in fade-in duration-200">
                <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-50/90 via-amber-50/50 to-emerald-50/90 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="absolute w-6 h-6 rounded-full bg-[#00873D]/25 animate-ping" />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00873D] to-[#005224] shadow-xs" />
                  </div>
                  <div className="flex items-center gap-1.5 pr-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00873D] animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00873D] animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* FLOATING MOBILE INPUT BAR */}
      <footer className="shrink-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-emerald-900/10 z-20">
        <div className="max-w-2xl mx-auto flex items-end gap-2 bg-[#F6FAF7] border border-emerald-900/15 focus-within:border-[#00873D] focus-within:ring-2 focus-within:ring-[#00873D]/20 rounded-3xl p-1.5 transition-all shadow-xs">
          {/* Direct Upload Button */}
          {chatFeatures.showUploadButton && (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="chat-image-upload"
              />
              <label
                htmlFor="chat-image-upload"
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-slate-500 hover:text-[#00873D] hover:bg-emerald-50 cursor-pointer transition-all"
                title="رفع صورة مباشرة"
              >
                <Paperclip className="w-5 h-5" />
              </label>
            </div>
          )}

          {/* Voice Input Button */}
          {chatFeatures.showVoiceButton && (
            <button
              onClick={handleToggleVoice}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-slate-500 hover:text-[#00873D] hover:bg-emerald-50'
              }`}
              title={isRecording ? 'إيقاف التسجيل الصوتي' : 'التسجيل الصوتي عبر المايكروفون'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Text Area with Pending Image Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {pendingImage && (
              <div className="px-2 pt-2 flex items-center gap-2">
                <div className="relative group w-14 h-14 rounded-xl overflow-hidden border-2 border-[#00873D] bg-white shadow-sm">
                  <img src={pendingImage} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="text-[10px] text-[#00873D] font-bold">
                  سيتم إرسال الصورة مع رسالتك
                </div>
              </div>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'جاري الاستماع لصوتك...' : 'اكتب سؤالك هنا...'}
              className="w-full max-h-32 bg-transparent py-2.5 px-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none outline-hidden leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !pendingImage) || isLoading}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              inputText.trim() && !isLoading
                ? 'bg-gradient-to-r from-[#00873D] to-[#006830] text-white shadow-md active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="إرسال"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </footer>

      {/* ADVANCED FULLSCREEN PHOTO LIGHTBOX (مستعرض الصور فائق التطور - أفضل من الواتساب) */}
      {activeViewerImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between text-white select-none animate-in fade-in duration-200 overflow-hidden"
          onClick={() => {
            setActiveViewerImage(null);
            resetZoomAndPan();
          }}
        >
          {/* Top Bar with Controls & Clean SaaS Aesthetics */}
          <div
            className="p-3 sm:p-4 bg-slate-900/85 border-b border-white/10 flex items-center justify-between shrink-0 z-20 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimal Photo Counter (no titles or extra badges) */}
            <div className="flex items-center gap-2">
              {activeViewerImage.gallery.length > 1 && (
                <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  {activeViewerImage.index + 1} / {activeViewerImage.gallery.length}
                </span>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale((prev) => {
                      const next = Math.max(prev - 0.5, 1);
                      if (next === 1) setPanPosition({ x: 0, y: 0 });
                      return next;
                    });
                  }}
                  disabled={zoomScale <= 1}
                  className="p-1.5 hover:bg-white/20 disabled:opacity-40 rounded-lg transition-colors text-white"
                  title="تصغير (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-black px-2 text-slate-200">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(prev + 0.5, 3.5))}
                  disabled={zoomScale >= 3.5}
                  className="p-1.5 hover:bg-white/20 disabled:opacity-40 rounded-lg transition-colors text-white"
                  title="تكبير (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {zoomScale > 1 && (
                  <button
                    type="button"
                    onClick={resetZoomAndPan}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-amber-300"
                    title="إعادة ضبط الحجم الطبيعي"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Download Photo */}
              <button
                type="button"
                onClick={() =>
                  handleDownloadImage(
                    activeViewerImage.img.imageUrl,
                    activeViewerImage.img.title
                  )
                }
                className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
                title="تنزيل الصورة لجهازك"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">تنزيل HD</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveViewerImage(null);
                  resetZoomAndPan();
                }}
                className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-sm"
                aria-label="إغلاق المستعرض"
                title="إغلاق (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Visual Stage with Left & Right Navigation Arrows */}
          <div
            className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDragging) {
                setActiveViewerImage(null);
                resetZoomAndPan();
              }
            }}
          >
            {/* Previous Arrow Button (RTL aware) */}
            {activeViewerImage.gallery.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const prevIdx =
                    (activeViewerImage.index - 1 + activeViewerImage.gallery.length) %
                    activeViewerImage.gallery.length;
                  setActiveViewerImage({
                    ...activeViewerImage.gallery[prevIdx],
                    gallery: activeViewerImage.gallery,
                    index: prevIdx,
                  });
                  resetZoomAndPan();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-emerald-600 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110 shadow-xl backdrop-blur-md"
                title="الصورة السابقة (سهم يمين)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Next Arrow Button */}
            {activeViewerImage.gallery.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIdx =
                    (activeViewerImage.index + 1) % activeViewerImage.gallery.length;
                  setActiveViewerImage({
                    ...activeViewerImage.gallery[nextIdx],
                    gallery: activeViewerImage.gallery,
                    index: nextIdx,
                  });
                  resetZoomAndPan();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-emerald-600 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110 shadow-xl backdrop-blur-md"
                title="الصورة التالية (سهم يسار)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Floating Drag Hint When Zoomed - Disappears on first interaction */}
            {zoomScale > 1 && !hasPanned && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/80 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full border border-white/20 shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-[#D4AF37] animate-bounce">🖐️</span>
                <span>اسحب الصورة لتحريكها</span>
              </div>
            )}

            {/* The Image Container with Drag & Pan Support */}
            <div
              className="relative max-h-[72vh] max-w-[90vw] flex items-center justify-center select-none"
              style={{
                transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0px) scale(${zoomScale})`,
                transformOrigin: 'center center',
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                touchAction: zoomScale > 1 ? 'none' : 'auto',
              }}
              onMouseDown={(e) => {
                if (zoomScale <= 1) return;
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
                setHasPanned(true);
                dragStartRef.current = {
                  x: e.clientX - panPosition.x,
                  y: e.clientY - panPosition.y,
                };
              }}
              onTouchStart={(e) => {
                if (zoomScale <= 1 || e.touches.length !== 1) return;
                setIsDragging(true);
                setHasPanned(true);
                dragStartRef.current = {
                  x: e.touches[0].clientX - panPosition.x,
                  y: e.touches[0].clientY - panPosition.y,
                };
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (zoomScale > 1) {
                  resetZoomAndPan();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (zoomScale === 1) {
                  setZoomScale(2);
                } else if (zoomScale > 1) {
                  // Single click while zoomed does nothing special or just toggles zoom?
                  // User said "تكبير الصورة يعمل من ضغطة واحده وليس من ضغطتين، واما التراجع عن التكبير يكون بضغطتين."
                  // So if zoomScale > 1, single click should probably do nothing or allow panning.
                }
              }}
            >
              <img
                src={activeViewerImage.img.imageUrl}
                alt={activeViewerImage.img.title}
                draggable={false}
                className="max-h-[72vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl drop-shadow-2xl select-none pointer-events-none"
              />
            </div>
          </div>

          {/* Bottom Interactive Area: Thumbnails Strip */}
          <div
            className="p-3 sm:p-4 bg-slate-900/90 border-t border-white/10 z-20 backdrop-blur-md space-y-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bottom Gallery Thumbnails Strip (if multiple photos in set) */}
            {activeViewerImage.gallery.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                {activeViewerImage.gallery.map((thumb, idx) => (
                  <button
                    key={thumb.img.id || idx}
                    type="button"
                    onClick={() => {
                      setActiveViewerImage({
                        ...thumb,
                        gallery: activeViewerImage.gallery,
                        index: idx,
                      });
                      setZoomScale(1);
                    }}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeViewerImage.index === idx
                        ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/30'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={thumb.img.imageUrl}
                      alt={thumb.img.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-60 px-6 py-3 bg-slate-900/90 backdrop-blur-md text-white text-sm font-bold rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
