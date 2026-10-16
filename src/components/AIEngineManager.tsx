import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  ArrowLeftRight,
  ShieldCheck,
  Key,
  Clock,
  Activity,
  Sparkles,
  Sliders,
  History,
  Check,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  AIProviderId,
  AIProviderStatus,
  AIEngineConfig,
  FailoverIncident,
} from '../types';
import {
  fetchTrash,
  restoreItem,
  permanentDeleteItem,
  enableProvider,
} from '../services/productService';
import {
  fetchAIProvidersStatus,
  testAIProvider,
  saveAIEngineConfig,
  resolveFailoverIncident,
  simulateFailover,
  ProvidersStatusResponse,
  TestProviderResponse,
} from '../services/aiProviderService';

interface AIEngineManagerProps {
  showToast: (msg: string) => void;
  onActiveEngineChange?: (provider: AIProviderId) => void;
}

export const AIEngineManager: React.FC<AIEngineManagerProps> = ({
  showToast,
  onActiveEngineChange,
}) => {
  const [data, setData] = useState<ProvidersStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testingId, setTestingId] = useState<AIProviderId | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestProviderResponse>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Local draft of config for quick interactions
  const [selectedPrimary, setSelectedPrimary] = useState<AIProviderId>('deepseek');
  const [autoFailover, setAutoFailover] = useState<boolean>(true);
  const [failoverOrder, setFailoverOrder] = useState<AIProviderId[]>(['deepseek', 'gemini', 'aisa']);
  const [disabledProviders, setDisabledProviders] = useState<AIProviderId[]>([]);
  const [models, setModels] = useState<Record<string, string>>({
    gemini: 'gemini-2.5-flash',
    deepseek: 'deepseek-chat',
    aisa: 'gpt-4o-mini',
  });

  const loadStatus = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetchAIProvidersStatus();
      setData(res);
      setSelectedPrimary(res.config.primaryProvider);
      setAutoFailover(res.config.autoFailover);
      setFailoverOrder(res.config.failoverOrder || ['deepseek', 'gemini', 'aisa']);
      setDisabledProviders(res.config.disabledProviders || []);
      setModels(res.config.models || {
        gemini: 'gemini-2.5-flash',
        deepseek: 'deepseek-chat',
        aisa: 'gpt-4o-mini',
      });
      if (onActiveEngineChange) {
        onActiveEngineChange(res.config.primaryProvider);
      }
    } catch (err: any) {
      if (!silent) showToast('⚠️ تعذر تحميل حالة محركات الذكاء الاصطناعي');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Poll for status every 10 seconds to detect automatic failovers if they happen in the background
    const interval = setInterval(() => {
      loadStatus(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTestProvider = async (provider: AIProviderId) => {
    setTestingId(provider);
    try {
      const activeModel = models[provider];
      const res = await testAIProvider(provider, activeModel);
      setTestResults((prev) => ({ ...prev, [provider]: res }));
      if (res.success) {
        showToast(`✅ تم اختبار محرك ${getProviderArabicName(provider)} بنجاح (${res.latencyMs}ms)`);
      } else {
        showToast(`⚠️ فشل اختبار ${getProviderArabicName(provider)}: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`❌ خطأ في فحص الاتصال: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleSelectPrimary = async (provider: AIProviderId) => {
    setSelectedPrimary(provider);
    setIsSaving(true);
    try {
      const res = await saveAIEngineConfig({
        primaryProvider: provider,
        autoFailover,
        failoverOrder,
        models: models as any,
      });
      setData((prev) => (prev ? { ...prev, config: res.config } : prev));
      if (onActiveEngineChange) {
        onActiveEngineChange(provider);
      }
      showToast(`🌟 تم تعيين "${getProviderArabicName(provider)}" كمحرك فعلي أساسي معتمد بنجاح`);
    } catch (err: any) {
      showToast('❌ تعذر حفظ المحرك الأساسي');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAutoFailover = async () => {
    const nextVal = !autoFailover;
    setAutoFailover(nextVal);
    setIsSaving(true);
    try {
      const res = await saveAIEngineConfig({
        primaryProvider: selectedPrimary,
        autoFailover: nextVal,
        failoverOrder,
        models: models as any,
      });
      setData((prev) => (prev ? { ...prev, config: res.config } : prev));
      showToast(
        nextVal
          ? '🛡️ تم تفعيل نظام التحويل التلقائي الذكي عند نفاد الرصيد'
          : '⚠️ تم إيقاف التحويل التلقائي الذكي'
      );
    } catch (err: any) {
      showToast('❌ تعذر تحديث إعدادات التحويل');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModelChange = async (provider: AIProviderId, newModel: string) => {
    const updatedModels = { ...models, [provider]: newModel };
    setModels(updatedModels);
    setIsSaving(true);
    try {
      const res = await saveAIEngineConfig({
        primaryProvider: selectedPrimary,
        autoFailover,
        failoverOrder,
        models: updatedModels as any,
      });
      setData((prev) => (prev ? { ...prev, config: res.config } : prev));
      showToast(`✅ تم تحديث نموذج ${getProviderArabicName(provider)} إلى ${newModel}`);
    } catch (err: any) {
      showToast('❌ تعذر حفظ النموذج المختار');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...failoverOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setFailoverOrder(newOrder);
    setIsSaving(true);
    try {
      const res = await saveAIEngineConfig({
        primaryProvider: selectedPrimary,
        autoFailover,
        failoverOrder: newOrder,
        models: models as any,
      });
      setData((prev) => (prev ? { ...prev, config: res.config } : prev));
      showToast('🔄 تم تحديث تسلسل أولويات التحويل التلقائي');
    } catch (err: any) {
      showToast('❌ تعذر حفظ تسلسل الأولويات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveFailover = async () => {
    setIsResolving(true);
    try {
      await resolveFailoverIncident();
      setData((prev) => (prev ? { ...prev, activeFailover: null } : prev));
      showToast('✅ تم تأكيد وحل تنبيه التحويل التلقائي واستئناف العمل الطبيعي');
    } catch (err: any) {
      showToast('❌ تعذر تأكيد حل التنبيه');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSimulateFailover = async () => {
    try {
      const fallback = selectedPrimary === 'deepseek' ? 'gemini' : 'deepseek';
      const res = await simulateFailover({
        originalProvider: selectedPrimary,
        fallbackProvider: fallback,
        reason: 'محاكاة اختبارية: نفاد الرصيد المالي في المحرك الأساسي (402 Insufficient Balance / Quota Exceeded)',
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              activeFailover: res.activeFailover,
              failoverHistory: [res.activeFailover, ...(prev.failoverHistory || [])],
            }
          : prev
      );
      showToast('⚠️ تم إطلاق تجربة التحويل التلقائي بنجاح! راجع تنبيه الطوارئ بالأعلى');
    } catch (err: any) {
      showToast('❌ تعذر إطلاق تجربة التحويل');
    }
  };

  const getProviderArabicName = (id: string): string => {
    switch (id) {
      case 'deepseek':
        return 'ديب سيك (DeepSeek)';
      case 'gemini':
        return 'جوجل جيميناي (Gemini)';
      case 'aisa':
        return 'أيسا الموحد (AISA.one)';
      default:
        return id;
    }
  };

  const handleEnableProvider = async (provider: AIProviderId) => {
    try {
      await enableProvider(provider);
      setDisabledProviders(prev => prev.filter(p => p !== provider));
      showToast(`✅ تم إعادة تفعيل محرك ${getProviderArabicName(provider)} بنجاح`);
      loadStatus(true);
    } catch (err) {
      showToast('❌ فشل إعادة تفعيل المحرك');
    }
  };
  const getProviderBadgeColor = (id: string): { bg: string; border: string; text: string } => {
    switch (id) {
      case 'deepseek':
        return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' };
      case 'gemini':
        return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' };
      case 'aisa':
        return { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700' };
    }
  };

  if (isLoading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#00873D] animate-spin" />
        <p className="text-sm font-bold text-slate-600">
          جاري استعلام حالة محركات الذكاء الاصطناعي والربط...
        </p>
      </div>
    );
  }

  const activeFailover = data?.activeFailover;
  const providers = data?.providers || [];
  const configuredCount = providers.filter((p) => p.isConfigured).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. ACTIVE FAILOVER ALERT BANNER (تنبيه التحويل التلقائي الذكي الفوري للمالك) */}
      {activeFailover && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500 rounded-3xl shadow-md space-y-3 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    ⚠️ تنبيه استجابة الطوارئ: تم التحويل التلقائي إلى محرك بديل!
                  </h3>
                  <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    تحويل تلقائي نشط
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                  حدث خلل في المحرك الأساسي المختار (
                  <strong className="text-rose-700">{getProviderArabicName(activeFailover.originalProvider)}</strong>
                  ) بسبب: <span className="bg-white/80 px-2 py-0.5 rounded-md text-rose-900 font-mono text-xs">{activeFailover.reason}</span>.
                </p>
                <p className="text-xs text-emerald-800 font-bold">
                  🛡️ تم التحويل التلقائي الفوري إلى محرك (
                  <strong>{getProviderArabicName(activeFailover.fallbackProvider)}</strong>
                  ) لضمان استمرار الخدمة للعملاء 100% دون أي توقف.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleResolveFailover}
                disabled={isResolving}
                className="px-4 py-2 bg-[#00873D] hover:bg-[#007033] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                {isResolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>تأكيد وحل التنبيه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HEADER & QUICK STATUS BAR */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00873D] to-[#005c2a] text-white flex items-center justify-center shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                إدارة محركات الذكاء الاصطناعي (AI Orchestrator)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                التحكم المركزي في ربط واختيار المحرك الفعلي والتحويل التلقائي الذكي لضمان استمرارية الخدمة.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          {/* Active Engine Badge */}
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00873D] animate-ping" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-emerald-800 font-bold">المحرك الفعلي المعتمد:</span>
              <span className="text-xs font-black text-[#00873D]">
                المشغل المختار نشط حالياً
              </span>
            </div>
          </div>

          {/* Connected Providers Count */}
          <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-600" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-500 font-bold">المحركات المتصلة (Secrets):</span>
              <span className="text-xs font-black text-slate-800">
                {configuredCount} من {providers.length} محركات
              </span>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadStatus()}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 transition-colors"
            title="تحديث الحالة الآن"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. PROVIDER CARDS GRID (DeepSeek, Gemini, AISA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {providers.map((p) => {
          const isPrimary = selectedPrimary === p.id;
          const isDisabled = disabledProviders.includes(p.id);
          const isTesting = testingId === p.id;
          const testRes = testResults[p.id];
          const colors = getProviderBadgeColor(p.id);

          return (
            <div
              key={p.id}
              className={`relative bg-white rounded-3xl border-2 transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs ${
                isDisabled
                  ? 'border-rose-300 bg-rose-50/20 opacity-90'
                  : isPrimary
                  ? 'border-[#00873D] ring-4 ring-[#00873D]/10 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Primary Active Badge Ribbon */}
              {isPrimary && !isDisabled && (
                <div className="absolute -top-3.5 right-6 bg-[#00873D] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>المحرك الفعلي المعتمد للردود</span>
                </div>
              )}

              {isDisabled && (
                <div className="absolute -top-3.5 right-6 bg-rose-600 text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-white" />
                  <span>معطل بسبب خلل (نفاد الرصيد)</span>
                </div>
              )}

              {/* Card Top: Provider Header & Connection Status */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base border ${colors.bg} ${colors.border} ${colors.text} shadow-2xs`}
                    >
                      {p.id === 'deepseek' && '🐋'}
                      {p.id === 'gemini' && '✨'}
                      {p.id === 'aisa' && '🌍'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-black text-slate-900">{p.arabicName}</h3>
                        <span className="text-xs text-slate-400 font-mono">({p.name})</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">{p.company}</span>
                    </div>
                  </div>

                  {/* Connection Status Badge */}
                  <div>
                    {p.isConfigured ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00873D]" />
                        <span>مرتبط بنجاح</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>غير مرتبط</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {p.description}
                </p>

                {/* Detected Environment Key */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    المتغير في Secrets:
                  </span>
                  {p.envKeyFound ? (
                    <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {p.envKeyFound} (محفوظ بأمان)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">
                      غير محدد (أضف {p.id === 'aisa' ? 'AISA_API_KEY' : 'API_KEY'})
                    </span>
                  )}
                </div>

                {/* Model Selector Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>النموذج النشط للمحرك:</span>
                    <span className="text-[10px] text-slate-400">Model</span>
                  </label>
                  <select
                    value={models[p.id] || p.supportedModels[0]}
                    onChange={(e) => handleModelChange(p.id, e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-[#00873D] focus:ring-1 focus:ring-[#00873D] outline-hidden transition-all"
                  >
                    {p.supportedModels.map((m) => (
                      <option key={m} value={m}>
                        {m} {m === 'deepseek-chat' && '(الأسرع والأذكى V3)'}
                        {m === 'deepseek-reasoner' && '(نموذج التفكير R1)'}
                        {m === 'gemini-2.5-flash' && '(الموصى به فائق السرعة)'}
                        {m === 'gpt-4o-mini' && '(AISA: التوازن الذكي)'}
                        {m === 'gpt-6-astra' && '(AISA: أذكى محرك في العالم حالياً)'}
                        {m === 'gpt-5.6-luna' && '(AISA: أداء فائق السرعة)'}
                        {m === 'claude-opus-5-5' && '(AISA: الإبداع والمنطق الأقصى)'}
                        {m === 'claude-sonnet-5-5' && '(AISA: دقة لغوية فائقة)'}
                        {m === 'gemini-3.5-flash' && '(AISA: أحدث محركات جوجل)'}
                        {m === 'deepseek-v4.1-flash' && '(AISA: ديب سيك المطور)'}
                        {m === 'kimi-k3' && '(Kimi: سياق فائق الطول K3)'}
                        {m === 'qwen3.8-max' && '(Qwen: أقوى محركات علي بابا)'}
                        {m === 'seed-2-0-pro-260328' && '(Doubao: محرك بايت دانس)'}
                        {m === 'glm-5.3' && '(GLM: الذكاء الصيني المتطور)'}
                        {m === 'MiniMax-M3' && '(Minimax: معالجة لغوية متقدمة)'}
                        {m === 'step-3.7-flash' && '(Step: السرعة الفائقة)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Test Result Display Box (if tested) */}
                {testRes && (
                  <div
                    className={`p-3 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                      testRes.success
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        {testRes.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{testRes.success ? 'استجابة المحرك نشطة وسريعة' : 'فشل الفحص المباشر'}</span>
                      </span>
                      <span className="font-mono text-[11px] bg-white px-1.5 py-0.2 rounded border">
                        ⏱️ {testRes.latencyMs}ms
                      </span>
                    </div>

                    {testRes.success && testRes.reply && (
                      <p className="text-[11px] text-slate-700 bg-white/70 p-1.5 rounded-lg border border-emerald-100 font-medium">
                        رد الاختبار: "{testRes.reply}"
                      </p>
                    )}

                    {!testRes.success && testRes.error && (
                      <p className="text-[11px] text-rose-700 bg-white/80 p-1.5 rounded-lg border border-rose-200 font-bold leading-relaxed">
                        السبب: {testRes.error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card Bottom: Actions (Test Ping & Set as Primary) */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {/* Live Test Ping Button */}
                <button
                  type="button"
                  onClick={() => handleTestProvider(p.id)}
                  disabled={isTesting}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 text-[#00873D] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'جاري الفحص المباشر وقياس السرعة...' : '⚡ فحص الاتصال وسرعة الاستجابة'}</span>
                </button>

                {/* Make Primary Button */}
                {isDisabled ? (
                  <button
                    type="button"
                    onClick={() => handleEnableProvider(p.id)}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>إعادة تفعيل هذا المحرك</span>
                  </button>
                ) : isPrimary ? (
                  <div className="w-full py-2.5 px-3 bg-emerald-50 text-[#00873D] border border-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00873D]" />
                    <span>المحرك الفعلي المعتمد حالياً</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPrimary(p.id)}
                    disabled={isSaving}
                    className="w-full py-2.5 px-3 bg-[#00873D] hover:bg-[#007033] active:scale-98 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>تعيين كمحرك أساسي معتمد</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. SMART AUTO-FAILOVER SETTINGS (نظام التحويل التلقائي عند نفاد الرصيد) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                نظام التحويل التلقائي الذكي عند نفاد الرصيد أو حدوث خلل (Auto-Failover)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              يضمن استمرار عمل التطبيق 24/7 دون أي انقطاع. في حال نفاد رصيد المحرك الأساسي أو تأخر استجابته، يتم التحويل في أجزاء من الثانية للمحرك البديل تلقائياً مع تنبيه المالك.
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleAutoFailover}
            className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
              autoFailover
                ? 'bg-[#00873D] text-white shadow-xs'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <span className={`w-3 h-3 rounded-full ${autoFailover ? 'bg-white' : 'bg-slate-400'}`} />
            <span>{autoFailover ? 'التحويل التلقائي مفعل ✅' : 'التحويل التلقائي معطل ❌'}</span>
          </button>
        </div>

        {/* Priority Order Sequence (تسلسل أولويات المحركات البديلة) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#00873D]" />
              تسلسل أولوية التحويل التلقائي (الأول ➔ الثاني ➔ الثالث):
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              يمكنك إعادة الترتيب بالأسهم
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {failoverOrder.map((provId, idx) => {
              const pInfo = providers.find((p) => p.id === provId);
              const isFirst = idx === 0;
              const isLast = idx === failoverOrder.length - 1;

              return (
                <div
                  key={provId}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#00873D] text-white text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {pInfo?.arabicName || provId}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {idx === 0 ? 'المحرك المستهدف أولاً' : `بديل احتياطي #${idx}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded-lg text-slate-700 transition-colors"
                      title="تقديم الأولوية"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded-lg text-slate-700 transition-colors"
                      title="تأخير الأولوية"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test / Simulation Trigger for Owner */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-900">🧪 اختبار الأمان الفعلي: </span>
              اضغط لتجربة محاكاة نفاد رصيد المحرك الأساسي ورؤية تنبيه الطوارئ والتحويل للمحرك البديل.
            </div>
            <button
              type="button"
              onClick={handleSimulateFailover}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 active:scale-98 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 text-amber-700" />
              <span>محاكاة تجربة التحويل التلقائي للطوارئ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. FAILOVER HISTORY & AUDIT LOG (سجل التحويلات والأعطال السابقة) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              سجل أحداث التحويل التلقائي والأعطال (Incident Audit Log)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {data?.failoverHistory?.length || 0} أحداث مسجلة
          </span>
        </div>

        {(!data?.failoverHistory || data.failoverHistory.length === 0) ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-[#00873D] mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              لا توجد أي أعطال أو حوادث تحويل سابقة — جميع العمليات تمت بنجاح واستقرار تام.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.failoverHistory.map((inc) => (
              <div
                key={inc.id}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      تحويل من {getProviderArabicName(inc.originalProvider)} ➔ {getProviderArabicName(inc.fallbackProvider)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(inc.timestamp).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">
                    <span className="font-bold text-rose-700">السبب: </span>
                    {inc.reason}
                  </p>
                </div>

                <div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-[11px]">
                    تم استمرار الخدمة بنجاح ✅
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. SECURITY & SECRETS BEST PRACTICES CARD */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-3xl flex items-start gap-3 text-xs text-emerald-950 font-medium">
        <ShieldCheck className="w-5 h-5 text-[#00873D] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-black text-sm text-[#00873D]">
            حماية المفاتيح البرمجية (Enterprise Secrets Security):
          </h4>
          <p className="leading-relaxed text-slate-700">
            جميع مفاتيح الربط البرمجية محفوظة حصرياً في قسم السكرت (Secrets) الآمن على الخادم الخلفي. لا يتم إرسال أي مفتاح للمتصفح نهائياً، وتمر جميع الاستعلامات عبر وكيل الخادم المباشر مع عزل كامل وضمان أمني 100%.
          </p>
        </div>
      </div>
    </div>
  );
};
