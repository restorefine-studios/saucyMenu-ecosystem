// Minimal service worker: no caching, just makes the app installable
// (Chrome requires a registered SW with a fetch handler for beforeinstallprompt to fire).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const { pathname } = new URL(event.request.url);
  // Don't intercept Vite dev server internals — virtual modules, HMR, source files
  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/src/") ||
    pathname.startsWith("/node_modules/")
  ) {
    return;
  }
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});
