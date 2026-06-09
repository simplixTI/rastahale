const CACHE_NAME = "rastahale-v3";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/favicon.png", "/favicon.ico"];

// Install: pré-cacheia assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para API, cache-first para assets estáticos
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests não-HTTP e extensões do browser
  if (!request.url.startsWith("http")) return;

  // Supabase e APIs externas: sempre network, sem cache
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/rest/")) {
    return;
  }

  // Navegação (HTML): network-first com fallback para index.html (SPA)
  // Usa index.html tanto em falha de rede quanto em 404 (rotas client-side)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => (res.ok ? res : caches.match("/index.html")))
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Assets estáticos (JS, CSS, imagens): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
