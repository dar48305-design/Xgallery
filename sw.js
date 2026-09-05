/* X Gallery service worker — app shell only, never intercept media streams */
const CACHE = "xgal-shell-v7";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
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
  if (dest === "video" || dest === "audio" || dest === "image") return true;
  if (/\.(mp4|m3u8|ts|webm|mov|m4v|mp3|aac|jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(path)) return true;
  // X / Twitter / CDN media hosts — always bypass SW
  const host = url.hostname;
  if (
    host.includes("twimg.com") ||
    host.includes("video.twimg.com") ||
    host.includes("pbs.twimg.com") ||
    host.includes("cdn.twitter.com") ||
    host.includes("abs.twimg.com") ||
    host.includes("video.pscp.tv")
  ) {
    return true;
  }
  // range requests (video seeking)
  if (request.headers.get("range")) return true;
  return false;
}

function isApiOrProxy(url) {
  return (
    url.hostname.includes("workers.dev") ||
    url.pathname.includes("/api") ||
    url.searchParams.has("id")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // CRITICAL: do not touch media / video / range streams — lets Range & CORS work
  if (isMediaRequest(url, req)) {
    return; // browser default network
  }

  // Proxy / API: network only
  if (isApiOrProxy(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // Same-origin app shell: network-first, fallback cache
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && (req.mode === "navigate" || req.destination === "document" ||
              url.pathname.endsWith(".html") || url.pathname.endsWith(".webmanifest") ||
              url.pathname.endsWith(".js") || url.pathname.endsWith(".css") ||
              url.pathname.includes("/icons/"))) {
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
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
