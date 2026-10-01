'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToOrder } from '@/lib/orders';
import { getServiceById } from '@/lib/services';
import { Order, Service } from '@/types/database';

const STATUS_BADGES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const PAYMENT_BADGES = {
  unpaid: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
};

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang làm',
  completed: 'Hoàn thành',
  error: 'Lỗi',
  cancelled: 'Đã hủy',
};

const PAYMENT_LABELS = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
};

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const orderId = params.id as string;
    
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
  }, [params.id]);

  const handleFakePayment = async () => {
    if (!order) return;

    try {
      const response = await fetch('/api/payment/fake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        throw new Error('Thanh toán thất bại');
      }

      alert('Thanh toán thành công!');
    } catch (err: any) {
      alert(err.message || 'Đã có lỗi xảy ra');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy đơn hàng</h2>
            <p className="text-gray-600 mb-6">{error || 'Đơn hàng không tồn tại'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const serviceName = service?.name || order.serviceType;
  const servicePrice = order.amount || service?.price || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Theo dõi đơn hàng
          </h1>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Mã đơn</span>
              <span className="font-mono font-medium">{order.id}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Mã sự kiện</span>
              <span className="font-medium">{order.eventCode}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Loại dịch vụ</span>
              <span className="font-medium">{serviceName}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Giá</span>
              <span className="font-bold text-blue-600">
                {servicePrice.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Trạng thái thanh toán</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${PAYMENT_BADGES[order.paymentStatus]}`}>
                {PAYMENT_LABELS[order.paymentStatus]}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Trạng thái xử lý</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGES[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            {order.employeeName && (
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Nhân viên xử lý</span>
                <span className="font-medium">{order.employeeName}</span>
              </div>
            )}

            {order.errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">Lỗi:</p>
                <p>{order.errorMessage}</p>
              </div>
            )}

            {order.paymentStatus === 'unpaid' && process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleFakePayment}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Fake Thanh toán (Dev only)
              </button>
            )}
          </div>

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
