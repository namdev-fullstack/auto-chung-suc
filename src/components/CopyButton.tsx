'use client';

import { useState } from 'react';
import { IconCheck, IconCopy } from '@/components/Icons';

interface CopyButtonProps {
  text: string;
  label?: string;
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  title?: string;
}

export default function CopyButton({
  text,
  label,
  showText = false,
  className = '',
  iconClassName = 'h-3.5 w-3.5',
  title = 'Sao chép',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Đã sao chép!' : title}
      className={`inline-flex items-center gap-1 p-1 rounded transition-colors ${
        copied
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100 active:scale-95'
      } ${className}`}
    >
      {copied ? (
        <IconCheck className={`${iconClassName} text-emerald-600 animate-in fade-in`} />
      ) : (
        <IconCopy className={iconClassName} />
      )}
      {showText && (
        <span className="text-xs font-medium">
          {copied ? 'Đã chép' : label || 'Chép'}
        </span>
      )}
    </button>
  );
}
