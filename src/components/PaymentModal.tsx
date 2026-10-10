'use client';

import { useState, useEffect } from 'react';
import { PAYMENT_CONFIG, getSepayQrUrl } from '@/config/constants';
import { confirmPaymentTransfer } from '@/lib/orders';
import CopyButton from '@/components/CopyButton';
import { IconAlert, IconCheck, IconQrCode, IconX, Spinner } from '@/components/Icons';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  serviceName?: string;
  onPaymentConfirmed?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  orderId,
  amount,
  serviceName,
  onPaymentConfirmed,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  // Mỗi khi mở modal, luôn bắt đầu bằng màn hình thanh toán QR & thông tin chuyển khoản
  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const qrUrl = getSepayQrUrl(amount, orderId);
  const zaloUrl = 'https://zalo.me/0966216495';

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await confirmPaymentTransfer(orderId);
      setConfirmed(true);
      if (onPaymentConfirmed) {
        onPaymentConfirmed();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể cập nhật trạng thái. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <IconQrCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">Thanh toán chuyển khoản</h3>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">Quét mã QR qua ứng dụng ngân hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {confirmed ? (
            <div className="py-4 text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-md shadow-emerald-500/20">
                ✓
              </div>
              <h4 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                Đã ghi nhận chuyển khoản!
              </h4>
              <p className="text-sm sm:text-base text-gray-600 max-w-sm mx-auto leading-relaxed">
                Đơn hàng đã được chuyển sang trạng thái <strong className="text-amber-700 font-bold">Đợi nhân viên xác nhận</strong>. Nhân viên sẽ kiểm tra và bắt đầu xử lý ngay.
              </p>

              {/* Hộp thoại thông báo Zalo theo yêu cầu */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 text-left space-y-2 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0">🔔</span>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-blue-900 leading-snug">
                      Lưu ý hỗ trợ khách hàng:
                    </p>
                    <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
                      Nếu sau <span className="font-bold text-red-600">30 phút</span> đơn của bạn chưa được hoàn thành, vui lòng nhắn tin trực tiếp qua Zalo để được hỗ trợ xử lý ngay lập tức!
                    </p>
                  </div>
                </div>

                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2 bg-[#0068FF] hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-[0.99]"
                >
                  <span>Nhắn Zalo: 0966.216.495</span>
                </a>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-bold text-sm transition-colors shadow-md shadow-blue-500/20"
                >
                  Đóng & Quay lại chi tiết đơn
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors"
                >
                  Xem lại mã QR & Thông tin chuyển khoản
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="relative bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
                  <img
                    src={qrUrl}
                    alt={`Mã QR thanh toán cho đơn ${orderId}`}
                    className="w-56 h-56 sm:w-60 sm:h-60 object-contain rounded-lg"
                    loading="eager"
                  />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2.5 text-center font-medium">
                  Mở ứng dụng ngân hàng bất kỳ để quét mã QR
                </p>
              </div>

              {/* Thông tin chuyển khoản */}
              <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-100 space-y-3 text-sm sm:text-base">
                <div className="flex justify-between items-center py-1 border-b border-blue-100">
                  <span className="text-gray-600 text-xs sm:text-sm">Ngân hàng:</span>
                  <span className="font-bold text-gray-900 text-right">{PAYMENT_CONFIG.BANK_NAME}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-blue-100">
                  <span className="text-gray-600 text-xs sm:text-sm">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-blue-700 text-base sm:text-lg">
                      {PAYMENT_CONFIG.ACCOUNT_NO}
                    </span>
                    <CopyButton text={PAYMENT_CONFIG.ACCOUNT_NO} title="Sao chép số tài khoản" />
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-blue-100">
                  <span className="text-gray-600 text-xs sm:text-sm">Chủ tài khoản:</span>
                  <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm">
                    {PAYMENT_CONFIG.ACCOUNT_NAME}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-blue-100">
                  <span className="text-gray-600 text-xs sm:text-sm">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-emerald-600 text-base sm:text-lg">
                      {amount.toLocaleString('vi-VN')}đ
                    </span>
                    <CopyButton text={amount.toString()} title="Sao chép số tiền" />
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 bg-amber-50 -mx-2 px-3 rounded-xl border border-amber-200">
                  <div className="flex flex-col">
                    <span className="text-amber-900 text-xs sm:text-sm font-bold">Nội dung chuyển khoản:</span>
                    <span className="text-[11px] sm:text-xs text-amber-700 font-medium">
                      (Bắt buộc ghi đúng để kiểm tra nhanh)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-amber-900 text-base sm:text-lg bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                      {orderId}
                    </span>
                    <CopyButton text={orderId} title="Sao chép mã đơn" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                  <IconAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Hướng dẫn và nút xác nhận */}
              <div className="pt-1 space-y-2.5">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3.5 px-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-base sm:text-lg active:scale-[0.99]"
                >
                  {loading ? <Spinner className="h-5 w-5" /> : <IconCheck className="h-5 w-5" />}
                  <span>{loading ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản thành công'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors text-center"
                >
                  Đóng cửa sổ
                </button>

                <p className="text-center text-xs sm:text-sm text-gray-500 leading-relaxed">
                  Sau khi bạn chuyển tiền xong, bấm nút trên để hệ thống ghi nhận và nhân viên duyệt đơn!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
