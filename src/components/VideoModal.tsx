import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, RotateCcw } from 'lucide-react';
import { ProductVideo } from '../types';
import { getYouTubeVideoId, getYouTubeEmbedUrl, isYouTubeShorts } from '../utils/videoUtils';

interface VideoModalProps {
  video: ProductVideo | null;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerClose = useCallback(() => {
    setIsDismissing(true);
    setTimeout(() => {
      onClose();
      setIsDismissing(false);
      setDragOffsetY(0);
    }, 200);
  }, [onClose]);

  // Touch gesture handlers for swipe up / swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    setDragOffsetY(deltaY);
  };

  const handleTouchEnd = () => {
    if (Math.abs(dragOffsetY) > 85) {
      triggerClose();
    } else {
      setDragOffsetY(0);
    }
    startYRef.current = null;
    setIsDragging(false);
  };

  // Mouse drag handlers for desktop swipe up/down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking background or drag handle area
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('iframe') || target.closest('video')) {
      return;
    }
    startYRef.current = e.clientY;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || startYRef.current === null) return;
    const deltaY = e.clientY - startYRef.current;
    setDragOffsetY(deltaY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    if (Math.abs(dragOffsetY) > 85) {
      triggerClose();
    } else {
      setDragOffsetY(0);
    }
    startYRef.current = null;
    setIsDragging(false);
  };

  if (!video) return null;

  const ytId = getYouTubeVideoId(video.videoUrl);
  const isYoutube = !!ytId;
  const isShorts = isYouTubeShorts(video.videoUrl);
  const embedUrl = isYoutube ? getYouTubeEmbedUrl(video.videoUrl, true) : null;

  // Calculate drag transform & opacity
  const dragTranslate = isDismissing
    ? dragOffsetY >= 0
      ? '100vh'
      : '-100vh'
    : `${dragOffsetY}px`;
  const dragScale = Math.max(0.75, 1 - Math.min(Math.abs(dragOffsetY) / 900, 0.25));
  const dragOpacity = Math.max(0.2, 1 - Math.min(Math.abs(dragOffsetY) / 500, 0.7));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] w-screen h-screen bg-black/95 select-none overflow-hidden flex flex-col items-center justify-center animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Floating Controls Bar (Overlays without affecting video viewport sizing) */}
      <div className="absolute top-0 inset-x-0 z-50 p-4 sm:p-5 flex items-center justify-between pointer-events-none">
        {/* Subtle Video Title Badge (discreet, semi-transparent) */}
        <div className="pointer-events-auto max-w-[70%] bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-xs sm:text-sm font-semibold truncate shadow-lg">
          {video.title}
        </div>

        {/* Floating Close Button - Sleek circular icon that returns to card without obstructing video */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerClose();
          }}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-90 text-white/90 hover:text-white backdrop-blur-md flex items-center justify-center border border-white/20 transition-all shadow-xl cursor-pointer"
          title="إغلاق الفيديو والعودة للبطاقة"
          aria-label="إغلاق الفيديو"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Swipe Indicator Handle at Top */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-1 opacity-60">
        <div className="w-12 h-1.5 rounded-full bg-white/40 backdrop-blur-xs" />
        <span className="text-[10px] text-white/75 font-medium select-none hidden sm:inline">
          اسحب لأعلى أو لأسفل للإغلاق
        </span>
      </div>

      {/* 100% Full Screen Video Area (Zero borders, zero margins, pure video canvas) */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          transform: `translateY(${dragTranslate}) scale(${dragScale})`,
          opacity: dragOpacity,
          transition: isDragging
            ? 'none'
            : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out',
        }}
      >
        {isYoutube ? (
          <div
            className={`relative flex items-center justify-center overflow-hidden ${
              isShorts
                ? 'aspect-[9/16] h-[90vh] max-h-screen max-w-[480px] mx-auto'
                : 'w-full h-full'
            }`}
          >
            {/* The "Hide Branding" Wrapper: Slightly larger than 100% to clip YouTube's default watermarks/title bar if possible */}
            <div className="relative w-full h-full scale-[1.01] pointer-events-auto">
              <iframe
                src={embedUrl || ''}
                title={video.title}
                className="w-full h-full border-0 select-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              
              {/* Invisible touch-blocking overlays for top-right corner to minimize "Share" button interaction if needed, 
                  but we must stay within TOS. Just styling the container to look more like a native app player. */}
            </div>

            {/* Custom Overlay for native app feel */}
            <div className="absolute inset-0 pointer-events-none border-[12px] border-black/5 opacity-40"></div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={video.videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full max-h-screen object-contain"
              onEnded={(e) => {
                // Ensure reliable looping across all mobile/desktop browsers
                e.currentTarget.currentTime = 0;
                e.currentTarget.play().catch(() => {});
              }}
            >
              متصفحك لا يدعم تشغيل هذا المقطع.
            </video>
          </div>
        )}
      </div>

      {/* Subtle Bottom Swipe Handle Indicator for Mobile */}
      <div className="absolute bottom-2 inset-x-0 z-40 pointer-events-none flex justify-center pb-1 opacity-50">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-white/80">
          <ChevronDown className="w-3 h-3 animate-bounce" />
          <span>اسحب للإغلاق والعودة للبطاقة</span>
        </div>
      </div>
    </div>
  );
};
