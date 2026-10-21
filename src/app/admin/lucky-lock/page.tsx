'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { MinigameEntry, LuckyWinner, LuckyNumberGameSettings, CurrentWinnerDisplay } from '@/types/minigame';
import {
  fetchLuckyNumberEntries,
  clearGoogleSheetEntries,
  saveLuckyWinnerToFirestore,
  subscribeToWinners,
  deleteWinnerFromFirestore,
  subscribeToLuckyGameSettings,
  updateLuckyGameSettings,
} from '@/lib/minigame';
import MinigameBackground3D from '@/components/minigame/MinigameBackground3D';
import LuggageLock from '@/components/minigame/LuggageLock';
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
  ArrowLeft,
  Users,
  Tv,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  Sliders,
  KeyRound,
} from 'lucide-react';

export default function LuckyLockAdminPage() {
  const [settings, setSettings] = useState<LuckyNumberGameSettings>({
    isOpen: false,
    maxNumber: 99,
    round: 1,
  });
  const [tempMaxNumber, setTempMaxNumber] = useState('99');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const [entries, setEntries] = useState<MinigameEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [winners, setWinners] = useState<LuckyWinner[]>([]);
  const [isLoadingWinners, setIsLoadingWinners] = useState(true);

  const [isSpinning, setIsSpinning] = useState(false);
  const [luckyTargetNumber, setLuckyTargetNumber] = useState<number | null>(null);
  const [currentWinner, setCurrentWinner] = useState<CurrentWinnerDisplay | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isClearingSheet, setIsClearingSheet] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'lock' | 'entries'>('lock');

  const isSpinningRef = useRef(isSpinning);
  isSpinningRef.current = isSpinning;

  // Lắng nghe Game Settings Realtime
  useEffect(() => {
    const unsub = subscribeToLuckyGameSettings((s) => {
      setSettings(s);
      setTempMaxNumber(String(s.maxNumber));
    });
    return () => unsub();
  }, []);

  // Lắng nghe Winners Realtime từ Firestore
  useEffect(() => {
    setIsLoadingWinners(true);
    const unsub = subscribeToWinners(
      (data) => {
        setWinners(data);
        setIsLoadingWinners(false);
      },
      () => {
        setIsLoadingWinners(false);
      }
    );
    return () => unsub();
  }, []);

  const isFetchingRef = useRef(false);

  // Tải danh sách người tham gia từ Google Sheet (đã tối ưu tránh load quá tải)
  const loadEntries = useCallback(async (showToast = false, force = false) => {
    if (isSpinningRef.current || isFetchingRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return; // Không fetch khi tab đang ẩn

    isFetchingRef.current = true;
    setIsLoadingEntries(true);
    try {
      const data = await fetchLuckyNumberEntries(force);
      setEntries(data);
      if (showToast) {
        toast.success('Đã cập nhật danh sách!', {
          description: `Hiện có ${data.length} số đã được gửi lên.`,
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

  // Tùy chọn: Tự động làm mới mỗi khi có khách gửi số mới
  const [refreshOnNewEntry, setRefreshOnNewEntry] = useState(true);

  // 1. CHỈ TẢI KHI CỔNG ĐANG MỞ (Cổng đóng tuyệt đối KHÔNG load)
  const prevIsOpenRef = useRef<boolean | null>(null);
  useEffect(() => {
    // Nếu cổng đóng: không tải gì cả
    if (!settings.isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    // Khi cổng chuyển sang MỞ: mới kích hoạt tải dữ liệu từ Google Sheet
    if (prevIsOpenRef.current !== true) {
      prevIsOpenRef.current = true;
      loadEntries(false, true);
    }
  }, [settings.isOpen, loadEntries]);

  // 2. Tự động làm mới mỗi khi có khách gửi số mới (qua tín hiệu Firestore lastEntryAt)
  const prevLastEntryAtRef = useRef<unknown>(null);
  useEffect(() => {
    // Khi cổng đóng hoặc tắt chế độ thì không tự tải
    if (!settings.isOpen || !refreshOnNewEntry) return;

    if (settings.lastEntryAt && settings.lastEntryAt !== prevLastEntryAtRef.current) {
      if (prevLastEntryAtRef.current !== null) {
        // Có khách vừa nhập số thành công -> tải ngay danh sách mới nhất
        loadEntries(false, true);
      }
      prevLastEntryAtRef.current = settings.lastEntryAt;
    }
  }, [settings.lastEntryAt, settings.isOpen, refreshOnNewEntry, loadEntries]);



  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Bật/Tắt Cổng Nhận Số
  const handleToggleGate = async () => {
    const nextState = !settings.isOpen;
    setIsUpdatingSettings(true);
    try {
      await updateLuckyGameSettings({ isOpen: nextState });
      toast.success(
        nextState ? 'ĐÃ MỞ CỔNG NHẬN SỐ!' : 'ĐÃ ĐÓNG CỔNG NHẬN SỐ!',
        {
          description: nextState
            ? `Khán giả có thể gửi con số từ 0 đến ${settings.maxNumber}.`
            : 'Đã chốt danh sách để chuẩn bị mở vali.',
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật Firestore';
      toast.error('Lỗi cập nhật trạng thái cổng', { description: msg });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Lưu số trần maxNumber
  const handleSaveMaxNumber = async () => {
    const val = parseInt(tempMaxNumber, 10);
    if (isNaN(val) || val <= 0) {
      toast.error('Số không hợp lệ', {
        description: 'Vui lòng nhập số nguyên dương (ví dụ: 50, 99, 500).',
      });
      return;
    }

    setIsUpdatingSettings(true);
    try {
      await updateLuckyGameSettings({ maxNumber: val });
      toast.success(`Đã đổi số trần thành: ${val}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu Firestore';
      toast.error('Lỗi lưu cấu hình', { description: msg });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Bắt đầu Xoay Ổ Khoá Vali
  const handleStartSpin = async () => {
    if (isSpinning) return;

    // Tự động đóng cổng nhận số để chốt danh sách
    if (settings.isOpen) {
      try {
        await updateLuckyGameSettings({ isOpen: false });
      } catch {
        //
      }
    }

    // Tải danh sách mới nhất
    setIsLoadingEntries(true);
    let currentEntries = entries;
    try {
      currentEntries = await fetchLuckyNumberEntries();
      setEntries(currentEntries);
    } catch {
      //
    } finally {
      setIsLoadingEntries(false);
    }

    if (currentEntries.length === 0) {
      toast.error('Chưa có con số nào được gửi lên!', {
        description: 'Cần có ít nhất 1 người tham gia để bắt đầu mở khoá vali.',
      });
      return;
    }

    // Random số mật mã vali trong khoảng [0, maxNumber]
    const randomResult = Math.floor(Math.random() * (settings.maxNumber + 1));
    setLuckyTargetNumber(randomResult);
    setIsSpinning(true);
    setShowResultModal(false);
    setActiveTab('lock');
  };

  // Callback khi ổ khoá dừng hẳn tại mật mã
  const handleSpinEnd = async () => {
    setIsSpinning(false);
    if (luckyTargetNumber === null) return;

    // LOGIC CHỈ CÓ TRÚNG HOẶC KHÔNG (Không có gần đúng):
    const exactWinners = entries.filter((entry) => {
      const num = entry.predictedNumber !== undefined ? entry.predictedNumber : 0;
      return num === luckyTargetNumber;
    });

    if (exactWinners.length > 0) {
      // Có người đoán đúng chính xác 100%!
      const bestEntry = exactWinners[0]; // Người gửi sớm nhất trong số những người đoán đúng
      const winnerData: CurrentWinnerDisplay = {
        eventCode: bestEntry.eventCode || bestEntry.code || '',
        tiktokId: bestEntry.tiktokId || bestEntry.tiktok || 'Ẩn danh',
        predictedNumber: luckyTargetNumber,
        luckyNumber: luckyTargetNumber,
        difference: 0,
        round: settings.round || 1,
        prize: 'Mở Khoá Vali Thành Công',
      };

      setCurrentWinner(winnerData);
      setShowResultModal(true);

      if (soundEnabled) {
        soundEffects.playWin();
      }

      // Lưu người thắng vào Firestore collection `winners`
      try {
        await saveLuckyWinnerToFirestore(winnerData);
        toast.success(`Chúc mừng @${winnerData.tiktokId} đã đoán đúng số ${luckyTargetNumber}!`);
      } catch (err) {
        console.error('Lỗi khi lưu người mở khoá vào Firestore:', err);
      }
    } else {
      // KHÔNG CÓ AI ĐOÁN ĐÚNG SỐ NÀY
      setCurrentWinner(null);
      setShowResultModal(true);

      if (soundEnabled) {
        soundEffects.playNoWinner();
      }

      toast.info(`Mật mã là ${luckyTargetNumber}. Tiếc quá kì này chưa có ai đoán đúng!`);
    }

    // Tự động xóa danh sách tạm trên Google Sheet để chuẩn bị vòng tiếp theo
    try {
      setIsClearingSheet(true);
      await clearGoogleSheetEntries();
      setEntries([]);
    } catch (clearErr) {
      console.error('Lỗi xóa Google Sheet:', clearErr);
    } finally {
      setIsClearingSheet(false);
    }
  };

  // Chuẩn bị cho vòng tiếp theo
  const handleResetForNextRound = async () => {
    setShowResultModal(false);
    setCurrentWinner(null);
    setLuckyTargetNumber(null);

    try {
      await updateLuckyGameSettings({
        round: (settings.round || 1) + 1,
        isOpen: false,
      });
      toast.success(`Đã chuẩn bị cho Đợt ${(settings.round || 1) + 1}!`, {
        description: 'Hãy bấm "Mở Cổng Nhận Số" khi bắt đầu nhận số của khán giả.',
      });
    } catch {
      //
    }

    if (entries.length > 0) {
      setIsClearingSheet(true);
      try {
        await clearGoogleSheetEntries();
        setEntries([]);
      } catch {
        //
      } finally {
        setIsClearingSheet(false);
      }
    }
  };

  // Xóa thủ công 1 người mở được vali khỏi Firestore
  const handleDeleteWinner = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lượt này?')) return;
    try {
      await deleteWinnerFromFirestore(id);
      toast.success('Đã xóa');
    } catch {
      toast.error('Lỗi khi xóa');
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-amber-50/70 via-orange-50/40 to-yellow-50/60 text-slate-800 flex flex-col justify-between selection:bg-amber-400 selection:text-amber-950 overflow-x-hidden">
      <Toaster position="top-right" richColors />

      {/* Hiệu ứng 3D Background pastel nhẹ nhàng */}
      <MinigameBackground3D intensity={0.9} variant="light" />

      {/* Header Điều Khiển Top */}
      <header className="relative z-20 border-b border-amber-200/80 bg-white/90 backdrop-blur-md px-4 py-3 sm:px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Về Trang Quản Trị"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-400 text-amber-950">
                  <Tv className="w-4 h-4" />
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <span>MỞ KHOÁ VALI QUÀ TẶNG</span>
                  <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                    ĐỢT #{settings.round}
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Màn hình Host & OBS Livestream • Tương tác mở vali quà tặng
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Đếm số người tham gia & trạng thái cổng */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/70 border border-amber-300 text-xs font-bold text-amber-950">
              <Users className="w-4 h-4 text-amber-700" />
              <span>Đã nhận:</span>
              <span className="font-mono font-black text-amber-900 text-sm">{entries.length} số</span>
              {!settings.isOpen && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-semibold ml-0.5">
                  Cổng đóng
                </span>
              )}
            </div>

            {/* Toggle Tự tải khi khách gửi số mới */}
            <button
              onClick={() => {
                const next = !refreshOnNewEntry;
                setRefreshOnNewEntry(next);
                toast.info(next ? 'Đã BẬT tự động tải khi khách nhập số' : 'Đã TẮT tự động tải (chỉ tải thủ công)');
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                refreshOnNewEntry
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
              title="Tự động tải lại dữ liệu mỗi khi có khách gửi số mới"
            >
              <span className={`w-2 h-2 rounded-full ${refreshOnNewEntry ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="hidden sm:inline">Tải khi khách nhập</span>
            </button>

            {/* Nút bấm làm mới thủ công */}
            <button
              onClick={() => loadEntries(true, true)}
              disabled={isLoadingEntries || isSpinning}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-amber-200 text-xs font-bold transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
              title="Làm mới danh sách số khách gửi ngay bây giờ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEntries ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
              <span className="hidden md:inline">Làm mới</span>
            </button>



            {/* Âm thanh */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-colors shadow-2xs ${
                soundEnabled
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Toàn màn hình OBS */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white hover:bg-amber-50 text-slate-600 hover:text-slate-900 border border-amber-200 transition-colors shadow-2xs"
              title="Toàn màn hình chiếu Live"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Bảng Điều Khiển Host & Ổ Khoá Vali (8 Cột) */}
        <section className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Host Control Panel */}
          <div className="bg-white/95 backdrop-blur-md border-2 border-amber-300 rounded-[28px] p-4 sm:p-5 shadow-lg shadow-amber-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3.5">
              
              {/* Nút Mở / Đóng Cổng */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleGate}
                  disabled={isUpdatingSettings || isSpinning}
                  className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                    settings.isOpen
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                  }`}
                >
                  {settings.isOpen ? (
                    <>
                      <Unlock className="w-4 h-4 animate-bounce" />
                      <span>CỔNG ĐANG MỞ (Nhận số)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>CỔNG ĐANG ĐÓNG (Bấm để mở)</span>
                    </>
                  )}
                </button>

                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {settings.isOpen ? 'Đang nhận số...' : 'Đã khoá sổ'}
                </span>
              </div>

              {/* Cài Đặt Số Trần */}
              <div className="flex items-center gap-1.5 bg-amber-50 p-1 px-2.5 rounded-xl border border-amber-200 text-xs">
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span className="font-bold text-slate-600">Số trần:</span>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={tempMaxNumber}
                  onChange={(e) => setTempMaxNumber(e.target.value)}
                  disabled={isSpinning || settings.isOpen}
                  className="w-14 sm:w-16 px-1.5 py-0.5 bg-white border border-amber-300 rounded-md text-amber-950 font-mono font-black text-center text-xs focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSaveMaxNumber}
                  disabled={
                    isSpinning ||
                    settings.isOpen ||
                    parseInt(tempMaxNumber, 10) === settings.maxNumber
                  }
                  className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-300 hover:bg-amber-400 text-amber-950 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Lưu
                </button>
              </div>

              {/* Nút Xoay Ổ Khoá Vali */}
              <button
                type="button"
                onClick={handleStartSpin}
                disabled={isSpinning}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm sm:text-base uppercase bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {isSpinning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>ĐANG XOAY Ổ KHOÁ...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>XOAY Ổ KHOÁ VALI</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('lock')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  activeTab === 'lock'
                    ? 'bg-amber-300 text-amber-950 shadow-2xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-amber-200/60'
                }`}
              >
                Ổ Khoá Vali
              </button>
              <button
                onClick={() => setActiveTab('entries')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'entries'
                    ? 'bg-amber-300 text-amber-950 shadow-2xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-amber-200/60'
                }`}
              >
                <span>Số Khách Đã Gửi</span>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 text-[10px] font-mono">
                  {entries.length}
                </span>
              </button>
            </div>

            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Đồng bộ Google Sheet</span>
            </div>
          </div>

          {/* Nội dung tab */}
          {activeTab === 'lock' ? (
            <div className="bg-white/95 backdrop-blur-md border-2 border-amber-300 rounded-[32px] p-5 sm:p-8 shadow-xl shadow-amber-500/10 flex flex-col items-center justify-center min-h-[380px]">
              
              <div className="text-center mb-3">
                <span className="text-xs font-black uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  MẬT MÃ MỞ VALI QUÀ TẶNG (0 - {settings.maxNumber})
                </span>
              </div>

              {/* Ổ Khoá Vali Dễ Thương */}
              <LuggageLock
                maxNumber={settings.maxNumber}
                targetNumber={luckyTargetNumber}
                isSpinning={isSpinning}
                onSpinEnd={handleSpinEnd}
                soundEnabled={soundEnabled}
              />

              <div className="mt-5 text-center text-xs text-slate-500 max-w-sm">
                Khi xoay ổ khoá dừng lại, hệ thống sẽ kiểm tra xem có bạn nào chọn đúng con số này để trao quà không nhé!
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md border-2 border-amber-300 rounded-[32px] p-4 sm:p-5 shadow-xl shadow-amber-500/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span>Danh Sách Số Của Khán Giả</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Tự động làm mới mỗi 5 giây
                </span>
              </div>

              <EntryGrid
                entries={entries}
                highlightedIndex={null}
                isSpinning={isSpinning}
              />
            </div>
          )}
        </section>

        {/* Right Column: Bảng Mở Khoá Thành Công (4 Cột) */}
        <section className="lg:col-span-4 h-full">
          <WinnersSidebar
            winners={winners}
            onDeleteWinner={handleDeleteWinner}
            isLoading={isLoadingWinners}
          />
        </section>
      </div>

      {/* Modal Kết Quả (Trúng hoặc Không Trúng) */}
      {showResultModal && (
        <WinnerModal
          winner={currentWinner}
          luckyNumber={luckyTargetNumber ?? undefined}
          onClose={() => setShowResultModal(false)}
          onResetForNextRound={handleResetForNextRound}
          isClearingSheet={isClearingSheet}
        />
      )}

      {/* Footer */}
      <footer className="relative z-20 border-t border-amber-200/80 bg-white/80 px-4 py-2 text-center text-xs text-slate-500">
        Auto Chung Sức - MiniGame Mở Khoá Vali Quà Tặng &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
