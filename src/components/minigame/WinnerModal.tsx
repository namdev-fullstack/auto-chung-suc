'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CurrentWinnerDisplay } from '@/types/minigame';
import { Gift, AtSign, Sparkles, RotateCcw, KeyRound, HelpCircle } from 'lucide-react';

interface WinnerModalProps {
  winner: CurrentWinnerDisplay | null;
  luckyNumber?: number;
  isOpen?: boolean;
  onClose: () => void;
  onResetForNextRound: () => void;
  isClearingSheet?: boolean;
}

export default function WinnerModal({
  winner,
  luckyNumber,
  onClose,
  onResetForNextRound,
  isClearingSheet,
}: WinnerModalProps) {
  const hasWinner = !!winner;
  const actualLockNumber = winner?.luckyNumber ?? luckyNumber ?? 0;

  useEffect(() => {
    // Chỉ bắn pháo hoa khi CÓ NGƯỜI ĐOÁN ĐÚNG MẬT MÃ
    if (!winner) return;

    const duration = 2.8 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 45 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.15, 0.35), y: Math.random() - 0.2 },
        colors: ['#f59e0b', '#fbbf24', '#f97316', '#38bdf8', '#34d399', '#f472b6'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.65, 0.85), y: Math.random() - 0.2 },
        colors: ['#f59e0b', '#fbbf24', '#f97316', '#38bdf8', '#34d399', '#f472b6'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, [winner]);

  // Nếu cả winner lẫn luckyNumber đều không có thì không hiển thị
  if (!winner && luckyNumber === undefined) return null;

  const eventCode = winner?.eventCode || winner?.code || '';
  const tiktokId = winner?.tiktokId || winner?.tiktok || 'Ẩn danh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Glow Aura Background nhẹ nhàng */}
      <div className="absolute w-[450px] h-[450px] bg-gradient-to-r from-amber-200/50 to-orange-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md bg-white border-3 border-amber-300 rounded-[32px] p-6 sm:p-7 shadow-2xl shadow-amber-500/20 text-center animate-in zoom-in-95 duration-200">
        
        {/* Top Icon Dễ Thương */}
        <div className="mx-auto -mt-16 sm:-mt-18 w-22 h-22 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-300 to-orange-400 p-1 shadow-lg shadow-amber-400/30 flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
            {hasWinner ? (
              <Gift className="w-12 h-12 text-amber-500 animate-bounce" />
            ) : (
              <HelpCircle className="w-12 h-12 text-slate-400" />
            )}
          </div>
        </div>

        {hasWinner ? (
          <>
            {/* Tag Chúc Mừng */}
            <div className="mt-4 inline-flex items-center gap-1.5 text-amber-800 font-black text-xs uppercase tracking-wide bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>CHÍNH XÁC MẬT MÃ VALI</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
              MỞ KHOÁ THÀNH CÔNG!
            </h2>

            {/* Mật mã đúng */}
            <div className="my-4 p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-200">
              <div className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center justify-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>MẬT MÃ MỞ VALI</span>
              </div>
              <div className="text-4xl sm:text-5xl font-black font-mono text-amber-600 my-1">
                {actualLockNumber}
              </div>

              {/* Thông tin người giải đúng */}
              <div className="mt-3 pt-3 border-t border-amber-200/80">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <span className="text-xs text-slate-500 font-bold">TikTok:</span>
                  <span className="inline-flex items-center gap-1 text-sm sm:text-base font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                    <AtSign className="w-3.5 h-3.5 text-amber-600" />
                    <span>{tiktokId}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Mã sự kiện: <strong className="font-mono text-slate-800">{eventCode}</strong>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Trường hợp Không Có Ai Đoán Đúng */}
            <div className="mt-4 inline-flex items-center gap-1.5 text-slate-600 font-black text-xs uppercase tracking-wide bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
              <span>KẾT QUẢ VÒNG NÀY</span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight mt-2">
              CHƯA AI MỞ ĐƯỢC VALI KÌ NÀY!
            </h2>

            <div className="my-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wide">
                MẬT MÃ CỦA VALI LÀ
              </div>
              <div className="text-4xl sm:text-5xl font-black font-mono text-slate-800 my-1">
                {actualLockNumber}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-2">
                Chưa có bạn nào chọn đúng con số này. Hãy chuẩn bị thử sức lại ở vòng tiếp theo nhé!
              </p>
            </div>
          </>
        )}

        {/* Nút thao tác */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2">
          <button
            type="button"
            onClick={onResetForNextRound}
            disabled={isClearingSheet}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isClearingSheet ? 'animate-spin' : ''}`} />
            <span>{isClearingSheet ? 'Đang dọn dữ liệu...' : 'SẴN SÀNG VÒNG TIẾP THEO'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
