
// A unique name for the cache, change this whenever you update the assets
const CACHE_NAME = 'ai-chat-cache-v1.51'; // Bumped version to trigger update

// A list of assets to be pre-cached when the service worker is installed.
const URLS_TO_PRECACHE = [
  '/',
  '/index.html', // Explicitly cache the main HTML file
  '/bundle.js',  // The main application JavaScript bundle
  '/assets/default_avatar.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap',
  // Note: Fonts from fonts.gstatic.com and scripts from esm.sh will be cached dynamically by the fetch handler on first use.
];

// Install event: This is fired when the service worker is first installed.
self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting(); 

  // Perform install steps: open a cache and add the pre-cache assets to it.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Opened cache and pre-caching assets.');
        // Use { cache: 'reload' } to bypass browser's HTTP cache for pre-caching
        const preCacheRequests = URLS_TO_PRECACHE.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(preCacheRequests).catch(error => {
            console.error('Service Worker: Failed to pre-cache some assets. The app might not work fully offline if these are critical.', error);
        });
      })
  );
});

// Activate event: This is fired when the service worker is activated.
// It's a good place to clean up old, unused caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Identify caches that are from this app but not the current version.
          return cacheName.startsWith('ai-chat-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
        // Take control of all open clients immediately.
        return self.clients.claim();
    })
  );
});

// Fetch event: This is fired for every network request made by the page.
// We'll use a "Network falling back to cache" strategy.
self.addEventListener('fetch', event => {
  // We only handle GET requests. Other requests (POST, etc.) should not be cached.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // URLs for external APIs that should not be cached.
  const onlineOnlyUrls = [
      'https://generativelanguage.googleapis.com', // Gemini API
  ];

  // If the request is for an online-only API, bypass the cache and go directly to the network.
  if (onlineOnlyUrls.some(url => event.request.url.startsWith(url))) {
      return; // Let the browser handle the request normally.
  }

  // "Network falling back to cache" strategy.
  event.respondWith(
    // 1. Try to fetch from the network.
    fetch(event.request)
      .then(networkResponse => {
        // If the fetch is successful, cache it and return the response.
        // Check if we received a valid response to cache.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
            // console.log('Service Worker: Serving from network and caching:', event.request.url);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 2. If the network fetch fails (e.g., offline), try to find it in the cache.
        // console.log('Service Worker: Network request failed, trying cache for:', event.request.url);
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests (e.g., loading the page), if nothing is in the cache,
          // we should serve the main index.html file as a fallback for the SPA.
          if (event.request.mode === 'navigate') {
            console.log('Service Worker: Serving index.html as fallback for navigation.');
            return caches.match('/index.html');
          }
          
          // If it's not a navigation request and not in cache, then it's a real failure.
          console.error('Service Worker: Resource not found in cache or network:', event.request.url);
          // Return a proper error response
          return new Response(JSON.stringify({ error: 'Resource not available offline and network failed.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
            statusText: 'Not Found'
          });
        });
      })
  );
});
