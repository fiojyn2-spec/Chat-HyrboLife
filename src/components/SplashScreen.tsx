import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PWASettings } from '../types';

interface SplashScreenProps {
  settings: PWASettings;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ settings }) => {
  const [isVisible, setIsVisible] = useState(settings.showIntro);

  useEffect(() => {
    if (settings.showIntro) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Show for 3 seconds
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [settings.showIntro]);

  if (!isVisible) return null;

  const getAnimation = () => {
    switch (settings.introAnimation) {
      case 'fade':
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
      case 'zoom':
        return { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 1.2, opacity: 0 } };
      case 'slide':
        return { initial: { y: 100, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -100, opacity: 0 } };
      default:
        return { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
  };

  const anim = getAnimation();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={anim.initial}
          animate={anim.animate}
          exit={anim.exit}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ 
            backgroundColor: settings.introColors.background,
            backgroundImage: settings.introBackgroundUrl ? `url(${settings.introBackgroundUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          className="fixed inset-0 z-100 flex flex-col items-center justify-center p-6"
        >
          <div className="relative flex flex-col items-center gap-6">
            {settings.introLogoUrl ? (
              <motion.img
                src={settings.introLogoUrl}
                alt="App Logo"
                style={{ width: `${settings.introLogoSize}px`, height: 'auto' }}
                className="object-contain"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 1 }}
              />
            ) : (
              <motion.div
                className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 1 }}
              >
                <svg viewBox="0 0 100 100" className="w-16 h-16 fill-white">
                  <path d="M50 10 C35 30 35 60 50 85 C65 60 65 30 50 10 Z" />
                  <path d="M45 50 C25 40 10 60 25 80 C40 85 45 65 45 50 Z" />
                  <path d="M55 50 C75 40 90 60 75 80 C60 85 55 65 55 50 Z" />
                </svg>
              </motion.div>
            )}

            {settings.showIntroText && settings.introText && (
              <motion.div
                className="text-center space-y-2"
                initial={
                  settings.introTextAnimation === 'slide' ? { opacity: 0, y: 20 } :
                  settings.introTextAnimation === 'zoom' ? { opacity: 0, scale: 0.8 } :
                  settings.introTextAnimation === 'fade' ? { opacity: 0 } :
                  { opacity: 1 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.5, 
                  duration: 0.8,
                  ease: "easeOut"
                }}
              >
                <h1 
                  style={{ 
                    color: settings.introTextColor || settings.introColors.text,
                    fontSize: `${settings.introTextSize}px`
                  }}
                  className="font-black tracking-tight"
                >
                  {settings.introText}
                </h1>
                <div 
                  style={{ backgroundColor: settings.introColors.accent }}
                  className="h-1 w-12 mx-auto rounded-full" 
                />
              </motion.div>
            )}
          </div>

          <motion.div 
            className="absolute bottom-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse delay-150" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
