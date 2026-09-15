// CuMeals Service Worker Push Notifications Handler
// Works on both Android (Chrome) and iOS 16.4+ (Safari PWA on Home Screen)

self.addEventListener('push', function (event) {
  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'CuMeals Alert',
        body: event.data.text()
      };
    }
  } else {
    notificationData = {
      title: 'CuMeals Alert',
      body: 'You have a new mess update from CuMeals!'
    };
  }

  const title = notificationData.title || 'CuMeals Hostel Mess';
  const options = {
    body: notificationData.body || 'Open the app to check today\'s hostel mess menu and updates.',
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/favicon.png',
    image: notificationData.image || undefined,
    data: {
      url: notificationData.url || '/',
      timestamp: Date.now()
    },
    tag: notificationData.tag || 'cumeals-notification',
    renotify: true,
    vibrate: [100, 50, 100],
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', function (event) {
  // Handle subscription change when browser or OS revokes/renews tokens
  console.log('[CuMeals SW] Push subscription changed:', event);
});
