'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { soundEffects } from './soundEffects';
import { KeyRound, Sparkles } from 'lucide-react';

interface LuggageLockProps {
  maxNumber: number;
  targetNumber: number | null;
  isSpinning: boolean;
  onSpinEnd?: () => void;
  soundEnabled?: boolean;
}

const FACE_HEIGHT = 72; // Chiều cao mỗi mặt số (px)
const NUM_FACES = 10; // 0 đến 9
const STEP_ANGLE = 360 / NUM_FACES; // 36 độ
// Bán kính hình trụ r = (h / 2) / tan(18 deg) ≈ 110px
const CYLINDER_RADIUS = Math.round((FACE_HEIGHT / 2) / Math.tan((18 * Math.PI) / 180));

export default function LuggageLock({
  maxNumber,
  targetNumber,
  isSpinning,
  onSpinEnd,
  soundEnabled = true,
}: LuggageLockProps) {
  // Xác định số lượng con lăn dựa trên maxNumber (tối thiểu 2)
  const numDigits = useMemo(() => {
    return Math.max(2, String(maxNumber).length);
  }, [maxNumber]);

  // Tách targetNumber thành từng chữ số
  const targetDigits = useMemo(() => {
    if (targetNumber === null) {
      return Array(numDigits).fill(0);
    }
    const str = String(targetNumber).padStart(numDigits, '0');
    return str.split('').map((ch) => parseInt(ch, 10));
  }, [targetNumber, numDigits]);

  // Góc quay hiện tại của từng con lăn (độ)
  const [rotations, setRotations] = useState<number[]>(() => Array(numDigits).fill(0));
  // Trạng thái dừng của từng con lăn
  const [lockedDials, setLockedDials] = useState<boolean[]>(() => Array(numDigits).fill(true));

  const animFrameRefs = useRef<(number | null)[]>([]);

  // Cập nhật mảng rotations khi numDigits thay đổi
  useEffect(() => {
    setRotations((prev) => {
      if (prev.length === numDigits) return prev;
      return Array(numDigits).fill(0);
    });
    setLockedDials(Array(numDigits).fill(true));
  }, [numDigits]);

  // Quản lý việc bật tắt âm thanh
  useEffect(() => {
    soundEffects.enabled = soundEnabled;
  }, [soundEnabled]);

  // Xử lý hiệu ứng quay ổ khoá
  useEffect(() => {
    if (!isSpinning) return;

    setLockedDials(Array(numDigits).fill(false));

    let completedDials = 0;

    targetDigits.forEach((digit, dialIndex) => {
      const baseSpinTime = 2800 + dialIndex * 800; // ms
      const startTime = performance.now();
      const initialRotation = rotations[dialIndex] || 0;

      const extraSpins = 6 + dialIndex * 2;
      const targetAngle =
        initialRotation - (extraSpins * 360 + digit * STEP_ANGLE + (initialRotation % 360));

      let lastTickAngle = initialRotation;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / baseSpinTime, 1);

        // Easing mượt mà
        const easeOut = 1 - Math.pow(1 - progress, 3.6);
        const currentRotation = initialRotation + (targetAngle - initialRotation) * easeOut;

        const deltaAngle = Math.abs(currentRotation - lastTickAngle);
        if (deltaAngle >= STEP_ANGLE) {
          if (soundEnabled) {
            soundEffects.playTick(550 + dialIndex * 90);
          }
          lastTickAngle = currentRotation;
        }

        setRotations((prev) => {
          const next = [...prev];
          next[dialIndex] = currentRotation;
          return next;
        });

        if (progress < 1) {
          animFrameRefs.current[dialIndex] = requestAnimationFrame(animate);
        } else {
          setRotations((prev) => {
            const next = [...prev];
            next[dialIndex] = targetAngle;
            return next;
          });

          setLockedDials((prev) => {
            const next = [...prev];
            next[dialIndex] = true;
            return next;
          });

          if (soundEnabled) {
            soundEffects.playLockClick();
          }

          completedDials++;
          if (completedDials === numDigits) {
            if (onSpinEnd) {
              setTimeout(() => {
                onSpinEnd();
              }, 300);
            }
          }
        }
      };

      animFrameRefs.current[dialIndex] = requestAnimationFrame(animate);
    });

    return () => {
      animFrameRefs.current.forEach((ref) => {
        if (ref) cancelAnimationFrame(ref);
      });
    };
  }, [isSpinning, targetDigits, numDigits, soundEnabled, onSpinEnd]);

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      {/* Quai Xách Chiếc Vali Du Lịch Dễ Thương (Cute Luggage Handle) */}
      <div className="w-28 sm:w-36 h-7 sm:h-9 bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-2xl border-3 border-b-0 border-amber-600/70 shadow-sm flex items-center justify-center -mb-1 z-0">
        <div className="w-16 sm:w-20 h-3 bg-amber-100/90 rounded-full" />
      </div>

      {/* Thân Vali Du Lịch Xinh Xắn (Vali Body) */}
      <div className="relative z-10 rounded-[32px] p-5 sm:p-7 bg-gradient-to-b from-amber-100 via-amber-50 to-orange-100 border-4 border-amber-400 shadow-xl shadow-amber-500/15 max-w-full">
        
        {/* Nút đinh tán bo tròn màu mật ong 4 góc */}
        <div className="absolute top-3.5 left-3.5 w-3 h-3 rounded-full bg-amber-300 border border-amber-500/50" />
        <div className="absolute top-3.5 right-3.5 w-3 h-3 rounded-full bg-amber-300 border border-amber-500/50" />
        <div className="absolute bottom-3.5 left-3.5 w-3 h-3 rounded-full bg-amber-300 border border-amber-500/50" />
        <div className="absolute bottom-3.5 right-3.5 w-3 h-3 rounded-full bg-amber-300 border border-amber-500/50" />

        {/* Thanh tiêu đề chiếc vali */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-amber-200">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-xl bg-amber-300/80 text-amber-900">
              <KeyRound className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-black tracking-wide text-amber-950">
              Ổ KHOÁ VALI QUÀ TẶNG
            </span>
          </div>
          <div className="text-[11px] sm:text-xs font-black text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
            Giới hạn: 0 đến {maxNumber}
          </div>
        </div>

        {/* Khoang Chứa Con Lăn Số (Dials Chamber) */}
        <div className="relative flex items-center justify-center gap-3 sm:gap-5 px-5 py-5 bg-white rounded-2xl border-2 border-amber-200 shadow-inner overflow-hidden">
          
          {/* Khung Ngắm Căn Mật Mã Ở Giữa (Cute Viewfinder / Indicator) */}
          <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-14 sm:h-16 rounded-xl border-2 border-amber-400 bg-amber-300/15 pointer-events-none z-30 flex items-center justify-between px-1.5 shadow-xs">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-xs" />
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-xs" />
          </div>

          {/* Bóng mờ 3D trên & dưới con lăn */}
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-slate-200/90 via-slate-100/50 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-200/90 via-slate-100/50 to-transparent z-20 pointer-events-none" />

          {/* Render từng con lăn số */}
          {Array.from({ length: numDigits }).map((_, dialIdx) => {
            const rot = rotations[dialIdx] || 0;
            const isLocked = lockedDials[dialIdx];

            return (
              <div
                key={dialIdx}
                className="relative flex flex-col items-center"
                style={{
                  perspective: '1200px',
                }}
              >
                {/* Khe con lăn */}
                <div
                  className="relative w-16 sm:w-20 md:w-24 h-32 sm:h-40 flex items-center justify-center rounded-xl bg-gradient-to-b from-slate-100 via-amber-50/50 to-slate-100 border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Trục quay 3D */}
                  <div
                    className="relative w-full h-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateX(${rot}deg)`,
                      transition: isSpinning
                        ? 'none'
                        : 'transform 0.35s cubic-bezier(0.15, 0.9, 0.2, 1)',
                    }}
                  >
                    {/* 10 Mặt Số Từ 0 Đến 9 */}
                    {Array.from({ length: NUM_FACES }).map((_, faceNum) => {
                      const faceAngle = faceNum * STEP_ANGLE;

                      return (
                        <div
                          key={faceNum}
                          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center font-black font-mono text-3xl sm:text-4xl text-slate-900 select-none"
                          style={{
                            height: `${FACE_HEIGHT}px`,
                            transform: `rotateX(${faceAngle}deg) translateZ(${CYLINDER_RADIUS}px)`,
                            backfaceVisibility: 'hidden',
                          }}
                        >
                          <span
                            className={`transition-all duration-200 ${
                              isLocked
                                ? 'text-amber-800 scale-105'
                                : 'text-slate-700'
                            }`}
                          >
                            {faceNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Gradient cong nhẹ */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-300/40 via-transparent to-slate-300/40 pointer-events-none z-10" />
                </div>

                {/* Nhãn hàng vị trí */}
                <div className="mt-2 text-[10px] sm:text-xs font-black text-amber-800 uppercase tracking-wide">
                  {numDigits === 2
                    ? dialIdx === 0
                      ? 'Hàng chục'
                      : 'Hàng đơn vị'
                    : dialIdx === 0
                    ? 'Hàng trăm'
                    : dialIdx === 1
                    ? 'Hàng chục'
                    : 'Hàng đơn vị'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chân đáy vali: Trạng thái */}
        <div className="mt-3.5 pt-2.5 flex items-center justify-between border-t border-amber-200 text-xs text-amber-900 font-bold">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpinning
                  ? 'bg-amber-500 animate-ping'
                  : targetNumber !== null
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              {isSpinning
                ? 'Đang xoay mở ổ khoá...'
                : targetNumber !== null
                ? `Mật mã mở vali: ${targetNumber}`
                : 'Sẵn sàng mở khoá'}
            </span>
          </div>

          <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Chung Sức MiniGame</span>
          </div>
        </div>
      </div>
    </div>
  );
}
