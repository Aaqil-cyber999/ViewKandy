/*
 * KandyVerse service worker.
 *
 * Strategy:
 *  - App shell + offline page are precached on install.
 *  - Navigations are network-first with a cached page / offline fallback.
 *  - Static build assets and icons are cache-first with a background refresh.
 *  - API requests are never cached: weather, routes, assistant answers and
 *    admin writes must always be fresh and must not leak between users.
 */

const VERSION = "kandyverse-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually so one failure cannot abort the whole install.
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => null)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("kandyverse-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/vendor/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isPrivatePath(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/cesium/")
  );
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone()).catch(() => null);
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"background:#07111f;color:#f8fafc;font-family:system-ui;padding:2rem\"><h1>You are offline</h1><p>KandyVerse needs a connection for this page. Cached pages remain available from the menu.</p></body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh in the background; failures are fine.
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, response)).catch(() => null);
        }
      })
      .catch(() => null);
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone()).catch(() => null);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivatePath(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, OFFLINE_URL));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
