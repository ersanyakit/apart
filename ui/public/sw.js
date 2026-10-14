/* Only public offline assets are cached. Authenticated HTML, API requests,
   guest data and financial documents always use the network. */
const CACHE = 'otel-public-offline-v1';
const PUBLIC_ASSETS = ['/pwa/offline.html', '/pwa/icon-192.png', '/pwa/icon-512.png', '/pwa/icon-maskable.png', '/pwa/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('otel-public-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (PUBLIC_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
    return;
  }
  if (event.request.mode === 'navigate' && !url.pathname.startsWith('/action') && !url.pathname.startsWith('/media')) {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('/pwa/offline.html')).then(page => page || new Response('Bağlantı yok. Lütfen yeniden deneyin.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}}))));
  }
});
