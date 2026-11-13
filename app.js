"use strict";
/* MI EVOLUCIÓN V0.3: UI, calendario, tracker, estadísticas y backups. */
document.addEventListener("DOMContentLoaded", iniciar);
const S=window.EvoStorage;
const CAT={mental:"🧠 Mental",fisico:"💪 Físico",emocional:"❤️ Emocional",personal:"🌱 Personal",familiar:"👨‍👩‍👧‍👦 Familiar"};
const DAYS=["L","M","M","J","V","S","D"],DAY_NAMES=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
let datos,seleccionada,mesVista;

function el(id){return document.getElementById(id);}
function hoy(){return S.isoLocal();}
function fechaTexto(iso){return S.fromISO(iso).toLocaleDateString("es-BO",{day:"2-digit",month:"short",year:"numeric"});}
function diaSemana(date){return (date.getDay()+6)%7;}
function fechaMes(year,month,day){return S.isoLocal(new Date(year,month,day));}
function notify(msg){el("aviso").textContent=msg;el("aviso").hidden=false;setTimeout(()=>{if(el("aviso").textContent===msg)el("aviso").hidden=true;},6500);}
function guardadoSeguro(cambio){
 const anterior=JSON.stringify(datos);
 try{cambio();S.save(datos);actualizar();return true;}
 catch(err){datos=JSON.parse(anterior);actualizar();alert("No se guardó el cambio: "+err.message);return false;}
}
function diasElegidos(prefijo){return [...document.querySelectorAll(`#${prefijo} input:checked`)].map(x=>Number(x.value)).sort();}
function crearOpcionesDias(id,days=S.ALL){
 const destino=el(id);destino.replaceChildren();
 DAY_NAMES.forEach((nombre,i)=>{
   const lab=document.createElement("label");lab.className="day-option";
   const input=document.createElement("input");input.type="checkbox";input.value=String(i);input.checked=days.includes(i);
   lab.append(input,document.createTextNode(nombre));destino.appendChild(lab);
 });
}
function scheduleAt(h,iso){
 if(iso<h.creado||(h.archivado&&iso>=h.archivado))return false;
 let seg=null;for(const s of h.segmentos){if(s.desde<=iso)seg=s;else break;}
 if(!seg)return false;
 return seg.dias.includes(diaSemana(S.fromISO(iso)));
}
function habitsAt(iso){return datos.habitos.filter(h=>scheduleAt(h,iso));}
function completed(h,iso){return datos.registros[iso]?.[h.id]===true;}
function summary(iso){
 const hs=habitsAt(iso),done=hs.filter(h=>completed(h,iso)).length;
 return {total:hs.length,done,pct:hs.length?Math.round(done*100/hs.length):null};
}
function dateAdd(iso,n){let d=S.fromISO(iso);d.setDate(d.getDate()+n);return S.isoLocal(d);}
function habitoActivo(h){return !h.archivado;}
function inicio(){
 try{
   const r=S.read();datos=r.data;
   if(r.origen==="migrado")notify("✅ Datos V0.2 migrados. El almacenamiento anterior sigue intacto. Descarga un JSON V0.3.");
 }catch(e){
   console.error(e);
   alert("Error al leer datos locales. NO hemos borrado nada. Conserva tus JSON y revisa la consola. "+e.message);
   return;
 }
 seleccionada=hoy();mesVista=new Date(S.fromISO(hoy()).getFullYear(),S.fromISO(hoy()).getMonth(),1);
 el("hoy-etiqueta").textContent=new Date().toLocaleDateString("es-BO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 el("fecha-registro").value=seleccionada;
 crearOpcionesDias("dias-crear");
 crearOpcionesDias("dias-editar");
 el("fecha-registro").addEventListener("change",e=>{if(S.fromISO(e.target.value))setFecha(e.target.value);else e.target.value=seleccionada;});
 el("volver-hoy").addEventListener("click",()=>setFecha(hoy()));
 el("formulario-habito").addEventListener("submit",crearHabito);
 el("formulario-editar").addEventListener("submit",guardarEdicion);
 el("cancelar-edicion").addEventListener("click",()=>el("modal-editar").close());
 el("mes-anterior").addEventListener("click",()=>moverMes(-1));
 el("mes-siguiente").addEventListener("click",()=>moverMes(1));
 el("exportar-json").addEventListener("click",exportJSON);
 el("exportar-csv").addEventListener("click",exportCSV);
 el("importar-json").addEventListener("click",()=>el("archivo-importar").click());
 el("archivo-importar").addEventListener("change",importJSON);
 actualizar();
}
function iniciar(){inicio();}
function setFecha(iso){
 seleccionada=iso;el("fecha-registro").value=iso;
 const d=S.fromISO(iso);mesVista=new Date(d.getFullYear(),d.getMonth(),1);
 actualizar();
}
function moverMes(dir){mesVista=new Date(mesVista.getFullYear(),mesVista.getMonth()+dir,1);actualizar();}
function actualizar(){
 renderHabits();renderArchive();renderMetrics();renderTracker();renderCalendar();renderStats();renderHistory();
}
function button(text,cls,handler){
 const b=document.createElement("button");b.type="button";b.className=`button ${cls}`;b.textContent=text;b.addEventListener("click",handler);return b;
}
function renderHabits(){
 const list=el("lista-habitos");list.replaceChildren();
 const hs=habitsAt(seleccionada);
 el("mensaje-vacio").hidden=hs.length!==0;
 hs.forEach(h=>{
  const div=document.createElement("div");div.className="habit-item";
  const lab=document.createElement("label");lab.className="habit-check";
  const cb=document.createElement("input");cb.type="checkbox";cb.checked=completed(h,seleccionada);
  cb.addEventListener("change",()=>guardadoSeguro(()=>{
    if(cb.checked){datos.registros[seleccionada]??={};datos.registros[seleccionada][h.id]=true;}
    else {if(datos.registros[seleccionada]){delete datos.registros[seleccionada][h.id];
        if(!Object.keys(datos.registros[seleccionada]).length)delete datos.registros[seleccionada];}}
  }));
  const txt=document.createElement("span");txt.className="habit-text";
  const name=document.createElement("strong");name.textContent=h.nombre;
  const sub=document.createElement("small");sub.textContent=CAT[h.categoria]+" · "+frecuencia(h,seleccionada);
  const streak=document.createElement("small");
  streak.className="habit-streak";
  streak.textContent=`🔥 Racha individual: ${habitStreak(h)} ${h.segmentos.at(-1).dias.length===7?"días":"sesiones programadas"}`;
  txt.append(name,sub,streak);lab.append(cb,txt);div.append(lab);
  if(habitoActivo(h)){
    const actions=document.createElement("div");actions.className="row-actions";
    actions.append(button("Editar","secondary",()=>abrirEdicion(h.id)),
                   button("Archivar","danger",()=>archivar(h.id)));
    div.append(actions);
  }
  list.append(div);
 });
}
function frecuencia(h,iso){
 let seg=h.segmentos[0];for(const s of h.segmentos){if(s.desde<=iso)seg=s;else break;}
 return seg.dias.length===7?"Diario":seg.dias.map(i=>DAY_NAMES[i]).join(", ");
}
function crearHabito(e){
 e.preventDefault();
 const nombre=el("nombre-habito").value.trim(),cat=el("categoria-habito").value,dias=diasElegidos("dias-crear");
 if(!nombre||nombre.length>80||!CAT[cat]||!dias.length){alert("Indica nombre, categoría y al menos un día.");return;}
 if(datos.habitos.some(h=>!h.archivado&&h.nombre.toLowerCase()===nombre.toLowerCase())){
   alert("Ya existe un hábito activo con ese nombre.");return;
 }
 const start=hoy(),id="h-"+crypto.randomUUID();
 if(guardadoSeguro(()=>datos.habitos.push({id,nombre,categoria:cat,creado:start,archivado:null,segmentos:[{desde:start,dias}]}))){
   el("formulario-habito").reset();crearOpcionesDias("dias-crear");setFecha(start);notify("✅ Hábito creado.");
 }
}
function abrirEdicion(id){
 const h=datos.habitos.find(x=>x.id===id);if(!h||h.archivado)return;
 el("editar-id").value=id;el("editar-nombre").value=h.nombre;el("editar-categoria").value=h.categoria;
 let seg=h.segmentos[0];for(const s of h.segmentos){if(s.desde<=hoy())seg=s;}
 crearOpcionesDias("dias-editar",seg.dias);
 el("modal-editar").showModal();
}
function guardarEdicion(e){
 e.preventDefault();
 const h=datos.habitos.find(x=>x.id===el("editar-id").value);
 if(!h||h.archivado)return;
 const nombre=el("editar-nombre").value.trim(),categoria=el("editar-categoria").value,dias=diasElegidos("dias-editar");
 if(!nombre||nombre.length>80||!CAT[categoria]||!dias.length){alert("Revisa los campos y selecciona al menos un día.");return;}
 if(datos.habitos.some(x=>x.id!==h.id&&!x.archivado&&x.nombre.toLowerCase()===nombre.toLowerCase())){
  alert("Ya existe otro hábito activo con ese nombre.");return;
 }
 const ok=guardadoSeguro(()=>{
  h.nombre=nombre;h.categoria=categoria;
  const last=h.segmentos[h.segmentos.length-1];
  if(JSON.stringify(last.dias)!==JSON.stringify(dias)){
   const fecha=hoy();
   if(last.desde===fecha)last.dias=dias;
   else if(last.desde<fecha)h.segmentos.push({desde:fecha,dias});
   // No se modifica la programación futura previa.
  }
 });
 if(ok){el("modal-editar").close();notify("✅ Hábito actualizado. Historial de programación conservado.");}
}
function archivar(id){
 const h=datos.habitos.find(x=>x.id===id);if(!h||h.archivado)return;
 const mensaje=`¿Archivar "${h.nombre}" desde hoy?\n\nSus registros anteriores se conservarán, pero dejará de programarse.`;
 if(!confirm(mensaje))return;
 if(guardadoSeguro(()=>{h.archivado=hoy();})){notify("🗄️ Hábito archivado; historial conservado.");}
}
function renderArchive(){
 const list=el("lista-archivados");list.replaceChildren();
 const hs=datos.habitos.filter(h=>h.archivado);
 el("archivados-cantidad").textContent=`(${hs.length})`;
 hs.forEach(h=>{
  const div=document.createElement("div");div.className="habit-item";
  const txt=document.createElement("span");txt.className="habit-text";
  const strong=document.createElement("strong");strong.textContent=h.nombre;
  const small=document.createElement("small");small.textContent=`Archivado el ${fechaTexto(h.archivado)}`;
  txt.append(strong,small);
  div.append(txt,button("Reactivar","secondary",()=>reactivar(h.id)));
  list.append(div);
 });
}
function reactivar(id){
 const viejo=datos.habitos.find(x=>x.id===id);if(!viejo||!viejo.archivado)return;
 if(datos.habitos.some(h=>!h.archivado&&h.nombre.toLowerCase()===viejo.nombre.toLowerCase())){
   alert("Existe otro hábito activo con ese nombre. Cambia ese nombre primero.");return;
 }
 if(!confirm(`¿Reactivar "${viejo.nombre}"?\n\nSe creará una nueva etapa a partir de hoy; el archivo histórico se conserva.`))return;
 // Crear un nuevo ID, no reabrir uno cerrado: así los periodos anteriores quedan inmutables.
 const ultimo=viejo.segmentos[viejo.segmentos.length-1];
 const start=hoy();
 if(guardadoSeguro(()=>datos.habitos.push({
   id:"h-"+crypto.randomUUID(),nombre:viejo.nombre,categoria:viejo.categoria,
   creado:start,archivado:null,segmentos:[{desde:start,dias:[...ultimo.dias]}]
 })))notify("✅ Nuevo periodo activo creado. El historial archivado permanece separado.");
}
function renderMetrics(){
 const r=summary(seleccionada);
 el("habitos-total").textContent=r.total;el("habitos-completados").textContent=r.done;
 el("porcentaje").textContent=r.pct===null?"—":r.pct+"%";
 el("progreso-relleno").style.width=(r.pct??0)+"%";
 el("progreso-texto").textContent=(r.pct===null?"Sin hábitos programados":r.pct+"% completado")+" · "+fechaTexto(seleccionada);
 el("racha").textContent=generalStreak()+" días";
}
function generalStreak(){
 let iso=hoy(),streak=0,started=false;
 // Se tolera que el día de hoy aún no esté completo.
 for(let i=0;i<3660;i++,iso=dateAdd(iso,-1)){
   const r=summary(iso);
   if(!r.total) {if(started)break;continue;}
   if(r.done===r.total){streak++;started=true;}
   else if(i===0)continue;
   else break;
 }
 return streak;
}
function habitStreak(h){
 let iso=hoy(),count=0,seen=false;
 for(let i=0;i<3660;i++,iso=dateAdd(iso,-1)){
   if(iso<h.creado)break;
   if(!scheduleAt(h,iso))continue;
   if(completed(h,iso)){count++;seen=true;}
   else if(!seen && iso===hoy())continue;
   else break;
 }
 return count;
}
function renderTracker(){
 const year=mesVista.getFullYear(),mon=mesVista.getMonth();
 el("nombre-mes").textContent=mesVista.toLocaleDateString("es-BO",{month:"long",year:"numeric"});
 const totalDays=new Date(year,mon+1,0).getDate(),table=el("tracker-tabla");
 table.replaceChildren();
 const head=document.createElement("thead"),row=document.createElement("tr");
 for(const value of ["Hábito",...Array.from({length:totalDays},(_,i)=>String(i+1)),"%"]){
  const th=document.createElement("th");th.textContent=value;row.append(th);
 }head.append(row);table.append(head);
 const body=document.createElement("tbody");
 const first=fechaMes(year,mon,1),last=fechaMes(year,mon,totalDays);
 // Incluir hábitos históricos cuando alguna fecha de este mes estuvo programada.
 const hs=datos.habitos.filter(h=>h.creado<=last&&(!h.archivado||h.archivado>first));
 for(const h of hs){
  const tr=document.createElement("tr"),label=document.createElement("td");label.textContent=h.nombre;tr.append(label);
  let total=0,done=0;
  for(let i=1;i<=totalDays;i++){
   const date=fechaMes(year,mon,i),td=document.createElement("td");
   if(scheduleAt(h,date)){
    total++;
    if(completed(h,date)){td.textContent="✓";td.className="yes";done++;}
    else if(date<=hoy()){td.textContent="○";td.className="no";}
    else{td.textContent="·";td.className="na";}
   }else{td.textContent="—";td.className="na";}
   tr.append(td);
  }
  const pct=document.createElement("td");pct.className="total";pct.textContent=total?Math.round(done*100/total)+"%":"—";tr.append(pct);body.append(tr);
 }
 if(!hs.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=totalDays+2;td.textContent="Sin hábitos para este mes.";tr.append(td);body.append(tr);}
 table.append(body);
}
function renderCalendar(){
 const c=el("calendario-grid");c.replaceChildren();
 for(const d of DAYS){const label=document.createElement("div");label.className="weekday";label.textContent=d;c.append(label);}
 const year=mesVista.getFullYear(),mon=mesVista.getMonth(),first=new Date(year,mon,1),end=new Date(year,mon+1,0).getDate();
 for(let n=0;n<diaSemana(first);n++)c.append(document.createElement("div"));
 for(let n=1;n<=end;n++){
  const iso=fechaMes(year,mon,n),r=summary(iso),b=document.createElement("button");
  b.type="button";b.className="day";if(r.pct===100)b.classList.add("full");
  else if(r.done>0)b.classList.add("partial");
  if(iso===seleccionada)b.classList.add("current");
  const num=document.createElement("span"),small=document.createElement("small");
  num.textContent=String(n);small.textContent=r.pct===null?"—":r.pct+"%";b.append(num,small);
  b.title=fechaTexto(iso)+" — "+(r.pct===null?"sin programación":r.pct+"%");
  b.addEventListener("click",()=>{setFecha(iso);el("habitos").scrollIntoView({behavior:"smooth"});});
  c.append(b);
 }
}
function renderStats(){
 const year=mesVista.getFullYear(),mon=mesVista.getMonth(),len=new Date(year,mon+1,0).getDate();
 let total=0,done=0;
 for(let n=1;n<=len;n++){const date=fechaMes(year,mon,n);if(date>hoy())break;
   const s=summary(date);total+=s.total;done+=s.done;
 }
 el("mes-porcentaje").textContent=total?Math.round(done*100/total)+"%":"—";
 el("mes-cantidad").textContent=`${done} / ${total}`;
 const list=el("rachas-individuales");list.replaceChildren();
 const hs=datos.habitos.filter(h=>!h.archivado);
 if(!hs.length){list.textContent="Sin hábitos activos.";return;}
 hs.forEach(h=>{
  const row=document.createElement("div");row.className="streak-row";
  const name=document.createElement("span");name.textContent=h.nombre;
  const v=document.createElement("strong");v.textContent=habitStreak(h)+" días programados";
  row.append(name,v);list.append(row);
 });
}
function renderHistory(){
 const body=el("tabla-historial");body.replaceChildren();
 let date=seleccionada;
 for(let i=0;i<7;i++,date=dateAdd(date,-1)){
  const r=summary(date),tr=document.createElement("tr");
  for(const v of [fechaTexto(date),r.total,r.done,r.pct===null?"—":r.pct+"%"]){
   const td=document.createElement("td");td.textContent=String(v);tr.append(td);
  }body.append(tr);
 }
}
function descargar(nombre,contenido,tipo){
 const blob=new Blob([contenido],{type:tipo}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=nombre;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function exportJSON(){
 descargar(`mi-evolucion-v03-${hoy()}.json`,JSON.stringify({...datos,exportadoEn:new Date().toISOString()},null,2),"application/json");
 notify("✅ Respaldo descargado. Guarda una copia fuera de esta carpeta de código.");
}
function csvValue(value){
 const s=String(value??"");return '"'+s.replaceAll('"','""')+'"';
}
function exportCSV(){
 const year=mesVista.getFullYear(),mon=mesVista.getMonth(),len=new Date(year,mon+1,0).getDate();
 const rows=[["Fecha","ID hábito","Hábito","Categoría","Programado","Completado"]];
 for(let n=1;n<=len;n++){
  const iso=fechaMes(year,mon,n);if(iso>hoy())break;
  for(const h of datos.habitos){
   if(!scheduleAt(h,iso))continue;
   rows.push([iso,h.id,h.nombre,h.categoria,"SI",completed(h,iso)?"SI":"NO"]);
  }
 }
 descargar(`habit-tracker-${year}-${String(mon+1).padStart(2,"0")}.csv`,"\uFEFF"+rows.map(r=>r.map(csvValue).join(",")).join("\r\n"),"text/csv;charset=utf-8");
 notify("✅ CSV del mes visible exportado. El JSON contiene el historial completo.");
}
async function importJSON(e){
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error("Archivo demasiado grande (máximo 5 MB).");
  const parsed=JSON.parse(await file.text());
  const cleaned=parsed.version===2?S.migrate(parsed):S.check(parsed);
  if(!confirm(`¿Importar ${cleaned.habitos.length} hábitos?\n\nSe reemplazarán TODOS los hábitos y registros V0.3 del navegador. Descarga antes tu JSON actual.`))return;
  S.save(cleaned);datos=cleaned;setFecha(hoy());notify("✅ Respaldo restaurado correctamente.");
 }catch(err){console.error(err);alert("No se pudo importar: "+err.message);}
 finally{e.target.value="";}
}
