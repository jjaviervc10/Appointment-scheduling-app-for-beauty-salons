const STATIC_CACHE = 'jl-barber-static-v1';
const NAV_CACHE = 'jl-barber-navigation-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/maskable-512.png',
];

const NO_NAV_FALLBACK_PREFIXES = [
  '/dashboard',
  '/agenda',
  '/clients',
  '/messages',
  '/settings',
  '/owner',
  '/(owner)',
  '/miniapp',
  '/api',
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function hasAuthorizationHeader(request) {
  return request.headers.has('authorization');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function canUseNavigationFallback(pathname) {
  return !NO_NAV_FALLBACK_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaticAssetRequest(request, url) {
  if (!isSameOrigin(url)) return false;
  if (request.method !== 'GET') return false;
  if (isApiRequest(url)) return false;
  if (hasAuthorizationHeader(request)) return false;

  return (
    ['font', 'image', 'manifest', 'script', 'style', 'worker'].includes(request.destination) ||
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/')
  );
}

async function precache() {
  const cache = await caches.open(STATIC_CACHE);

  await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
      if (response.ok) {
        await cache.put(url, response);
      }
    })
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstNavigation(request) {
  const url = new URL(request.url);

  try {
    const response = await fetch(request);

    if (response.ok && url.pathname === '/') {
      const cache = await caches.open(NAV_CACHE);
      await cache.put('/', response.clone());
    }

    return response;
  } catch (error) {
    if (canUseNavigationFallback(url.pathname)) {
      const cachedHome = await caches.match('/');
      if (cachedHome) return cachedHome;
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => ![STATIC_CACHE, NAV_CACHE].includes(cacheName))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!isSameOrigin(url)) return;
  if (isApiRequest(url)) return;
  if (hasAuthorizationHeader(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
