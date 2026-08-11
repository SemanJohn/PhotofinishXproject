/* PhotoFinishX — service worker
   Halaman: rangkaian dahulu (supaya kemas kini GitHub terus masuk bila ada talian).
   Aset lain: guna cache, kemas kini di latar belakang.
   Pengaktifan versi baharu dikawal oleh halaman melalui mesej 'skipWaiting',
   supaya aplikasi tidak dimuat semula di tengah-tengah rakaman. */

const VERSION = 'photofinishx-v5.2.0';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
  // Sengaja TIDAK skipWaiting di sini — halaman yang menentukan masanya.
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navigasi: cuba rangkaian dahulu, jatuh balik ke cache bila luar talian.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Aset: guna cache serta-merta, muat turun versi baharu di latar belakang.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION });
});
