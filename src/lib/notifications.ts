import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Order } from '@/types/database';

/**
 * Âm thanh chuông báo êm dịu, nhẹ nhàng (Gentle chime - hợp âm Đô Trưởng C5 - E5 - G5)
 * Sử dụng Web Audio API tổng hợp âm sine mềm mại, không gây giật mình hay chói tai.
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // 3 nốt nhạc nối tiếp nhẹ nhàng: Đô (523.25Hz) -> Mi (659.25Hz) -> Sol (783.99Hz)
    const notes = [
      { freq: 523.25, start: 0, duration: 0.35, gain: 0.08 },
      { freq: 659.25, start: 0.1, duration: 0.4, gain: 0.1 },
      { freq: 783.99, start: 0.22, duration: 0.55, gain: 0.08 },
    ];

    notes.forEach(({ freq, start, duration, gain: targetGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      // Fade-in êm ái và fade-out mượt mà
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gainNode.gain.exponentialRampToValueAtTime(targetGain, ctx.currentTime + start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    });
  } catch (err) {
    console.warn('AudioContext playback error: ', err);
  }
};

/**
 * Đăng ký Service Worker và xin quyền thông báo trên trình duyệt
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('Service worker registration note:', e);
      });
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Gửi thông báo hệ thống ra màn hình laptop / desktop
 */
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
  // 1. Phát âm thanh chuông êm ái
  playNotificationSound();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  // 2. Hiển thị thông báo màn hình
  try {
    // Gọi trực tiếp Notification API để hiển thị ngay trên desktop/laptop
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `${tag}-${Date.now()}`,
      silent: true, // Đã có âm thanh Web Audio dịu nhẹ ở trên
    });

    notif.onclick = () => {
      window.focus();
      if (url && window.location.pathname !== url) {
        window.location.href = url;
      }
      notif.close();
    };

    // Đồng bộ với Service Worker nếu có
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.active) {
          reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            tag: `${tag}-${Date.now()}`,
            data: url,
            silent: true,
          } as any).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to display system notification:', err);
  }
};

/**
 * Lắng nghe real-time đơn hàng mới:
 * - Admin: nhận thông báo khi có đơn mới tạo hoặc vừa xác nhận chuyển khoản.
 * - Employee: nhận thông báo khi đơn được Admin duyệt là Đã thanh toán (paid) và đang Chờ xử lý (pending).
 *
 * Lưu ý quan trọng:
 * - Lần tải snapshot đầu tiên luôn bỏ qua (không báo chuông các đơn cũ trong quá khứ).
 * - Chỉ thông báo các đơn phát sinh thời gian thực trong phiên làm việc hiện tại.
 */
export const listenForOrderNotifications = (
  role: 'admin' | 'employee',
  onNotification: (order: Order, message: string) => void
) => {
  if (typeof window === 'undefined') return () => {};

  const seenNewIds = new Set<string>();
  const seenVerifyIds = new Set<string>();
  const seenPaidIds = new Set<string>();
  let isInitial = true;

  const ordersQuery = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(40)
  );

  const unsubscribe = onSnapshot(
    ordersQuery,
    (snapshot) => {
      // 1. Snapshot đầu tiên khi vừa kết nối:
      // Đánh dấu tất cả đơn đã có trong DB là đã biết, TUYỆT ĐỐI KHÔNG BÁO CHUÔNG ĐƠN CŨ
      if (isInitial) {
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          seenNewIds.add(doc.id);
          if (data.paymentStatus === 'pending_verification') {
            seenVerifyIds.add(doc.id);
          }
          if (data.paymentStatus === 'paid') {
            seenPaidIds.add(doc.id);
          }
        });
        isInitial = false;
        return;
      }

      // 2. Các snapshot tiếp theo: Chỉ xử lý thay đổi mới phát sinh
      snapshot.docChanges().forEach((change) => {
        const order = { id: change.doc.id, ...change.doc.data() } as Order;

        if (role === 'admin') {
          // ADMIN:
          // A) Có khách vừa đặt đơn mới
          if (change.type === 'added' && !seenNewIds.has(order.id)) {
            seenNewIds.add(order.id);
            const msg = `Đơn mới #${order.id.slice(-6)} (${order.amount.toLocaleString('vi-VN')}đ) đang chờ duyệt!`;
            sendSystemNotification({
              title: '🔔 CÓ ĐƠN HÀNG MỚI!',
              body: msg,
              url: '/admin',
              tag: `order-${order.id}`,
            });
            onNotification(order, msg);
          }

          // B) Khách vừa bấm xác nhận đã chuyển tiền
          if (
            change.type === 'modified' &&
            order.paymentStatus === 'pending_verification' &&
            !seenVerifyIds.has(order.id)
          ) {
            seenVerifyIds.add(order.id);
            const msg = `Khách vừa xác nhận chuyển khoản đơn #${order.id.slice(-6)}!`;
            sendSystemNotification({
              title: '💳 KHÁCH ĐÃ CHUYỂN TIỀN!',
              body: msg,
              url: '/admin',
              tag: `verify-${order.id}`,
            });
            onNotification(order, msg);
          }
        } else if (role === 'employee') {
          // NHÂN VIÊN:
          // Chỉ báo khi đơn được Admin duyệt thanh toán (paid) và còn ở trạng thái chờ nhận (pending)
          const isAvailableToClaim =
            order.paymentStatus === 'paid' &&
            order.status === 'pending' &&
            !order.employeeId;

          if (isAvailableToClaim && !seenPaidIds.has(order.id)) {
            seenPaidIds.add(order.id);
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
    },
    (error) => {
      console.warn('Lỗi lắng nghe đơn hàng:', error);
    }
  );

  return unsubscribe;
};
