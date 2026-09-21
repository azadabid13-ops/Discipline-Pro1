/* Discipline — Service Worker
   Keeps the app (index.html), Google Fonts, and the Firebase SDK scripts
   cached so the app opens and works offline. Cloud sync (Firebase Auth/
   Firestore) still needs a live connection, but the app shell, your
   local data (in localStorage), and the UI all work without one. */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `discipline-${CACHE_VERSION}`;
const PAGE_URL = './index.html';

const RUNTIME_CACHE_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(['./', PAGE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // পেজ নেভিগেশন: নেট থাকলে আপডেট আনো ও ক্যাশ করো, নেট না থাকলে ক্যাশ থেকে দাও
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(PAGE_URL, res.clone()));
          return res;
        })
        .catch(() => caches.match(PAGE_URL))
    );
    return;
  }

  // একই অরিজিনের অন্য রিকোয়েস্ট (এই অ্যাপে সবই index.html এর ভেতরেই, তাও safety হিসেবে)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // গুগল ফন্ট ও ফায়ারবেজ SDK (jsdelivr): ক্যাশ-ফার্স্ট, প্রথমবার অনলাইনে থাকলে সেভ হয়ে যাবে
  if (RUNTIME_CACHE_HOSTS.has(url.hostname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => cached))
    );
    return;
  }
});
