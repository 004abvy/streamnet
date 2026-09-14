self.addEventListener('push', (event) => {
  console.log('[sw] push event received', event);
  let payload = { title: 'New', body: '', icon: '/icons/192.png', url: '/' };
  try {
    if (event.data) payload = event.data.json();
  } catch (e) {
    // not JSON
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge || "/images/badge.png",
    image: payload.image,
    data: payload.data || { url: payload.url },
    tag: payload.tag,
    renotify: payload.renotify || false,
    silent: payload.silent || false,
    actions: payload.actions || []
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const url = data.url || '/';
  if (event.action === 'stop') {
    // try to call unsubscribe URL (fire-and-forget)
    const unsub = data.unsubscribeUrl;
    if (unsub) fetch(unsub, { method: 'GET', mode: 'no-cors' }).catch(()=>{});
    return;
  }
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    for (const w of windows) {
      try {
        if (w.location && w.location.href === url) return w.focus();
      } catch (e) {}
    }
    return clients.openWindow(url);
  }));
  
  event.notification.close();
});
