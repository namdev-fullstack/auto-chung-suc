import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Order } from '@/types/database';

// Âm thanh chuông báo Ting-Ting bằng Web Audio API
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Chuông đôi (Chime 2 nốt cao trong trẻo)
    playTone(880, 0, 0.4);      // Nốt A5
    playTone(1318.51, 0.15, 0.6); // Nốt E6
  } catch (err) {
    console.warn('AudioContext playback error: ', err);
  }
};

// Đăng ký Service Worker và xin quyền thông báo
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    // Đăng ký Service Worker nếu trình duyệt hỗ trợ
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('Service worker registration failed:', e);
      });
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Gửi thông báo hệ thống
export const sendSystemNotification = async ({
  title,
  body,
  url = '/',
  tag = 'order-notification',
}: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) => {
  // Phát âm thanh chuông báo
  playNotificationSound();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag,
          data: url,
          vibrate: [200, 100, 200],
        } as any);
        return;
      }
    }

    // Fallback nếu chưa có service worker
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
    });
  } catch (err) {
    console.warn('Failed to display system notification:', err);
  }
};

/**
 * Lắng nghe real-time đơn hàng mới:
 * - Admin: nhận thông báo khi có đơn mới tạo hoặc vừa xác nhận chuyển khoản.
 * - Employee: nhận thông báo khi đơn được Admin duyệt là Đã thanh toán (paid) và đang Chờ xử lý (pending).
 */
export const listenForOrderNotifications = (
  role: 'admin' | 'employee',
  onNotification: (order: Order, message: string) => void
) => {
  if (typeof window === 'undefined') return () => {};

  const initTime = Date.now();
  const notifiedIds = new Set<string>();

  // Lấy danh sách ID gần đây để không thông báo các đơn cũ
  const ordersQuery = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const order = { id: change.doc.id, ...change.doc.data() } as Order;
      const orderTime =
        (order.createdAt as any)?.toMillis?.() ||
        (order.createdAt as any)?.seconds * 1000 ||
        0;

      // Chỉ báo các đơn xuất hiện sau khi listener được tạo (hoặc trong vòng 60 giây gần nhất)
      const isFresh = orderTime >= initTime - 60000;

      if (role === 'admin') {
        // ADMIN: Báo khi có đơn mới tạo
        if (change.type === 'added' && isFresh && !notifiedIds.has(`new-${order.id}`)) {
          notifiedIds.add(`new-${order.id}`);
          const msg = `Đơn mới #${order.id.slice(-6)} (${order.amount.toLocaleString('vi-VN')}đ) đang chờ duyệt!`;
          sendSystemNotification({
            title: '🔔 CÓ ĐƠN HÀNG MỚI!',
            body: msg,
            url: '/admin',
            tag: `order-${order.id}`,
          });
          onNotification(order, msg);
        } else if (
          change.type === 'modified' &&
          order.paymentStatus === 'pending_verification' &&
          !notifiedIds.has(`verify-${order.id}`)
        ) {
          notifiedIds.add(`verify-${order.id}`);
          const msg = `Khách vừa xác nhận chuyển tiền cho đơn #${order.id.slice(-6)}!`;
          sendSystemNotification({
            title: '💳 KHÁCH ĐÃ CHUYỂN TIỀN!',
            body: msg,
            url: '/admin',
            tag: `verify-${order.id}`,
          });
          onNotification(order, msg);
        }
      } else if (role === 'employee') {
        // NHÂN VIÊN: Chỉ báo khi đơn đã được Admin duyệt thanh toán (paid) và chưa ai nhận (pending)
        if (
          order.paymentStatus === 'paid' &&
          order.status === 'pending' &&
          !order.employeeId &&
          !notifiedIds.has(`paid-${order.id}`)
        ) {
          notifiedIds.add(`paid-${order.id}`);
          const msg = `Đơn #${order.id.slice(-6)} đã thanh toán! Vào nhận đơn làm ngay.`;
          sendSystemNotification({
            title: '⚡ ĐƠN MỚI ĐÃ THANH TOÁN!',
            body: msg,
            url: '/dashboard',
            tag: `paid-order-${order.id}`,
          });
          onNotification(order, msg);
        }
      }
    });
  });

  return unsubscribe;
};
