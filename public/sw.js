// Service Worker cho Web Push & System Notification
const CACHE_NAME = 'chung-suc-notification-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Lắng nghe sự kiện Push từ server nếu có
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Thông báo đơn hàng', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Đơn hàng mới!';
  const options = {
    body: data.body || 'Có cập nhật đơn hàng mới cần xử lý.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: data.tag || 'order-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Khi người dùng bấm vào thông báo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
