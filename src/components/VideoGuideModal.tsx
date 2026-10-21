'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IconX } from '@/components/Icons';
import { VIDEO_GUIDE_CONFIG } from '@/config/constants';

interface VideoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title?: string;
}

export default function VideoGuideModal({
  isOpen,
  onClose,
  videoUrl = VIDEO_GUIDE_CONFIG.VIDEO_URL,
  title = VIDEO_GUIDE_CONFIG.TITLE,
}: VideoGuideModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lắng nghe sự kiện fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Khi modal mở/đóng: reset lỗi, tự động pause khi đóng
  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      setHasError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý phóng to toàn màn hình
  const handleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current;

    // Ưu tiên fullscreen cho container hoặc video element
    const target = (container || video) as (HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
      webkitEnterFullscreen?: () => void;
    }) | null;

    if (!target) return;

    try {
      if (video && typeof (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen === 'function') {
        // Cho thiết bị iOS Safari
        (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
        return;
      }

      if (target.requestFullscreen) {
        target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      } else if (target.mozRequestFullScreen) {
        target.mozRequestFullScreen();
      } else if (target.msRequestFullscreen) {
        target.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Không thể bật toàn màn hình:', err);
    }
  };

  // Kiểm tra nếu là link YouTube
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('embed/')) return url;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : url;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 text-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/80 max-h-[90vh]"
      >
        {/* Header Modal */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-800 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🎬</span>
            <h3 className="font-bold text-sm sm:text-base text-white truncate">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleFullscreen}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1"
              title="Phóng to toàn màn hình"
            >
              <span>⛶</span>
              <span className="hidden sm:inline">Toàn màn hình</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
              aria-label="Đóng"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Player Section */}
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[240px] sm:min-h-[360px]">
          {isYouTube ? (
            <iframe
              src={getYouTubeEmbedUrl(videoUrl)}
              title={title}
              className="w-full aspect-video border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                preload="none"
                className="w-full max-h-[65vh] object-contain"
                onError={() => setHasError(true)}
              >
                Trình duyệt của bạn không hỗ trợ thẻ video HTML5.
              </video>

              {hasError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mb-3">
                    ℹ️
                  </div>
                  <h4 className="font-bold text-white text-base mb-1">
                    Chưa tìm thấy video hướng dẫn
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                    Vui lòng thêm file video <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">public/guide.mp4</code> hoặc cập nhật đường dẫn video trong file cấu hình.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-800/80 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p className="text-center sm:text-left">
            💡 <span className="text-slate-300 font-medium">Mẹo:</span> Bạn có thể bấm biểu tượng ô vuông góc phải dưới video hoặc nút &quot;Toàn màn hình&quot; để phóng to rõ nét nhất.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-center"
          >
            Đã hiểu, quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
