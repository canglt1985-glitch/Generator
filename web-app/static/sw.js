// Service Worker - Minimal for PWA recognition
const CACHE_NAME = 'vt3-cache-v1';

self.addEventListener('install', event => {
    console.log('SW Installed');
});

self.addEventListener('fetch', event => {
    // Simple pass-through for now
});
