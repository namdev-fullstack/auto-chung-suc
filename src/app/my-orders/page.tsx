'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    localStorage.setItem('myOrders', JSON.stringify(updatedOrders));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Đơn hàng của bạn
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Quản lý và theo dõi tất cả đơn hàng của bạn
          </p>

          {orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Bạn chưa có đơn hàng nào</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Tạo đơn mới
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Xem
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
