/* Almacenamiento local y migración de V0.2 a V0.3. No altera la clave antigua. */
"use strict";
window.EvoStorage = (() => {
 const KEY3="mi_evolucion_habitos_v03", KEY2="mi_evolucion_habitos_v02";
 const CATS=["mental","fisico","emocional","personal","familiar"];
 const ALL=[0,1,2,3,4,5,6]; // lunes=0 ... domingo=6
 function isoLocal(date=new Date()){
   return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
 }
 function fromISO(s){
   const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");
   if(!m)return null;
   const d=new Date(+m[1],+m[2]-1,+m[3]);
   return isoLocal(d)===s?d:null;
 }
 function defaults(){
   // La aplicación comienza vacía: cada persona crea sus propios hábitos.
   return {version:3,habitos:[],registros:{}};
 }
 function limpiarHabitosDeEjemplo(data){
   // Retira únicamente los cinco hábitos de demostración de versiones anteriores.
   // Conserva íntegros todos los hábitos y registros creados por la persona.
   const ids=new Set(data.habitos
     .filter(h=>/^inicial-[1-5]$/.test(h.id))
     .map(h=>h.id));
   if(!ids.size)return data;
   data.habitos=data.habitos.filter(h=>!ids.has(h.id));
   for(const fecha of Object.keys(data.registros)){
     for(const id of ids)delete data.registros[fecha][id];
     if(!Object.keys(data.registros[fecha]).length)delete data.registros[fecha];
   }
   return data;
 }
 function check(data){
   if(!data||typeof data!=="object"||data.version!==3||!Array.isArray(data.habitos)||
      data.habitos.length>5000||!data.registros||typeof data.registros!=="object"||
      Array.isArray(data.registros))throw Error("El JSON no tiene estructura V0.3 válida.");
   const ids=new Set();
   for(const h of data.habitos){
     if(!h||typeof h.id!=="string"||!/^[a-zA-Z0-9_-]{1,100}$/.test(h.id)||
       ids.has(h.id)||typeof h.nombre!=="string"||!h.nombre.trim()||h.nombre.length>80||
       !CATS.includes(h.categoria)||!fromISO(h.creado)||
       !(h.archivado===null||fromISO(h.archivado))||
       (h.archivado && h.archivado<h.creado)||!Array.isArray(h.segmentos)||
       !h.segmentos.length||h.segmentos.length>1000)throw Error("Hay un hábito inválido.");
     ids.add(h.id);
     let anterior="";
     for(const seg of h.segmentos){
       if(!seg||!fromISO(seg.desde)||seg.desde<h.creado||seg.desde<=anterior||
          !Array.isArray(seg.dias)||seg.dias.length<1||seg.dias.length>7||
          new Set(seg.dias).size!==seg.dias.length||
          !seg.dias.every(n=>Number.isInteger(n)&&n>=0&&n<=6))
            throw Error("La programación de un hábito es inválida.");
       anterior=seg.desde;
     }
     if(h.segmentos[0].desde!==h.creado)throw Error("La fecha inicial de un hábito es incorrecta.");
   }
   if(Object.keys(data.registros).length>20000)throw Error("Demasiadas fechas en el respaldo.");
   for(const [fecha,registro] of Object.entries(data.registros)){
     if(!fromISO(fecha)||!registro||typeof registro!=="object"||Array.isArray(registro))throw Error("Fecha o registro inválido.");
     for(const [id,val] of Object.entries(registro)){
       if(!ids.has(id)||val!==true)throw Error("El respaldo contiene un registro desconocido.");
     }
   }
   return {version:3,habitos:data.habitos,registros:data.registros};
 }
 function migrate(old){
   if(!old||old.version!==2||!Array.isArray(old.habitos)||!old.registros||
      typeof old.registros!=="object"||Array.isArray(old.registros))throw Error("Datos V0.2 inválidos.");
   const nuevo={version:3,habitos:old.habitos.map(h=>({
     id:h.id,nombre:h.nombre,categoria:h.categoria,creado:h.creado,
     archivado:null,segmentos:[{desde:h.creado,dias:[...ALL]}]
   })),registros:old.registros};
   return check(nuevo);
 }
 function read(){
   // Inicio limpio de una sola vez: elimina los datos de demostración que ya
   // estaban guardados en este navegador. Después, los datos nuevos se conservan.
   const CLEAN_KEY="mi_evolucion_inicio_limpio_v1";
   if(localStorage.getItem(CLEAN_KEY)!=="1"){
     localStorage.removeItem(KEY3);
     localStorage.removeItem(KEY2);
     localStorage.setItem(CLEAN_KEY,"1");
   }
   const raw=localStorage.getItem(KEY3);
   if(raw!==null){
     const data=limpiarHabitosDeEjemplo(check(JSON.parse(raw)));
     save(data);
     return {data,origen:"v03"};
   }
   const raw2=localStorage.getItem(KEY2);
   if(raw2!==null){
     const data=limpiarHabitosDeEjemplo(migrate(JSON.parse(raw2)));
     // Si no puede guardarse la versión nueva, avisamos y no operamos sin persistencia.
     save(data);
     return {data,origen:"migrado"};
   }
   const data=defaults();save(data);
   return {data,origen:"nuevo"};
 }
 function save(data){
   const limpio=check(data);
   localStorage.setItem(KEY3,JSON.stringify(limpio));
 }
 return {KEY3,KEY2,ALL,CATS,isoLocal,fromISO,check,migrate,read,save};
})();
