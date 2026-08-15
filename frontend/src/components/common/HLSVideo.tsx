import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HLSVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

export const HLSVideo: React.FC<HLSVideoProps> = ({
  src,
  poster,
  className = 'fixed inset-0 h-full w-full object-cover pointer-events-none z-0',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const isHls = src.includes('.m3u8');

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari / iOS support
        video.src = src;
      } else if (Hls.isSupported()) {
        // Hls.js fallback for Chromium / Firefox
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            video.play().catch(() => {});
          }
        });
      }
    } else {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      className={className}
    />
  );
};
