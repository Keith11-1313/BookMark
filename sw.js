// sw.js — Service Worker for offline support + PWA

const CACHE_NAME = 'bookmark-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/index.css',
  './css/auth.css',
  './css/sidebar.css',
  './css/command-palette.css',
  './css/dashboard.css',
  './css/links.css',
  './css/notes.css',
  './css/directory.css',
  './css/snippets.css',
  './js/firebase-config.js',
  './js/store.js',
  './js/auth.js',
  './js/app.js',
  './js/sidebar.js',
  './js/command-palette.js',
  './js/dashboard.js',
  './js/links.js',
  './js/notes.js',
  './js/directory.js',
  './js/snippets.js',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for static, network-first for Firebase
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and Firebase/Google requests (let them go to network)
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) return;

  // Cache-first for local static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
