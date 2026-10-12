'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/lib/orders';
import { getActiveServices } from '@/lib/services';
import { Service } from '@/types/database';
import { IconCheck, IconSearch, Spinner } from '@/components/Icons';

export default function Home() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveServices();
        setServices(data);
        if (data.length > 0) {
          setSelectedService(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError('Không tải được danh sách dịch vụ');
      } finally {
        setLoadingServices(false);
      }
    };

    load();
  }, []);

  const currentSelected = services.find((s) => s.id === selectedService);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = eventCode.trim();
    if (!cleanCode) {
      setError('Vui lòng nhập mã sự kiện hoặc dán link sự kiện');
      return;
    }

    if (!selectedService || !currentSelected) {
      setError('Vui lòng chọn một gói dịch vụ');
      return;
    }

    setLoading(true);

    try {
      const order = await createOrder({
        eventCode: cleanCode,
        serviceType: selectedService,
        amount: currentSelected.price,
      });

      const existingOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
      existingOrders.unshift({
        id: order.id,
        trackingToken: order.trackingToken,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('myOrders', JSON.stringify(existingOrders));

      localStorage.setItem('orderId', order.id);
      localStorage.setItem('trackingToken', order.trackingToken);

      // Chuyển sang trang theo dõi và kích hoạt mở modal thanh toán ngay
      router.push(`/track/${order.id}?pay=1`);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi tạo đơn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-5 sm:py-10 px-3 sm:px-6">
      <div className="max-w-md mx-auto">
        {/* Card Header & Brand */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[11px] sm:text-xs font-semibold mb-2.5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Hệ Thống Tương Tác Sự Kiện LQ
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Auto Chung Sức - TachiOni
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Hỗ trợ trao đổi liên kết, hoàn thành mốc sự kiện siêu tốc & tự động 24/7
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm sm:text-base font-extrabold text-gray-800 flex items-center gap-1">
                  <span>Chọn gói hỗ trợ mốc</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                  Tự động 24/7
                </span>
              </div>

              {loadingServices ? (
                <div className="py-6 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Spinner className="h-6 w-6 text-blue-600" />
                  <p className="text-xs sm:text-sm">Đang tải danh sách mốc hỗ trợ...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs sm:text-sm text-center">
                  Hiện chưa có dịch vụ nào đang mở. Vui lòng quay lại sau!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {services.map((service, index) => {
                    const isSelected = selectedService === service.id;
                    const isHot = index === 0;

                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service.id)}
                        className={`relative rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <IconCheck className="h-3 w-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-sm sm:text-base font-bold leading-tight ${
                                  isSelected ? 'text-blue-900' : 'text-gray-900'
                                }`}
                              >
                                {service.name}
                              </span>
                              {isHot && (
                                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0">
                                  HOT
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs text-gray-500 block truncate mt-0.5">
                              Hỗ trợ hoàn thành mốc tương tác
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm sm:text-base font-extrabold whitespace-nowrap ${
                              isSelected ? 'text-blue-600' : 'text-gray-900'
                            }`}
                          >
                            {service.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event Code Input */}
            <div>
              <label
                htmlFor="eventCode"
                className="text-sm sm:text-base font-extrabold text-gray-800 flex items-center justify-between mb-1.5"
              >
                <span>Mã hoặc link sự kiện</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="eventCode"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  placeholder="Dán mã sự kiện hoặc liên kết vào đây"
                  className="w-full px-3.5 py-3 sm:py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base font-medium transition-all"
                  required
                />
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 leading-relaxed">
                💡 Sao chép mã chia sẻ hoặc liên kết sự kiện từ trang nhiệm vụ rồi dán vào đây.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || loadingServices || services.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl font-extrabold shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    <span>Đang khởi tạo đơn...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận đặt đơn</span>
                    {currentSelected && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap">
                        {currentSelected.price.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Links */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-around text-xs sm:text-sm font-bold text-gray-600">
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
        <div className="mt-3.5 text-center">
          <p className="text-[11px] text-gray-400">
            Hệ thống hỗ trợ trao đổi tương tác 24/7 • Đảm bảo an toàn 100%
          </p>
        </div>
      </div>
    </main>
  );
}
