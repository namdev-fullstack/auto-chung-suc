'use client';

import { MinigameEntry } from '@/types/minigame';
import { Trophy, AtSign, Sparkles, Flame, Users, Dices } from 'lucide-react';

interface SpotlightRollerProps {
  currentEntry: MinigameEntry | null;
  isSpinning: boolean;
  totalEntries: number;
  winner: MinigameEntry | null;
  onStartSpin: () => void;
  disabled?: boolean;
}

export default function SpotlightRoller({
  currentEntry,
  isSpinning,
  totalEntries,
  winner,
  onStartSpin,
  disabled,
}: SpotlightRollerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 p-1 sm:p-1.5 shadow-xl shadow-amber-500/25 mb-4">
      {/* Background Glow / Shimmer Light */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-md" />

      {/* Main Inner Card */}
      <div className="relative rounded-[22px] bg-gradient-to-b from-white via-amber-50/50 to-white p-4 sm:p-6 text-center border border-white">
        {/* Top Mini Header */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-900 uppercase tracking-wider bg-amber-100/90 px-3 py-1 rounded-xl border border-amber-300">
            <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
            <span>SÂN KHẤU QUAY TÂM ĐIỂM (SPOTLIGHT)</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-800 bg-white px-3 py-1 rounded-xl border-2 border-amber-200 shadow-xs">
            <Users className="w-4 h-4 text-amber-600" />
            <span>{totalEntries} Mã Tham Gia</span>
          </div>
        </div>

        {/* Roller Display Box */}
        <div
          className={`relative my-2 sm:my-3 rounded-2xl p-4 sm:p-6 transition-all duration-150 border-3 ${
            isSpinning
              ? 'bg-amber-100/80 border-amber-500 shadow-inner scale-[1.01]'
              : winner
              ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 border-amber-500 shadow-lg'
              : 'bg-white border-amber-200/90 shadow-sm'
          }`}
        >
          {/* Subtle spinning indicator */}
          {isSpinning && (
            <div className="absolute top-2 right-3 flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-200/90 px-2 py-0.5 rounded-full animate-pulse">
              <Dices className="w-3.5 h-3.5 animate-spin" />
              <span>ĐANG XÁO MÃ...</span>
            </div>
          )}

          {winner && !isSpinning && (
            <div className="absolute top-2 right-3 flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>ĐÃ TRÚNG GIẢI</span>
            </div>
          )}

          <div className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-1">
            {isSpinning
              ? 'HỘP SỐ ĐANG XOAY TỐC ĐỘ CAO'
              : winner
              ? 'CHÚC MỪNG MÃ TRÚNG THƯỞNG!'
              : 'SẴN SÀNG QUAY THƯỞNG'}
          </div>

          {/* Central Mega Code Display - To Rõ Cực Đại */}
          <div className="min-h-[58px] sm:min-h-[76px] flex items-center justify-center">
            {currentEntry || winner ? (
              <div className="font-mono text-3xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-widest break-all drop-shadow-sm select-all">
                {(winner && !isSpinning ? winner : currentEntry)?.code}
              </div>
            ) : (
              <div className="text-slate-400 font-mono text-2xl sm:text-4xl font-extrabold tracking-widest">
                ••••••••••
              </div>
            )}
          </div>

          {/* TikTok Tag Display */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500">TikTok:</span>
            <div className="inline-flex items-center gap-1 text-sm sm:text-lg font-black text-slate-900 bg-amber-200/80 px-3.5 py-1 rounded-xl border border-amber-300">
              <AtSign className="w-4 h-4 text-amber-700" />
              <span>
                {((winner && !isSpinning ? winner : currentEntry)?.tiktok) ||
                  (totalEntries > 0 ? 'Đang đợi bấm quay...' : 'Chưa có người tham gia')}
              </span>
            </div>
          </div>
        </div>

        {/* Big Action CTA inside the Spotlight Stage */}
        <div className="mt-3 flex items-center justify-center">
          <button
            type="button"
            onClick={onStartSpin}
            disabled={disabled || isSpinning || totalEntries === 0}
            className={`w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg tracking-wider uppercase flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl ${
              isSpinning
                ? 'bg-amber-400 text-slate-900 cursor-not-allowed opacity-90'
                : totalEntries === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            {isSpinning ? (
              <>
                <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>HỘP SỐ ĐANG QUAY...</span>
              </>
            ) : (
              <>
                <Trophy className="w-6 h-6 text-yellow-200" />
                <span>BẤM ĐỂ QUAY THƯỞNG NGAY</span>
                <Sparkles className="w-5 h-5 text-yellow-200 animate-spin" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
