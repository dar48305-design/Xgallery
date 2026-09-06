const CACHE = "xgal-shell-v13";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./dialogs.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isMediaRequest(url, request) {
  const path = url.pathname.toLowerCase();
  const dest = request.destination;
  if (dest === "video" || dest === "audio") return true;
  if (/\.(mp4|m3u8|ts|webm|mov|m4v)(\?|$)/i.test(path)) return true;
  if (url.hostname.includes("video.twimg.com") || url.hostname.includes("video.pscp.tv")) return true;
  if (request.headers.get("range")) return true;
  return false;
}

function isThumbImage(url, request) {
  if (request.destination === "image") return true;
  if (url.hostname.includes("twimg.com")) return true;
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url.pathname)) return true;
  return false;
}

function isApiOrProxy(url) {
  return url.hostname.includes("workers.dev") || url.searchParams.has("id") || url.searchParams.has("user");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  if (isMediaRequest(url, req)) return;

  if (isApiOrProxy(url)) {
    event.respondWith(fetch(req));
    return;
  }

  if (isThumbImage(url, req)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch (e) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (cached) return cached;
            if (req.mode === "navigate") return caches.match("./index.html");
            return undefined;
          })
        )
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = "./?open=chat";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.url && "focus" in c) {
          c.postMessage({ type: "open-chat", payload: event.notification.data || null });
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "show-notification") {
    const title = data.title || "X Gallery";
    const body = data.body || "";
    const opts = {
      body: body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: data.tag || "xgal-nudge",
      data: data.payload || { open: "chat" },
      renotify: true
    };
    event.waitUntil(self.registration.showNotification(title, opts));
  }
});
