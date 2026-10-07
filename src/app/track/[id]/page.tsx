'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { subscribeToOrder } from '@/lib/orders';
import { getServiceById } from '@/lib/services';
import { Order, Service } from '@/types/database';
import { PAYMENT_STATUS_BADGES, PAYMENT_STATUS_LABELS } from '@/config/constants';
import CopyButton from '@/components/CopyButton';
import PaymentModal from '@/components/PaymentModal';
import Toast, { ToastType } from '@/components/Toast';
import { IconAlert, IconClock, IconQrCode, Spinner } from '@/components/Icons';

const STATUS_BADGES = {
  pending: 'bg-amber-50 text-amber-800 border border-amber-300',
  processing: 'bg-blue-50 text-blue-800 border border-blue-300',
  completed: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
  error: 'bg-red-50 text-red-800 border border-red-300',
  cancelled: 'bg-gray-100 text-gray-700 border border-gray-300',
};

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang làm',
  completed: 'Hoàn thành',
  error: 'Gặp sự cố',
  cancelled: 'Đã hủy',
};

export default function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const zaloUrl = 'https://zalo.me/0966216495';

  useEffect(() => {
    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToOrder(orderId, async (orderData) => {
      setOrder(orderData);
      if (orderData) {
        const serviceData = await getServiceById(orderData.serviceType);
        setService(serviceData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  // Tự động mở modal thanh toán nếu có query ?pay=1 và đơn chưa thanh toán
  useEffect(() => {
    if (searchParams.get('pay') === '1' && order && order.paymentStatus === 'unpaid') {
      setIsPaymentModalOpen(true);
    }
  }, [searchParams, order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Spinner className="h-10 w-10 text-blue-600 mx-auto" />
          <p className="mt-3 text-base font-semibold text-gray-700">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-7 text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
          <p className="text-base text-gray-600 mb-6 leading-relaxed">
            {error || 'Đơn hàng không tồn tại hoặc đã bị xóa.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors text-base"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const serviceName = service?.name || order.serviceType;
  const servicePrice = order.amount || service?.price || 0;

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3.5 sm:px-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-md mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-bold text-gray-600 hover:text-blue-600 inline-flex items-center gap-1.5 p-1"
          >
            ← Trang chủ
          </button>
          <button
            onClick={() => router.push('/my-orders')}
            className="text-sm font-bold text-blue-600 hover:text-blue-800 p-1"
          >
            Đơn hàng của tôi
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {/* Card Top Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 sm:px-6 py-4 sm:py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
                  Trạng thái đơn hàng
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                  Đơn #{order.id.slice(-6)}
                </h1>
              </div>
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold border ${STATUS_BADGES[order.status]}`}
              >
                {STATUS_LABELS[order.status]}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Payment Callout Section */}
            {order.paymentStatus === 'unpaid' && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5">
                    <IconQrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-red-900 leading-snug">
                      Đơn hàng chưa thanh toán
                    </h3>
                    <p className="text-xs sm:text-sm text-red-700 mt-1 leading-relaxed">
                      Vui lòng quét mã QR chuyển khoản để nhân viên tiếp nhận và xử lý đơn ngay cho bạn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  <IconQrCode className="h-5 w-5" />
                  <span>Mở mã QR SePay để thanh toán</span>
                </button>
              </div>
            )}

            {order.paymentStatus === 'pending_verification' && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                    <IconClock className="h-6 w-6 animate-spin text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-900">
                      Đợi nhân viên xác nhận
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                      Bạn đã xác nhận chuyển khoản. Nhân viên đang kiểm tra lịch sử biến động và sẽ duyệt làm ngay!
                    </p>
                  </div>
                </div>

                {/* Hộp thoại thông báo sau 30 phút theo yêu cầu */}
                <div className="bg-white/80 border border-amber-200 rounded-xl p-3 text-xs sm:text-sm text-amber-900 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span>🔔</span>
                    <span>Hỗ trợ gấp nếu đợi lâu:</span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Nếu sau <strong className="text-red-600 font-bold">30 phút</strong> đơn của bạn chưa được hoàn thành, vui lòng nhắn tin qua Zalo <strong className="text-blue-700 font-bold">0966216495</strong> để được xử lý ngay!
                  </p>
                  <a
                    href={zaloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-xs sm:text-sm pt-1"
                  >
                    <span>👉 Bấm vào đây để chat Zalo ngay</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <IconQrCode className="h-4 w-4" />
                  <span>Xem lại mã QR & Thông tin chuyển khoản</span>
                </button>
              </div>
            )}

            {order.paymentStatus === 'paid' && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-lg font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-emerald-900">
                    Đã thanh toán thành công
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">
                    Đơn hàng đã được duyệt thanh toán và nhân viên đang tiến hành thực hiện.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message if any */}
            {order.errorMessage && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5">
                <IconAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Ghi chú sự cố:</p>
                  <p className="mt-0.5 leading-relaxed">{order.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Order Details List with larger fonts */}
            <div className="divide-y divide-slate-100 text-sm sm:text-base">
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Mã đơn hàng</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-gray-900 text-sm sm:text-base bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    {order.id}
                  </span>
                  <CopyButton text={order.id} title="Sao chép mã đơn hàng" />
                </div>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Mã / Link sự kiện</span>
                <div className="flex items-center gap-1.5 max-w-[65%]">
                  <span className="font-mono font-semibold text-gray-900 text-xs sm:text-sm truncate" title={order.eventCode}>
                    {order.eventCode}
                  </span>
                  <CopyButton text={order.eventCode} title="Sao chép mã sự kiện" />
                </div>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Gói dịch vụ</span>
                <span className="font-bold text-gray-900 text-sm sm:text-base">{serviceName}</span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Số tiền thanh toán</span>
                <span className="font-extrabold text-blue-600 text-lg sm:text-xl">
                  {servicePrice.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Thanh toán</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold border ${PAYMENT_STATUS_BADGES[order.paymentStatus]}`}
                >
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Tiến độ thực hiện</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold border ${STATUS_BADGES[order.status]}`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              {order.employeeName && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 text-xs sm:text-sm font-medium">Nhân viên phụ trách</span>
                  <span className="font-bold text-gray-800 text-sm sm:text-base">{order.employeeName}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-gray-800 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-colors text-center"
              >
                + Đặt thêm đơn mới
              </button>
            </div>
          </div>
        </div>

        {/* Modal Thanh toán QR */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          orderId={order.id}
          amount={servicePrice}
          serviceName={serviceName}
          onPaymentConfirmed={() => {
            setToast({
              message: 'Đã xác nhận chuyển khoản! Nếu sau 30 phút đơn chưa được làm, hãy liên hệ Zalo 0966216495.',
              type: 'info',
            });
          }}
        />
      </div>
    </main>
  );
}
