/* V0.6: Cache exclusivo de archivos públicos de la aplicación.
   NO almacena ni transmite contenidos de localStorage. */
const VERSION = "evo-v10-simple-completa-1";
const SHELL = [
  "./", "./index.html", "./css/estilos.css", "./js/almacenamiento.js",
  "./js/app.js", "./js/desarrollo.js", "./js/respaldo-integral.js",
  "./js/pwa.js", "./js/gemini-informe.js", "./js/portabilidad.js", "./manifest.webmanifest", "./assets/icono-192.png",
  "./assets/icono-512.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name =>
      (name.startsWith("evo-v06-shell-") || name.startsWith("evo-v07-shell-") || name.startsWith("evo-v071-shell-") || name.startsWith("evo-v072-shell-") || name.startsWith("evo-unificado-v09-shell-") || name.startsWith("evo-unificado-v091-shell-") || name.startsWith("evo-unificado-v092-shell-") || name.startsWith("evo-v10-windows-shell-")) && name !== VERSION
    ).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    // Network-first para HTML: permite detectar cambios; caché como respaldo.
    if (request.mode === "navigate") {
      try { return await fetch(request); }
      catch {
        return await caches.match("./index.html") || Response.error();
      }
    }
    const cached = await caches.match(request);
    return cached || fetch(request);
  })());
});
