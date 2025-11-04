// Empty service worker file
// This file exists to prevent 404 errors when browsers auto-check for service workers
// No actual service worker functionality is implemented

self.addEventListener('install', (event) => {
  // Skip waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients
  event.waitUntil(self.clients.claim());
});
