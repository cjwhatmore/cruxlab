const CACHE = 'cruxlab-shell-v2';
const FILES = [
    './', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('cruxlab-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin)
        return;
    e.respondWith(fetch(e.request).then(r => {
        if (r.ok && FILES.some(f => new URL(f, self.registration.scope).href === e.request.url)) {
            let copy = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
    }).catch(async () => {
        let cached = await caches.match(e.request);
        return cached || (e.request.mode === 'navigate' ? await caches.match('./index.html') : new Response('Offline', { status: 503 }));
    }));
});
