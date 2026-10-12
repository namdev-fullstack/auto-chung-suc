'use client';

import { useState } from 'react';
import { PAYMENT_CONFIG } from '@/config/constants';
import { buildVietQRUrl, sanitizeMemo } from '@/lib/payment-utils';
import { IconAlert, IconCheck, IconQrCode, Spinner } from '@/components/Icons';

export interface PaymentCheckoutProps {
  orderCode: string;
  amount: number;
  bankId?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  template?: 'compact' | 'compact2';
  serviceName?: string;
  loading?: boolean;
  onPaymentConfirmed?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function PaymentCheckout({
  orderCode,
  amount,
  bankId = PAYMENT_CONFIG.BANK_ID,
  bankName = PAYMENT_CONFIG.BANK_NAME,
  accountNo = PAYMENT_CONFIG.ACCOUNT_NO,
  accountName = PAYMENT_CONFIG.ACCOUNT_NAME,
  template = 'compact',
  serviceName,
  loading = false,
  onPaymentConfirmed,
  onClose,
  className = '',
}: PaymentCheckoutProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Chuẩn hóa nội dung chuyển khoản: CHỈ DUY NHẤT MÃ ĐƠN (tối đa 10 ký tự, in hoa, không dấu, không ký tự đặc biệt)
  const cleanMemo = sanitizeMemo(orderCode);

  // Sinh URL VietQR chuẩn
  const qrUrl = buildVietQRUrl({
    bankId,
    accountNo,
    amount,
    memo: cleanMemo,
    accountName,
    template,
  });

  // Hàm sao chép clipboard với phản hồi giao diện trực quan
  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Không thể sao chép:', err);
    }
  };

  // Hàm tải ảnh VietQR về máy / điện thoại
  const handleDownloadQr = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `vietqr-${cleanMemo}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      // Fallback mở ảnh trong tab mới
      window.open(qrUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const formattedAmount = `${amount.toLocaleString('vi-VN')} đ`;

  return (
    <div className={`w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 sm:p-2 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
            <IconQrCode className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base leading-tight">Thanh toán chuyển khoản VietQR</h3>
            <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">Quét mã QR tự động điền số tiền & nội dung</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
            aria-label="Đóng"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto">
        {/* 1. KHUNG NỘI DUNG CHUYỂN KHOẢN CỰC KỲ NỔI BẬT */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-amber-900 tracking-wide uppercase">
              Mã nội dung chuyển khoản
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Bắt buộc chính xác
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white p-2 sm:p-2.5 rounded-xl border border-amber-200">
            <span
              className="font-mono text-2xl sm:text-3xl font-black text-amber-900 tracking-wider truncate selection:bg-amber-200"
              title={cleanMemo}
            >
              {cleanMemo}
            </span>

            <button
              type="button"
              onClick={() => copyToClipboard(cleanMemo, 'memo')}
              className={`shrink-0 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                copiedKey === 'memo'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {copiedKey === 'memo' ? (
                <>
                  <IconCheck className="h-4 w-4 stroke-[3]" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>

          {/* 2. CẢNH BÁO QUAN TRỌNG CHO KHÁCH */}
          <div className="mt-2.5 flex items-start gap-1.5 text-amber-900 text-xs sm:text-sm leading-snug">
            <IconAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-semibold">
              ⚠️ Giữ nguyên nội dung chuyển khoản <strong className="font-mono text-amber-950 underline">{cleanMemo}</strong> để đơn hàng được duyệt nhanh nhất.
            </p>
          </div>
        </div>

        {/* 3. KHU VỰC HIỂN THỊ VIETQR & NÚT TẢI ẢNH */}
        <div className="flex flex-col items-center justify-center bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
          <div className="relative bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <img
              src={qrUrl}
              alt={`Mã VietQR thanh toán ${cleanMemo}`}
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
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
            className="mt-2.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            {downloading ? <Spinner className="h-3.5 w-3.5" /> : <span>📥</span>}
            <span>{downloading ? 'Đang tải ảnh...' : 'Tải ảnh QR về máy'}</span>
          </button>
        </div>

        {/* 4. TÓM TẮT THÔNG TIN THANH TOÁN (NGÂN HÀNG, STK, CHỦ THẺ, SỐ TIỀN) */}
        <div className="bg-blue-50/70 rounded-2xl p-3 sm:p-4 border border-blue-100 space-y-2.5 text-xs sm:text-sm">
          {serviceName && (
            <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
              <span className="text-gray-500 shrink-0">Dịch vụ:</span>
              <span className="font-bold text-gray-900 text-right truncate">{serviceName}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
            <span className="text-gray-500 shrink-0">Ngân hàng:</span>
            <span className="font-bold text-gray-900 text-right truncate">
              {bankName} ({bankId})
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
            <span className="text-gray-500 shrink-0">Số tài khoản:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold text-blue-700 text-sm sm:text-base">
                {accountNo}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(accountNo, 'acc')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  copiedKey === 'acc'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                }`}
                title="Sao chép số tài khoản"
              >
                {copiedKey === 'acc' ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-blue-100 gap-2">
            <span className="text-gray-500 shrink-0">Chủ tài khoản:</span>
            <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm text-right truncate">
              {accountName}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 gap-2">
            <span className="text-gray-500 shrink-0">Số tiền cần chuyển:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-emerald-600 text-base sm:text-lg">
                {formattedAmount}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(amount.toString(), 'amount')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  copiedKey === 'amount'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                }`}
                title="Sao chép số tiền"
              >
                {copiedKey === 'amount' ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>
        </div>

        {/* 5. NÚT XÁC NHẬN & ĐÓNG */}
        <div className="pt-1 space-y-2">
          {onPaymentConfirmed && (
            <button
              type="button"
              onClick={onPaymentConfirmed}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 sm:py-3.5 px-4 rounded-xl font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-sm sm:text-base active:scale-[0.99]"
            >
              {loading ? <Spinner className="h-5 w-5" /> : <IconCheck className="h-5 w-5 stroke-[2.5]" />}
              <span>{loading ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản thành công'}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 py-2 sm:py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-colors text-center"
            >
              Đóng cửa sổ
            </button>
          )}

          <p className="text-center text-[11px] sm:text-xs text-gray-500 leading-relaxed">
            Hệ thống đối soát tự động duyệt đơn ngay sau khi nhận được chuyển khoản đúng nội dung!
          </p>
        </div>
      </div>
    </div>
  );
}
