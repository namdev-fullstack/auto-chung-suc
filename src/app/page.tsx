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
    <main className="min-h-screen bg-slate-50 py-6 sm:py-12 px-3.5 sm:px-6">
      <div className="max-w-md mx-auto">
        {/* Card Header & Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Hỗ Trợ Sự Kiện Liên Quân Mobile
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Chung Sức Liên Quân
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Hỗ trợ kéo rương siêu tốc, an toàn, đối soát chuyển khoản nhanh chóng
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-5 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Service Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-base font-extrabold text-gray-800 flex items-center gap-1.5">
                  <span>Chọn gói dịch vụ</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Giá ưu đãi
                </span>
              </div>

              {loadingServices ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Spinner className="h-6 w-6 text-blue-600" />
                  <p className="text-sm">Đang tải bảng giá dịch vụ...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm text-center">
                  Hiện chưa có dịch vụ nào đang mở bán. Vui lòng quay lại sau!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {services.map((service, index) => {
                    const isSelected = selectedService === service.id;
                    const isHot = index === 0;

                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service.id)}
                        className={`relative rounded-2xl p-4 border-2 transition-all cursor-pointer select-none flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm shadow-blue-500/15'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <IconCheck className="h-4 w-4 stroke-[3]" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-base sm:text-lg font-bold ${
                                  isSelected ? 'text-blue-900' : 'text-gray-900'
                                }`}
                              >
                                {service.name}
                              </span>
                              {isHot && (
                                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                                  HOT
                                </span>
                              )}
                            </div>
                            <span className="text-xs sm:text-sm text-gray-500">
                              Hỗ trợ nhận rương nhanh chóng
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-lg sm:text-xl font-extrabold ${
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
                className="text-base font-extrabold text-gray-800 flex items-center justify-between mb-2"
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
                  placeholder="Dán mã sự kiện hoặc link vào đây"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium transition-all"
                  required
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                💡 Vào game, sao chép mã mời hoặc liên kết sự kiện chung sức rồi dán vào đây.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || loadingServices || services.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white py-4 px-5 rounded-2xl font-extrabold shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    <span>Đang khởi tạo đơn...</span>
                  </>
                ) : (
                  <>
                    <span>Đặt đơn ngay</span>
                    {currentSelected && (
                      <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-sm font-bold">
                        {currentSelected.price.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Links */}
          <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-around text-sm font-bold text-gray-600">
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
              <IconSearch className="h-4 w-4" />
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
        <div className="mt-4 text-center">
          <p className="text-[11px] text-gray-400">
            Hệ thống hỗ trợ duyệt đơn và thực hiện 24/7 • Đảm bảo an toàn 100%
          </p>
        </div>
      </div>
    </main>
  );
}
