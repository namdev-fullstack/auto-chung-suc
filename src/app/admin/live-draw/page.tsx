'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { MinigameEntry, EventWinner } from '@/types/minigame';
import {
  fetchMinigameEntries,
  clearSheetEntries,
  saveWinnerToFirestore,
  subscribeToWinners,
  deleteWinnerFromFirestore,
  subscribeToLuckyGameSettings,
} from '@/lib/minigame';

import MinigameBackground3D from '@/components/minigame/MinigameBackground3D';
import SpotlightRoller from '@/components/minigame/SpotlightRoller';
import EntryGrid from '@/components/minigame/EntryGrid';
import WinnersSidebar from '@/components/minigame/WinnersSidebar';
import WinnerModal from '@/components/minigame/WinnerModal';
import { soundEffects } from '@/components/minigame/soundEffects';
import {
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Flame,
  Search,
  Trash2,
  ArrowLeft,
  Users,
  Radio,
  Tv,
} from 'lucide-react';

export default function AdminLiveDrawPage() {
  const [entries, setEntries] = useState<MinigameEntry[]>([]);
  const [winners, setWinners] = useState<EventWinner[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<MinigameEntry | null>(null);
  const [isClearingSheet, setIsClearingSheet] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isLoadingWinners, setIsLoadingWinners] = useState(true);
  const [roundNumber, setRoundNumber] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpinningRef = useRef(isSpinning);
  isSpinningRef.current = isSpinning;

  const isFetchingRef = useRef(false);

  // 1. Tải danh sách người tham gia từ Google Sheet (đã tối ưu tránh load quá tải)
  const loadEntries = useCallback(async (showToast = false, force = false) => {
    if (isSpinningRef.current || isFetchingRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return; // Không fetch khi tab đang ẩn

    isFetchingRef.current = true;
    setIsLoadingEntries(true);
    try {
      const data = await fetchMinigameEntries(force);
      setEntries(data);
      if (showToast) {
        toast.success('Đã làm mới dữ liệu!', {
          description: `Đang có ${data.length} mã tham gia trên Google Sheet.`,
        });
      }
    } catch {
      if (showToast) {
        toast.error('Không thể kết nối đến Google Sheet');
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoadingEntries(false);
    }
  }, []);

  // 2. Lắng nghe real-time từ Firestore `event_winners` (đã có limit tối ưu)
  useEffect(() => {
    setIsLoadingWinners(true);
    const unsubscribe = subscribeToWinners(
      (data) => {
        setWinners(data);
        setIsLoadingWinners(false);
      },
      () => {
        setIsLoadingWinners(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Quản lý trạng thái cổng & Chỉ load khi CỔNG MỞ hoặc khi có khách nhập số mới
  const [isGateOpen, setIsGateOpen] = useState(false);
  const prevIsOpenRef = useRef<boolean | null>(null);
  const prevLastEntryAtRef = useRef<unknown>(null);

  useEffect(() => {
    const unsub = subscribeToLuckyGameSettings((s) => {
      setIsGateOpen(s.isOpen);

      // Nếu cổng vừa được mở: lập tức tải dữ liệu
      if (s.isOpen && prevIsOpenRef.current !== true) {
        prevIsOpenRef.current = true;
        loadEntries(false, true);
      } else if (!s.isOpen) {
        prevIsOpenRef.current = false;
      }

      // Nếu có khách vừa gửi số mới VÀ cổng đang mở
      if (s.isOpen && s.lastEntryAt && s.lastEntryAt !== prevLastEntryAtRef.current) {
        if (prevLastEntryAtRef.current !== null && autoRefresh) {
          loadEntries(false, true);
        }
        prevLastEntryAtRef.current = s.lastEntryAt;
      }
    });

    return () => unsub();
  }, [autoRefresh, loadEntries]);



  // Cập nhật âm thanh
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
  };

  // Toggle Toàn màn hình (OBS Stream Friendly)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // 4. XỬ LÝ QUAY THƯỞNG (Tối ưu chống lóa mắt khi có hàng trăm người tham gia)
  const handleStartDraw = () => {
    if (isSpinning) return;
    if (entries.length === 0) {
      toast.error('Chưa có mã tham gia!', {
        description: 'Vui lòng bảo người xem truy cập /minigame để gửi mã dự thưởng.',
      });
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);

    // Chọn người may mắn ngẫu nhiên
    const winnerIdx = Math.floor(Math.random() * entries.length);
    const totalEntries = entries.length;

    // Bắt đầu quay: hiển thị trên Sân khấu Spotlight Roller trung tâm
    let currentIdx = highlightedIndex !== null ? highlightedIndex : 0;
    let delay = 40; // ms ban đầu
    const startTime = Date.now();
    const duration = 4000; // 4s tổng thời gian quay chuẩn truyền hình

    const step = () => {
      const elapsed = Date.now() - startTime;
      currentIdx = (currentIdx + 1) % totalEntries;
      setHighlightedIndex(currentIdx);

      // Âm thanh tick synth theo nhịp quay
      const pitch = 380 + (currentIdx % 7) * 45;
      soundEffects.playTick(pitch);

      if (elapsed < duration - 1200) {
        // Giai đoạn quay tốc độ cao mượt mà
        delay = Math.min(75, delay + 1.2);
        spinTimeoutRef.current = setTimeout(step, delay);
      } else if (elapsed < duration) {
        // Giai đoạn chậm dần kịch tính (hồi hộp)
        const remaining = duration - elapsed;
        delay = delay + 40 + (1200 - remaining) * 0.09;
        spinTimeoutRef.current = setTimeout(step, delay);
      } else {
        // Khóa mục tiêu chính xác ở người trúng thưởng
        setHighlightedIndex(winnerIdx);
        const finalWinner = entries[winnerIdx];
        handleWinnerSelected(finalWinner);
      }
    };

    step();
  };

  // 5. KHI CHỐT KẾT QUẢ NGƯỜI CHIẾN THẮNG
  const handleWinnerSelected = async (winner: MinigameEntry) => {
    setIsSpinning(false);
    setCurrentWinner(winner);

    // Âm thanh ăn mừng chiến thắng
    soundEffects.playWin();

    try {
      // 1. Lưu vào Firestore `event_winners`
      await saveWinnerToFirestore({
        code: winner.code,
        tiktok: winner.tiktok,
        prize: `Giải Độc Đắc - Vòng ${roundNumber}`,
        round: roundNumber,
      });

      // 2. Tự động gọi Google Apps Script xóa sạch danh sách tạm thời trên Sheet
      setIsClearingSheet(true);
      await clearSheetEntries();
    } catch (err) {
      console.error('Lỗi khi lưu người trúng giải:', err);
    } finally {
      setIsClearingSheet(false);
    }
  };

  // Reset chuẩn bị cho đợt quay tiếp theo
  const handleResetForNextRound = async () => {
    setCurrentWinner(null);
    setHighlightedIndex(null);
    setRoundNumber((prev) => prev + 1);
    setEntries([]);
    await loadEntries(false);
    toast.success(`Sẵn sàng cho Vòng ${roundNumber + 1}!`, {
      description: 'Đã làm mới danh sách Google Sheet và hệ thống quay số.',
    });
  };

  // Xóa người thắng khỏi Firestore
  const handleDeleteWinner = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa người trúng giải này khỏi danh sách?')) {
      try {
        await deleteWinnerFromFirestore(id);
        toast.success('Đã xóa thành công');
      } catch {
        toast.error('Không thể xóa');
      }
    }
  };

  // Dọn dẹp sheet thủ công
  const handleManualClearSheet = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách tạm trên Google Sheet?')) {
      try {
        setIsClearingSheet(true);
        await clearSheetEntries();
        setEntries([]);
        setHighlightedIndex(null);
        toast.success('Đã xóa sạch Google Sheet');
      } catch {
        toast.error('Lỗi xóa Google Sheet');
      } finally {
        setIsClearingSheet(false);
      }
    }
  };

  // Lọc thẻ khi search
  const filteredEntries = entries.filter(
    (e) =>
      (e.code || e.eventCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.tiktok || e.tiktokId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeEntry = highlightedIndex !== null && entries[highlightedIndex] ? entries[highlightedIndex] : null;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-100 via-amber-50/50 to-orange-50/60 text-slate-900 flex flex-col overflow-hidden select-none">
      <Toaster position="top-right" richColors />

      {/* Hiệu ứng 3D Three.js Particles nền sáng lễ hội */}
      <MinigameBackground3D intensity={1.2} variant="light" />

      {/* Ambient Glow Lights */}
      <div className="absolute -top-32 left-1/4 w-[600px] h-[400px] bg-amber-300/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[500px] h-[400px] bg-orange-300/25 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Livestream OBS Header Bar - Nền sáng sắc nét */}
      <header className="relative z-20 bg-white/95 backdrop-blur-md border-b-2 border-amber-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        {/* Brand & Round Info */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition-colors border-2 border-amber-200 shadow-2xs"
            title="Về Trang Quản Trị"
          >
            <ArrowLeft className="w-4 h-4 text-amber-700 font-bold" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/25">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-slate-950 tracking-tight flex items-center gap-1.5">
                  <span>MÀN HÌNH QUAY SỐ LIVESTREAM</span>
                  <Flame className="w-5 h-5 text-orange-600 animate-pulse" />
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-2xs">
                  VÒNG #{roundNumber}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 hidden sm:flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>Minh bạch 100% qua Google Sheet & Firestore • Tối ưu màn hình OBS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stream Actions & Controls */}
        <div className="flex items-center gap-2">
          {/* Nút Làm Mới Google Sheet */}
          <button
            onClick={() => loadEntries(true, true)}
            disabled={isLoadingEntries || isSpinning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-amber-50 text-slate-800 border-2 border-amber-200 text-xs sm:text-sm font-extrabold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Làm mới danh sách từ Google Sheet (bỏ qua cache)"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingEntries ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
            <span className="hidden sm:inline">Làm Mới</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3.5 py-2 rounded-2xl border-2 text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
            title="Tự động đồng bộ Google Sheet mỗi 15 giây (tạm dừng khi tab ẩn)"
          >

            <span className={`w-2.5 h-2.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="hidden md:inline">Auto-Sync</span>
          </button>

          {/* Xóa sạch Sheet */}
          <button
            onClick={handleManualClearSheet}
            disabled={isSpinning || isClearingSheet || entries.length === 0}
            className="p-2.5 rounded-2xl bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border-2 border-slate-200 hover:border-red-300 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
            title="Xóa toàn bộ mã trên Google Sheet"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Toggle Âm Thanh */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-2xl bg-white hover:bg-amber-50 text-slate-700 border-2 border-amber-200 transition-colors cursor-pointer shadow-2xs"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-white hover:bg-amber-50 text-slate-700 border-2 border-amber-200 transition-colors cursor-pointer shadow-2xs"
            title="Chế độ toàn màn hình OBS"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main 2-Column Layout: 75% Grid / 25% Hall of Fame */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 p-4 sm:p-6 overflow-hidden">
        {/* CỘT CHÍNH (75% chiều rộng trên màn hình lớn -> 9/12 cột) */}
        <section className="lg:col-span-9 flex flex-col h-full bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-300/90 p-4 sm:p-6 shadow-xl shadow-amber-500/10">
          {/* SÂN KHẤU QUAY TÂM ĐIỂM (SPOTLIGHT ROLLER) - Giải pháp chống lóa mắt khi có hàng trăm người */}
          <SpotlightRoller
            currentEntry={activeEntry}
            isSpinning={isSpinning}
            totalEntries={entries.length}
            winner={currentWinner}
            onStartSpin={handleStartDraw}
            disabled={isSpinning || entries.length === 0}
          />

          {/* Sub Header for Matrix Grid */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 mb-3 border-b-2 border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                DANH SÁCH MÃ THAM GIA ({entries.length})
              </span>
              {isSpinning && (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300 animate-pulse">
                  Đang lọc tâm điểm...
                </span>
              )}
            </div>

            {/* Ô tìm kiếm nhanh mã hoặc tiktok */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc mã hoặc TikTok ID..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-amber-50/50 hover:bg-white focus:bg-white border-2 border-amber-200 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Ma trận thẻ số Live Grid */}
          <div className="flex-1 overflow-hidden relative">
            <EntryGrid
              entries={searchQuery ? filteredEntries : entries}
              highlightedIndex={highlightedIndex}
              isSpinning={isSpinning}
            />
          </div>
        </section>

        {/* CỘT PHỤ (25% chiều rộng trên màn hình lớn -> 3/12 cột) */}
        <aside className="lg:col-span-3 flex flex-col h-full">
          <WinnersSidebar
            winners={winners}
            onDeleteWinner={handleDeleteWinner}
            isLoading={isLoadingWinners}
          />
        </aside>
      </div>

      {/* Modal Người Chiến Thắng + Pháo hoa */}
      <WinnerModal
        winner={currentWinner}
        onClose={() => setCurrentWinner(null)}
        onResetForNextRound={handleResetForNextRound}
        isClearingSheet={isClearingSheet}
      />
    </div>
  );
}
