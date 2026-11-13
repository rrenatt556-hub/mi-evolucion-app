"use strict";
/* V0.4: módulos adicionales locales. NO modifica mi_evolucion_habitos_v03. */
document.addEventListener("DOMContentLoaded", iniciarV4);
const V4_KEY = "mi_evolucion_desarrollo_v04";
const V4_MAX = 500;
let v4 = null;
function v4El(id) { return document.getElementById(id); }
function v4Hoy() {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function v4Fecha(fecha) {
 if(typeof fecha!=="string"|| !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
 const [y,m,d]=fecha.split("-").map(Number);
 const t=new Date(y,m-1,d);
 return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d;
}
function v4Id() {
 if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
 return `v4-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;
}
function v4Nuevo() { return {version:4,actividades:[],metas:[],tareas:[]}; }
function v4Validar(obj) {
 if(!obj||obj.version!==4||typeof obj!=="object")throw Error("No es un respaldo de módulos V0.4.");
 for(const tipo of ["actividades","metas","tareas"]) {
  if(!Array.isArray(obj[tipo])||obj[tipo].length>V4_MAX)throw Error(`Lista inválida: ${tipo}.`);
  const ids=new Set();
  for(const x of obj[tipo]) {
   if(!x||typeof x.id!=="string"||x.id.length>120||x.id.length<5||ids.has(x.id)||
      typeof x.nombre!=="string"||!x.nombre.trim()||x.nombre.length>100||
      !v4Fecha(x.fecha))throw Error(`Registro inválido en ${tipo}.`);
   ids.add(x.id);
   if(tipo==="actividades"&&
      (!["mental","fisico"].includes(x.area)||!Number.isInteger(x.minutos)||
       x.minutos<1||x.minutos>1440)) throw Error("Actividad inválida.");
   if(tipo==="metas"&&(!["personal","familiar"].includes(x.ambito)||
      typeof x.completado!=="boolean"))throw Error("Meta inválida.");
   if(tipo==="tareas"&&typeof x.completado!=="boolean")throw Error("Tarea inválida.");
  }
 }
 return {version:4,
  actividades:obj.actividades.map(x=>({id:x.id,nombre:x.nombre,fecha:x.fecha,area:x.area,minutos:x.minutos})),
  metas:obj.metas.map(x=>({id:x.id,nombre:x.nombre,fecha:x.fecha,ambito:x.ambito,completado:x.completado})),
  tareas:obj.tareas.map(x=>({id:x.id,nombre:x.nombre,fecha:x.fecha,completado:x.completado}))
 };
}
function v4Guardar(accion) {
 const previo=JSON.stringify(v4);
 try {
  accion();
  localStorage.setItem(V4_KEY,JSON.stringify(v4));
  v4Render();
 }catch(e) {
  v4=JSON.parse(previo);
  v4Render();
  alert("No se pudo guardar: "+e.message);
 }
}
function v4Elem(tag,clase,texto) {
 const x=document.createElement(tag);
 if(clase)x.className=clase;
 if(texto!==undefined)x.textContent=texto;
 return x;
}
function v4Pintar(tipo,destino) {
 const caja=v4El(destino);caja.replaceChildren();
 const items=[...v4[tipo]].sort((a,b)=>b.fecha.localeCompare(a.fecha));
 if(!items.length){caja.append(v4Elem("p","muted","Todavía no hay registros."));return;}
 for(const item of items) {
  const fila=v4Elem("div","v4-item");
  const main=v4Elem("div",item.completado?"v4-done":"");
  main.append(v4Elem("strong","",item.nombre));
  let sub=item.fecha;
  if(tipo==="actividades")sub+=` · ${item.area==="mental"?"🧠 Mental":"💪 Físico"} · ${item.minutos} minutos`;
  if(tipo==="metas")sub+=` · ${item.ambito==="personal"?"Personal":"Familiar"} · ${item.completado?"Completada":"Pendiente"}`;
  if(tipo==="tareas")sub+=` · ${item.completado?"Completada":"Pendiente"}`;
  main.append(v4Elem("small","",sub));
  const actions=v4Elem("div","v4-actions");
  if(tipo!=="actividades") {
   const cambiar=v4Elem("button","button secondary",item.completado?"Reabrir":"Completar");
   cambiar.type="button";
   cambiar.addEventListener("click",()=>v4Guardar(()=>{
    const actual=v4[tipo].find(x=>x.id===item.id);
    if(actual)actual.completado=!actual.completado;
   }));
   actions.append(cambiar);
  }
  const quitar=v4Elem("button","button secondary","Eliminar");quitar.type="button";
  quitar.addEventListener("click",()=>{
   if(!confirm(`¿Eliminar "${item.nombre}"? Descarga un respaldo antes de borrar registros.`))return;
   v4Guardar(()=>{v4[tipo]=v4[tipo].filter(x=>x.id!==item.id);});
  });
  actions.append(quitar);fila.append(main,actions);caja.append(fila);
 }
}
function v4Render(){
 v4Pintar("actividades","lista-actividades");
 v4Pintar("metas","lista-metas");
 v4Pintar("tareas","lista-tareas");
 const hoy=v4Hoy();
 const delMes=v4.actividades.filter(x=>x.fecha.slice(0,7)===hoy.slice(0,7));
 const minutos=delMes.reduce((sum,x)=>sum+x.minutos,0);
 v4El("actividades-resumen").textContent=
 `Este mes: ${delMes.length} actividades registradas · ${minutos} minutos acumulados.`;
}
function v4Agregar(tipo,item,form){
 if(v4[tipo].length>=V4_MAX){alert("Límite local de 500 registros por sección.");return;}
 v4Guardar(()=>v4[tipo].push({id:v4Id(),...item}));
 form.reset();
}
function v4Descargar(){
 const blob=new Blob([JSON.stringify({...v4,exportadoEn:new Date().toISOString()},null,2)],
                     {type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`mi-evolucion-modulos-v04-${v4Hoy()}.json`;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function v4Importar(evento){
 const file=evento.target.files?.[0];if(!file)return;
 try {
  if(file.size>3*1024*1024)throw Error("Archivo demasiado grande (máximo 3 MB).");
  const parsed=v4Validar(JSON.parse(await file.text()));
  if(!confirm("¿Reemplazar actividades, metas y tareas V0.4? Descarga primero el respaldo actual. Los hábitos V0.3 no se modificarán."))return;
  const previo=JSON.stringify(v4);
  try {localStorage.setItem(V4_KEY,JSON.stringify(parsed));v4=parsed;v4Render();}
  catch(e){v4=JSON.parse(previo);throw e;}
  alert("Respaldo de módulos V0.4 restaurado.");
 } catch(e) {alert("No se pudo importar: "+e.message);}
 finally {evento.target.value="";}
}
function iniciarV4(){
 try{
  const actual=localStorage.getItem(V4_KEY);
  v4=actual?v4Validar(JSON.parse(actual)):v4Nuevo();
 }catch(e){
  console.error(e);alert("Los datos V0.4 no pudieron leerse. No se borrarán ni reemplazarán. "+e.message);
  return;
 }
 for(const id of ["actividad-fecha","meta-fecha","tarea-fecha"])v4El(id).value=v4Hoy();
 v4El("form-actividad").addEventListener("submit",e=>{
  e.preventDefault();
  const nombre=v4El("actividad-nombre").value.trim(),area=v4El("actividad-area").value,
   fecha=v4El("actividad-fecha").value,minutos=Number(v4El("actividad-minutos").value);
  if(!nombre||nombre.length>80||!["mental","fisico"].includes(area)||
    !v4Fecha(fecha)||!Number.isInteger(minutos)||minutos<1||minutos>1440){alert("Verifica los datos de la actividad.");return;}
  v4Agregar("actividades",{nombre,area,fecha,minutos},e.target);
  v4El("actividad-fecha").value=v4Hoy();
 });
 v4El("form-meta").addEventListener("submit",e=>{
  e.preventDefault();
  const nombre=v4El("meta-nombre").value.trim(),ambito=v4El("meta-ambito").value,fecha=v4El("meta-fecha").value;
  if(!nombre||nombre.length>100||!["personal","familiar"].includes(ambito)||!v4Fecha(fecha)){alert("Verifica los datos de la meta.");return;}
  v4Agregar("metas",{nombre,ambito,fecha,completado:false},e.target);
  v4El("meta-fecha").value=v4Hoy();
 });
 v4El("form-tarea").addEventListener("submit",e=>{
  e.preventDefault();
  const nombre=v4El("tarea-nombre").value.trim(),fecha=v4El("tarea-fecha").value;
  if(!nombre||nombre.length>100||!v4Fecha(fecha)){alert("Verifica la tarea.");return;}
  v4Agregar("tareas",{nombre,fecha,completado:false},e.target);
  v4El("tarea-fecha").value=v4Hoy();
 });
 v4El("v4-exportar").addEventListener("click",v4Descargar);
 v4El("v4-importar").addEventListener("click",()=>v4El("v4-archivo").click());
 v4El("v4-archivo").addEventListener("change",v4Importar);
 v4Render();
}
