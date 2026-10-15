'use client';

import { useState, useEffect } from 'react';
import { PAYMENT_CONFIG } from '@/config/constants';
import { buildVietQRUrl, sanitizeMemo } from '@/lib/payment-utils';
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
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Mỗi khi mở modal, reset lỗi
  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Chuẩn hóa nội dung chuyển khoản: Chỉ đúng chuỗi mã đơn ngắn gọn, sạch sẽ
  const shortId = sanitizeMemo(orderId.slice(-6));
  const qrUrl = buildVietQRUrl({
    bankId: PAYMENT_CONFIG.BANK_ID,
    accountNo: PAYMENT_CONFIG.ACCOUNT_NO,
    amount,
    memo: shortId,
    accountName: PAYMENT_CONFIG.ACCOUNT_NAME,
    template: 'compact',
  });

  const handleDownloadQr = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `vietqr-${shortId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await confirmPaymentTransfer(orderId);
      if (onPaymentConfirmed) {
        onPaymentConfirmed();
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể cập nhật trạng thái. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <IconQrCode className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-lg leading-tight">Thanh toán chuyển khoản</h3>
              <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">Quét mã QR qua ứng dụng ngân hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
            <div className="relative bg-white p-2 rounded-xl shadow-xs border border-slate-200">
              <img
                src={qrUrl}
                alt={`Mã QR thanh toán cho đơn ${orderId}`}
                className="w-44 h-44 sm:w-56 sm:h-56 object-contain rounded-lg"
                loading="eager"
              />
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-2 text-center font-medium">
              Mở ứng dụng ngân hàng bất kỳ để quét mã QR
            </p>
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={downloading}
              className="mt-2 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {downloading ? <Spinner className="h-3 w-3" /> : <span>📥</span>}
              <span>{downloading ? 'Đang tải...' : 'Tải ảnh QR về máy'}</span>
            </button>
          </div>

          {/* Thông tin chuyển khoản */}
          <div className="bg-blue-50/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-100 space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
              <span className="text-gray-500 shrink-0">Ngân hàng:</span>
              <span className="font-bold text-gray-900 text-right truncate">{PAYMENT_CONFIG.BANK_NAME}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
              <span className="text-gray-500 shrink-0">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-extrabold text-blue-700 text-sm sm:text-base">
                  {PAYMENT_CONFIG.ACCOUNT_NO}
                </span>
                <CopyButton text={PAYMENT_CONFIG.ACCOUNT_NO} title="Sao chép số tài khoản" />
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
              <span className="text-gray-500 shrink-0">Chủ tài khoản:</span>
              <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm text-right truncate">
                {PAYMENT_CONFIG.ACCOUNT_NAME}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
              <span className="text-gray-500 shrink-0">Số tiền:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-emerald-600 text-base sm:text-lg">
                  {amount.toLocaleString('vi-VN')}đ
                </span>
                <CopyButton text={amount.toString()} title="Sao chép số tiền" />
              </div>
            </div>

            <div className="flex justify-between items-center py-2 bg-amber-50 -mx-1 px-2.5 rounded-lg border border-amber-200 gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-amber-900 text-xs sm:text-sm font-bold">Nội dung chuyển khoản:</span>
                <span className="text-[10px] sm:text-xs text-amber-700 font-medium">
                  (Bắt buộc ghi đúng 5 ký tự này)
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-extrabold text-amber-900 text-base sm:text-lg bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  {shortId}
                </span>
                <CopyButton text={shortId} title="Sao chép nội dung chuyển khoản" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <IconAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Hướng dẫn và nút xác nhận */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-sm sm:text-base active:scale-[0.99]"
            >
              {loading ? <Spinner className="h-5 w-5" /> : <IconCheck className="h-5 w-5" />}
              <span>{loading ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản thành công'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 py-2 sm:py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-colors text-center"
            >
              Đóng cửa sổ
            </button>

            <p className="text-center text-[11px] sm:text-xs text-gray-500 leading-relaxed">
              Sau khi bạn chuyển tiền xong, bấm nút trên để hệ thống ghi nhận và nhân viên duyệt đơn!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
