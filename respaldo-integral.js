"use strict";
/* V0.5: respaldo integral local. No modifica la API ni las hojas de Hogar & Finanzas. */
(() => {
  const KEY_H = "mi_evolucion_habitos_v03";
  const KEY_D = "mi_evolucion_desarrollo_v04";
  const MAX_BYTES = 8 * 1024 * 1024;
  const get = id => document.getElementById(id);

  function mensaje(texto, error = false) {
    const elemento = get("v5-estado");
    if (!elemento) return;
    elemento.textContent = (error ? "⚠️ " : "✅ ") + texto;
    elemento.style.color = error ? "#a53742" : "#164e48";
  }
  function obtener() {
    // La lectura de hábitos aprovecha validaciones y migración existentes.
    const habitos = window.EvoStorage.read().data;
    const raw = localStorage.getItem(KEY_D);
    const desarrollo = raw === null
      ? {version:4, actividades:[], metas:[], tareas:[]}
      : JSON.parse(raw);
    // No reemplazamos información que no puede validarse.
    const h = window.EvoStorage.check(habitos);
    const d = window.v4Validar(desarrollo);
    return {habitos:h, desarrollo:d};
  }
  function comprobar() {
    try {
      const datos = obtener();
      const kb = new Blob([JSON.stringify(datos)]).size / 1024;
      mensaje(`Datos legibles: ${datos.habitos.habitos.length} hábitos; ` +
        `${datos.desarrollo.actividades.length} actividades; ` +
        `${datos.desarrollo.metas.length} metas y ${datos.desarrollo.tareas.length} tareas. ` +
        `Respaldo estimado ${kb.toFixed(1)} KB. No hay sincronización automática.`);
    } catch (e) {
      console.error("V0.5:", e);
      mensaje("Los datos no pudieron verificarse. No se ha borrado nada: " + e.message, true);
    }
  }
  function descargar() {
    try {
      const datos = obtener();
      const paquete = {
        formato:"mi-evolucion-integral",
        version:5,
        creadoEn:new Date().toISOString(),
        habitos:datos.habitos,
        desarrollo:datos.desarrollo
      };
      const contenido = JSON.stringify(paquete, null, 2);
      const blob = new Blob([contenido], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fecha = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `mi-evolucion-integral-v05-${fecha}.json`;
      document.body.append(a);
      a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      mensaje("Descarga iniciada. Comprueba el archivo en Descargas y guárdalo fuera del proyecto.");
    } catch (e) {
      console.error(e);
      mensaje("No fue posible generar el respaldo: " + e.message, true);
    }
  }
  function validarIntegral(paquete) {
    if (!paquete || typeof paquete !== "object" ||
        paquete.formato !== "mi-evolucion-integral" ||
        paquete.version !== 5) throw Error("No es un respaldo integral V0.5 válido.");
    const habitos = window.EvoStorage.check(paquete.habitos);
    const desarrollo = window.v4Validar(paquete.desarrollo);
    return {habitos, desarrollo};
  }
  async function importar(ev) {
    const archivo = ev.target.files && ev.target.files[0];
    if (!archivo) return;
    try {
      if (archivo.size > MAX_BYTES) throw Error("Máximo permitido: 8 MB.");
      const contenido = await archivo.text();
      const nuevo = validarIntegral(JSON.parse(contenido));
      const aviso = `Respaldo verificado:\n` +
        `${nuevo.habitos.habitos.length} hábitos\n` +
        `${nuevo.desarrollo.actividades.length} actividades\n` +
        `${nuevo.desarrollo.metas.length} metas\n` +
        `${nuevo.desarrollo.tareas.length} tareas.\n\n` +
        `Esta acción REEMPLAZA los datos locales de hábitos y desarrollo/familia.\n` +
        `Antes de confirmar, descarga el respaldo integral actual.\n\n¿Continuar?`;
      if (!window.confirm(aviso)) {mensaje("Restauración cancelada; no se modificaron datos.");return;}
      const anteriorH = localStorage.getItem(KEY_H);
      const anteriorD = localStorage.getItem(KEY_D);
      let escritoH = false;
      try {
        localStorage.setItem(KEY_H, JSON.stringify(nuevo.habitos));
        escritoH = true;
        localStorage.setItem(KEY_D, JSON.stringify(nuevo.desarrollo));
        // Confirmar que ambos valores quedaron disponibles y validables.
        window.EvoStorage.check(JSON.parse(localStorage.getItem(KEY_H)));
        window.v4Validar(JSON.parse(localStorage.getItem(KEY_D)));
      } catch (error) {
        // Revertir ambos valores al estado anterior cuando sea posible.
        try {
          if (anteriorH === null) localStorage.removeItem(KEY_H);
          else localStorage.setItem(KEY_H, anteriorH);
          if (anteriorD === null) localStorage.removeItem(KEY_D);
          else localStorage.setItem(KEY_D, anteriorD);
        } catch (rollbackError) {
          console.error("Falló la reversión del respaldo:", rollbackError);
          throw Error("Error al restaurar y al revertir. Conserva tus archivos JSON. " + rollbackError.message);
        }
        throw error;
      }
      mensaje("Restauración completada. Actualizando la aplicación.");
      window.alert("Respaldo integral restaurado. La aplicación se recargará.");
      window.location.reload();
    } catch (e) {
      console.error("Error al importar V0.5:",e);
      mensaje("No se pudo importar: "+e.message, true);
    } finally {
      ev.target.value = "";
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    if (!get("v5-exportar")) return;
    get("v5-exportar").addEventListener("click", descargar);
    get("v5-comprobar").addEventListener("click", comprobar);
    get("v5-importar").addEventListener("click", () => get("v5-archivo").click());
    get("v5-archivo").addEventListener("change", importar);
    comprobar();
  });
})();
