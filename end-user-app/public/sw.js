// Minimal service worker: no caching, just makes the app installable
// (Chrome requires a registered SW with a fetch handler for beforeinstallprompt to fire).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
