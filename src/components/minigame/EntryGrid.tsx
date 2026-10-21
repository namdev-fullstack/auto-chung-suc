'use client';

import { useState, useMemo } from 'react';
import { MinigameEntry } from '@/types/minigame';
import { AtSign, Users, Sparkles, Search, ChevronDown, Eye } from 'lucide-react';

interface EntryGridProps {
  entries: MinigameEntry[];
  highlightedIndex: number | null;
  isSpinning: boolean;
  defaultLimit?: number;
}

const DEFAULT_LIMIT = 45;

export default function EntryGrid({
  entries,
  highlightedIndex,
  isSpinning,
  defaultLimit = DEFAULT_LIMIT,
}: EntryGridProps) {
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(defaultLimit);

  // Lọc theo tìm kiếm
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const eCode = (entry.eventCode || entry.code || '').toLowerCase();
      const tId = (entry.tiktokId || entry.tiktok || '').toLowerCase();
      const pNum = String(entry.predictedNumber ?? '');
      return eCode.includes(q) || tId.includes(q) || pNum === q;
    });
  }, [entries, search]);

  // Đảm bảo nếu đang quay và có highlightedIndex, thẻ đó luôn được hiển thị
  const effectiveLimit = useMemo(() => {
    if (highlightedIndex !== null && highlightedIndex >= displayLimit) {
      return highlightedIndex + 10;
    }
    return displayLimit;
  }, [highlightedIndex, displayLimit]);

  const visibleEntries = useMemo(() => {
    // Nếu đang tìm kiếm, hiển thị tối đa 60 kết quả tìm kiếm
    if (search.trim()) {
      return filteredEntries.slice(0, 80);
    }
    return filteredEntries.slice(0, effectiveLimit);
  }, [filteredEntries, effectiveLimit, search]);

  const hasMore = !search.trim() && filteredEntries.length > visibleEntries.length;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center border-2 border-dashed border-amber-300 rounded-3xl bg-amber-50/50 min-h-[280px]">
        <div className="w-14 h-14 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-800 mb-3">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-800 mb-1">
          Chưa Có Mật Mã Nào Được Gửi Lên
        </h3>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-sm leading-relaxed">
          Hãy kêu gọi người xem truy cập trang <span className="text-amber-800 bg-amber-100 font-mono font-black px-1.5 py-0.5 rounded border border-amber-200">/minigame</span> để chọn con số may mắn của mình!
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-2.5">
      {/* Thanh công cụ tìm kiếm & Thống kê tải nhẹ */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-xl">
            Tổng: <strong className="font-mono text-amber-900">{entries.length}</strong> số
          </span>
          {entries.length > visibleEntries.length && !search.trim() && (
            <span className="text-[11px] font-medium text-slate-500">
              (Hiển thị {visibleEntries.length}/{entries.length} để tối ưu nhẹ máy)
            </span>
          )}
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div className="relative w-full sm:w-56">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm số, TikTok, Mã SK..."
            className="w-full pl-8 pr-3 py-1 bg-white/90 border border-amber-200 focus:border-amber-400 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-300 shadow-2xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid danh sách vé đã giới hạn số lượng render */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-[48vh] overflow-y-auto pr-1.5 custom-scrollbar p-1">
        {visibleEntries.map((entry, index) => {
          const isHighlighted = highlightedIndex === index;
          const eCode = entry.eventCode || entry.code || '';
          const tId = entry.tiktokId || entry.tiktok || 'Ẩn danh';
          const pNum = entry.predictedNumber !== undefined ? entry.predictedNumber : 0;

          return (
            <div
              key={`${eCode}-${index}`}
              id={`entry-card-${index}`}
              className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-150 flex flex-col items-center justify-between select-none ${
                isHighlighted
                  ? 'bg-amber-300 border-2 border-amber-500 shadow-lg scale-105 z-20'
                  : isSpinning
                  ? 'bg-white/80 border border-amber-100 opacity-80'
                  : 'bg-white hover:bg-amber-50/50 border-2 border-amber-200/90 shadow-2xs hover:border-amber-300'
              }`}
            >
              {/* STT góc trái nhỏ */}
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span className="font-bold">#{index + 1}</span>
                <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider bg-amber-100/70 px-1.5 py-0.2 rounded">
                  Số chọn
                </span>
              </div>

              {/* Con số của khách */}
              <div className="my-0.5 py-1 px-3 rounded-2xl bg-amber-100/60 w-full text-center border border-amber-200/60">
                <span className="font-mono font-black text-2xl sm:text-3xl text-amber-900 tracking-tight">
                  {pNum}
                </span>
              </div>

              {/* TikTok ID */}
              <div className="w-full mt-1 pt-1.5 border-t border-amber-100 flex items-center justify-center gap-1">
                <AtSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span
                  className="text-xs font-black text-slate-800 truncate max-w-[120px]"
                  title={tId}
                >
                  {tId}
                </span>
              </div>

              {/* Mã SK */}
              <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px] mt-0.5">
                {eCode}
              </div>

              {isHighlighted && (
                <div className="absolute -top-1 -right-1 text-amber-600 bg-white rounded-full p-0.5 shadow-xs border border-amber-300">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nút Xem thêm khi danh sách dài để tránh load giật lag */}
      {hasMore && (
        <div className="flex items-center justify-center gap-2 pt-1 pb-0.5">
          <button
            type="button"
            onClick={() => setDisplayLimit((prev) => prev + 45)}
            className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 transition-colors shadow-2xs flex items-center gap-1"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Xem thêm 45 số nữa (+45)</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayLimit(entries.length)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors shadow-2xs flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Xem tất cả ({entries.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}
