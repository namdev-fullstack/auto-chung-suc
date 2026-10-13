'use client';

import React, { useEffect } from 'react';
import { IconAlert, IconCheck, IconTrash, IconX, Spinner } from './Icons';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-600',
          icon: <IconTrash className="h-6 w-6" />,
          buttonBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          icon: <IconAlert className="h-6 w-6" />,
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          icon: <IconCheck className="h-6 w-6" />,
          buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25',
        };
    }
  };

  const { iconBg, icon, buttonBg } = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Nút đóng góc phải */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Đóng"
        >
          <IconX className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* Icon Badge */}
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${iconBg}`}
          >
            {icon}
          </div>

          {/* Nội dung */}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
              {title}
            </h3>
            <div className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-line">
              {message}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-gray-700 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 active:scale-98"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md transition-all inline-flex items-center gap-1.5 disabled:opacity-60 active:scale-98 ${buttonBg}`}
          >
            {isLoading && <Spinner className="h-4 w-4" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
