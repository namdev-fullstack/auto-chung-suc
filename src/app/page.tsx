'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createOrder } from '@/lib/orders';
import {
  getActiveServices,
  getCachedServicesSync,
} from '@/lib/services';
import { CONTACT_CONFIG, EVENT_CODE_CONFIG, extractEventCode, PRIORITY_ORDER_FEE } from '@/config/constants';
import { Service } from '@/types/database';
import { IconCheck, IconFacebook, IconSearch, IconZalo, Spinner } from '@/components/Icons';
import ParticleBackground from '@/components/ParticleBackground';
import FloatingMinigameIcon from '@/components/minigame/FloatingMinigameIcon';

const VideoGuideModal = dynamic(() => import('@/components/VideoGuideModal'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [inputError, setInputError] = useState('');
  // Khởi tạo dịch vụ ngay từ cache hoặc default để tránh đơ/chậm khi vào hoặc back lại trang trên mobile
  const [services, setServices] = useState<Service[]>(() => getCachedServicesSync());
  const [selectedService, setSelectedService] = useState<string>(() => {
    const initial = getCachedServicesSync();
    return initial[0]?.id || 'FULL_3_RUONG';
  });
  const [isPriority, setIsPriority] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState('');
  const [isVideoGuideOpen, setIsVideoGuideOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Reset trạng thái loading nếu trình duyệt khôi phục từ bfcache (Back/Forward Cache) trên di động
    const handlePageShow = () => {
      setLoading(false);
      const cached = getCachedServicesSync();
      if (cached.length > 0) {
        setServices(cached);
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    const loadFreshServices = async () => {
      try {
        const data = await getActiveServices({ timeoutMs: 3500 });
        if (!isMounted) return;
        if (data.length > 0) {
          setServices(data);
          setSelectedService((prev) => (data.some((s) => s.id === prev) ? prev : data[0].id));
        }
      } catch (err) {
        console.warn('Lỗi cập nhật danh sách dịch vụ:', err);
      } finally {
        if (isMounted) {
          setLoadingServices(false);
        }
      }
    };

    loadFreshServices();

    return () => {
      isMounted = false;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const currentSelected = services.find((s) => s.id === selectedService) || services[0];
  const basePrice = currentSelected ? currentSelected.price : 0;
  const priorityFee = isPriority ? PRIORITY_ORDER_FEE : 0;
  const totalAmount = basePrice + priorityFee;

  // Trích xuất mã hiển thị xem trước real-time dùng useMemo tránh tính lại khi re-render
  const extractedResult = useMemo(() => {
    return eventCode.trim() ? extractEventCode(eventCode) : null;
  }, [eventCode]);

  const handleEventCodeChange = (value: string) => {
    setEventCode(value);
    if (inputError) {
      setInputError('');
    }
  };

  const getServiceBadgeInfo = (service: Service, index: number) => {
    // Giá fake / niêm yết: nếu DB có thì dùng, nếu chưa có thì tính giá niêm yết ~35% cao hơn để kích cầu
    const fakePrice =
      service.originalPrice && service.originalPrice > service.price
        ? service.originalPrice
        : Math.round((service.price * 1.35) / 1000) * 1000;

    const discountPercent = Math.max(
      10,
      Math.min(70, Math.round(((fakePrice - service.price) / fakePrice) * 100))
    );

    let tagText = `GIẢM ${discountPercent}%`;
    let isSpecial = false;

    if (index === 0 || service.id === 'FULL_3_RUONG') {
      tagText = '👑 Chọn Nhiều';
      isSpecial = true;
    } else if (index === 1 || service.id === 'RUONG_SS') {
      tagText = '🔥 SIÊU HOT';
      isSpecial = true;
    } else if (index === 2 || service.id === 'RUONG_S_PLUS_PLUS') {
      tagText = '⭐ TIẾT KIỆM';
    } else {
      tagText = '🎯 TIẾT KIỆM';
    }

    return {
      fakePrice,
      discountPercent,
      tagText,
      isSpecial,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setInputError('');

    // Kiểm tra và trích xuất mã tự động từ tin nhắn chia sẻ hoặc link
    const codeResult = extractEventCode(eventCode);
    if (!codeResult.isValid) {
      setInputError(codeResult.error || 'Vui lòng nhập mã sự kiện hợp lệ');
      return;
    }

    if (!selectedService || !currentSelected) {
      setError('Vui lòng chọn một gói dịch vụ');
      return;
    }

    setLoading(true);

    try {
      // Lưu đúng mã đã làm sạch (ví dụ: PwN8JZ5gWH) vào cơ sở dữ liệu
      const order = await createOrder({
        eventCode: codeResult.cleanCode,
        serviceType: selectedService,
        amount: totalAmount,
        isPriority,
        priorityFee,
      });

      const existingOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
      existingOrders.unshift({
        id: order.id,
        trackingToken: order.trackingToken,
        createdAt: new Date().toISOString(),
        isPriority,
        amount: totalAmount,
      });
      localStorage.setItem('myOrders', JSON.stringify(existingOrders));

      localStorage.setItem('orderId', order.id);
      localStorage.setItem('trackingToken', order.trackingToken);

      // Chuyển sang trang theo dõi và kích hoạt mở modal thanh toán ngay
      router.push(`/track/${order.id}?pay=1`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi tạo đơn';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-blue-50/40 py-4 sm:py-9 px-3.5 sm:px-6 overflow-hidden flex flex-col justify-center">
      {/* Hiệu ứng hạt ánh sáng tương tác mượt mà trên desktop */}
      <ParticleBackground />

      {/* Ánh sáng nền công nghệ nhẹ nhàng (CSS radial gradient thuần, không filter blur tốn GPU) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] sm:w-[500px] h-[360px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,rgba(147,197,253,0.05)_45%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-md mx-auto w-full">
        {/* Card Header & Brand */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
            Auto Chung Sức - TachiOni
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Hỗ trợ trao đổi liên kết, hoàn thành mốc sự kiện siêu tốc & tự động 24/7
          </p>
        </div>

        {/* Form Container (bỏ backdrop-blur-sm để cuộn và gõ siêu mượt 120fps trên iOS) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-4 sm:p-6 transition-all">
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Service Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-extrabold text-gray-800 flex items-center gap-1">
                  <span>Chọn gói hỗ trợ mốc</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80 shrink-0 inline-flex items-center gap-1">
                  <span>⚡</span>
                  <span>Siêu tốc 5-15p</span>
                </span>
              </div>

              {loadingServices && services.length === 0 ? (
                <div className="py-7 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Spinner className="h-6 w-6 text-blue-600" />
                  <p className="text-xs font-medium">Đang tải danh sách mốc hỗ trợ...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs text-center">
                  Hiện chưa có dịch vụ nào đang mở. Vui lòng quay lại sau!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                  {services.map((service, index) => {
                    const isSelected = selectedService === service.id;
                    const { fakePrice, discountPercent, tagText, isSpecial } =
                      getServiceBadgeInfo(service, index);

                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service.id)}
                        className={`relative rounded-xl p-2.5 sm:p-3 border-2 transition-all duration-150 cursor-pointer select-none flex items-center justify-between gap-2 active:scale-[0.985] ${
                          isSelected
                            ? 'border-blue-600 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Radio Check Indicator */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <IconCheck className="h-3 w-3 stroke-[3]" />}
                          </div>

                          {/* Info Column */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-sm sm:text-base font-extrabold leading-snug ${
                                  isSelected ? 'text-blue-950' : 'text-gray-900'
                                }`}
                              >
                                {service.name}
                              </span>

                              {/* Sale / Recommendation Badge */}
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  isSpecial
                                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-2xs'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {tagText}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-gray-500 block truncate">
                                Trọn gói hoàn thành mốc
                              </span>
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200/80 px-1 py-0.2 rounded shrink-0">
                                -{discountPercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price Column (Real & Fake Price) */}
                        <div className="text-right shrink-0">
                          {/* Fake Price (Gạch ngang tạo cảm giác giảm giá) */}
                          <div className="text-[11px] text-gray-400 line-through font-medium leading-none mb-0.5">
                            {fakePrice.toLocaleString('vi-VN')}đ
                          </div>

                          {/* Real Price */}
                          <div
                            className={`text-sm sm:text-base font-black whitespace-nowrap leading-tight ${
                              isSelected ? 'text-blue-600' : 'text-gray-900'
                            }`}
                          >
                            {service.price.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event Code Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="eventCode"
                  className="text-xs sm:text-sm font-extrabold text-gray-800 flex items-center gap-0.5"
                >
                  <span>Mã Sk chung sức</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsVideoGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 px-2.5 py-0.5 rounded-lg border border-blue-200/80 transition-all cursor-pointer shadow-2xs"
                  title="Xem video hướng dẫn cách lấy mã sự kiện"
                >
                  <span>▶️</span>
                  <span>Hướng dẫn lấy mã</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="eventCode"
                  value={eventCode}
                  onChange={(e) => handleEventCodeChange(e.target.value)}
                  placeholder="Dán mã hoặc lời mời sự kiện vào đây"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={`w-full px-3.5 py-3 bg-slate-50 border rounded-xl focus:bg-white text-sm font-medium transition-all ${
                    inputError
                      ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Thông báo lỗi hoặc mã đã nhận diện ngay góc trái phía dưới input */}
              {inputError ? (
                <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1 text-left animate-in fade-in duration-150">
                  <span>⚠️</span>
                  <span>{inputError}</span>
                </p>
              ) : extractedResult?.isValid ? (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1.5 text-left">
                  <span>✓</span>
                  <span>
                    Đã nhận diện mã: <strong className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800">{extractedResult.cleanCode}</strong>
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed text-left">
                  💡 Dán mã hoặc toàn bộ tin nhắn chia sẻ từ trong sự kiện, hệ thống sẽ tự động lọc đúng {EVENT_CODE_CONFIG.REQUIRED_LENGTH} ký tự mã.
                </p>
              )}
            </div>

            {/* Đơn ưu tiên làm trước (+19k) */}
            <div
              onClick={() => setIsPriority(!isPriority)}
              className={`relative rounded-2xl p-3 sm:p-3.5 border-2 cursor-pointer select-none transition-all duration-200 ${
                isPriority
                  ? 'border-amber-500 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 shadow-xs ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/20'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  {/* Icon Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isPriority
                        ? 'border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isPriority && <IconCheck className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-1">
                        <span>⚡</span>
                        <span>Đơn ưu tiên làm trước</span>
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs shrink-0">
                        +19.000đ
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 leading-relaxed">
                      Đơn hàng được gắn cờ ưu tiên hàng đầu, nhân viên tiếp nhận & hoàn thành trước các đơn thường.
                    </p>
                  </div>
                </div>

                {/* Animated Switch Pill */}
                <div className="shrink-0 flex items-center">
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                      isPriority ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        isPriority ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message chung */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-0.5">
              <button
                type="submit"
                disabled={loading || services.length === 0}
                className="group relative overflow-hidden w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3.5 px-4 rounded-xl font-black shadow-lg shadow-blue-500/30 active:scale-[0.985] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {/* Hiệu ứng quét sáng lướt qua nút bấm */}
                <span
                  className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none"
                  aria-hidden="true"
                />

                {loading ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    <span>Đang khởi tạo đơn...</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span>Xác nhận đặt đơn</span>
                      {isPriority && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded text-[11px] font-black shadow-2xs">
                          <span>⚡</span>
                          <span>Ưu tiên</span>
                        </span>
                      )}
                    </span>
                    {currentSelected && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        {totalAmount.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Support Divider */}
            <div className="relative py-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-slate-500 font-semibold text-[11px] sm:text-xs">
                  Cần hỗ trợ gấp? Liên hệ ngay
                </span>
              </div>
            </div>

            {/* 2 Contact Buttons: Zalo & Facebook */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {/* Zalo Button */}
              <a
                href={CONTACT_CONFIG.ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
              >
                <IconZalo className="w-5 h-5 shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-extrabold">Chat Zalo</div>
                  <div className="text-[10px] text-blue-600/80 font-medium">
                    {CONTACT_CONFIG.ZALO_PHONE}
                  </div>
                </div>
              </a>

              {/* Facebook Button */}
              <a
                href={CONTACT_CONFIG.FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
              >
                <div className="w-5 h-5 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0 p-1">
                  <IconFacebook className="w-full h-full" />
                </div>
                <div className="text-left leading-tight">
                  <div className="font-extrabold">Facebook</div>
                  <div className="text-[10px] text-indigo-600/80 font-medium">namdev1029</div>
                </div>
              </a>
            </div>
          </form>

          {/* Quick Links */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-around text-xs font-bold text-gray-600">
            <button
              type="button"
              onClick={() => {
                const orderId = localStorage.getItem('orderId');
                if (orderId) {
                  router.push(`/track/${orderId}`);
                } else {
                  router.push('/track');
                }
              }}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors p-1"
            >
              <IconSearch className="h-4 w-4 shrink-0" />
              <span>Tra cứu đơn hàng</span>
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => router.push('/my-orders')}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors p-1"
            >
              <span>Đơn hàng của tôi</span>
            </button>
          </div>
        </div>

        {/* Mobile Safe Notice */}
        <div className="mt-3 text-center">
          <p className="text-[11px] text-gray-400">
            Hệ thống hỗ trợ trao đổi tương tác 24/7 • Đảm bảo an toàn 100%
          </p>
        </div>
      </div>

      {/* Floating Minigame Rotating Icon */}
      <FloatingMinigameIcon />

      {/* Modal Hướng dẫn lấy mã qua Video (chỉ nạp khi khách bấm xem) */}
      {isVideoGuideOpen && (
        <VideoGuideModal
          isOpen={isVideoGuideOpen}
          onClose={() => setIsVideoGuideOpen(false)}
        />
      )}
    </main>
  );
}
