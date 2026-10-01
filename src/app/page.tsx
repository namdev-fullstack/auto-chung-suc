'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/lib/orders';
import { getActiveServices } from '@/lib/services';
import { Service } from '@/types/database';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!eventCode.trim()) {
        throw new Error('Vui lòng nhập mã sự kiện');
      }

      const service = services.find((item) => item.id === selectedService);
      if (!service) {
        throw new Error('Vui lòng chọn dịch vụ');
      }

      const order = await createOrder({
        eventCode: eventCode.trim(),
        serviceType: selectedService,
        amount: service.price,
      });

      const existingOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
      existingOrders.push({
        id: order.id,
        trackingToken: order.trackingToken,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('myOrders', JSON.stringify(existingOrders));

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
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Chung Sức Liên Quân
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Chọn dịch vụ và nhập mã sự kiện để bắt đầu
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại dịch vụ
              </label>
              {loadingServices ? (
                <p className="text-sm text-gray-500">Đang tải dịch vụ...</p>
              ) : services.length === 0 ? (
                <p className="text-sm text-gray-500">Hiện chưa có dịch vụ nào đang bán.</p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedService === service.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="service"
                          value={service.id}
                          checked={selectedService === service.id}
                          onChange={(e) => setSelectedService(e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 font-medium text-gray-900">{service.name}</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {service.price.toLocaleString('vi-VN')}đ
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="eventCode" className="block text-sm font-medium text-gray-700 mb-2">
                Mã sự kiện
              </label>
              <input
                type="text"
                id="eventCode"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                placeholder="Nhập mã sự kiện của bạn"
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
              disabled={loading || loadingServices || services.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Đang tạo đơn...' : 'Tạo đơn'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => {
                const orderId = localStorage.getItem('orderId');
                if (orderId) {
                  router.push(`/track/${orderId}`);
                } else {
                  router.push('/track');
                }
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Theo dõi đơn hàng của bạn
            </button>
            <br />
            <button
              onClick={() => router.push('/my-orders')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Xem tất cả đơn hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
