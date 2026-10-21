'use client';

import { LuckyWinner } from '@/types/minigame';
import { Gift, AtSign, Clock, Trash2, KeyRound, Sparkles } from 'lucide-react';

interface WinnersSidebarProps {
  winners: LuckyWinner[];
  onDeleteWinner?: (id: string) => void;
  isLoading?: boolean;
}

export default function WinnersSidebar({
  winners,
  onDeleteWinner,
  isLoading,
}: WinnersSidebarProps) {
  const formatTime = (wonAt: unknown) => {
    if (!wonAt) return 'Vừa xong';
    try {
      if (typeof (wonAt as { toDate?: () => Date }).toDate === 'function') {
        const d = (wonAt as { toDate: () => Date }).toDate();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (typeof wonAt === 'string') {
        const d = new Date(wonAt);
        if (!isNaN(d.getTime())) {
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        return wonAt;
      }
    } catch {
      // ignore
    }
    return 'Vừa xong';
  };

  return (
    <div className="flex flex-col h-full bg-white/95 rounded-[32px] border-2 border-amber-300 p-4 sm:p-5 shadow-lg shadow-amber-500/10">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b-2 border-amber-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-200 text-amber-900 shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>ĐÃ MỞ KHOÁ THÀNH CÔNG</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-[11px] font-bold text-slate-500">Các đợt mở vali quà tặng</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-mono text-xs font-black border border-amber-300">
          {winners.length} lượt
        </span>
      </div>

      {/* Winners List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar max-h-[calc(100vh-230px)]">
        {isLoading && winners.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs font-medium">
            <div className="inline-block animate-spin w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full mb-2" />
            <p>Đang tải danh sách...</p>
          </div>
        ) : winners.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-400 mb-2 border border-amber-200">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              Chưa có ai mở được vali.
              <br />
              <span className="text-[11px] text-slate-400 font-medium">Bấm "Mở Khoá Vali" để khám phá mật mã!</span>
            </p>
          </div>
        ) : (
          winners.map((winner, idx) => {
            const eCode = winner.eventCode || (winner as unknown as { code?: string }).code || '';
            const tId = winner.tiktokId || (winner as unknown as { tiktok?: string }).tiktok || 'Ẩn danh';
            const luckyNum = winner.luckyNumber !== undefined ? winner.luckyNumber : 0;

            return (
              <div
                key={winner.id}
                className="relative group bg-gradient-to-r from-amber-50/70 to-orange-50/50 border-2 border-amber-200/90 hover:border-amber-400 rounded-2xl p-3 transition-all duration-200 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-amber-300 text-amber-950 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1 text-slate-900 font-black text-xs sm:text-sm truncate max-w-[130px]">
                      <AtSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{tId}</span>
                    </div>
                  </div>

                  {onDeleteWinner && (
                    <button
                      onClick={() => onDeleteWinner(winner.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all"
                      title="Xóa lượt này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Số mật mã mở thành công */}
                <div className="bg-white rounded-xl px-2.5 py-1.5 border border-amber-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">MẬT MÃ VALI:</span>
                  <span className="font-mono text-base font-black text-amber-700">
                    {luckyNum}
                  </span>
                </div>

                {/* Mã SK & Thời gian */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5">
                  <span className="font-mono text-slate-600 truncate max-w-[120px]">
                    {eCode}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                    <Clock className="w-3 h-3" />
                    {formatTime(winner.wonAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
