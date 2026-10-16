import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  MessageSquare,
  Trash2,
  Share2,
  Download,
  Check,
  Copy,
  Sparkles,
  Send,
  Smartphone,
  Link2,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  ChatSession,
  MedicalFontSize,
  PersuasionPrompt,
  AppLogoConfig,
  AdminDashboardTab,
  SharingSettings,
  ChatFeatures,
} from '../types';
import Fuse from 'fuse.js';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenDashboard: (tab?: AdminDashboardTab) => void;
  medicalFontSize: MedicalFontSize;
  onSetMedicalFontSize: (size: MedicalFontSize) => void;
  activePrompt: PersuasionPrompt;
  productsCount: number;
  logoConfig: AppLogoConfig;
  sharingSettings: SharingSettings;
  chatFeatures: ChatFeatures;
  onSearchHighlight: (sessionId: string, messageId: string) => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenDashboard,
  logoConfig,
  sharingSettings,
  chatFeatures,
  onSearchHighlight,
}) => {
  const { isInstallable, isInstalled, isInstalling, installProgress, isIOS, install } = usePWAInstall();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Share Drawer & Short Link State
  const [copiedState, setCopiedState] = useState<'none' | 'all' | 'link'>('none');
  const [isSharing, setIsSharing] = useState(false);
  const [resolvedShortLink, setResolvedShortLink] = useState<string>('');
  const [isShortening, setIsShortening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Prepare data for Fuse.js (Deep Search in Sessions and Messages)
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];

    const items: Array<{
      sessionId: string;
      sessionTitle: string;
      messageId?: string;
      content: string;
      role?: string;
      type: 'session' | 'message';
    }> = [];

    sessions.forEach(session => {
      // Add session title as a searchable item
      items.push({
        sessionId: session.id,
        sessionTitle: session.title,
        content: session.title,
        type: 'session'
      });

      // Add messages as searchable items
      session.messages.forEach(msg => {
        items.push({
          sessionId: session.id,
          sessionTitle: session.title,
          messageId: msg.id,
          content: msg.content,
          role: msg.role,
          type: 'message'
        });
      });
    });

    const fuse = new Fuse(items, {
      keys: ['content', 'sessionTitle'],
      threshold: 0.35,
      distance: 100,
      ignoreLocation: true,
      includeMatches: true,
    });

    return fuse.search(searchQuery).map(res => res.item);
  }, [sessions, searchQuery]);

  const filteredSessions = searchQuery.trim() === '' 
    ? sessions 
    : []; // In search mode we show searchResults instead

  const rawAppUrl =
    typeof window !== 'undefined'
      ? window.location.origin.replace('ais-dev-', 'ais-pre-')
      : '';

  const shareText =
    sharingSettings?.shareMessage?.trim() ||
    '🌿 أنصحك بتجربة المستشار الذكي لهيربولايف — دليلك الشخصي للتغذية المتوازنة والوصول لوزنك المثالي بنشاط وبدون حرمان:';

  const buttonLabel = sharingSettings?.buttonTitle?.trim() || 'إهداء المستشار لصديق';

  // Resolve or auto-generate a real short link
  useEffect(() => {
    if (!isOpen) return;

    if (sharingSettings?.shortLink && sharingSettings.shortLink.trim() !== '') {
      setResolvedShortLink(sharingSettings.shortLink.trim());
      return;
    }

    const cached = localStorage.getItem('herbalife_cached_short_url_v1');
    if (cached && cached.startsWith('http')) {
      setResolvedShortLink(cached);
      return;
    }

    let isMounted = true;
    setIsShortening(true);
    fetch('/api/shorten-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawAppUrl }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data?.shortUrl) {
          setResolvedShortLink(data.shortUrl);
          try {
            localStorage.setItem('herbalife_cached_short_url_v1', data.shortUrl);
          } catch {}
        }
      })
      .catch(() => {
        if (isMounted) setResolvedShortLink(rawAppUrl);
      })
      .finally(() => {
        if (isMounted) setIsShortening(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sharingSettings?.shortLink, rawAppUrl]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setShouldRender(true);
      timer = setTimeout(() => {
        setIsVisible(true);
      }, 35);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const finalShareUrl = resolvedShortLink || sharingSettings?.shortLink?.trim() || rawAppUrl;
  const composedFullMessage = `${shareText}\n${finalShareUrl}`;

  const copyToClipboard = async (text: string, type: 'all' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(type);
      setTimeout(() => setCopiedState('none'), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedState(type);
      setTimeout(() => setCopiedState('none'), 2500);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const shareData: ShareData = {
      title: 'المستشار الذكي - هيربولايف',
      text: shareText,
      url: finalShareUrl,
    };

    try {
      // If there is an image, try to include it
      if (sharingSettings?.shareImageUrl && navigator.share && navigator.canShare) {
        try {
          const imageUrl = sharingSettings.shareImageUrl;
          let blob: Blob;

          if (imageUrl.startsWith('data:')) {
            const res = await fetch(imageUrl);
            blob = await res.blob();
          } else {
            const res = await fetch(imageUrl);
            blob = await res.blob();
          }

          const extension = blob.type.split('/')[1] || 'jpg';
          const file = new File([blob], `herbalife-share.${extension}`, { type: blob.type });
          const filesToShare = [file];

          if (navigator.canShare({ files: filesToShare })) {
            await navigator.share({
              ...shareData,
              files: filesToShare,
            });
            setIsSharing(false);
            return;
          }
        } catch (err) {
          console.warn('Could not share with image:', err);
        }
      }

      // Fallback to text/URL only share
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setIsSharing(false);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            setIsSharing(false);
            return;
          }
        }
      }

      // Ultimate fallback: copy to clipboard
      await copyToClipboard(composedFullMessage, 'all');
      alert('تم نسخ رابط ورسالة المشاركة! يمكنك الآن لصقها في أي تطبيق.');
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  if (!shouldRender) return null;

  const { menuLogo, logoUrl } = logoConfig;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-start select-none overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-500 ease-in-out ${
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={`relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-[0_0_60px_-10px_rgba(0,135,61,0.25)] flex flex-col z-10 border-l border-emerald-900/10 transition-transform duration-500 ease-in-out transform ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Subtle Edge Glow Bar */}
        <div className="absolute top-0 bottom-0 -left-1 w-1 bg-gradient-to-b from-[#00873D] via-[#D4AF37] to-[#00873D] opacity-60 pointer-events-none" />

        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#00873D] via-[#007033] to-[#005224] text-white flex items-center justify-between shadow-md shrink-0 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div
              style={{
                width: `${menuLogo.size}px`,
                height: `${menuLogo.size}px`,
                backgroundColor: menuLogo.hasBackground ? menuLogo.backgroundColor : 'transparent',
                border:
                  menuLogo.hasBorder !== false
                    ? `1.5px solid ${menuLogo.borderColor || '#D4AF37'}`
                    : 'none',
              }}
              className="rounded-2xl flex items-center justify-center p-1.5 shadow-sm overflow-hidden shrink-0 transition-all hover:scale-105"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="شعار هيربولايف"
                  className="w-full h-full object-contain"
                  style={{
                    filter:
                      menuLogo.colorMode === 'emerald'
                        ? 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1212%) hue-rotate(119deg)'
                        : 'none',
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill={menuLogo.colorMode === 'emerald' ? '#00873D' : '#FFFFFF'}
                >
                  <path d="M50 10 C35 30 35 60 50 85 C65 60 65 30 50 10 Z" />
                  <path d="M45 50 C25 40 10 60 25 80 C40 85 45 65 45 50 Z" />
                  <path d="M55 50 C75 40 90 60 75 80 C60 85 55 65 55 50 Z" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black tracking-tight text-white">هيربولايف</h2>
                <span className="text-[10px] font-bold bg-[#D4AF37] text-emerald-950 px-1.5 py-0.5 rounded-sm font-mono shadow-xs">
                  AI PRO
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">المساعد الذكي والاستشاري</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all relative z-10"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-100 bg-[#FAFDFB] shrink-0">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#00873D] to-[#006830] hover:brightness-105 active:scale-[0.99] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            محادثة جديدة
          </button>
        </div>

        {/* Smart Search Field (Conditional) */}
        {chatFeatures.showSearchInSideMenu && (
          <div className="px-3 py-2 border-b border-slate-100 bg-white shrink-0">
            <div className="relative group">
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <Search className={`w-3.5 h-3.5 transition-colors ${searchQuery ? 'text-[#00873D]' : 'text-slate-400'}`} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في المحادثات..."
                dir="rtl"
                className="w-full py-2 pr-9 pl-4 bg-slate-50 border border-slate-200 focus:border-[#00873D] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 left-2 flex items-center px-1 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Middle Scrollable Section (Chat History Only) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#00873D]" />
                سجل المحادثات ({filteredSessions.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {searchQuery.trim() !== '' ? (
                /* SMART SEARCH RESULTS VIEW */
                searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    لا توجد نتائج مطابقة لبحثك في المحادثات
                  </p>
                ) : (
                  searchResults.map((result, idx) => (
                    <div
                      key={`${result.sessionId}-${result.messageId || 'title'}-${idx}`}
                      onClick={() => {
                        if (result.messageId) {
                          onSearchHighlight(result.sessionId, result.messageId);
                        } else {
                          onSelectSession(result.sessionId);
                          onClose();
                        }
                      }}
                      className="group p-2.5 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-[#00873D] bg-emerald-100/50 px-1.5 py-0.5 rounded-sm truncate max-w-[120px]">
                          {result.sessionTitle}
                        </span>
                        {result.type === 'message' && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${result.role === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            {result.role === 'user' ? 'سؤالك' : 'رد المستشار'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {result.content}
                      </p>
                    </div>
                  ))
                )
              ) : (
                /* CLASSIC SESSION LIST VIEW */
                filteredSessions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    لا توجد محادثات سابقة
                  </p>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = session.id === currentSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        className={`group relative flex items-center justify-between p-2.5 rounded-2xl text-xs font-medium cursor-pointer transition-all ${
                          isActive
                            ? 'bg-emerald-50 text-[#00873D] border border-emerald-200/80 shadow-xs'
                            : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 pl-2">
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-[#00873D]' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{session.title}</span>
                        </div>

                        {sessions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-600 text-slate-400 p-1 transition-opacity"
                            title="حذف المحادثة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>

        {/* FIXED BOTTOM SECTION: Premium Share Button */}
        <div
          dir="rtl"
          className="p-4 border-t border-emerald-900/10 bg-gradient-to-b from-[#FAFDFB] to-white shrink-0 shadow-[0_-12px_30px_-15px_rgba(0,135,61,0.15)] relative z-20"
        >
          <div className="relative group">
            {/* Animated Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37] via-[#00873D] to-[#D4AF37] rounded-2xl blur-xs opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className={`relative w-full py-3.5 px-6 bg-gradient-to-l from-[#00873D] via-[#007033] to-[#005928] hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-lg border border-[#D4AF37]/30 transition-all ${isSharing ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isSharing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Share2 className="w-5 h-5 text-[#D4AF37] group-hover:rotate-12 transition-transform" />
              )}
              <span className="tracking-wide">
                {isSharing ? 'جاري التحضير...' : buttonLabel}
              </span>
            </button>
          </div>

          {/* Optional PWA Install Button with subtler design */}
          {!isInstalled && (isInstallable || isIOS) && (
            <button
              onClick={isIOS ? () => { onOpenDashboard('general'); onClose(); } : install}
              disabled={isInstalling}
              className="w-full mt-3 py-2 px-3 hover:bg-emerald-50 text-[#00873D] font-bold rounded-xl text-[11px] flex items-center justify-center gap-2 transition-all border border-emerald-100/50 active:scale-[0.98]"
            >
              <Download className="w-3 h-3 opacity-70" />
              <span>
                {isInstalling
                  ? `جاري التثبيت... %${installProgress}`
                  : 'تثبيت التطبيق للوصول السريع'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
