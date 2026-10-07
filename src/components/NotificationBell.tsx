'use client';

import { useEffect, useState } from 'react';
import {
  listenForOrderNotifications,
  playNotificationSound,
  requestNotificationPermission,
  sendSystemNotification,
} from '@/lib/notifications';
import { Order } from '@/types/database';

interface NotificationBellProps {
  role: 'admin' | 'employee';
  onNewOrderAlert?: (order: Order, message: string) => void;
}

export default function NotificationBell({ role, onNewOrderAlert }: NotificationBellProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setActive(true);
      }
    }

    // Luôn bật listener realtime khi component mount
    const unsubscribe = listenForOrderNotifications(role, (order, msg) => {
      if (onNewOrderAlert) {
        onNewOrderAlert(order, msg);
      }
    });

    return () => unsubscribe();
  }, [role, onNewOrderAlert]);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
      setActive(true);
      // Gửi thông báo thử nghiệm và phát chuông ngay
      sendSystemNotification({
        title: '🔔 Thông báo đã được bật!',
        body: role === 'admin'
          ? 'Hệ thống sẽ báo chuông và thông báo mỗi khi có đơn hàng mới phát sinh!'
          : 'Hệ thống sẽ báo chuông mỗi khi có đơn mới được Admin duyệt thanh toán!',
      });
    } else {
      setPermission('denied');
      // Thử phát chuông âm thanh để user vẫn nghe được
      playNotificationSound();
      alert('Vui lòng cho phép quyền thông báo trên trình duyệt để nhận thông báo đơn hàng!');
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    sendSystemNotification({
      title: '🔔 Thử chuông thông báo đơn hàng',
      body: 'Âm thanh thông báo hoạt động bình thường!',
    });
  };

  return (
    <div className="flex items-center gap-2">
      {permission !== 'granted' ? (
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all animate-pulse"
          title="Bấm để nhận chuông và thông báo khi có đơn mới"
        >
          <span>🔔</span>
          <span>Bật chuông đơn mới</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTestSound}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
          title="Thông báo đang hoạt động. Bấm để thử chuông báo"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>🔔 Chuông đơn (Bật)</span>
        </button>
      )}
    </div>
  );
}
