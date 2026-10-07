'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderByTrackingToken, getOrderById } from '@/lib/orders';
import { Spinner } from '@/components/Icons';

export default function TrackPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const query = searchInput.trim();
    if (!query) {
      setError('Vui lòng nhập mã đơn hoặc mã theo dõi');
      return;
    }

    setLoading(true);

    try {
      // Thử tìm theo Order ID trước
      let order = await getOrderById(query);

      // Nếu không tìm thấy, thử tìm theo trackingToken
      if (!order) {
        order = await getOrderByTrackingToken(query);
      }

      if (!order) {
        throw new Error('Không tìm thấy đơn hàng với thông tin đã nhập');
      }

      localStorage.setItem('orderId', order.id);
      localStorage.setItem('trackingToken', order.trackingToken);

      router.push(`/track/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-12 px-3.5 sm:px-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="text-xs font-semibold text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 p-1"
          >
            ← Trang chủ
          </button>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-5 sm:p-7">
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-1">
            Tra cứu đơn hàng
          </h1>
          <p className="text-xs text-gray-500 text-center mb-6">
            Nhập mã đơn hàng hoặc mã theo dõi để kiểm tra trạng thái
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="searchInput" className="block text-xs font-bold text-gray-700 mb-1.5">
                Mã đơn hàng / Mã theo dõi
              </label>
              <input
                type="text"
                id="searchInput"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ví dụ: nB6kL9... hoặc mã đơn"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Đang tìm kiếm...</span>
                </>
              ) : (
                <span>Tìm đơn hàng</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
            >
              + Tạo đơn hàng mới
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
