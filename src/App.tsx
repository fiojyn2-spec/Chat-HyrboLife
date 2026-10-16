/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  INITIAL_PRODUCTS,
  MASTER_PERSUASION_PROMPT,
  ALTERNATIVE_PROMPTS,
  INITIAL_FORBIDDEN_RULE,
  DEFAULT_APP_LOGO_CONFIG,
  DEFAULT_WELCOME_SETTINGS,
  DEFAULT_CATEGORIES,
  DEFAULT_PWA_SETTINGS,
  DEFAULT_CHAT_FEATURES,
  DEFAULT_SHARING_SETTINGS,
  DEFAULT_AI_GUIDANCE,
} from './data/defaultData';
import {
  Product,
  ProductVideo,
  PersuasionPrompt,
  ForbiddenRule,
  ChatSession,
  ChatMessage,
  MedicalFontSize,
  AppLogoConfig,
  WelcomeSettings,
  AdminDashboardTab,
  PWASettings,
  ChatFeatures,
  SharingSettings,
  AIGuidanceSettings,
  UnansweredQuery,
} from './types';
import {
  fetchProducts,
  saveProducts,
  fetchPrompts,
  savePrompts,
  fetchForbiddenRule,
  saveForbiddenRule,
  fetchSettings,
  saveSettings,
} from './services/productService';
import { sendChatMessage } from './services/geminiService';
import { ChatView } from './components/ChatView';
import { SideMenu } from './components/SideMenu';
import { AdminDashboard } from './components/AdminDashboard';
import { VideoModal } from './components/VideoModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SplashScreen } from './components/SplashScreen';

const STORAGE_KEYS = {
  PRODUCTS: 'herbalife_ai_products_v1',
  PROMPTS: 'herbalife_ai_prompts_v1',
  FORBIDDEN: 'herbalife_ai_forbidden_v1',
  SESSIONS: 'herbalife_ai_sessions_v1',
  CURRENT_SESSION: 'herbalife_ai_cur_session_v1',
  FONT_SIZE: 'herbalife_ai_font_size_v1',
  VIEW_MODE: 'herbalife_ai_view_mode_v1',
  LOGO_CONFIG: 'herbalife_ai_logo_config_v1',
  WELCOME_SETTINGS: 'herbalife_ai_welcome_v1',
  CATEGORIES: 'herbalife_ai_categories_v1',
  SEEN_QUESTIONS: 'herbalife_ai_seen_questions_v1',
  PWA_SETTINGS: 'herbalife_ai_pwa_v1',
  CHAT_FEATURES: 'herbalife_ai_chat_features_v1',
  SHARING_SETTINGS: 'herbalife_ai_sharing_settings_v1',
  AI_GUIDANCE: 'herbalife_ai_guidance_v1',
  UNANSWERED_QUERIES: 'herbalife_ai_unanswered_v1',
  AI_GENERATED_KB: 'herbalife_ai_generated_kb_v1',
};

export default function App() {
  // --- UI/Transient State ---
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // --- Persistent State ---
  const [aiGuidance, setAiGuidance] = useState<AIGuidanceSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_GUIDANCE);
    if (saved) {
      try { return { ...DEFAULT_AI_GUIDANCE, ...JSON.parse(saved) }; } catch {}
    }
    return DEFAULT_AI_GUIDANCE;
  });

  const [unansweredQueries, setUnansweredQueries] = useState<UnansweredQuery[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UNANSWERED_QUERIES);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [aiGeneratedKb, setAiGeneratedKb] = useState<Array<{ id: string; question: string; answer: string; approvedAt: number }>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_GENERATED_KB);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });
  const [logoConfig, setLogoConfig] = useState<AppLogoConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGO_CONFIG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_APP_LOGO_CONFIG,
          ...parsed,
          headerLogo: {
            ...DEFAULT_APP_LOGO_CONFIG.headerLogo,
            ...(parsed.headerLogo || {}),
          },
          menuLogo: {
            ...DEFAULT_APP_LOGO_CONFIG.menuLogo,
            ...(parsed.menuLogo || {}),
          },
        };
      } catch {
        // fallback
      }
    }
    return DEFAULT_APP_LOGO_CONFIG;
  });

  const [welcomeSettings, setWelcomeSettings] = useState<WelcomeSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WELCOME_SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_WELCOME_SETTINGS;
  });

  const [pwaSettings, setPwaSettings] = useState<PWASettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PWA_SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_PWA_SETTINGS;
  });

  const [chatFeatures, setChatFeatures] = useState<ChatFeatures>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHAT_FEATURES);
    if (saved) {
      try {
        return { ...DEFAULT_CHAT_FEATURES, ...JSON.parse(saved) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_CHAT_FEATURES;
  });

  const [sharingSettings, setSharingSettings] = useState<SharingSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHARING_SETTINGS);
    if (saved) {
      try {
        return { ...DEFAULT_SHARING_SETTINGS, ...JSON.parse(saved) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_SHARING_SETTINGS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const initialSet = new Set([...DEFAULT_CATEGORIES, ...INITIAL_PRODUCTS.map((p) => p.category)]);
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((c) => c && initialSet.add(c.trim()));
        }
      } catch {
        // fallback
      }
    }
    return Array.from(initialSet);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      try {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => {
            const yer = p.priceYER || (p.priceIQD ? p.priceIQD.replace('د.ع', 'ر.ي') : '');
            return {
              ...p,
              priceYER: yer,
            };
          });
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [prompts, setPrompts] = useState<PersuasionPrompt[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROMPTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [MASTER_PERSUASION_PROMPT, ...ALTERNATIVE_PROMPTS];
  });

  const [forbiddenRule, setForbiddenRule] = useState<ForbiddenRule>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FORBIDDEN);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_FORBIDDEN_RULE;
  });

  const [medicalFontSize, setMedicalFontSize] = useState<MedicalFontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return (saved as MedicalFontSize) || 'normal';
  });

  const [isMobileFrameView, setIsMobileFrameView] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return saved ? saved === 'frame' : false; // default full screen mobile app view
  });

  // --- Chat Sessions State ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    // Create initial session
    const initialSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'محادثة استشارية جديدة',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    return [initialSession];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (saved && sessions.some((s) => s.id === saved)) {
      return saved;
    }
    return sessions[0]?.id || `session-${Date.now()}`;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [seenQuestions, setSeenQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SEEN_QUESTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    return [];
  });

  // --- Modals State ---
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [adminDashboardTab, setAdminDashboardTab] = useState<AdminDashboardTab>('products');
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<ProductVideo | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  const isBackendLoadedRef = useRef<boolean>(false);

  // --- Effect: Load from Backend ---
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [p, pr, f, s] = await Promise.all([
          fetchProducts().catch(() => null),
          fetchPrompts().catch(() => null),
          fetchForbiddenRule().catch(() => null),
          fetchSettings().catch(() => null),
        ]);
        
        // Update state if data exists on server
        if (p) {
          setProducts(p);
          try { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(p)); } catch {}
        }
        if (pr) {
          setPrompts(pr);
          try { localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(pr)); } catch {}
        }
        if (f) {
          setForbiddenRule(f);
          try { localStorage.setItem(STORAGE_KEYS.FORBIDDEN, JSON.stringify(f)); } catch {}
        }
        if (s) {
          if (s.logoConfig) setLogoConfig(s.logoConfig);
          if (s.welcomeSettings) setWelcomeSettings(s.welcomeSettings);
          if (s.pwaSettings) setPwaSettings(s.pwaSettings);
          if (s.categories) setCategories(s.categories);
          if (s.chatFeatures) setChatFeatures(s.chatFeatures);
          if (s.sharingSettings) setSharingSettings(s.sharingSettings);
          
          try {
            if (s.logoConfig) localStorage.setItem(STORAGE_KEYS.LOGO_CONFIG, JSON.stringify(s.logoConfig));
            if (s.welcomeSettings) localStorage.setItem(STORAGE_KEYS.WELCOME_SETTINGS, JSON.stringify(s.welcomeSettings));
            if (s.pwaSettings) localStorage.setItem(STORAGE_KEYS.PWA_SETTINGS, JSON.stringify(s.pwaSettings));
            if (s.categories) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(s.categories));
            if (s.chatFeatures) localStorage.setItem(STORAGE_KEYS.CHAT_FEATURES, JSON.stringify(s.chatFeatures));
            if (s.sharingSettings) localStorage.setItem(STORAGE_KEYS.SHARING_SETTINGS, JSON.stringify(s.sharingSettings));
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to load initial data from backend, using localStorage/defaults:', err);
      } finally {
        isBackendLoadedRef.current = true;
      }
    };
    loadAll();
  }, []);

  // --- Effects: Persistent Storage Sync ---
  // We only sync to localStorage here. Server sync is handled explicitly in AdminDashboard
  // to avoid redundant calls and race conditions.

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PWA_SETTINGS, JSON.stringify(pwaSettings));
    } catch {}
  }, [pwaSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_FEATURES, JSON.stringify(chatFeatures));
    } catch {}
  }, [chatFeatures]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHARING_SETTINGS, JSON.stringify(sharingSettings));
    } catch {}
  }, [sharingSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGO_CONFIG, JSON.stringify(logoConfig));
    } catch {}
  }, [logoConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WELCOME_SETTINGS, JSON.stringify(welcomeSettings));
    } catch {}
  }, [welcomeSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch {}
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn('Could not store full products payload in localStorage:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(prompts));
    } catch {}
  }, [prompts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FORBIDDEN, JSON.stringify(forbiddenRule));
    } catch {}
  }, [forbiddenRule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, currentSessionId);
  }, [currentSessionId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, medicalFontSize);
  }, [medicalFontSize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, isMobileFrameView ? 'frame' : 'fullscreen');
  }, [isMobileFrameView]);

  // Current active prompt
  const activePrompt = prompts.find((p) => p.isActive && !p.isDeleted) || prompts.find((p) => !p.isDeleted) || MASTER_PERSUASION_PROMPT;

  // Current active session
  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  // --- Chat Handlers ---
  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text,
      imageUrl,
      timestamp: Date.now(),
    };

    const updatedMessages = [...(currentSession.messages || []), userMessage];

    // Auto title for session if first message
    let sessionTitle = currentSession.title;
    if (currentSession.messages.length === 0) {
      sessionTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
    }

    const updatedSession: ChatSession = {
      ...currentSession,
      title: sessionTitle,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
    );

    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        updatedMessages,
        activePrompt,
        forbiddenRule,
        products,
        seenQuestions
      );

      // Log unanswered queries if response lacks product recommendations and prompt is substantial
      if ((!response.recommendedProductIds || response.recommendedProductIds.length === 0) && text.trim().length > 6) {
        setUnansweredQueries((prev) => {
          if (prev.some((q) => q.query.toLowerCase() === text.trim().toLowerCase())) return prev;
          const newQ: UnansweredQuery = {
            id: `uq-${Date.now()}`,
            query: text.trim(),
            timestamp: Date.now(),
            sessionId: currentSession.id,
            suggestedAnswer: `بناءً على توجيهات المسؤول ومصادر المعرفة المعتمدة (${aiGuidance.allowedDomains.join(', ')}): إجابة مقترحة لسؤال الزائر: ${response.content.slice(0, 160)}...`,
            status: 'pending',
          };
          const updated = [newQ, ...prev].slice(-50);
          localStorage.setItem(STORAGE_KEYS.UNANSWERED_QUERIES, JSON.stringify(updated));
          return updated;
        });
      }

      // Track newly suggested questions and user message to avoid repetition across sessions
      if (response.suggestedQuestions && response.suggestedQuestions.length > 0) {
        setSeenQuestions((prev) => {
          const combined = Array.from(new Set([...prev, text.trim(), ...response.suggestedQuestions!])).slice(-100);
          localStorage.setItem(STORAGE_KEYS.SEEN_QUESTIONS, JSON.stringify(combined));
          return combined;
        });
      } else {
        setSeenQuestions((prev) => {
          if (!prev.includes(text.trim())) {
            const combined = [...prev, text.trim()].slice(-100);
            localStorage.setItem(STORAGE_KEYS.SEEN_QUESTIONS, JSON.stringify(combined));
            return combined;
          }
          return prev;
        });
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        recommendedProductIds: response.recommendedProductIds,
        recommendedVideoIds: response.recommendedVideoIds,
        recommendedImageIds: response.recommendedImageIds,
        recommendedDocIds: response.recommendedDocIds,
        suggestedQuestions: response.suggestedQuestions,
        providerUsed: response.providerUsed,
        failoverOccurred: response.failoverOccurred,
        failoverReason: response.failoverReason,
      };

      if (response.failoverOccurred) {
        // We don't have showToast here, but we can alert or log. 
        // Actually, the user wants the UI to reflect the change.
        // The server config is already updated.
        console.warn(`[AutoFailover] Switched to ${response.providerUsed}. Reason: ${response.failoverReason}`);
      }

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalSession: ChatSession = {
        ...updatedSession,
        updatedAt: Date.now(),
        messages: finalMessages,
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === currentSession.id ? finalSession : s))
      );
    } catch (err) {
      console.error('Failed to get bot answer:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'محادثة استشارية جديدة',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) {
      // Don't delete last one, reset it instead
      handleNewSession();
      return;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) {
      setCurrentSessionId(filtered[0].id);
    }
  };

  const handleToggleMedicalFontSize = () => {
    if (medicalFontSize === 'small') setMedicalFontSize('normal');
    else if (medicalFontSize === 'normal') setMedicalFontSize('large');
    else if (medicalFontSize === 'large') setMedicalFontSize('medical');
    else setMedicalFontSize('small');
  };

  const handleSearchHighlight = (sessionId: string, messageId: string) => {
    setCurrentSessionId(sessionId);
    setHighlightedMessageId(messageId);
    setIsSideMenuOpen(false);
    // Clear highlight after some time
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 5000);
  };

  const handleOpenDashboardWithTab = (tab: AdminDashboardTab = 'products') => {
    setAdminDashboardTab(tab);
    setIsAdminDashboardOpen(true);
  };

  const productRecommendationStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        if (m.recommendedProductIds) {
          m.recommendedProductIds.forEach((pid) => {
            counts[pid] = (counts[pid] || 0) + 1;
          });
        }
      });
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name.split(' - ')[0] || p.name,
      fullName: p.name,
      count: counts[p.id] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [sessions, products]);

  const handleSaveAiGuidance = (settings: AIGuidanceSettings) => {
    setAiGuidance(settings);
    localStorage.setItem(STORAGE_KEYS.AI_GUIDANCE, JSON.stringify(settings));
  };

  const handleApproveUnansweredQuery = (queryId: string, editedAnswer: string) => {
    setUnansweredQueries((prev) => {
      const updated = prev.map((q) => {
        if (q.id === queryId) {
          return {
            ...q,
            status: 'approved' as const,
            adminEditedAnswer: editedAnswer,
          };
        }
        return q;
      });
      localStorage.setItem(STORAGE_KEYS.UNANSWERED_QUERIES, JSON.stringify(updated));
      return updated;
    });

    const targetQuery = unansweredQueries.find((q) => q.id === queryId);
    if (targetQuery) {
      const newKbItem = {
        id: `kb-${Date.now()}`,
        question: targetQuery.query,
        answer: editedAnswer || targetQuery.suggestedAnswer,
        approvedAt: Date.now(),
      };
      setAiGeneratedKb((prev) => {
        const updated = [newKbItem, ...prev];
        localStorage.setItem(STORAGE_KEYS.AI_GENERATED_KB, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleDeleteUnansweredQuery = (queryId: string) => {
    setUnansweredQueries((prev) => {
      const updated = prev.filter((q) => q.id !== queryId);
      localStorage.setItem(STORAGE_KEYS.UNANSWERED_QUERIES, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddManualAiQa = (question: string, answer: string) => {
    const newKbItem = {
      id: `kb-manual-${Date.now()}`,
      question,
      answer,
      approvedAt: Date.now(),
    };
    setAiGeneratedKb((prev) => {
      const updated = [newKbItem, ...prev];
      localStorage.setItem(STORAGE_KEYS.AI_GENERATED_KB, JSON.stringify(updated));
      return updated;
    });
  };

  // Time state for mobile phone status bar simulation
  const [mobileTime, setMobileTime] = useState('9:41');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setMobileTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full min-h-screen bg-[#F0F4F2] flex items-center justify-center font-['Cairo'] antialiased overflow-hidden">
      <SplashScreen settings={pwaSettings} />

      {/* APP CONTAINER (Either framed like iPhone/Android or full mobile viewport) */}
      <div
        className={`relative w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${
          isMobileFrameView
            ? 'max-w-[430px] max-h-[920px] rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,100,50,0.3)] border-[10px] border-slate-900 bg-white ring-1 ring-slate-800'
            : 'max-w-none max-h-none rounded-none shadow-none border-0 bg-white'
        }`}
      >
        {/* Mobile Phone Top Notch / Dynamic Island (Only in framed view) */}
        {isMobileFrameView && (
          <div className="shrink-0 h-8 bg-white px-7 flex items-center justify-between z-30 select-none border-b border-slate-100">
            <span className="text-[12px] font-bold text-slate-800">{mobileTime}</span>
            {/* Camera cutout */}
            <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-800/80 mr-4" />
            </div>
            {/* Status icons (WiFi, Cellular, Battery) */}
            <div className="flex items-center gap-1.5 text-slate-800">
              <span className="text-[10px] font-bold">5G</span>
              <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5 flex items-center">
                <div className="h-full w-full bg-[#00873D] rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {/* MAIN CHAT SCREEN */}
        <ChatView
          messages={currentSession.messages || []}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onOpenSideMenu={() => setIsSideMenuOpen(true)}
          onOpenDashboard={handleOpenDashboardWithTab}
          products={products}
          onOpenVideoModal={(video) => setSelectedVideoForModal(video)}
          onOpenProductModal={(product) => setSelectedProductForModal(product)}
          medicalFontSize={medicalFontSize}
          onToggleMedicalFontSize={handleToggleMedicalFontSize}
          activePrompt={activePrompt}
          onNewChat={handleNewSession}
          logoConfig={logoConfig}
          welcomeSettings={welcomeSettings}
          chatFeatures={chatFeatures}
          highlightedMessageId={highlightedMessageId}
        />

        {/* Mobile Phone Home Indicator Bar (Only in framed view) */}
        {isMobileFrameView && (
          <div className="shrink-0 h-4 bg-white flex items-center justify-center pb-1">
            <div className="w-32 h-1 bg-slate-300 rounded-full" />
          </div>
        )}
      </div>

      {/* SIDE DRAWER MENU */}
      <SideMenu
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenDashboard={handleOpenDashboardWithTab}
        medicalFontSize={medicalFontSize}
        onSetMedicalFontSize={setMedicalFontSize}
        activePrompt={activePrompt}
        productsCount={products.length}
        logoConfig={logoConfig}
        sharingSettings={sharingSettings}
        chatFeatures={chatFeatures}
        onSearchHighlight={handleSearchHighlight}
      />

      {/* ADMIN CONTROL PANEL / SETTINGS MODAL */}
      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        initialTab={adminDashboardTab}
        products={products}
        onSaveProducts={setProducts}
        prompts={prompts}
        onSavePrompts={setPrompts}
        forbiddenRule={forbiddenRule}
        onSaveForbiddenRule={setForbiddenRule}
        medicalFontSize={medicalFontSize}
        onSetMedicalFontSize={setMedicalFontSize}
        logoConfig={logoConfig}
        onSaveLogoConfig={setLogoConfig}
        welcomeSettings={welcomeSettings}
        onSaveWelcomeSettings={setWelcomeSettings}
        pwaSettings={pwaSettings}
        onSavePwaSettings={setPwaSettings}
        categories={categories}
        onSaveCategories={setCategories}
        chatFeatures={chatFeatures}
        onSaveChatFeatures={setChatFeatures}
        sharingSettings={sharingSettings}
        onSaveSharingSettings={setSharingSettings}
        productRecommendationStats={productRecommendationStats}
        aiGuidance={aiGuidance}
        onSaveAiGuidance={handleSaveAiGuidance}
        unansweredQueries={unansweredQueries}
        onApproveUnansweredQuery={handleApproveUnansweredQuery}
        onDeleteUnansweredQuery={handleDeleteUnansweredQuery}
        aiGeneratedKb={aiGeneratedKb}
        onAddManualAiQa={handleAddManualAiQa}
      />

      {/* VIDEO PREVIEW MODAL */}
      <VideoModal
        video={selectedVideoForModal}
        onClose={() => setSelectedVideoForModal(null)}
      />

      {/* PRODUCT DETAILS MODAL */}
      <ProductDetailModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        onSelectVideo={(video) => {
          setSelectedProductForModal(null);
          setSelectedVideoForModal(video);
        }}
        onAskAboutProduct={(prompt) => {
          handleSendMessage(prompt);
        }}
      />
    </div>
  );
}
