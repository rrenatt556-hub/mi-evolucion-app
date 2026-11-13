"use strict";
/* V0.6: instalación opcional; NO modifica los datos existentes. */
(() => {
  let installEvent = null;
  const el = id => document.getElementById(id);
  const informar = msg => { if (el("pwa-estado")) el("pwa-estado").textContent = msg; };
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    installEvent = e;
    if (el("pwa-instalar")) el("pwa-instalar").hidden = false;
    informar("Este navegador ofrece instalar la aplicación.");
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    if (el("pwa-instalar")) el("pwa-instalar").hidden = true;
    informar("Aplicación instalada en este dispositivo. Datos no sincronizados.");
  });
  document.addEventListener("DOMContentLoaded", async () => {
    el("pwa-instalar")?.addEventListener("click", async () => {
      if (!installEvent) return;
      await installEvent.prompt();
      installEvent = null;
      el("pwa-instalar").hidden = true;
    });
    if (location.protocol === "file:") {
      informar("Estás utilizando file://. Exporta el respaldo integral antes de pasar a un servidor local.");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      informar("El navegador no admite service workers; puedes seguir usando la aplicación en línea.");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("./service-worker.js");
      informar("Aplicación preparada para uso básico sin conexión en este navegador. Datos solo locales.");
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            el("pwa-actualizar").hidden = false;
            informar("Hay una actualización de archivos disponible. Respalda tus datos antes de recargar.");
          }
        });
      });
      el("pwa-actualizar")?.addEventListener("click", () => location.reload());
    } catch (error) {
      informar("No se pudo activar el modo sin conexión: " + error.message);
    }
  });
})();
