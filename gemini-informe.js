"use strict";
/* V0.8: Informe local para consultar manualmente en Gemini.
   No contiene llamadas a APIs ni envía datos automáticamente. */
(() => {
 const $ = id => document.getElementById(id);
 const iso = d => window.EvoStorage.isoLocal(d);
 const parse = s => window.EvoStorage.fromISO(s);
 const mondayDay = d => (d.getDay()+6)%7;
 function programado(h,fecha) {
   if (fecha < h.creado || (h.archivado && fecha >= h.archivado)) return false;
   let seg = null;
   for(const s of h.segmentos) {
     if(s.desde <= fecha) seg=s;
     else break;
   }
   const d=parse(fecha);
   return !!(seg && d && seg.dias.includes(mondayDay(d)));
 }
 function generar() {
   let habitos,desarrollo;
   try {
     habitos=window.EvoStorage.read().data;
     const guardado=localStorage.getItem("mi_evolucion_desarrollo_v04");
     desarrollo=window.v4Validar(guardado ? JSON.parse(guardado) :
       {version:4,actividades:[],metas:[],tareas:[]});
   } catch (error) {
     $("gemini-estado").textContent="No se pudieron leer los datos. Revisa los respaldos antes de continuar.";
     console.error(error);
     return;
   }
   const ahora=new Date(), hoy=iso(ahora);
   const inicio=new Date(ahora.getFullYear(),ahora.getMonth(),1);
   let programadas=0, realizadas=0;
   const porCat={mental:[0,0],fisico:[0,0],emocional:[0,0],personal:[0,0],familiar:[0,0]};
   for(let d=new Date(inicio);iso(d)<=hoy;d.setDate(d.getDate()+1)){
     const fecha=iso(d);
     for(const h of habitos.habitos){
       if(!programado(h,fecha))continue;
       programadas++;
       porCat[h.categoria][0]++;
       if(habitos.registros[fecha]?.[h.id]===true){
         realizadas++; porCat[h.categoria][1]++;
       }
     }
   }
   const mes=hoy.slice(0,7);
   const actividades=desarrollo.actividades.filter(a=>a.fecha?.slice(0,7)===mes);
   const minutos=actividades.reduce((n,a)=>n+(Number(a.minutos)||0),0);
   const metas=desarrollo.metas;
   const tareas=desarrollo.tareas;
   const pct=n=>n[0] ? Math.round(n[1]/n[0]*100)+" %" : "Sin registros programados";
   const categorias=Object.entries(porCat).map(([cat,v])=>`- ${cat}: ${v[1]}/${v[0]} (${pct(v)})`).join("\n");
   const texto=`INFORME RESUMIDO DE HÁBITOS (SIN NOMBRES NI DATOS FINANCIEROS)
Mes: ${mes} · acumulado hasta ${hoy}
Hábitos programados: ${programadas}
Cumplimientos registrados: ${realizadas}
Cumplimiento global: ${pct([programadas,realizadas])}

Cumplimiento por categoría:
${categorias}

Actividades mentales/físicas registradas este mes: ${actividades.length}
Tiempo total de actividades este mes: ${minutos} minutos
Metas: ${metas.filter(x=>x.completado).length} completadas de ${metas.length}
Tareas familiares: ${tareas.filter(x=>x.completado).length} completadas de ${tareas.length}

Solicito:
1. Señala dos patrones observables, sin inventar causas.
2. Propón tres ajustes pequeños y realistas para la próxima semana.
3. Sugiere cómo medir si funcionaron.
4. No hagas diagnósticos médicos o psicológicos.
Nota: es un resumen generado localmente; verifica los cálculos y el contenido antes de compartirlo.`;
   $("gemini-texto").value=texto;
   $("gemini-estado").textContent="Informe creado solo en tu navegador. No se ha enviado nada.";
 }
 function init(){
   if(!$("gemini-generar"))return;
   $("gemini-generar").addEventListener("click",generar);
   $("gemini-copiar").addEventListener("click",async()=>{
     const t=$("gemini-texto").value;
     if(!t){$("gemini-estado").textContent="Primero genera el informe.";return;}
     if(!$("gemini-autorizar").checked){
       $("gemini-estado").textContent="Antes de copiar, confirma que revisaste la información.";
       return;
     }
     try {
       await navigator.clipboard.writeText(t);
       $("gemini-estado").textContent="Copiado. Ahora puedes pegarlo voluntariamente en Gemini.";
     } catch {
       $("gemini-texto").focus();
       $("gemini-texto").select();
       $("gemini-estado").textContent="Copia manualmente con Ctrl + C y pégalo donde decidas.";
     }
   });
   $("gemini-abrir").addEventListener("click",()=>{
     window.open("https://gemini.google.com/app","_blank","noopener,noreferrer");
     $("gemini-estado").textContent="Se abrió Gemini en otra pestaña. Ningún dato se envió automáticamente.";
   });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
 else init();
})();
