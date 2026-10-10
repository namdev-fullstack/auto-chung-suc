'use client';

import { useEffect, useRef, useState } from 'react';
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

  // Giữ callback trong ref để không làm re-trigger subscription khi component cha re-render
  const onNewOrderAlertRef = useRef(onNewOrderAlert);
  useEffect(() => {
    onNewOrderAlertRef.current = onNewOrderAlert;
  }, [onNewOrderAlert]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setActive(true);
      }
    }

    // Bật listener 1 lần theo role, an toàn tuyệt đối không lặp subscription
    const unsubscribe = listenForOrderNotifications(role, (order, msg) => {
      onNewOrderAlertRef.current?.(order, msg);
    });

    return () => unsubscribe();
  }, [role]);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
      setActive(true);
      // Gửi thông báo thử nghiệm và phát chuông êm ái
      await sendSystemNotification({
        title: '🔔 Thông báo màn hình đã bật!',
        body: role === 'admin'
          ? 'Hệ thống sẽ báo chuông nhẹ và hiện thông báo màn hình khi có đơn mới!'
          : 'Hệ thống sẽ báo chuông nhẹ khi có đơn được Admin duyệt thanh toán!',
      });
    } else {
      setPermission('denied');
      // Thử phát chuông âm thanh để user vẫn nghe được
      playNotificationSound();
      alert('Vui lòng cho phép quyền Thông báo (Notification) trên trình duyệt hoặc trong cài đặt máy tính để thông báo hiển thị trên màn hình laptop!');
    }
  };

  const handleTestSound = async () => {
    await sendSystemNotification({
      title: '🔔 Thử thông báo đơn hàng',
      body: 'Âm thanh êm dịu và thông báo trên màn hình hoạt động tốt!',
    });
  };

  return (
    <div className="flex items-center gap-2">
      {permission !== 'granted' ? (
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all animate-pulse"
          title="Bấm để cấp quyền hiển thị thông báo trên màn hình laptop và phát chuông khi có đơn mới"
        >
          <span>🔔</span>
          <span>Bật thông báo màn hình</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTestSound}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
          title="Thông báo màn hình & chuông êm dịu đang bật. Bấm để thử tiếng chuông và thông báo!"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>🔔 Chuông đơn (Đang bật)</span>
        </button>
      )}
    </div>
  );
}
