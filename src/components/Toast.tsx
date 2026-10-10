'use client';

import { useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onCloseRef.current?.();
      }, 300);
    }, 3500);

    return () => clearTimeout(timer);
  }, [message, type]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-5 py-3 rounded-lg shadow-xl transition-all duration-300 flex items-center gap-3 max-w-md ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        {type === 'success' && <span className="font-bold">✓</span>}
        {type === 'error' && <span className="font-bold">✕</span>}
        {type === 'info' && <span className="font-bold">ℹ</span>}
        <span className="font-medium text-sm">{message}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onCloseRef.current?.(), 150);
        }}
        className="text-white/80 hover:text-white font-bold text-lg leading-none p-1"
        aria-label="Đóng"
      >
        ×
      </button>
    </div>
  );
}
