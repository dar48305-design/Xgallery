const CACHE = "xgal-shell-v9";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
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
  if (/\.(mp4|m3u8|ts|webm|mov|m4v|mp3|aac)(\?|$)/i.test(path)) return true;
  const host = url.hostname;
  if (
    host.includes("video.twimg.com") ||
    host.includes("video.pscp.tv") ||
    host.includes("abs.twimg.com")
  ) return true;
  if (request.headers.get("range")) return true;
  return false;
}

function isThumbImage(url, request) {
  if (request.destination === "image") return true;
  if (url.hostname.includes("pbs.twimg.com") || url.hostname.includes("twimg.com")) return true;
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

  // Never intercept video streams
  if (isMediaRequest(url, req)) return;

  if (isApiOrProxy(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // Cache-first for twimg thumbs (faster scroll / reopen)
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
