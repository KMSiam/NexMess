self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/logo-icon.svg',
        badge: '/logo-icon.svg',
        data: { url: payload.url || '/dashboard' },
      })
    );
  } catch (e) {
    console.error('Push parse failed, falling back to text:', e);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('NexMess Alert', {
        body: text,
        icon: '/logo-icon.svg',
        badge: '/logo-icon.svg',
        data: { url: '/dashboard' },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
