import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstalling(false);
      setInstallProgress(100);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    
    // Simulate download progress as requested by user
    setIsInstalling(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        clearInterval(interval);
        setInstallProgress(100);
        // Trigger actual prompt
        deferredPrompt.prompt();
      } else {
        setInstallProgress(Math.min(Math.floor(progress), 99));
      }
    }, 200);

    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallProgress(100);
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstalling(false);
      return true;
    } else {
      setIsInstalling(false);
      setInstallProgress(0);
      return false;
    }
  };

  const uninstall = async () => {
    // PWA "uninstallation" in browser usually means clearing cache and storage
    // as we can't programmatically uninstall from OS.
    if (confirm('هل أنت متأكد من حذف الذاكرة المؤقتة وملفات التطبيق؟ سيتم إعادة تحميل الصفحة.')) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isInstalling,
    installProgress,
    isIOS,
    install,
    uninstall,
  };
}
