/* Cache-first service worker: the whole manual works with no signal at sea.
 * Bump VERSION whenever content changes so guests get the update next time they're online. */
const VERSION = "anasa-manual-v9";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest",
                "./config.js", "./lang/en.js", "./lang/el.js", "./lang/bg.js", "./lang/de.js", "./boats/anasa.js",
                "./icon-192.png", "./icon-512.png", "./icon-maskable-192.png", "./icon-maskable-512.png",
                "./apple-touch-icon.png", "./favicon-32.png", "./favicon-64.png",
                "./logo-badge.png", "./logo-white.png", "./logo-white-regular.png", "./logo-black.png", "./fonts/inter.woff2",
                "./fonts/inter-greek.woff2", "./fonts/inter-cyrillic.woff2",
                "./img/boat-above.jpg", "./img/boat-headland.jpg", "./img/boat-side.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined));
      return hit || net;   // instant from cache, refreshed in the background
    })
  );
});
