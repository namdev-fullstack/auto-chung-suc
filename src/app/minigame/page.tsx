'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { extractEventCode } from '@/config/constants';
import {
  submitLuckyNumberEntry,
  subscribeToLuckyGameSettings,
  notifyMinigameEntryAdded,
} from '@/lib/minigame';
import { LuckyNumberGameSettings } from '@/types/minigame';
import MinigameBackground3D from '@/components/minigame/MinigameBackground3D';
import {
  Sparkles,
  AtSign,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Radio,
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';

export default function MinigamePage() {
  const [eventCode, setEventCode] = useState('');
  const [tiktokId, setTiktokId] = useState('');
  const [predictedNumber, setPredictedNumber] = useState<string>('');
  const [inputError, setInputError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{
    code: string;
    tiktok: string;
    number: number;
  } | null>(null);

  // Trạng thái cấu hình game realtime từ Firestore
  const [gameSettings, setGameSettings] = useState<LuckyNumberGameSettings>({
    isOpen: false,
    maxNumber: 99,
    round: 1,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToLuckyGameSettings(
      (settings) => {
        setGameSettings(settings);
        setIsLoadingSettings(false);
      },
      (err) => {
        console.error('Lỗi kết nối Firestore game_settings:', err);
        setIsLoadingSettings(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const isOpen = gameSettings.isOpen;
  const maxNumber = gameSettings.maxNumber;
  const round = gameSettings.round;

  const codeResult = eventCode.trim() ? extractEventCode(eventCode) : null;

  const handleEventCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setEventCode(val);
    if (inputError) setInputError('');
  };

  const handleTiktokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/^@+/, '').trim();
    setTiktokId(clean);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setPredictedNumber('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num < 0) {
        setPredictedNumber('0');
      } else if (num > maxNumber) {
        setPredictedNumber(String(maxNumber));
      } else {
        setPredictedNumber(String(num));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setInputError('');

    if (!isOpen) {
      toast.error('Cổng nhận mật mã đang đóng!', {
        description: 'Vui lòng theo dõi livestream, Host sẽ mở cổng đợt tiếp theo.',
      });
      return;
    }

    const result = extractEventCode(eventCode);
    if (!result.isValid) {
      setInputError(result.error || 'Vui lòng nhập mã sự kiện hợp lệ');
      toast.error('Mã sự kiện chưa đúng', {
        description: result.error || 'Vui lòng kiểm tra lại mã sự kiện đã nhập.',
      });
      return;
    }

    const cleanTikTok = tiktokId.trim().replace(/^@+/, '');
    if (!cleanTikTok) {
      toast.error('Thiếu TikTok ID', {
        description: 'Vui lòng nhập TikTok ID để MC gọi tên bạn khi mở trúng vali nhé!',
      });
      return;
    }

    if (predictedNumber === '') {
      toast.error('Chưa chọn con số của bạn', {
        description: `Vui lòng nhập con số bạn chọn từ 0 đến ${maxNumber}!`,
      });
      return;
    }

    const numVal = parseInt(predictedNumber, 10);
    if (isNaN(numVal) || numVal < 0 || numVal > maxNumber) {
      toast.error('Số không hợp lệ', {
        description: `Con số phải nằm trong khoảng từ 0 đến ${maxNumber}.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitLuckyNumberEntry(result.cleanCode, cleanTikTok, numVal);

      if (res.success) {
        // Bắn tín hiệu để màn hình Admin tự động nhận dữ liệu mới nếu đang mở cổng
        notifyMinigameEntryAdded();

        toast.success(`Đã ghi nhận con số ${numVal} của bạn!`, {
          description: `@${cleanTikTok} đã sẵn sàng mở vali cùng Host trên Live!`,
          duration: 5000,
        });


        setLastSubmitted({
          code: result.cleanCode,
          tiktok: cleanTikTok,
          number: numVal,
        });

        setEventCode('');
        setTiktokId('');
        setPredictedNumber('');
        setInputError('');
      } else if (res.duplicate) {
        toast.error('Mã sự kiện này đã được ghi nhận!', {
          description: res.message || 'Mỗi mã sự kiện chỉ được gửi một lần trong mỗi đợt mở vali.',
          duration: 5000,
        });
      } else {
        toast.error('Không thể gửi thông tin', {
          description: res.message || 'Đã có lỗi xảy ra khi kết nối đến hệ thống.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống';
      toast.error('Lỗi kết nối', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-amber-100/60 via-orange-50/40 to-yellow-100/70 text-slate-800 flex flex-col justify-between py-5 px-4 overflow-hidden selection:bg-amber-400 selection:text-amber-950">
      {/* Toast notifications */}
      <Toaster position="top-center" richColors />

      {/* Hiệu ứng 3D Background */}
      <MinigameBackground3D intensity={1.0} variant="light" />

      {/* Quầng sáng nhẹ nhàng */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-gradient-to-tr from-amber-200/40 via-orange-100/30 to-yellow-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Top */}
      <header className="relative z-10 max-w-md mx-auto w-full flex items-center justify-between pb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-amber-700 transition-colors bg-white/90 hover:bg-white px-3 py-1.5 rounded-2xl border border-amber-200 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-amber-600" />
          <span>Trang Chủ</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-200/80 px-3 py-1.5 rounded-full border border-amber-300">
          <Radio className="w-3.5 h-3.5 text-amber-600" />
          <span>MINIGAME LIVESTREAM</span>
        </div>
      </header>

      {/* Main Content Card */}
      <div className="relative z-10 max-w-md mx-auto w-full my-auto">
        {/* Header Chiếc Vali Xinh Xắn */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-md shadow-amber-400/20 mb-2.5">
            <KeyRound className="w-7 h-7 text-white drop-shadow-xs" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            <span>MỞ KHOÁ VALI QUÀ</span>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
            Chọn con số may mắn của bạn • Đợt #{round}
          </p>

          {/* Badge Trạng Thái Nhận Số */}
          <div className="mt-2.5 flex items-center justify-center">
            {isLoadingSettings ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 animate-pulse border border-slate-200">
                <span>Đang kiểm tra trạng thái cổng...</span>
              </span>
            ) : isOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-xs">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>ĐANG MỞ CỔNG NHẬN SỐ (0 đến {maxNumber})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Đang tạm đóng - Chờ Host mở đợt tiếp theo</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Form Chính */}
        <div className="bg-white/95 backdrop-blur-md rounded-[32px] border-2 border-amber-300 shadow-xl shadow-amber-500/10 p-5 sm:p-7 relative overflow-hidden">
          
          {!isOpen && !isLoadingSettings && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cổng nhận số hiện đang đóng. Bạn hãy đón xem trên livestream để bấm gửi ngay khi Host mở lại nhé!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* FOCUS MẠNH NHẤT: KHU VỰC CHỌN SỐ CỦA KHÁCH */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/90 text-center">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="predictedNumber"
                  className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1"
                >
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>CON SỐ BẠN CHỌN ĐỂ MỞ VALI</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded-md">
                  0 đến {maxNumber}
                </span>
              </div>

              {/* Ô Nhập Số To Bản Rực Rỡ */}
              <div className="relative mt-2">
                <input
                  id="predictedNumber"
                  type="number"
                  min={0}
                  max={maxNumber}
                  value={predictedNumber}
                  onChange={handleNumberChange}
                  placeholder={`0 - ${maxNumber}`}
                  disabled={!isOpen || isSubmitting}
                  className="w-full py-3 sm:py-3.5 rounded-2xl bg-white border-2 border-amber-300 text-amber-900 font-mono font-black text-3xl sm:text-4xl text-center placeholder:text-slate-300 placeholder:text-2xl placeholder:font-normal focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-400/20 shadow-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {predictedNumber !== '' && (
                <div className="mt-2 text-xs font-bold text-amber-800 flex items-center justify-center gap-1">
                  <span>Con số may mắn của bạn: </span>
                  <span className="font-mono font-black text-base text-amber-950 bg-amber-200 px-2 py-0.2 rounded-md">
                    {predictedNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Field 2: Mã sự kiện */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="eventCode"
                  className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1"
                >
                  <span>Mã sự kiện Chung Sức</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                {codeResult && codeResult.isValid && (
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{codeResult.cleanCode}</span>
                  </span>
                )}
              </div>

              <input
                id="eventCode"
                type="text"
                value={eventCode}
                onChange={handleEventCodeChange}
                placeholder="Dán mã hoặc link mời (VD: PwN8JZ5gWH)"
                disabled={!isOpen || isSubmitting}
                className={`w-full px-4 py-2.5 sm:py-3 rounded-2xl bg-white border-2 text-slate-900 font-mono text-sm sm:text-base font-bold placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed ${
                  inputError
                    ? 'border-red-400 ring-2 ring-red-400/20'
                    : codeResult?.isValid
                    ? 'border-emerald-400 focus:border-amber-500'
                    : 'border-slate-200 focus:border-amber-400'
                }`}
                autoComplete="off"
              />

              {inputError ? (
                <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{inputError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Hệ thống tự động nhận diện mã từ tin nhắn chia sẻ</span>
                </p>
              )}
            </div>

            {/* Field 3: TikTok ID */}
            <div>
              <label
                htmlFor="tiktokId"
                className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1 mb-1"
              >
                <span>TikTok ID của bạn</span>
                <span className="text-red-500 font-bold">*</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  id="tiktokId"
                  type="text"
                  value={tiktokId}
                  onChange={handleTiktokChange}
                  placeholder="username_tiktok (không cần gõ @)"
                  disabled={!isOpen || isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 font-bold text-sm sm:text-base placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-amber-400 transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Nút gửi */}
            <button
              type="submit"
              disabled={
                !isOpen ||
                isSubmitting ||
                !eventCode.trim() ||
                !tiktokId.trim() ||
                predictedNumber === ''
              }
              className="w-full mt-2 py-3.5 px-5 rounded-2xl font-black text-base bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>ĐANG GỬI CON SỐ...</span>
                </>
              ) : !isOpen ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>CỔNG NHẬN SỐ ĐANG ĐÓNG</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>GỬI CON SỐ MỞ VALI</span>
                </>
              )}
            </button>
          </form>

          {/* Thẻ ghi nhận vừa gửi thành công - Focus vào số đã chọn */}
          {lastSubmitted && (
            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-black text-emerald-900">Đã ghi nhận con số của bạn!</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-slate-700 font-medium">
                <span>Số của bạn: <strong className="font-mono text-base text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">{lastSubmitted.number}</strong></span>
                <span>TikTok: <strong className="text-emerald-800">@{lastSubmitted.tiktok}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Cam kết minh bạch */}
        <div className="text-center mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Danh sách được cập nhật trực tiếp trên màn hình Livestream</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 py-2">
        Auto Chung Sức - MiniGame Mở Khoá Vali &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
