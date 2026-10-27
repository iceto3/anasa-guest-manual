/* Cache-first service worker: the whole manual works with no signal at sea.
 * Bump VERSION whenever content changes so guests get the update next time they're online.
 * v10: also receives Web Push for the in-app chat and opens the right thread on tap. */
const VERSION = "anasa-manual-v10";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./chat.js", "./manifest.webmanifest",
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
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;   // the chat API (workers.dev) is never cached
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

/* ---------- Web Push (payload encrypted by the Worker: VAPID + aes128gcm) ---------- */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Anasa";
  const url = new URL(d.url || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    wins.forEach(c => c.postMessage({ type: "push", payload: d }));   // an open app refreshes the thread right away
    // Always show a notification (Safari/iOS revokes push permission for silent pushes); the open app closes it when the thread is on screen.
    await self.registration.showNotification(title, {
      body: d.body || "", tag: d.tag || "anasa", renotify: true, icon: "icon-192.png", badge: "logo-badge.png",
      data: { url, convId: d.convId || null, kind: d.kind || null }, timestamp: Date.now()
    });
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const scope = self.registration.scope;
    const w = wins.find(c => c.url.startsWith(scope) && "focus" in c);
    if (w) { await w.focus(); w.postMessage({ type: "open", url }); return; }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
