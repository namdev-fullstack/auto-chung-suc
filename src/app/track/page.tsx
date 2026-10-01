'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderByTrackingToken } from '@/lib/orders';

export default function TrackPage() {
  const router = useRouter();
  const [trackingToken, setTrackingToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!trackingToken.trim()) {
        throw new Error('Vui lòng nhập mã theo dõi');
      }

      const order = await getOrderByTrackingToken(trackingToken.trim());

      if (!order) {
        throw new Error('Không tìm thấy đơn hàng với mã theo dõi này');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Theo dõi đơn hàng
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Nhập mã theo dõi để xem trạng thái đơn hàng
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="trackingToken" className="block text-sm font-medium text-gray-700 mb-2">
                Mã theo dõi
              </label>
              <input
                type="text"
                id="trackingToken"
                value={trackingToken}
                onChange={(e) => setTrackingToken(e.target.value)}
                placeholder="Nhập mã theo dõi của bạn"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Đang tìm...' : 'Tìm đơn hàng'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Tạo đơn mới
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
