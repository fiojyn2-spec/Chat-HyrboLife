import React, { useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, ArrowRight, Smartphone, RefreshCw } from 'lucide-react';

interface LoginOverlayProps {
  onLogin: (sessionId: string, user: { email: string; role: string }) => void;
  onClose: () => void;
}

export function LoginOverlay({ onLogin, onClose }: LoginOverlayProps) {
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSessionId, setResetSessionId] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');
      onLogin(data.sessionId, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحقق');
      setResetSessionId(data.resetSessionId);
      setView('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-id': resetSessionId || ''
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');
      setView('login');
      setError('تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8 text-[#00873D]" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-slate-900 mb-2">
            {view === 'login' ? 'لوحة التحكم الآمنة' : view === 'forgot' ? 'استعادة كلمة المرور' : 'تعيين كلمة مرور جديدة'}
          </h2>
          <p className="text-slate-500 text-center text-sm mb-8">
            {view === 'login' ? 'يرجى تسجيل الدخول للوصول إلى الإعدادات' : view === 'forgot' ? 'أدخل الرمز من تطبيق المصادقة' : 'أدخل كلمة المرور الجديدة لحسابك'}
          </p>

          {error && (
            <div className={`p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 ${error.includes('بنجاح') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 text-sm focus:ring-2 focus:ring-[#00873D] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 text-sm focus:ring-2 focus:ring-[#00873D] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#00873D] hover:bg-[#007032] text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'تسجيل الدخول'}
                {!isLoading && <ArrowRight className="w-5 h-5 transition-transform group-hover:-translate-x-1" />}
              </button>
              <button
                type="button"
                onClick={() => setView('forgot')}
                className="w-full text-center text-sm text-slate-400 hover:text-emerald-600 transition-colors mt-2"
              >
                نسيت كلمة المرور؟
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleVerifyTotp} className="space-y-4">
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="البريد الإلكتروني للحساب"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 text-sm focus:ring-2 focus:ring-[#00873D] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="رمز المصادقة (6 أرقام)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 text-center text-2xl font-black tracking-[1em] focus:ring-2 focus:ring-[#00873D] focus:border-transparent outline-none transition-all"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#00873D] hover:bg-[#007032] text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'تحقق من الرمز'}
              </button>
              <button
                type="button"
                onClick={() => setView('login')}
                className="w-full text-center text-sm text-slate-400 hover:text-emerald-600 transition-colors mt-2"
              >
                العودة لتسجيل الدخول
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 text-sm focus:ring-2 focus:ring-[#00873D] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#00873D] hover:bg-[#007032] text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'تحديث كلمة المرور'}
              </button>
            </form>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
           <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
           >
             إغلاق النافذة
           </button>
        </div>
      </div>
    </div>
  );
}
