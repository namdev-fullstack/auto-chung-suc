'use client';

import Link from 'next/link';
import { Sparkles, Radio } from 'lucide-react';

export default function FloatingMinigameIcon() {
  return (
    <aside
      aria-label="Minigame Livestream"
      className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-40 group select-none pointer-events-auto transform-gpu"
    >
      <Link
        href="/minigame"
        className="relative flex items-center gap-3 p-2 sm:p-2.5 rounded-full bg-white hover:bg-amber-50/90 border-2 border-amber-400 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-200 active:scale-95"
      >
        {/* Vòng quay may mắn rực rỡ */}
        <div className="relative w-12 h-12 sm:w-13 sm:h-13 flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-400 shadow-md shrink-0">
          {/* SVG Vòng quay chỉ xoay nhẹ khi hover trên desktop */}
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950 transition-transform duration-500 group-hover:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.93 4.93 4.24 4.24" />
            <path d="m14.83 9.17 4.24-4.24" />
            <path d="m14.83 14.83 4.24 4.24" />
            <path d="m9.17 14.83-4.24 4.24" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>

          {/* Sparkle badge */}
          <div className="absolute -top-1 -right-1 text-white bg-orange-600 rounded-full p-1 shadow-xs border border-white">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>

        {/* Text Pill hiển thị trên desktop */}
        <div className="pr-3.5 pl-1 hidden sm:flex flex-col text-left">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-amber-600" />
            <span>MINIGAME LIVE</span>
          </span>
          <span className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">
            Mở Khoá Vali Quà
          </span>
        </div>
      </Link>
    </aside>
  );
}
