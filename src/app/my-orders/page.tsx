'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CopyButton from '@/components/CopyButton';

interface StoredOrder {
  id: string;
  trackingToken: string;
  createdAt: string;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    const storedOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
    setOrders(storedOrders);
  }, []);

  const handleViewOrder = (orderId: string) => {
    router.push(`/track/${orderId}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    const updatedOrders = orders.filter((order) => order.id !== orderId);
    setOrders(updatedOrders);
    localStorage.setItem('myOrders', JSON.stringify(updatedOrders));
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 text-center">
            Đơn hàng đã lưu
          </h1>
          <p className="text-xs text-gray-500 mb-6 text-center">
            Danh sách các đơn hàng đã đặt trên thiết bị này
          </p>

          {orders.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-200">
              <p className="text-xs text-gray-500 mb-4">Bạn chưa lưu đơn hàng nào trên trình duyệt này.</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
              >
                Tạo đơn mới ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm truncate">
                        {order.id}
                      </span>
                      <CopyButton text={order.id} title="Sao chép mã đơn" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                    >
                      Xem
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-gray-400 hover:text-red-600 text-xs p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Xóa khỏi danh sách"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
            >
              + Tạo thêm đơn mới
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
