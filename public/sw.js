const CACHE_NAME = 'fitness-timer-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests (Supabase, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip requests that might cause white screen issues
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('chrome-extension://')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          // Check if cached response is valid
          if (response.status === 200 || response.type === 'opaque') {
          return response;
        }

        // Otherwise fetch from network
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            // Return a fallback page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            throw error;
            // Don't cache error pages or empty responses
              return caches.match('/').then(fallback => {
                if (fallback) return fallback;
                // Create a basic fallback response
                return new Response(
                  '<html><body><h1>App Offline</h1><p>Please check your connection and try again.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
              return response;
            }
          });
      })
  );
});

// Background sync for uploading sessions when online
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(syncSessions());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'Fitness Timer',
    body: 'Workout reminder',
    icon: '/manifest.json',
    badge: '/manifest.json',
    tag: 'fitness-timer',
    requireInteraction: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: [
        {
          action: 'open',
          title: 'Open App'
        }
      ],
      data: notificationData
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === self.location.origin + '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

async function syncSessions() {
  console.log('Syncing sessions in background...');
  // This will be handled by the main app when it comes online
  try {
    // Send message to all clients to trigger sync
    const allClients = await clients.matchAll();
    allClients.forEach(client => {
      client.postMessage({ type: 'BACKGROUND_SYNC' });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}