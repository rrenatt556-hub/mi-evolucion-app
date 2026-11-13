/* Caché de archivos de Mi Evolución Personal & Familiar.
   Esta versión utiliza los archivos ubicados en la raíz del repositorio. */
const VERSION = "mi-evolucion-v10-rootpaths-2";
const SHELL = [
  "./", "./index.html", "./estilos.css", "./almacenamiento.js",
  "./app.js", "./desarrollo.js", "./respaldo-integral.js",
  "./pwa.js", "./gemini-informe.js", "./portabilidad.js",
  "./manifest.webmanifest", "./icono-192.png", "./icono-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(name => name.startsWith("mi-evolucion-") && name !== VERSION)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    if (request.mode === "navigate") {
      try { return await fetch(request); }
      catch { return await caches.match("./index.html") || Response.error(); }
    }
    const cached = await caches.match(request);
    return cached || fetch(request);
  })());
});
