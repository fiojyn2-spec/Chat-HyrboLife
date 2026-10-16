/**
 * Utility functions for video URLs, YouTube ID extraction, YouTube Shorts support,
 * file-based video thumbnail extraction, and embed URL generators.
 */

export function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // 1. YouTube Shorts: /shorts/<id> (handles query parameters like ?feature=share or ?si=...)
  const shortsMatch = trimmed.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // 2. Short links: youtu.be/<id>
  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) return youtuBeMatch[1];

  // 3. Standard watch link: youtube.com/watch?v=<id> or with other params
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // 4. Embed or /v/ links: youtube.com/embed/<id>
  const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/(?:embed|v)\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // 5. Fallback regex for any 11-char YouTube ID in a YouTube-like string
  const generalMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return generalMatch ? generalMatch[1] : null;
}

export function isYouTubeUrl(url: string): boolean {
  return !!getYouTubeVideoId(url);
}

export function isYouTubeShorts(url: string): boolean {
  if (!url) return false;
  return /shorts\//i.test(url);
}

export function getYouTubeEmbedUrl(url: string, autoPlay: boolean = true): string | null {
  const ytId = getYouTubeVideoId(url);
  if (!ytId) return null;
  const autoPlayParam = autoPlay ? '&autoplay=1&mute=0' : '';
  // Enhanced YouTube player parameters:
  // - rel=0: Disables unrelated recommendations
  // - modestbranding=1: Minimizes YouTube branding
  // - iv_load_policy=3: Disables annotations/popups
  // - loop=1&playlist=${ytId}: Required by YouTube API to continuously repeat/loop a single video
  // - playsinline=1: Supports inline playback on mobile devices
  return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&iv_load_policy=3&loop=1&playlist=${ytId}&playsinline=1&enablejsapi=1${autoPlayParam}`;
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('data:video/') ||
    url.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)
  );
}

export function getVideoThumbnail(url: string, customThumbnail?: string): string {
  if (customThumbnail) return customThumbnail;
  const ytId = getYouTubeVideoId(url);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  if (url && (url.startsWith('data:video') || url.startsWith('blob:') || isDirectVideoUrl(url))) {
    return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80';
}

/**
 * Reads an uploaded video file, extracts its duration, generates a snapshot thumbnail,
 * and converts the file to a Data URL for persistence.
 */
export function processVideoFile(file: File): Promise<{
  dataUrl: string;
  thumbnailUrl: string;
  duration: string;
}> {
  return new Promise((resolve, reject) => {
    // 1. Read file as Data URL
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الفيديو'));
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // 2. Create temporary video element to extract thumbnail and duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;

      video.onloadedmetadata = () => {
        // Format duration
        const totalSecs = Math.round(video.duration || 0);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const durationFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        // Seek to 1 second (or midpoint if short) for thumbnail
        video.currentTime = Math.min(1, video.duration / 2 || 0.5);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth || 640, 640);
          canvas.height = Math.min(video.videoHeight || 360, 360);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(blobUrl);

            const totalSecs = Math.round(video.duration || 0);
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            const durationFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

            resolve({
              dataUrl,
              thumbnailUrl,
              duration: durationFormatted,
            });
            return;
          }
        } catch (e) {
          console.warn('Canvas snapshot failed, using fallback thumbnail:', e);
        }

        URL.revokeObjectURL(blobUrl);
        resolve({
          dataUrl,
          thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
          duration: '1:00',
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        // Fallback resolve with dataUrl if video cannot decode locally
        resolve({
          dataUrl,
          thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
          duration: '',
        });
      };
    };

    reader.readAsDataURL(file);
  });
}
