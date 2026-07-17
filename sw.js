// ──────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────

const CACHE_NAME = "marchese-admin-v1.4";

// Rutas relativas a donde está el sw.js (misma carpeta que todo)
const SHELL_ASSETS = [
  "admin.html",
  "login.html",
  "admin.js",
  "login.js",
  "firebase-config.js",
  "manifest.json",
  "launchericon-192.png",
  "launchericon-512.png",
];

// ── INSTALL: precachear el shell ─────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches viejos ─────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Network-first con fallback a cache ────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar GET
  if (request.method !== "GET") return;

  // Dejar pasar todo lo externo (Firebase, Cloudinary, Google Fonts…)
  const externalHosts = [
    "firestore.googleapis.com",
    "firebase.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "www.gstatic.com",
    "api.cloudinary.com",
    "res.cloudinary.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
  ];
  if (externalHosts.some((h) => url.hostname === h)) return;

  // Assets propios: Network-first, fallback a cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback: si piden una página HTML, devolver admin.html desde cache
          if (request.destination === "document") {
            return caches.match("admin.html");
          }
        })
      )
  );
});
