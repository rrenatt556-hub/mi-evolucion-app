"use strict";
/* Piloto integrado: exportación e importación manual entre dispositivos.
   Nunca envía datos a red. No incluye enlace/credenciales de Apps Script. */
(() => {
  const $=id=>document.getElementById(id);
  const KEYS={
    habitos:"mi_evolucion_habitos_v03",
    desarrollo:"mi_evolucion_desarrollo_v04"
  };
  const MAX=12*1024*1024;
  let pendiente=null;
  const msg=(s,error=false)=>{const e=$("port-estado");e.textContent=(error?"⚠️ ":"✅ ")+s;e.style.color=error?"#a53742":"#164e48";};
  function descargar(obj){
    const s=JSON.stringify(obj,null,2),url=URL.createObjectURL(new Blob([s],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;
    a.download="mi-evolucion-personal-v10-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function fecha(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const d=new Date(s+"T12:00:00Z");return !isNaN(d)&&d.toISOString().slice(0,10)===s;}
  function validar(obj){
    if(!obj||obj.formato!=="mi-evolucion-paquete"||![9,10].includes(obj.version)||!obj.datos||
       typeof obj.datos!=="object")throw Error("Archivo no corresponde a un paquete compatible.");
    const d=obj.datos;
    // Cada módulo es opcional para no borrar datos no incluidos.
    if(!Object.keys(d).some(k=>Object.hasOwn(KEYS,k)))
      throw Error("Módulos no reconocidos o respaldo vacío.");
    if(Object.hasOwn(d,"habitos"))window.EvoStorage.check(d.habitos);
    if(Object.hasOwn(d,"desarrollo"))window.v4Validar(d.desarrollo);
    return Object.fromEntries(Object.entries(d).filter(([key])=>Object.hasOwn(KEYS,key)));
  }
  function exportar(){
    try{
      const datos={};
      // Los módulos ausentes no se exportan: de este modo no borran datos en el destino.
      const ha=window.EvoStorage.read().data;
      datos.habitos=window.EvoStorage.check(ha);
      for(const k of ["desarrollo"]){
        const raw=localStorage.getItem(KEYS[k]);
        if(raw!==null)datos[k]=JSON.parse(raw);
      }
      validar({formato:"mi-evolucion-paquete",version:10,datos});
      const paquete={formato:"mi-evolucion-paquete",version:10,fecha:new Date().toISOString(),datos};
      if(new Blob([JSON.stringify(paquete)]).size>MAX)throw Error("Paquete demasiado grande (12 MB).");
      descargar(paquete);
      msg("Descarga iniciada. Verifica el archivo y consérvalo en un lugar privado; NO está cifrado.");
    }catch(e){msg(e.message,true);}
  }
  async function archivo(ev){
    pendiente=null;$("port-importar").disabled=true;
    const f=ev.target.files?.[0];if(!f)return;
    try{
      if(f.size>MAX)throw Error("Archivo mayor de 12 MB.");
      const paquete=JSON.parse(await f.text()),datos=validar(paquete);
      pendiente=datos;
      $("port-previa").textContent="Paquete validado (solo datos personales). Contiene:\n"+
       Object.entries(datos).map(([k,v])=>"- "+k+": "+(
         k==="habitos"?v.habitos.length+" hábitos":
         v.actividades.length+" actividades, "+v.metas.length+" metas, "+v.tareas.length+" tareas")).join("\n")+
       "\n\nLa importación reemplazará SOLO los módulos incluidos. No cambiará las hojas de Google.";
      $("port-importar").disabled=false;msg("Validación superada. Descarga primero un respaldo del destino.");
    }catch(e){$("port-previa").textContent="No se ha importado nada.";msg("Archivo rechazado: "+e.message,true);}
    finally{ev.target.value="";}
  }
  function importar(){
    if(!pendiente)return;
    if(!confirm("¿Tienes respaldo del dispositivo de destino? Se REEMPLAZARÁN sus módulos incluidos en este paquete. ¿Continuar?"))return;
    try{
      validar({formato:"mi-evolucion-paquete",version:10,datos:pendiente});
      const keys=Object.keys(pendiente).map(k=>KEYS[k]);
      const anteriores=keys.map(k=>[k,localStorage.getItem(k)]);
      try{
        for(const [nombre,datos] of Object.entries(pendiente))
          localStorage.setItem(KEYS[nombre],JSON.stringify(datos));
      }catch(e){
        for(const [k,old] of anteriores){
          try{if(old===null)localStorage.removeItem(k);else localStorage.setItem(k,old);}catch(_){}
        }
        throw Error("No se pudo guardar; se intentó recuperar el estado anterior. "+e.message);
      }
      pendiente=null;msg("Paquete importado. La página se recargará.");
      setTimeout(()=>location.reload(),500);
    }catch(e){msg(e.message,true);}
  }
  document.addEventListener("DOMContentLoaded",()=>{
    if(!$("port-exportar"))return;
    $("port-exportar").addEventListener("click",exportar);
    $("port-archivo").addEventListener("change",archivo);
    $("port-importar").addEventListener("click",importar);
  });
})();