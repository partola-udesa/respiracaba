/* =====================================================================
   RESPIRA — Comportamiento de la app
   Todo lo que PASA cuando el runner toca algo (= el modo Prototype de Figma,
   pero con memoria y lógica). Está ordenado como el recorrido del usuario.

   Dónde entra la IA: buscá "[API IA]" en este archivo. Las que dicen
   FUERA DE ALCANCE son ideas que se decidió no hacer por ahora (ver decisiones.md).
   ===================================================================== */

/* ---------- 1. ESTADO: la memoria de la app ----------
   Tip: en la consola de Chrome (Cmd + Opción + J) escribí  estado  y Enter para verla. */
const estado = {
  pantalla: 'splash',
  historial: [],
  perfil:   { nombre: '', apellido: '', foto: null, edad: 26, altura: 1.67, peso: 58, nivel: null, objetivo: null, alergias: [] },
  busqueda: { partida: null, llegada: null, circular: false, km: null, programar: false, fecha: null, hora: null },
  condiciones: new Set(CONDICIONES.filter(c => c.elegida).map(c => c.id)),
  origen: {},              // v11: de dónde vino cada condición: 'base' | 'perfil' | 'contanos' | 'manual'
  condicionesTocadas: false,   // si el runner o el "Contanos" ya eligieron, el perfil no las pisa
  clima: null,             // la hora del pronóstico que corresponde a la salida (Open-Meteo)
  recorridos: [],          // las tres opciones calculadas
  elegido: 0,              // índice de la opción elegida en el mapa / la lista
  corrida:  { sensacion: null, cumplio: null, ambiente: [], comentario: '' }
};
window.estado = estado;

let perfilGuardado = null;
try { perfilGuardado = JSON.parse(localStorage.getItem('respira-perfil')); } catch (e) { perfilGuardado = null; }
if (perfilGuardado) Object.assign(estado.perfil, perfilGuardado);
function guardarPerfil() { try { localStorage.setItem('respira-perfil', JSON.stringify(estado.perfil)); } catch (e) { /* modo privado */ } }

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const conComa = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');   // 5 → "5,0"
const pantallaActual = () => document.getElementById(estado.pantalla);
const icono = (id, clase = '') => `<svg class="icono ${clase}"><use href="#i-${id}"/></svg>`;
const escapar = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 2. ENCABEZADO flotante (volver · RESPIRA · avatar) ---------- */
$$('.pantalla[data-encabezado]').forEach(p => p.insertAdjacentHTML('afterbegin', `
  <header class="header">
    <button class="circulo vidrio" data-volver aria-label="Volver">${icono('volver')}</button>
    <span class="header__marca">RESPIRA</span>
    <button class="circulo vidrio avatar" data-ir="perfil" aria-label="Mi perfil">${icono('perfil')}</button>
  </header>`));
function dibujarAvatares() {
  const p = estado.perfil;
  $$('.avatar').forEach(b => { b.innerHTML = p.foto ? `<img src="${p.foto}" alt="">` : icono('perfil'); });
}

/* ---------- 3. NAVEGACIÓN ----------
   irA('inicio') = "Navigate to". volver() = "Back" (también con el gesto atrás del celular y con Esc). */
const selectores = [];   // ruedas y balanza: se acomodan cuando aparece su pantalla
const alMostrar = {};    // cosas que hay que hacer cuando aparece una pantalla (p. ej. ajustar el mapa)

function mostrar(id, { atras = false } = {}) {
  if (typeof cerrarAyuda === 'function') cerrarAyuda();   // el globo ⓘ no queda abierto al cambiar de pantalla
  if (globalThis.cerrarPin) cerrarPin();                    // ni el mapa de "marcá en el mapa" 
  $$('.pantalla').forEach(p => { p.hidden = (p.id !== id); });
  estado.pantalla = id;
  const pantalla = pantallaActual();
  pantalla.classList.toggle('saliendo-atras', atras);
  const sinVolver = pantalla.hasAttribute('data-sin-volver') || estado.historial.length === 0;
  pantalla.querySelectorAll('[data-volver]').forEach(b => b.classList.toggle('invisible', sinVolver));
  pantalla.querySelectorAll('.contenido').forEach(c => { c.scrollTop = 0; });
  const propios = selectores.filter(r => pantalla.contains(r.lugar));
  propios.forEach(r => r.control.sincronizar());
  requestAnimationFrame(() => propios.forEach(r => r.control.sincronizar()));   // otra vez cuando ya tienen ancho
  if (alMostrar[id]) alMostrar[id]();
}

function irA(id, { reemplazar = false } = {}) {
  if (!document.getElementById(id)) { console.warn(`La pantalla "${id}" todavía no existe.`); return; }
  if (id === estado.pantalla) return;
  if (!reemplazar && estado.historial[estado.historial.length - 1] === id) return volver();   // ir a la anterior = volver
  if (reemplazar) history.replaceState({ pantalla: id }, '');
  else { estado.historial.push(estado.pantalla); history.pushState({ pantalla: id }, ''); }
  mostrar(id);
}

function volver() {
  cerrarFlotantes();
  if (estado.historial.length) history.back();  // dispara "popstate"
}
window.addEventListener('popstate', () => { if (estado.historial.length) mostrar(estado.historial.pop(), { atras: true }); });

function irAlInicio() {
  estado.historial = [];
  history.replaceState({ pantalla: 'inicio' }, '');
  mostrar('inicio');
}

document.addEventListener('click', e => {
  const ir = e.target.closest('[data-ir]');
  if (ir) return irA(ir.dataset.ir);
  if (e.target.closest('[data-volver]')) return volver();
});

/* ---------- 4. TECLADO (compu) ----------
   Enter = acción principal de la pantalla (botón con data-enter). Esc = cerrar lo abierto o volver. */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (estado.pantalla === 'splash') { e.preventDefault(); return salirDelSplash(); }
    if (e.defaultPrevented) return;
    const etiqueta = e.target.tagName;
    if (['BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(etiqueta) || e.target.getAttribute('role') === 'button') return;
    const principal = globalThis.pinAbierto && pinAbierto() ? $('#pin-usar') : pantallaActual().querySelector('[data-enter]');
    if (principal && !principal.disabled) { e.preventDefault(); principal.click(); }
  }
  if (e.key === 'Escape') { e.preventDefault(); if (!cerrarFlotantes()) volver(); }
});

/* ---------- 5. PIEZAS QUE SE REPITEN ---------- */

// 5·0. Dictado por voz con el reconocimiento del navegador (Chrome y Safari). Se usa en "Contanos" y en el comentario.
// [API IA] FUERA DE ALCANCE (decisiones.md, 3/11/2026) — Whisper para navegadores sin dictado.
const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
function conectarDictado(boton, texto, aviso, alTerminar) {
  let dictado = null, dijo = false, fallo = false;
  boton.addEventListener('click', () => {
    if (!Reconocimiento) { aviso.hidden = false; aviso.textContent = 'Tu navegador no permite dictar. Probá desde Chrome o Safari, o escribilo.'; return; }
    if (dictado) { dictado.stop(); return; }
    dictado = new Reconocimiento();
    dictado.lang = 'es-AR'; dictado.interimResults = false; dijo = false; fallo = false;
    const base = texto.value;
    dictado.onresult = e => { dijo = true; texto.value = (base ? base + ' ' : '') + [...e.results].map(r => r[0].transcript).join(' '); };
    dictado.onerror = e => { fallo = true; aviso.hidden = false; aviso.textContent = e.error === 'not-allowed' ? 'Para dictar, permití el uso del micrófono.' : 'No se pudo usar el micrófono. Probá de nuevo.'; };
    dictado.onend = () => { dictado = null; boton.setAttribute('aria-pressed', 'false'); if (!fallo) aviso.hidden = true; if (dijo && alTerminar) alTerminar(); };
    boton.setAttribute('aria-pressed', 'true'); aviso.hidden = false; aviso.textContent = 'Te escuchamos… tocá de nuevo para terminar.';
    dictado.start();
  });
}

// 5a. Chips: data-tipo="uno" (una opción) o "varios" (varias). Guardan en el estado según data-grupo.
const DESTINO_CHIPS = { nivel: () => estado.perfil, alergias: () => estado.perfil, sensacion: () => estado.corrida, cumplio: () => estado.corrida };
$$('[data-grupo]').forEach(grupo => grupo.addEventListener('click', e => {
  const chip = e.target.closest('[data-valor]');
  if (!chip) return;
  const nombre = grupo.dataset.grupo, destino = DESTINO_CHIPS[nombre]();
  const estaba = chip.getAttribute('aria-pressed') === 'true';
  if (grupo.dataset.tipo === 'uno') {
    grupo.querySelectorAll('[data-valor]').forEach(c => c.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', String(!estaba));
    destino[nombre] = estaba ? null : chip.dataset.valor;
  } else {
    chip.setAttribute('aria-pressed', String(!estaba));
    // "Ninguna" (alergias) no se puede combinar con las demás
    if (chip.dataset.valor === 'ninguna' && !estaba) grupo.querySelectorAll('[data-valor]:not([data-valor="ninguna"])').forEach(c => c.setAttribute('aria-pressed', 'false'));
    else if (chip.dataset.valor !== 'ninguna' && !estaba) grupo.querySelector('[data-valor="ninguna"]')?.setAttribute('aria-pressed', 'false');
    destino[nombre] = [...grupo.querySelectorAll('[aria-pressed="true"]')].map(c => c.dataset.valor);
  }
}));
function marcarChips(grupo, valores) {
  const lista = [].concat(valores || []);
  $$(`[data-grupo="${grupo}"] [data-valor]`).forEach(c => c.setAttribute('aria-pressed', String(lista.includes(c.dataset.valor))));
}

// 5b. Globos de información (ícono "i").
$$('.info__boton').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  const globo = document.getElementById(b.getAttribute('aria-controls'));
  globo.hidden = !globo.hidden;
  b.setAttribute('aria-expanded', String(!globo.hidden));
}));

// 5c. Ruedas de números y balanza.
function crearSelector(tipo, nombre, opciones) {
  const lugar = document.querySelector(`[data-${tipo}="${nombre}"]`);
  const control = tipo === 'balanza' ? RespiraSelectores.balanza(lugar, opciones) : RespiraSelectores.ruedaHorizontal(lugar, opciones);
  selectores.push({ lugar, control });
  return control;
}
const rango = (desde, hasta, paso = 1) => Array.from({ length: Math.round((hasta - desde) / paso) + 1 }, (_, i) => Math.round((desde + i * paso) * 100) / 100);

// 5d. Cerrar todo lo flotante (sugerencias, globos, hoja abierta). Devuelve true si cerró algo.
function cerrarFlotantes() {
  let cerro = false;
  $$('.sugerencias:not([hidden]), .info__globo:not([hidden])').forEach(el => { el.hidden = true; cerro = true; });
  if (cerrarAyuda()) cerro = true;
  if (globalThis.cerrarFichaArchivo && cerrarFichaArchivo()) cerro = true;
  if (globalThis.cerrarPin && cerrarPin()) cerro = true;
  $$('.info__boton').forEach(b => b.setAttribute('aria-expanded', 'false'));
  $$('[role="combobox"]').forEach(i => i.setAttribute('aria-expanded', 'false'));
  if (estado.pantalla === 'detalle' && hojaDetalle.abierta) { hojaDetalle.alternar(false); cerro = true; }
  return cerro;
}
document.addEventListener('click', e => {
  if (!e.target.closest('.info__boton, .info__globo')) $$('.info__globo').forEach(g => g.hidden = true);
  if (!e.target.closest('.ayuda, #globo-ayuda')) cerrarAyuda();
});

/* 5·1. ⓘ AYUDA (devolución de la Entrega 3): las variables de respirabilidad se muestran interpretadas
   ("Tranquilo", "Muy verde") y el dato duro queda a un toque, en un globo que no le quita lugar al runner.
   Uso: ayuda('texto del globo') → devuelve el botón ⓘ. */
const ayuda = (texto, etiqueta = 'Ver el dato') => `<button class="ayuda" type="button" data-ayuda="${escapar(texto)}" aria-label="${escapar(etiqueta)}" aria-expanded="false">${icono('info')}</button>`;
document.body.insertAdjacentHTML('beforeend', '<div class="globo-ayuda" id="globo-ayuda" role="tooltip" hidden></div>');
function cerrarAyuda() { const g = $('#globo-ayuda'); if (!g || g.hidden) return false; g.hidden = true; $$('.ayuda[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); return true; }
document.addEventListener('click', e => {
  const b = e.target.closest('.ayuda'); if (!b) return;
  e.stopPropagation();
  const g = $('#globo-ayuda'), abierto = b.getAttribute('aria-expanded') === 'true';
  cerrarAyuda(); if (abierto) return;
  g.textContent = b.dataset.ayuda; g.hidden = false; b.setAttribute('aria-expanded', 'true');
  const app = $('#app').getBoundingClientRect(), r = b.getBoundingClientRect();
  const ancho = Math.min(260, app.width - 32);
  g.style.width = ancho + 'px';
  g.style.left = Math.max(app.left + 16, Math.min(r.left + r.width / 2 - ancho / 2, app.right - 16 - ancho)) + 'px';
  const arriba = r.top - g.offsetHeight - 8;
  g.style.top = (arriba > app.top + 60 ? arriba : r.bottom + 8) + 'px';
}, true);

/* ---------- 6. COMPLETÁ TU PERFIL: foto + nombre y apellido ---------- */
// La foto se achica a 256 px y se guarda en el teléfono (no se sube a ningún lado).
$('#foto-archivo').addEventListener('change', e => {
  const archivo = e.target.files && e.target.files[0];
  if (!archivo) return;
  const img = new Image();
  img.onload = () => {
    const lado = 256, c = document.createElement('canvas'); c.width = c.height = lado;
    const m = Math.min(img.width, img.height);
    c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
    estado.perfil.foto = c.toDataURL('image/jpeg', 0.82);
    URL.revokeObjectURL(img.src);
    dibujarFoto(); dibujarAvatares();
  };
  img.src = URL.createObjectURL(archivo);
});
function dibujarFoto() {
  const p = estado.perfil;
  $('#foto-vista').innerHTML = p.foto ? `<img src="${p.foto}" alt="Tu foto">` : icono('camara');
  $('#foto-texto').textContent = p.foto ? 'Cambiar foto' : 'Agregar foto';
}
['nombre', 'apellido'].forEach(c => $('#' + c).addEventListener('input', e => {
  estado.perfil[c] = e.target.value.trim(); $('#error-datos').hidden = true; $('#campo-' + c).classList.remove('campo--error');
}));
$('#continuar-datos').addEventListener('click', () => {
  const faltan = ['nombre', 'apellido'].filter(c => !estado.perfil[c]);
  faltan.forEach(c => $('#campo-' + c).classList.add('campo--error'));
  if (faltan.length) { $('#error-datos').hidden = false; $('#' + faltan[0]).focus(); return; }
  guardarPerfil(); dibujarSaludo();
  irA('perfil');
});

/* ---------- 7. TU PERFIL CORREDOR ----------
   Es una pantalla larga: "Guardar perfil" se habilita recién cuando se llegó al final
   (las alergias), para que nadie se las saltee. Mientras tanto hay una pista que invita a deslizar
   y una barrita arriba que muestra cuánto falta. */
crearSelector('rueda', 'edad', { valores: rango(14, 90), unidad: 'años', etiqueta: 'Edad', valor: estado.perfil.edad, alCambiar: v => estado.perfil.edad = v });
crearSelector('rueda', 'altura', { valores: rango(1.40, 2.10, 0.01), formato: v => conComa(v, 2), unidad: 'm', etiqueta: 'Altura', valor: estado.perfil.altura, alCambiar: v => estado.perfil.altura = v });
crearSelector('balanza', 'peso', { desde: 35, hasta: 150, valor: estado.perfil.peso, unidad: 'kg', etiqueta: 'Peso', alCambiar: v => estado.perfil.peso = v });
$('#objetivo').addEventListener('change', e => { estado.perfil.objetivo = e.target.value || null; });

const scrollPerfil = $('#contenido-perfil');
let perfilLeido = false;
function habilitarGuardar() {
  perfilLeido = true;
  $('#guardar-perfil').setAttribute('aria-disabled', 'false');
  $('#pista-perfil').hidden = true;
}
function progresoPerfil() {
  const max = scrollPerfil.scrollHeight - scrollPerfil.clientHeight;
  const f = max <= 4 ? 1 : scrollPerfil.scrollTop / max;
  $('#progreso-perfil').style.width = Math.round(f * 100) + '%';
  if (f > 0.97 && !perfilLeido) habilitarGuardar();
}
scrollPerfil.addEventListener('scroll', () => requestAnimationFrame(progresoPerfil), { passive: true });
$('#pista-perfil').addEventListener('click', () => scrollPerfil.scrollBy({ top: scrollPerfil.clientHeight * 0.7, behavior: 'smooth' }));
alMostrar.perfil = () => {
  $('#progreso-perfil').style.width = '0%';
  if (!perfilLeido) { $('#guardar-perfil').setAttribute('aria-disabled', 'true'); $('#pista-perfil').hidden = false; }
  requestAnimationFrame(progresoPerfil);   // si todo entra sin scroll, se habilita enseguida
};
$('#guardar-perfil').addEventListener('click', () => {
  if (!perfilLeido) {
    // Todavía no llegó al final: lo llevamos a las alergias y las resaltamos.
    $('#grupo-alergias').scrollIntoView({ behavior: 'smooth', block: 'center' });
    const g = $('#grupo-alergias'); g.classList.remove('resaltar'); void g.offsetWidth; g.classList.add('resaltar');
    return;
  }
  guardarPerfil();
  if (estado.historial.includes('datos')) irAlInicio(); else volver();
});
$('#perfil-ahora-no').addEventListener('click', () => { if (estado.historial.includes('datos')) irAlInicio(); else volver(); });

/* ---------- 8. INICIO ---------- */
function dibujarSaludo() {
  $('#saludo').textContent = estado.perfil.nombre ? `Hola, ${estado.perfil.nombre}` : 'Hola';
}

/* 8b. Repetí un trayecto: las corridas guardadas se vuelven a calcular con el clima y la época de hoy */
function leerCorridas() { try { return JSON.parse(localStorage.getItem('respira-corridas') || '[]'); } catch (e) { return []; } }
alMostrar.repetir = () => {
  const corridas = leerCorridas().filter(c => c.busqueda && c.busqueda.partida).reverse();
  $('#lista-corridas').innerHTML = corridas.length ? corridas.map((c, i) => `
    <button class="opcion-ruta" data-repetir="${i}">
      <span class="opcion-ruta__numero">${icono('repetir', 'icono--chico')}</span>
      <span><span class="opcion-ruta__titulo">${escapar(c.busqueda.partida.nombre)}${c.busqueda.circular ? ' · vuelta' : c.busqueda.llegada ? ' → ' + escapar(c.busqueda.llegada.nombre) : ''}</span>
        <span class="opcion-ruta__sub">${new Date(c.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} · ${conComa(c.km)} km</span></span>
      <span class="opcion-ruta__indice"><span class="numero">${c.indice}<small>%</small></span></span>
    </button>`).join('')
    : `<div class="vacio">Todavía no guardaste ningún recorrido.<br>Cuando termines uno, va a aparecer acá.</div>
       <button class="boton" data-ir="definir">Armá tu primer recorrido ${icono('derecha')}</button>`;
  $('#lista-corridas').onclick = e => {
    const b = e.target.closest('[data-repetir]'); if (!b) return;
    const c = corridas[+b.dataset.repetir];
    Object.assign(estado.busqueda, c.busqueda, { programar: false });
    estado.condiciones = new Set(c.condiciones || []); estado.origen = c.origen || {}; estado.condicionesTocadas = true;
    irA('recorridos'); calcularRecorridos();
  };
};

/* ---------- 9. DEFINÍ TU RECORRIDO ---------- */

// Buscador de partida y llegada: datasets (al instante) + esquinas + direcciones de OpenStreetMap.
function autocompletar(nombre) {
  const input = $('#' + nombre), lista = $('#sugerencias-' + nombre), borrar = $(`[data-borrar="${nombre}"]`);
  let opciones = [], marcada = 0, espera = null, pedido = null, buscandoRemoto = false, fueraDeCABA = false;

  const limpiarError = () => { $('#error-' + nombre).hidden = true; $('#campo-' + nombre).classList.remove('campo--error'); };
  function elegir(lugar) {
    if (!lugar) return;
    if (lugar.accion === 'ubicacion') {
      lista.innerHTML = '<li class="sugerencias__estado">Buscando tu ubicación…</li>';
      RespiraBuscador.miUbicacion().then(elegir).catch(err => { lista.innerHTML = `<li class="sugerencias__estado">${escapar(err.message)}</li>`; });
      return;
    }
    if (!dentroDeCABA(lugar.lon, lugar.lat)) { lista.innerHTML = `<li class="sugerencias__estado">${ZONA_NO_DISPONIBLE}</li>`; return; }
    input.value = lugar.nombre; estado.busqueda[nombre] = lugar; borrar.hidden = false;
    lista.hidden = true; input.setAttribute('aria-expanded', 'false');
    limpiarError();
  }
  function dibujar() {
    const filas = opciones.map((l, i) => `<li role="option" id="op-${nombre}-${i}" aria-selected="${i === marcada}" data-i="${i}">
        ${icono(l.accion === 'ubicacion' ? 'mi-ubicacion' : l.tipo === 'Calle' || l.tipo === 'Esquina' ? 'buscar' : 'partida', 'icono--chico')}
        <span class="sugerencia__textos"><span class="sugerencia__nombre">${escapar(l.nombre)}</span><span class="sugerencia__tipo">${escapar(l.tipo || '')}</span></span></li>`);
    if (buscandoRemoto) filas.push('<li class="sugerencias__estado">Buscando direcciones…</li>');
    else if (!opciones.length && fueraDeCABA) filas.push(`<li class="sugerencias__estado">${ZONA_NO_DISPONIBLE} Elegí un punto dentro de la Ciudad de Buenos Aires.</li>`);
    else if (!opciones.length && input.value.trim().length >= 3) filas.push('<li class="sugerencias__estado">No encontramos ese lugar en la Ciudad. Probá con calle y altura, o con una esquina (ej: Corrientes y Callao).</li>');
    lista.innerHTML = filas.join('');
    lista.hidden = !filas.length; input.setAttribute('aria-expanded', String(!!filas.length));
    input.setAttribute('aria-activedescendant', opciones.length ? `op-${nombre}-${marcada}` : '');
  }
  async function buscar() {
    const q = input.value.trim();
    if (!q) { opciones = [{ accion: 'ubicacion', nombre: 'Usar mi ubicación', tipo: 'Ubicación actual' }]; buscandoRemoto = false; marcada = 0; return dibujar(); }
    opciones = RespiraBuscador.local(q); marcada = 0; fueraDeCABA = false;
    buscandoRemoto = q.length >= 3; dibujar();
    if (!buscandoRemoto) return;
    clearTimeout(espera);
    espera = setTimeout(async () => {
      if (pedido) pedido.abort();
      pedido = new AbortController();
      const [esq, dirs] = await Promise.all([
        RespiraBuscador.esquina(q).catch(() => null),
        RespiraBuscador.direcciones(q, pedido.signal).catch(e => e.name === 'AbortError' ? null : { lugares: [], fuera: false })
      ]);
      if (dirs === null || input.value.trim() !== q) return;   // ya se escribió otra cosa
      const vistos = new Set(opciones.map(o => o.nombre.toLowerCase()));
      const nuevas = [esq, ...dirs.lugares].filter(o => o && !vistos.has(o.nombre.toLowerCase()) && vistos.add(o.nombre.toLowerCase()));
      opciones = [...(esq ? [esq] : []), ...opciones, ...nuevas.filter(o => o !== esq)].slice(0, 8);
      fueraDeCABA = !opciones.length && dirs.fuera;
      buscandoRemoto = false; dibujar();
    }, 350);
  }
  input.addEventListener('input', () => { estado.busqueda[nombre] = null; borrar.hidden = !input.value; limpiarError(); buscar(); });
  input.addEventListener('focus', () => { if (!estado.busqueda[nombre]) buscar(); });
  input.addEventListener('keydown', e => {
    if (lista.hidden || !opciones.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcada = (marcada + 1) % opciones.length; dibujar(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); marcada = (marcada - 1 + opciones.length) % opciones.length; dibujar(); }
    if (e.key === 'Enter')     { e.preventDefault(); elegir(opciones[marcada]); }   // Enter elige la sugerencia (no avanza)
  });
  lista.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); elegir(opciones[+li.dataset.i]); } });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); } }, 150));
  borrar.addEventListener('click', () => { input.value = ''; estado.busqueda[nombre] = null; borrar.hidden = true; input.focus(); buscar(); });
  return {
    poner(lugar) { input.value = lugar ? lugar.nombre : ''; estado.busqueda[nombre] = lugar || null; borrar.hidden = !lugar; lista.hidden = true; limpiarError(); },
    // Escribe el texto y abre las sugerencias, para que el runner elija (cuando no hay un lugar claro)
    sugerir(texto) { input.value = texto; estado.busqueda[nombre] = null; borrar.hidden = !texto; input.focus(); buscar(); }
  };
}
const campoPartida = autocompletar('partida');
const campoLlegada = autocompletar('llegada');

$('#circular').addEventListener('click', e => {
  estado.busqueda.circular = !estado.busqueda.circular;
  e.currentTarget.setAttribute('aria-checked', String(estado.busqueda.circular));
  $('#bloque-llegada').hidden = estado.busqueda.circular;
  $('#error-llegada').hidden = true;
  sugerirDistancia();
});

/* 9b. MARCÁ EN EL MAPA ("drop your pin", v14)
   El botón del pin de cada campo abre un mapa a pantalla completa con un pin fijo en el centro: el runner mueve
   el mapa (o toca un punto) y abajo aparece qué hay ahí: el espacio verde más cercano (datasets) o la esquina
   de la red de calles. "Usar este punto" completa el campo. Fuera de la Ciudad no se puede elegir. */
const pin = { campo: null, mapa: null, punto: null, pedido: 0 };
const CENTRO_CIUDAD = { lon: -58.4370, lat: -34.6075 };
function pinAbierto() { return !$('#elegir-punto').hidden; }
function cerrarPin() {
  if (!pinAbierto()) return false;
  $('#elegir-punto').hidden = true;
  const boton = $(`[data-pin="${pin.campo}"]`); if (boton) boton.focus();
  return true;
}
function abrirPin(campo) {
  pin.campo = campo; pin.punto = null;
  const esPartida = campo === 'partida', b = estado.busqueda;
  $('#pin-rotulo').textContent = esPartida ? 'Punto de partida' : 'Punto de llegada';
  $('#pin-pista').textContent = esPartida ? 'Mové el mapa hasta tu punto de partida' : 'Mové el mapa hasta donde terminás';
  $('#elegir-punto').hidden = false;
  // Arranca en el punto que ya estaba, en el otro punto del recorrido o en el centro de la Ciudad
  const inicio = b[campo] || (esPartida ? b.llegada : b.partida);
  if (!pin.mapa) {
    pin.mapa = L.map($('#mapa-pin'), { zoomControl: false, attributionControl: true, zoomSnap: 0.25, minZoom: 11 });
    RespiraMapa.capaBase(pin.mapa);
    pin.mapa.attributionControl.setPrefix(false);
    // Afuera de la Ciudad queda velado (igual que en el challenge)
    const contorno = CABA_CONTORNO.map(([lon, lat]) => [lat, lon]);
    L.polygon([[[-35.2, -59.2], [-35.2, -57.6], [-34.0, -57.6], [-34.0, -59.2]], contorno], { stroke: false, fillColor: '#F7F5EE', fillOpacity: 0.62, interactive: false }).addTo(pin.mapa);
    L.polygon(contorno, { color: getComputedStyle(document.documentElement).getPropertyValue('--acento-tinta').trim(), weight: 1.5, opacity: 0.7, fill: false, dashArray: '4 5', interactive: false }).addTo(pin.mapa);
    pin.mapa.on('movestart', () => { $('#pin-central').classList.add('pin-central--arriba'); $('#pin-usar').disabled = true; });
    pin.mapa.on('moveend', () => { $('#pin-central').classList.remove('pin-central--arriba'); nombrarPunto(); });
    pin.mapa.on('click', e => pin.mapa.panTo(e.latlng));   // tocar un punto lo lleva abajo del pin
  }
  pin.mapa.setMaxBounds([[CABA.sur - 0.05, CABA.oeste - 0.07], [CABA.norte + 0.05, CABA.este + 0.07]]);
  requestAnimationFrame(() => {
    pin.mapa.invalidateSize();
    pin.mapa.setView(inicio ? [inicio.lat, inicio.lon] : [CENTRO_CIUDAD.lat, CENTRO_CIUDAD.lon], inicio ? 16.5 : 13, { animate: false });
    nombrarPunto();
    $('#pin-cerrar').focus();
  });
}
// Qué hay debajo del pin: espacio verde cercano (datasets) o la esquina de la red de calles
async function nombrarPunto() {
  const yo = ++pin.pedido, c = pin.mapa.getCenter(), lon = c.lng, lat = c.lat;
  pin.punto = null;
  $('#pin-usar').disabled = true;
  if (!dentroDeCABA(lon, lat)) {
    $('#pin-nombre').textContent = ZONA_NO_DISPONIBLE;
    $('#pin-detalle').textContent = 'Mové el pin a un punto dentro de la Ciudad de Buenos Aires.';
    $('#elegir-punto').classList.add('elegir-punto--fuera');
    return;
  }
  $('#elegir-punto').classList.remove('elegir-punto--fuera');
  $('#pin-nombre').textContent = 'Buscando dónde estás…'; $('#pin-detalle').textContent = '';
  const [lugar, esquina] = await Promise.all([RespiraBuscador.cercano(lon, lat).catch(() => null), RespiraRed.esquinaConNombre(lon, lat).catch(() => null)]);
  if (yo !== pin.pedido) return;   // el mapa se movió mientras buscaba
  const cruce = esquina && esquina.calles.length ? esquina.calles.join(' y ') : null;
  const nombre = lugar ? lugar.nombre : cruce ? (esquina.distancia > 60 ? `Cerca de ${cruce}` : cruce) : 'Punto en el mapa';
  $('#pin-nombre').textContent = nombre;
  $('#pin-detalle').textContent = lugar && cruce ? `${lugar.tipo || 'Espacio verde'} · cerca de ${cruce}` : lugar ? lugar.tipo || '' : esquina && esquina.calles.length === 1 ? 'Calle de la red peatonal' : '';
  pin.punto = { nombre, tipo: 'Marcado en el mapa', lon, lat };
  $('#pin-usar').disabled = false;
}
$('#definir').addEventListener('click', e => { const b = e.target.closest('[data-pin]'); if (b) abrirPin(b.dataset.pin); });
$('#pin-cerrar').addEventListener('click', cerrarPin);
$('#pin-usar').addEventListener('click', () => {
  if (!pin.punto) return;
  (pin.campo === 'partida' ? campoPartida : campoLlegada).poner(pin.punto);
  cerrarPin();
});
$('#pin-ubicacion').addEventListener('click', async () => {
  $('#pin-nombre').textContent = 'Buscando tu ubicación…'; $('#pin-detalle').textContent = '';
  try { const l = await RespiraBuscador.miUbicacion(); pin.mapa.setView([l.lat, l.lon], 17); }
  catch (err) { $('#pin-nombre').textContent = err.message; $('#pin-detalle').textContent = 'Mové el mapa hasta tu punto.'; }
});

/* 9c. DISTANCIA (v13: como en el frame 06): un campo escrito, entre 1 y 42 km.
   Obligatorio en el trayecto circular; de un punto a otro es opcional (si es más largo que el camino
   directo, red.js da una vuelta). La sugerencia del campo sale del nivel y el objetivo del perfil. */
function sugerirDistancia() {
  const s = sugerenciaKm();
  $('#distancia').placeholder = s ? 'Ej: ' + conComa(s.km, 0) : 'Ej: 5';
}
alMostrar.definir = () => sugerirDistancia();

// Distancia: campo escrito. Acepta "5", "5,5" o "5.5".
function leerKm() {
  const t = $('#distancia').value.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
$('#distancia').addEventListener('input', () => { $('#error-distancia').hidden = true; $('#campo-distancia').classList.remove('campo--error'); });

const ahora = new Date();
const dosDigitos = n => String(n).padStart(2, '0');
$('#fecha').value = `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
$('#hora').value = `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`;
$('#programar').addEventListener('change', e => {
  estado.busqueda.programar = e.target.checked;
  $('#fecha').disabled = $('#hora').disabled = !e.target.checked;
  $('#cuando').classList.toggle('fila--activa', e.target.checked);
  if (e.target.checked) $('#hora').focus();
});

$('#continuar-definir').addEventListener('click', () => {
  const b = estado.busqueda, error = (id, texto) => { const m = $('#error-' + id); m.dataset.base ??= m.textContent; m.textContent = texto || m.dataset.base; m.hidden = false; $('#campo-' + id).classList.add('campo--error'); };
  let ok = true;
  if (!b.partida) { ok = false; error('partida'); }
  else if (!dentroDeCABA(b.partida.lon, b.partida.lat)) { ok = false; error('partida', ZONA_NO_DISPONIBLE); }
  if (!b.circular && !b.llegada) { ok = false; error('llegada'); }
  else if (!b.circular && !dentroDeCABA(b.llegada.lon, b.llegada.lat)) { ok = false; error('llegada', ZONA_NO_DISPONIBLE); }
  const km = leerKm();
  if (Number.isNaN(km) || (km !== null && (km < 1 || km > 42))) { ok = false; error('distancia', 'Escribí una distancia entre 1 y 42 km.'); }
  else if (b.circular && km === null) { ok = false; error('distancia', 'Para un trayecto circular, contanos cuántos km querés correr.'); }
  if (!ok) return;
  b.km = km;
  b.fecha = $('#fecha').value; b.hora = $('#hora').value;
  irA('condiciones');
});

// Fecha y hora de la salida (para el clima y la época de polen)
function fechaSalida() {
  const b = estado.busqueda;
  if (b.programar && b.fecha && b.hora) { const d = new Date(`${b.fecha}T${b.hora}:00-03:00`); if (!isNaN(d)) return d; }
  return new Date();
}
function esDeNoche() { const h = fechaSalida().getHours(); return h < 7 || h >= 20; }

/* ---------- 10. PERSONALIZÁ TUS CONDICIONES ----------
   Cada tarjeta muestra de qué dataset sale. "Más seguridad" y "Menos gente" se sacaron (sin dataset);
   "Cerca del agua" también se sacó: no es algo que el runner pueda accionar. */
function tarjetaCondicion(c) {
  return `<button class="condicion" data-condicion="${c.id}" aria-pressed="${estado.condiciones.has(c.id)}">
    ${icono(c.icono)}
    <span>${estado.origen[c.id] === 'perfil' && estado.condiciones.has(c.id) ? '<span class="condicion__origen">Por tu objetivo</span>' : ''}<span class="condicion__titulo">${c.titulo}</span><span class="condicion__fuente">${c.fuente}</span></span>
    <span class="condicion__check">${icono('check')}</span></button>`;
}
function dibujarCondiciones() {
  $('#condiciones-principales').innerHTML = CONDICIONES.filter(c => c.principal).map(tarjetaCondicion).join('');
  $('#condiciones-otras').innerHTML = CONDICIONES.filter(c => !c.principal).map(tarjetaCondicion).join('');
}
$('#condiciones').addEventListener('click', e => {
  const b = e.target.closest('[data-condicion]');
  if (!b) return;
  const id = b.dataset.condicion;
  estado.condiciones.has(id) ? estado.condiciones.delete(id) : estado.condiciones.add(id);
  estado.origen[id] = 'manual'; estado.condicionesTocadas = true;
  b.setAttribute('aria-pressed', String(estado.condiciones.has(id)));
  b.querySelector('.condicion__origen')?.remove();
});

/* 10b. DEL PERFIL A LOS FILTROS (v11). La tabla está en datos.js (PERFIL_A_FILTROS).
   Todo esto es cálculo de la app, no de la IA: marca condiciones, ajusta pesos, sugiere km y elige
   cuál de las 3 opciones recomendar. La IA después explica la recomendación en palabras. */
const reglaPerfil = () => PERFIL_A_FILTROS[estado.perfil.objetivo] || null;
function sugerenciaKm() {
  const rango = KM_POR_NIVEL[estado.perfil.nivel];
  if (!rango) return null;
  const r = reglaPerfil(), f = r ? r.km : 1;
  const [a, b] = rango.map(x => Math.round(x * f));
  return { km: Math.round((a + b) / 2), texto: `Para tu nivel (${estado.perfil.nivel}) sugerimos ${a} a ${b} km${f > 1 ? ', un poco más por tu objetivo de resistencia' : ''}.` };
}
function aplicarPerfil() {
  if (estado.condicionesTocadas) return;
  const base = CONDICIONES.filter(c => c.elegida).map(c => c.id);
  estado.condiciones = new Set(base);
  estado.origen = Object.fromEntries(base.map(id => [id, 'base']));
  const r = reglaPerfil();
  if (r) r.condiciones.forEach(id => { estado.condiciones.add(id); estado.origen[id] = 'perfil'; });
}
function pesosDelRecorrido() {
  const aprendidos = leerAprendizaje().pesos, perfil = (reglaPerfil() || {}).pesos || {}, pesos = { ...aprendidos };
  for (const [f, w] of Object.entries(perfil)) pesos[f] = (pesos[f] ?? 1) * w;
  return pesos;
}
function recomendadoPorPerfil(opciones) {
  const r = reglaPerfil();
  if (!r || !opciones.length) return null;
  if (r.recomendar === 'directo') return opciones.reduce((a, o) => (o.km < a.km ? o : a)).numero;
  if (r.recomendar === 'tranquilo') return opciones.reduce((a, o) => (o.factores.ruido > a.factores.ruido ? o : a)).numero;
  return opciones[0].numero;   // 'preferencias': la que más cumple las condiciones (ya están ordenadas así)
}
// Al empezar una búsqueda nueva desde el inicio, el perfil vuelve a decidir las condiciones de partida.
$('#inicio').addEventListener('click', e => { if (e.target.closest('[data-ir="definir"]')) estado.condicionesTocadas = false; }, true);
function dibujarAvisoPerfil() {
  const r = reglaPerfil(), aviso = $('#aviso-perfil');
  const marcadas = CONDICIONES.filter(c => estado.origen[c.id] === 'perfil' && estado.condiciones.has(c.id)).map(c => c.titulo.toLowerCase());
  aviso.hidden = !r || estado.condicionesTocadas && !marcadas.length;
  if (aviso.hidden) return;
  aviso.innerHTML = `${icono('perfil')}<span>Tu objetivo es <b>${NOMBRE_OBJETIVO[estado.perfil.objetivo]}</b>: ${r.porque}.${marcadas.length ? ` Marcamos ${marcadas.join(' y ')}; podés cambiarlas.` : ''}</span>`;
}
// Aviso de alergias: se ve solo si alguna especie marcada está en época en la fecha de la salida.
const alergiasActivas = () => (estado.perfil.alergias || []).filter(a => ALERGIAS[a]);
alMostrar.condiciones = () => {
  aplicarPerfil();
  dibujarCondiciones();
  dibujarAvisoPerfil();
  // Objetivo "cuidar mi salud": si a la hora de salir el UV está alto, se suma "Más sombra" (clima de Open-Meteo).
  const r = reglaPerfil();
  if (r && r.sombraConUV && !estado.condicionesTocadas && estado.busqueda.partida) climaDeLaSalida().then(h => {
    if (!h || estado.condicionesTocadas || estado.pantalla !== 'condiciones') return;
    if (h.uv_index >= RespiraClima.UMBRALES.uvAlto && h.is_day === 1 && !estado.condiciones.has('sombra')) {
      estado.condiciones.add('sombra'); estado.origen.sombra = 'perfil'; dibujarCondiciones(); dibujarAvisoPerfil();
    }
  });
  const mes = fechaSalida().getMonth();
  const enEpoca = alergiasActivas().filter(a => ESTACION_POLEN[a][mes] >= 0.3).map(a => ALERGIAS[a].nombre.toLowerCase());
  const aviso = $('#aviso-alergia');
  aviso.hidden = !enEpoca.length;
  if (enEpoca.length) aviso.innerHTML = `${icono('polen')}<span>En ${MESES[mes]} hay polen de <b>${enEpoca.join(' y ')}</b>. Como lo marcaste en tu perfil, vamos a evitar las calles con muchos de esos árboles, sobre todo si el viento viene de su lado.</span>`;
};
$('#buscar-recorridos').addEventListener('click', () => { irA('recorridos'); calcularRecorridos(); });

/* ---------- 11. TUS RECORRIDOS IDEALES: cálculo + clima + IA + mapa interactivo ---------- */
let mapaRecorridos = null, calculo = 0;
const altoHojaLista = () => ($('#hoja-recorridos').offsetHeight || 330);
alMostrar.recorridos = () => {
  if (!mapaRecorridos) return;
  setTimeout(() => { mapaRecorridos.ponerMargenes({ abajo: altoHojaLista(), arriba: 150 }); mapaRecorridos.encuadrar(); }, 0);
};

const factoresElegidos = () => CONDICIONES.filter(c => estado.condiciones.has(c.id)).map(c => c.factor);
const ritmo = () => RITMO[estado.perfil.nivel] || 6;
const minutos = r => Math.round(r.km * ritmo());

// Clima de la hora de salida en el punto de partida (Open-Meteo, sin clave). Si no responde en 4 s, se sigue sin clima.
async function climaDeLaSalida() {
  const p = estado.busqueda.partida;
  try {
    const horas = await Promise.race([RespiraClima.obtenerClimaPorHora(p.lat, p.lon, 3), new Promise((_, no) => setTimeout(() => no(new Error('tiempo')), 4000))]);
    return RespiraClima.climaALaHora(horas, fechaSalida());
  } catch (e) { return null; }
}

async function calcularRecorridos() {
  const yo = ++calculo;
  estado.challengeLetra = null;
  const b = estado.busqueda, factores = factoresElegidos();
  if (!mapaRecorridos) mapaRecorridos = RespiraMapa.crear($('#mapa-recorridos'), { margenAbajo: altoHojaLista(), margenArriba: 150 });
  const aviso = $('#mapa-estado');
  aviso.hidden = false; aviso.className = 'mapa__estado cargando'; aviso.textContent = 'Mirando el viento de esa hora…';
  $('#opciones-recorridos').innerHTML = '<div class="cargando">Cruzando cada tramo de calle con tus condiciones…</div>';
  $('#ver-recorrido').disabled = true;

  // Solo se arman recorridos dentro de la Ciudad (también para corridas guardadas antes de este control)
  if ([b.partida, b.circular ? null : b.llegada].some(l => l && !dentroDeCABA(l.lon, l.lat))) {
    aviso.className = 'mapa__estado'; aviso.textContent = ZONA_NO_DISPONIBLE;
    $('#opciones-recorridos').innerHTML = `<p class="chico">${ZONA_NO_DISPONIBLE} Volvé y elegí puntos dentro de la Ciudad de Buenos Aires.</p>`;
    return;
  }

  estado.clima = await climaDeLaSalida();
  if (yo !== calculo) return;
  aviso.textContent = 'Calculando recorridos con los datasets…';
  const viento = estado.clima && { direccion: estado.clima.wind_direction_10m, kmh: estado.clima.wind_speed_10m };

  let opciones;
  try {
    opciones = await RespiraRed.armarRecorridos({ desde: b.partida, hasta: b.llegada, circular: b.circular, km: b.km, factores,
      pesos: pesosDelRecorrido(), nocturno: esDeNoche(), alergias: alergiasActivas(), fecha: fechaSalida(), viento });
  } catch (err) {
    if (yo !== calculo) return;
    aviso.className = 'mapa__estado'; aviso.textContent = err.message;
    $('#opciones-recorridos').innerHTML = `<p class="chico">${escapar(err.message)} Volvé y probá con otro punto.</p>`;
    return;
  }
  if (yo !== calculo) return;
  if (!opciones.length) { aviso.className = 'mapa__estado'; aviso.textContent = 'No encontramos recorridos. Probá con otros puntos.'; $('#opciones-recorridos').innerHTML = ''; return; }

  // Orden: cuánto cumplen las preferencias, menos el riesgo de polen si el runner es alérgico.
  // El índice que se muestra es siempre el mismo (dato duro): las preferencias solo cambian el orden.
  // Si el runner avisó que un recorrido tuvo más polen del esperado, el polen pesa más (aprendizaje, sección 14b).
  const pesoPolen = 0.6 * (leerAprendizaje().pesos.polen ?? 1);
  const puntaje = r => r.preferencias - (r.polen ? pesoPolen * r.polen.riesgo : 0);
  opciones.sort((x, y) => puntaje(y) - puntaje(x));
  ponerTitulos(opciones, factores);
  opciones.forEach((r, i) => { r.numero = i + 1; r.minutos = minutos(r); r.explicacion = explicacionLocal(r, i, opciones); r.fuenteTexto = 'Resumen automático a partir de los datasets'; });
  // v11: si el perfil tiene objetivo, la app elige cuál recomendar (regla fija, ver datos.js). La IA lo explica.
  const porPerfil = huboFallas(factores, alergiasActivas().length > 0) ? 1 : recomendadoPorPerfil(opciones);
  if (porPerfil) opciones.forEach(r => { r.recomendado = r.numero === porPerfil; });
  estado.recorridos = opciones; estado.elegido = 0;

  aviso.hidden = true;
  mapaRecorridos.ponerMargenes({ abajo: altoHojaLista(), arriba: 150 });
  mapaRecorridos.orientar(null);
  mapaRecorridos.mostrarRecorridos(opciones, { circular: b.circular, alElegir: i => seleccionar(i, { desdeElMapa: true }) });
  dibujarOpciones();
  $('#ver-recorrido').disabled = false;

  // [API IA] La IA interpreta los números (no los cambia): título, explicación y cuál recomienda.
  // Llama a /api/ia con tarea "recorridos". Si no está disponible, queda el resumen automático.
  interpretarConIA(opciones, factores, porPerfil).then(lectura => {
    if (yo !== calculo || !lectura) return;
    for (const l of lectura.recorridos || []) {
      const r = opciones.find(o => o.numero === l.numero);
      if (!r) continue;
      if (l.titulo) r.titulo = l.titulo;
      if (l.explicacion) { r.explicacion = l.explicacion; r.fuenteTexto = 'Interpretación de la IA (Groq) a partir de los datasets'; }
    }
    // Si alguna preferencia de esta búsqueda ya falló en corridas anteriores, recomienda el algoritmo y no la IA:
    // el recorrido 1 es el que mejor cuida lo que falló (pesos de la sección 14b). La IA solo escribe los textos.
    const recomendado = porPerfil || lectura.recomendado;
    if (recomendado) opciones.forEach(r => { r.recomendado = r.numero === recomendado; });
    dibujarOpciones();
    if (estado.pantalla === 'detalle') dibujarDetalle();
  }).catch(() => {});
}

// Títulos cortos: a cada recorrido le toca aquello en lo que es el mejor de los tres.
function ponerTitulos(opciones, factores) {
  const NOMBRES = { vegetacion: 'Más verde', ruido: 'Más silencioso', aire: 'Mejor aire', transito: 'Menos tránsito', sombra: 'Más sombra', terreno: 'Terreno más parejo', luz: 'Más iluminado' };
  const orden = [...factores, ...Object.keys(NOMBRES).filter(f => !factores.includes(f))];
  const usados = new Set();
  if (opciones.some(o => o.polen)) {
    const menos = opciones.reduce((a, o) => (o.polen.riesgo < a.polen.riesgo ? o : a));
    if (opciones.some(o => o.polen.riesgo - menos.polen.riesgo >= 8)) { menos.titulo = 'Menos polen'; usados.add('polen'); }
  }
  opciones.forEach((r, i) => {
    if (r.titulo) return;
    let titulo = null;
    for (const f of orden) {
      if (usados.has(f)) continue;
      if (opciones.every(o => o === r || r.factores[f] >= o.factores[f])) { titulo = NOMBRES[f]; usados.add(f); break; }
    }
    if (!titulo && !usados.has('corto') && opciones.every(o => r.km <= o.km)) { titulo = 'Más corto'; usados.add('corto'); }
    r.titulo = titulo || (i === 0 ? 'El más equilibrado' : 'Alternativa');
  });
}

function explicacionLocal(r, i, opciones) {
  const partes = [];
  if (r.calles.length) partes.push(`Pasa por ${r.calles.slice(0, 2).join(' y ')}.`);
  partes.push(`Tiene en promedio ${conComa(r.datos.arboles_100m, 0)} árboles cada 100 m y unos ${r.datos.db} dB de ruido de día.`);
  if (r.polen && r.polen.nivel !== 'bajo') partes.push(`Ojo: pasa junto a árboles a los que sos alérgico en su época.`);
  if (i === 0 && opciones.length > 1) partes.push('Es el que mejor cumple las condiciones que elegiste.');
  return partes.join(' ');
}

const recorridoParaIA = r => ({ numero: r.numero, titulo: r.titulo, km: r.km, minutos: r.minutos, indice_respirabilidad: r.indice,
  cumplimiento_preferencias: r.preferencias, puntajes: nombresFavorables(r.factores),
  datos: { arboles_cada_100m: r.datos.arboles_100m, ruido_dia_db: r.datos.db, no2_umol_m2: r.datos.no2 },
  polen: r.polen ? { riesgo: r.polen.riesgo, nivel: r.polen.nivel, especies: r.polen.especies.map(e => ({ especie: ALERGIAS[e.especie].nombre, epoca: e.estacion, arboles_al_lado: e.arboles_al_lado })) } : null,
  calles: r.calles });
function climaParaIA() {
  const h = estado.clima;
  return h ? { temperatura: h.temperature_2m, sensacion: h.apparent_temperature, viento_kmh: h.wind_speed_10m, viento_desde_grados: h.wind_direction_10m,
    lluvia_prob: h.precipitation_probability, uv: h.uv_index, fuente: 'Open-Meteo' } : null;
}
async function interpretarConIA(opciones, factores, porPerfil = null) {
  const clima = climaParaIA();
  const nombres = Object.fromEntries(CONDICIONES.map(c => [c.factor, c.titulo]));
  return RespiraIA.interpretarRecorridos({
    preferencias: factores.map(f => nombres[f]),
    horario: estado.busqueda.programar ? `${estado.busqueda.fecha} ${estado.busqueda.hora}` : 'ahora',
    alergias: alergiasActivas().map(a => ALERGIAS[a].nombre),
    nivel: estado.perfil.nivel, circular: estado.busqueda.circular, clima,
    recorridos: opciones.map(recorridoParaIA),
    aprendizaje: resumenAprendizaje(factores, alergiasActivas().length > 0),
    objetivo: estado.perfil.objetivo ? NOMBRE_OBJETIVO[estado.perfil.objetivo] : null,
    recomendado_por_la_app: porPerfil,
    motivo_de_la_app: reglaPerfil() ? reglaPerfil().porque : null
  });
}

// Los puntajes son "qué tan bien está" (más alto = mejor). Con la clave "ruido" la IA leía 78 como mucho ruido:
// se mandan con un nombre que dice lo que mide el número.
const FAVORABLES = { ruido: 'silencio', transito: 'poco_transito', aire: 'aire_limpio' };
const nombresFavorables = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [FAVORABLES[k] || k, v]));

const etiquetaPolen = r => r.polen ? `<span class="etiqueta-polen etiqueta-polen--${r.polen.nivel}">${icono('polen')}polen ${r.polen.nivel}</span>` : '';
function dibujarOpciones() {
  $('#opciones-recorridos').innerHTML = estado.recorridos.map((r, i) => `
    <button class="opcion-ruta" role="radio" aria-checked="${i === estado.elegido}" data-elegir="${i}">
      <span class="opcion-ruta__numero">${r.numero}</span>
      <span class="opcion-ruta__textos"><span class="opcion-ruta__titulo">${escapar(r.titulo)}</span>
        <span class="opcion-ruta__sub">${conComa(r.km)} km · ≈ ${r.minutos} min${etiquetaPolen(r)}</span></span>
      <span class="opcion-ruta__indice" aria-label="Índice de respirabilidad ${r.indice}%${r.recomendado ? ', recomendado' : ''}">
        <span class="numero">${r.indice} %</span>
        <span class="opcion-ruta__leyenda">${r.recomendado ? 'recomendado' : 'índice'}</span>
      </span>
    </button>`).join('');
  $('#ver-recorrido').innerHTML = `Ver recorrido ${estado.recorridos[estado.elegido]?.numero || ''} ${icono('derecha')}`;
}

function seleccionar(i, { desdeElMapa = false } = {}) {
  if (i !== estado.elegido) {
    estado.elegido = i;
    if (!desdeElMapa) mapaRecorridos.elegir(i);
    dibujarOpciones();
  }
  $('#pista-mapa').hidden = true;   // ya entendió que se puede tocar
}
$('#opciones-recorridos').addEventListener('click', e => {
  const b = e.target.closest('[data-elegir]');
  if (b) seleccionar(+b.dataset.elegir);
});
$('#ver-recorrido').addEventListener('click', () => { if (estado.recorridos.length) irA('detalle'); });

/* ---------- 12. RECORRIDO ELEGIDO: mapa + hoja que se levanta ----------
   La hoja tiene dos alturas: plegada (lo esencial + "Empezar a correr") y abierta (todo el detalle).
   Se abre tocando la barrita/la flecha, o deslizándola hacia arriba con el dedo. */
let mapaDetalle = null;
const hojaDetalle = (() => {
  const hoja = $('#hoja-detalle'), agarre = $('#agarre-detalle'), contenido = $('#contenido-detalle');
  let abierta = false, arrastre = null, ultimoArrastre = 0;
  function alternar(abrir = !abierta) {
    abierta = abrir;
    hoja.style.transform = '';
    hoja.classList.toggle('abierta', abierta);
    agarre.setAttribute('aria-expanded', String(abierta));
    $('#texto-agarre').textContent = abierta ? 'Deslizá hacia abajo para ver el mapa' : 'Deslizá hacia arriba para ver el detalle';
    if (!abierta) contenido.scrollTop = 0;
    if (abierta) $$('#detalle-componentes .barra i').forEach(i => { i.style.width = i.dataset.v + '%'; });   // las barras se llenan al abrir
  }
  const plegadaY = () => hoja.offsetHeight - parseFloat(getComputedStyle(pantallaActual()).getPropertyValue('--alto-hoja') || 360);
  // Arrastrar con el dedo o el mouse: la hoja sigue al puntero y al soltar se acomoda en la altura más cercana.
  function empezar(e) {
    if (abierta && e.currentTarget === contenido && contenido.scrollTop > 0) return;   // en la hoja abierta, primero se scrollea el contenido
    arrastre = { y0: e.clientY, base: abierta ? 0 : plegadaY(), movio: false, t0: Date.now() };
    hoja.style.transition = 'none';
  }
  function mover(e) {
    if (!arrastre) return;
    const dy = e.clientY - arrastre.y0;
    if (Math.abs(dy) > 6) arrastre.movio = true;
    if (!arrastre.movio) return;
    if (abierta && dy < 0) return;                     // abierta: solo se puede bajar
    hoja.style.transform = `translateY(${Math.max(0, Math.min(plegadaY(), arrastre.base + dy))}px)`;
  }
  function soltar(e) {
    if (!arrastre) return;
    const dy = e.clientY - arrastre.y0, rapido = Math.abs(dy) / Math.max(1, Date.now() - arrastre.t0) > 0.5, movio = arrastre.movio;
    arrastre = null; hoja.style.transition = '';
    if (!movio) { hoja.style.transform = ''; return; }
    ultimoArrastre = Date.now();
    alternar(abierta ? !(dy > 80 || (rapido && dy > 0)) : (dy < -80 || (rapido && dy < 0)));
  }
  agarre.addEventListener('pointerdown', empezar);
  contenido.addEventListener('pointerdown', e => { if (!e.target.closest('button, a, input, textarea')) empezar(e); });
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', soltar);
  agarre.addEventListener('click', () => { if (Date.now() - ultimoArrastre > 350) alternar(); });   // un toque abre/cierra (no después de arrastrar)
  // La ruedita del mouse sobre la hoja plegada también la abre (en la compu).
  hoja.addEventListener('wheel', e => { if (!abierta && e.deltaY > 8) alternar(true); else if (abierta && contenido.scrollTop <= 0 && e.deltaY < -8) alternar(false); }, { passive: true });
  return { alternar, get abierta() { return abierta; } };
})();

alMostrar.detalle = () => {
  hojaDetalle.alternar(false);
  const hoja = $('#hoja-detalle');
  hoja.classList.add('oculta');          // arranca abajo de todo y sube hasta la altura plegada
  dibujarDetalle();
  // Altura de la hoja plegada = hasta el botón "Empezar a correr" (así se ve siempre entero).
  requestAnimationFrame(() => {
    const boton = $('#empezar'), alto = boton.getBoundingClientRect().bottom - hoja.getBoundingClientRect().top + 20;
    $('#detalle').style.setProperty('--alto-hoja', Math.round(alto) + 'px');
    requestAnimationFrame(() => hoja.classList.remove('oculta'));
    if (!mapaDetalle) mapaDetalle = RespiraMapa.crear($('#mapa-detalle'), { interactivo: true });
    mapaDetalle.ponerMargenes({ abajo: alto + 70, arriba: 110 });
    const r = estado.recorridos[estado.elegido];
    mapaDetalle.orientar(r.giro ?? null);   // una letra del challenge se ve derecha
    mapaDetalle.mostrarUno(r, { circular: estado.busqueda.circular, polen: !!r.polen });
  });
};

// "Hoy", "Mañana" o el día de la semana de la salida (chip del frame 09: "Hoy · 19:00")
function diaDeSalida() {
  const d = fechaSalida(), hoy = new Date(), dias = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(hoy).setHours(0, 0, 0, 0)) / 864e5);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return d.toLocaleDateString('es-AR', { weekday: 'long' }).replace(/^./, c => c.toUpperCase());
}
function textoViento(h) {
  if (!h || !Number.isFinite(h.wind_direction_10m)) return null;
  const desde = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(h.wind_direction_10m / 45) % 8];
  return `Viento del ${desde} · ${Math.round(h.wind_speed_10m)} km/h`;
}

function dibujarDetalle() {
  const r = estado.recorridos[estado.elegido]; if (!r) return;
  const b = estado.busqueda, h = estado.clima, factores = factoresElegidos();
  // Chips flotantes: hora, clima, viento y polen
  const hora = fechaSalida().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const chips = [`<span class="chip-dato chip-dato--acento">${icono('reloj')}${diaDeSalida()} · ${hora}</span>`];
  if (h && Number.isFinite(h.temperature_2m)) chips.push(`<span class="chip-dato">${icono('sol')}${Math.round(h.temperature_2m)}° · ST ${Math.round(h.apparent_temperature)}°</span>`);
  if (textoViento(h)) chips.push(`<span class="chip-dato">${icono('viento')}${textoViento(h)}</span>`);
  if (r.polen) chips.push(`<span class="chip-dato chip-dato--${r.polen.nivel}">${icono('polen')}Polen ${r.polen.nivel}</span>`);
  else if (alergiasActivas().length) chips.push(`<span class="chip-dato">${icono('polen')}Sin polen para vos</span>`);
  $('#chips-detalle').innerHTML = chips.join('');

  $('#detalle-indice').innerHTML = `${r.indice}<small>%</small>`;
  $('#detalle-titulo').textContent = r.titulo;
  $('#detalle-sub').textContent = b.circular ? `Vuelta desde ${b.partida.nombre}` : `${b.partida.nombre} → ${b.llegada.nombre}`;
  $('#detalle-insignia').hidden = !r.recomendado;
  $('#detalle-km').innerHTML = `${conComa(r.km)}<small>km</small>`;
  // v13 (frame 09a): tres datos duros, sin lecturas
  $('#detalle-datos').innerHTML = `
    <div class="dato"><b>${r.minutos} min</b><span>a ${ritmo()} min/km</span></div>
    <div class="dato"><b>${conComa(r.datos.arboles_100m, 0)}</b><span>árboles / 100 m</span></div>
    <div class="dato"><b>${r.datos.db} dB</b><span>ruido de día</span></div>`;

  // Componentes del índice (frame 09b): nombre, dato duro a la derecha y barra con el puntaje 0–100.
  // Los elegidos por el runner van en verde marca; los demás, más suaves.
  const mostrar = [...new Set(['vegetacion', 'aire', 'ruido', 'transito', ...factores])];
  $('#detalle-componentes').innerHTML = mostrar.map(f => `
    <div class="componente${factores.includes(f) ? ' componente--elegido' : ''}"><span>${FACTORES[f].nombre}</span><span class="componente__dato">${FACTORES[f].dato(r) || `${r.factores[f]} / 100`}</span>
      <div class="barra" role="img" aria-label="${FACTORES[f].nombre}: ${r.factores[f]} de 100"><i data-v="${r.factores[f]}"${hojaDetalle.abierta ? ` style="width:${r.factores[f]}%"` : ''}></i></div></div>`).join('');
  $('#detalle-fuentes').textContent = 'Índice = promedio de vegetación, aire, ruido y tránsito en cada tramo (0 a 100). Fuentes: arbolado lineal y espacios verdes (BA Data), NO₂ Sentinel-5P, Mapa de ruido 2018, OSM + GTFS.';

  // Polen (solo si el runner tiene alergias en época)
  const sp = $('#seccion-polen');
  sp.hidden = !r.polen;
  if (r.polen) {
    // Frame 09b: tarjeta verde con el riesgo, el viento y una fila por especie (barra + árboles al lado + época)
    const p = r.polen, maxArb = Math.max(1, ...p.especies.map(e => e.arboles_al_lado));
    const plural = { platano: 'plátanos', fresno: 'fresnos', ligustro: 'ligustros' };
    const especiesTexto = p.especies.map(e => plural[e.especie]).join(' y ');
    const viento = p.viento ? `El viento viene del ${p.viento.desde} a ${Math.round(p.viento.kmh)} km/h: suma el polen de los ${especiesTexto} de ese lado.` : 'Sin dato de viento: contamos solo los árboles cercanos.';
    sp.innerHTML = `<span class="seccion__titulo seccion__titulo--oscuro">Polen para vos · ${MESES[p.mes]}</span>
      <div class="tarjeta-polen tarjeta-polen--${p.nivel}">${icono('polen')}<div class="tarjeta-polen__textos">
        <p>Riesgo ${p.nivel} en este recorrido. ${viento}</p>
        ${p.especies.map(e => `<div class="especie"><span>${ALERGIAS[e.especie].nombre}</span>
          <span class="especie__barra"><i style="width:${Math.max(8, Math.round(e.arboles_al_lado / maxArb * 100))}%"></i></span><span class="especie__dato">${e.arboles_al_lado} al lado · época ${Math.round(e.estacion * 100)} %</span></div>`).join('')}
        ${r.tramosPolen.length ? '<p class="nota">Los tramos punteados en rojo del mapa son los de más polen.</p>' : ''}
      </div></div>
      <p class="nota">Cruza el arbolado público lineal (especie de cada árbol), el pronóstico de viento y la época del año. No es una medición de polen ni una evaluación médica.</p>`;
  }

  // El clima va solo en los chips de arriba (frame 09b): el bloque "Clima a la hora de salida" se sacó en v13.

  // IA (inferencia: siempre con su estilo propio)
  $('#detalle-ia').innerHTML = `<div class="ia__etiqueta">${icono('ia')}Interpretación</div><p>${escapar(r.explicacion)}</p><p class="nota">${r.fuenteTexto}</p>`;
  prepararChat(r);
}

/* 12b. Preguntale a RESPIRA: chat sobre el recorrido elegido.
   [API IA] Tarea "chat" de app/api/ia.js. Recibe como contexto los datos duros de este recorrido y de los otros dos,
   el clima, las preferencias y lo aprendido de corridas anteriores. Cada recorrido tiene su propia conversación. */
const PREGUNTAS_SUGERIDAS = ['¿Por qué me conviene este recorrido?', '¿En qué es mejor que los otros?', '¿Es buena hora para salir?'];
let chat = null, chatDe = null, chatEsperando = false;
function prepararChat(r) {
  if (chatDe === r) return;               // mismo recorrido: se mantiene la conversación
  chat = RespiraIA.nuevoChat(); chatDe = r;
  $('#chat-mensajes').innerHTML = '';
  $('#chat-sugerencias').hidden = false;
  $('#chat-sugerencias').innerHTML = PREGUNTAS_SUGERIDAS.map(p => `<button class="chip" type="button" data-pregunta="${escapar(p)}">${escapar(p)}</button>`).join('');
}
function contextoChat() {
  const r = estado.recorridos[estado.elegido], factores = factoresElegidos(), b = estado.busqueda;
  return {
    recorrido_elegido: recorridoParaIA(r),
    otros_recorridos: estado.recorridos.filter(o => o !== r).map(o => ({ ...recorridoParaIA(o), calles: undefined })),   // sin calles: menos tokens
    preferencias: CONDICIONES.filter(c => estado.condiciones.has(c.id)).map(c => c.titulo),
    salida: b.circular ? `vuelta desde ${b.partida.nombre}` : `${b.partida.nombre} → ${b.llegada.nombre}`,
    horario: fechaSalida().toLocaleString('es-AR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
    clima: climaParaIA(), alergias: alergiasActivas().map(a => ALERGIAS[a].nombre), nivel: estado.perfil.nivel,
    objetivo: estado.perfil.objetivo ? NOMBRE_OBJETIVO[estado.perfil.objetivo] : null,
    aprendizaje: resumenAprendizaje(factores, alergiasActivas().length > 0)
  };
}
function burbuja(quien, texto) {
  const el = document.createElement('div');
  el.className = `chat__mensaje chat__mensaje--${quien}`;
  el.innerHTML = quien === 'ia' ? `<div class="ia__etiqueta">${icono('ia')}RESPIRA</div><p>${escapar(texto)}</p>` : `<p>${escapar(texto)}</p>`;
  $('#chat-mensajes').appendChild(el);
  // Solo se desplaza el contenido de la hoja (scrollIntoView también movía la pantalla entera)
  const contenido = $('#contenido-detalle');
  contenido.scrollTo({ top: contenido.scrollHeight, behavior: 'smooth' });
  return el;
}
async function preguntarAlChat(texto) {
  texto = texto.trim();
  if (!texto || chatEsperando) return;
  chatEsperando = true; $('#chat-enviar').disabled = true; $('#chat-sugerencias').hidden = true;
  if (!hojaDetalle.abierta) hojaDetalle.alternar(true);
  burbuja('yo', texto);
  const pensando = burbuja('ia', 'Pensando…'); pensando.classList.add('chat__mensaje--cargando');
  const yo = chat;
  try {
    const respuesta = await chat.preguntar(texto, contextoChat());
    if (yo !== chat) return pensando.remove();          // cambió de recorrido mientras esperaba
    pensando.classList.remove('chat__mensaje--cargando'); pensando.querySelector('p').textContent = respuesta;
  } catch (err) {
    pensando.classList.remove('chat__mensaje--cargando'); pensando.classList.add('chat__mensaje--error');
    pensando.querySelector('p').textContent = err.message;
  } finally {
    chatEsperando = false; $('#chat-enviar').disabled = false;
  }
}
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); const t = $('#chat-texto'); preguntarAlChat(t.value); t.value = ''; });
$('#chat-texto').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-form').requestSubmit(); } });
$('#chat-sugerencias').addEventListener('click', e => { const b = e.target.closest('[data-pregunta]'); if (b) preguntarAlChat(b.dataset.pregunta); });

$('#empezar').addEventListener('click', () => empezarCorrida(estado.recorridos[estado.elegido]));

/* ---------- 13. EN RECORRIDO (simulación) ----------
   Todavía no hay seguimiento con GPS: un punto avanza sobre la ruta, 1 minuto real = 1 segundo. */
let mapaCorriendo = null, reloj = null;
function empezarCorrida(r) {
  estado.corrida = { sensacion: null, cumplio: null, ambiente: [], comentario: '', inicio: Date.now(), fraccion: 0, foto: null };
  $$('#completado [data-valor], #experiencia [data-valor]').forEach(c => c.setAttribute('aria-pressed', 'false'));
  $('#texto-comentario').value = '';
  irA('corriendo');
}
alMostrar.corriendo = () => {
  const r = estado.recorridos[estado.elegido];
  if (!mapaCorriendo) mapaCorriendo = RespiraMapa.crear($('#mapa-corriendo'), { interactivo: true });
  mapaCorriendo.ponerMargenes({ abajo: 240, arriba: 110 });
  mapaCorriendo.orientar(r.giro ?? null);
  mapaCorriendo.mostrarUno(r, { circular: estado.busqueda.circular });
  // índice de cada punto de la ruta (para mostrar el del tramo en el que va)
  const indicePorPunto = r.tramos.flatMap(t => Array(t.coords.length - 1).fill(Math.round(t.suma / t.n)));
  const totalSeg = r.minutos;   // simulación: r.minutos segundos
  clearInterval(reloj);
  const t0 = Date.now();
  reloj = setInterval(() => {
    if (estado.pantalla !== 'corriendo') { clearInterval(reloj); return; }
    const f = Math.min(1, (Date.now() - t0) / 1000 / totalSeg);
    estado.corrida.fraccion = f;
    mapaCorriendo.moverCorredor(f);
    const km = r.km * f, seg = Math.round(f * r.minutos * 60);
    const tiempo = `${dosDigitos(Math.floor(seg / 60))}:${dosDigitos(seg % 60)}`;
    $('#corriendo-km').textContent = conComa(km);
    $('#corriendo-tiempo').textContent = tiempo;
    $('#corriendo-indice').textContent = indicePorPunto[Math.min(indicePorPunto.length - 1, Math.floor(f * indicePorPunto.length))] ?? r.indice;
    $('#corriendo-resumen').textContent = `${conComa(km)} km · ${tiempo}`;
    if (f >= 1) { clearInterval(reloj); $('#terminar').classList.add('resaltar'); }
  }, 250);
};
$('#terminar').addEventListener('click', async e => {
  clearInterval(reloj);
  e.currentTarget.classList.remove('resaltar');
  if (mapaCorriendo) mapaCorriendo.quitarCorredor();
  const r = estado.recorridos[estado.elegido], f = Math.max(0.05, estado.corrida.fraccion || 1);
  $('#completado-km').textContent = conComa(r.km * f);
  $('#completado-min').textContent = Math.round(r.minutos * f);
  $('#completado-ritmo').textContent = `${ritmo()}:00`;
  $('#completado-indice').innerHTML = `${r.indice}<small>%</small>`;
  $('#completado-barra').style.width = '0';
  estado.corrida.km = Math.round(r.km * f * 10) / 10; estado.corrida.min = Math.round(r.minutos * f);
  await RespiraCelebracion.logro(e.currentTarget);   // sonido + luz: el logro (celebracion.js)
  irA('completado', { reemplazar: true });
});

/* ---------- 14. COMPLETADO ---------- */
let mapaCompletado = null;
alMostrar.completado = () => {
  const r = estado.recorridos[estado.elegido];
  if (!mapaCompletado) mapaCompletado = RespiraMapa.crear($('#mapa-completado'), { interactivo: false });
  setTimeout(() => { mapaCompletado.orientar(r.giro ?? null); mapaCompletado.mostrarUno(r, { circular: estado.busqueda.circular }); $('#completado-barra').style.width = r.indice + '%'; contarHasta($('#completado-indice'), r.indice); }, 60);
};
// El número sube junto con la barra (de 0 al índice del recorrido)
function contarHasta(el, final, ms = 1400) {
  const t0 = performance.now();
  const paso = t => {
    const f = Math.min(1, (t - t0) / ms), suave = 1 - Math.pow(1 - f, 3);
    el.innerHTML = `${Math.round(final * suave)}<small>%</small>`;
    if (f < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/* ---------- 14b. TU EXPERIENCIA: lo que la app aprende de cada corrida ----------
   v13 (frame 12 de "RESPIRA FINAL?"): dos preguntas en la misma pantalla.
   - "¿El recorrido cumplió con lo que buscabas?" Sí / No.
   - "¿Cómo describirías el ambiente?" chips: cada uno confirma ("si") o marca como fallida ("no") una condición
     (tabla AMBIENTE). Lo que dicen los chips pisa la respuesta general.
   Con "Sí", las preferencias elegidas quedan confirmadas; con "No", las que los chips no aclaran quedan "a medias".
   Cada preferencia tiene un peso (1 = normal) guardado en el teléfono ("respira-aprendizaje"):
   lo que falla pesa más la próxima vez y lo confirmado se refuerza un poco. Los pesos cambian
   el armado de recorridos (red.js) y la IA recibe el historial para no prometer de más. */
const AJUSTE_PESO = { si: 0.05, medias: 0.15, no: 0.3 };
const PESO_MIN = 0.5, PESO_MAX = 2.5;
const AMBIENTE = [
  { id: 'tranquilo', texto: 'Tranquilo', factor: 'ruido', valor: 'si', opuesto: 'ruidoso' },
  { id: 'verde', texto: 'Verde', factor: 'vegetacion', valor: 'si' },
  { id: 'ruidoso', texto: 'Ruidoso', factor: 'ruido', valor: 'no', opuesto: 'tranquilo' },
  { id: 'transito', texto: 'Con tránsito', factor: 'transito', valor: 'no' },
  { id: 'polen', texto: 'Con polen', factor: 'polen', valor: 'no' },
  { id: 'otro', texto: 'Otro', factor: null }
];

function leerAprendizaje() {
  try {
    const a = JSON.parse(localStorage.getItem('respira-aprendizaje'));
    if (a && a.pesos && a.historial) return a;
  } catch (e) { /* modo privado */ }
  return { pesos: {}, historial: {} };
}
function aprender(evaluacion) {
  const a = leerAprendizaje();
  for (const [f, v] of Object.entries(evaluacion || {})) {
    if (!AJUSTE_PESO[v]) continue;
    a.pesos[f] = Math.round(Math.min(PESO_MAX, Math.max(PESO_MIN, (a.pesos[f] ?? 1) + AJUSTE_PESO[v])) * 100) / 100;
    const h = a.historial[f] || (a.historial[f] = { si: 0, medias: 0, no: 0 });
    h[v]++;
  }
  try { localStorage.setItem('respira-aprendizaje', JSON.stringify(a)); } catch (e) { /* modo privado */ }
}
// Para la IA: cómo le fue a cada preferencia de esta búsqueda en corridas anteriores.
function huboFallas(factores, conPolen) {
  const { historial } = leerAprendizaje();
  return (conPolen ? [...factores, 'polen'] : factores).some(f => historial[f] && (historial[f].no || historial[f].medias));
}
function resumenAprendizaje(factores, conPolen) {
  const { historial } = leerAprendizaje(), nombres = Object.fromEntries(CONDICIONES.map(c => [c.factor, c.titulo]));
  const lista = conPolen ? [...factores, 'polen'] : factores;
  const resumen = Object.fromEntries(lista.filter(f => historial[f])
    .map(f => [nombres[f] || 'Menos polen', { se_cumplio: historial[f].si, a_medias: historial[f].medias, no_se_cumplio: historial[f].no }]));
  return Object.keys(resumen).length ? resumen : null;
}

// Las preferencias de la corrida que se acaba de hacer: las condiciones de la búsqueda y el polen si había riesgo.
function preferenciasDeLaCorrida() {
  const r = estado.recorridos[estado.elegido];
  const lista = CONDICIONES.filter(c => estado.condiciones.has(c.id)).map(c => ({ factor: c.factor, titulo: c.titulo, icono: c.icono }));
  if (r && r.polen) lista.push({ factor: 'polen', titulo: 'Menos polen', icono: 'polen' });
  return lista;
}
// Lo que se guarda y se aprende: la respuesta general para cada preferencia elegida, corregida por los chips del ambiente.
function evaluacionFinal() {
  const cumplio = estado.corrida.cumplio, ev = {};
  if (cumplio) preferenciasDeLaCorrida().forEach(p => { ev[p.factor] = cumplio === 'si' ? 'si' : 'medias'; });
  (estado.corrida.ambiente || []).forEach(id => { const a = AMBIENTE.find(x => x.id === id); if (a && a.factor) ev[a.factor] = a.valor; });
  return ev;
}

function dibujarExperiencia() {
  const elegidos = estado.corrida.ambiente || (estado.corrida.ambiente = []);
  $('#ambiente').innerHTML = AMBIENTE.map(a => `<button class="chip" type="button" data-ambiente="${a.id}" aria-pressed="${elegidos.includes(a.id)}">${a.texto}</button>`).join('');
  // Qué va a aprender la app, en una línea (así el runner ve para qué sirve responder)
  const ev = evaluacionFinal(), nombres = { ...Object.fromEntries(CONDICIONES.map(c => [c.factor, c.titulo.toLowerCase()])), polen: 'menos polen' };
  const mejor = Object.keys(ev).filter(f => ev[f] !== 'si').map(f => nombres[f]);
  const sigue = Object.keys(ev).filter(f => ev[f] === 'si').map(f => nombres[f]);
  $('#resumen-experiencia').textContent = !estado.corrida.cumplio && !elegidos.length ? ''
    : [sigue.length ? `Vamos a seguir priorizando ${sigue.join(', ')}.` : '', mejor.length ? `La próxima vez le damos más peso a: ${mejor.join(', ')}.` : ''].join(' ').trim();
  $('#experiencia-siguiente').disabled = !estado.corrida.cumplio;
}
alMostrar.experiencia = dibujarExperiencia;
$('[data-grupo="cumplio"]').addEventListener('click', dibujarExperiencia);   // corre después del manejo general de chips
$('#ambiente').addEventListener('click', e => {
  const b = e.target.closest('[data-ambiente]'); if (!b) return;
  const a = AMBIENTE.find(x => x.id === b.dataset.ambiente), lista = estado.corrida.ambiente;
  const i = lista.indexOf(a.id);
  if (i >= 0) lista.splice(i, 1);
  else { lista.push(a.id); if (a.opuesto) { const j = lista.indexOf(a.opuesto); if (j >= 0) lista.splice(j, 1); } }   // tranquilo y ruidoso se excluyen
  dibujarExperiencia();
});

/* ---------- 15. COMENTARIO con dictado por voz ----------
   Usa el reconocimiento de voz del navegador (Chrome y Safari).
   [API IA] FUERA DE ALCANCE (decisiones.md, 3/11/2026) — Dictado con Whisper para navegadores sin dictado:
   grabar el audio (MediaRecorder) y mandarlo a una tarea "transcribir" (Groq tiene whisper-large-v3). */
conectarDictado($('#microfono'), $('#texto-comentario'), $('#aviso-microfono'));

/* ---------- 16. RESPIRA CHALLENGE (la pirueta) ----------
   Escribí una palabra corriendo: cada letra es un recorrido real por la red de calles (red.js → armarLetra),
   con las mismas condiciones y el mismo índice que el resto de la app. Una letra por día.
   v13: la letra se busca en TODA la Ciudad (o cerca del runner, o alrededor de un lugar que elige): la app prueba
   cientos de lugares y se queda con el que mejor dibuja la letra y, entre esos, con mejor respirabilidad.
   Cada tarjeta muestra la letra sobre el mapa real de OpenStreetMap, girado para que se lea derecha, y abajo
   un mapa de la Ciudad con dónde cae cada letra.
   Se guarda en el teléfono ("respira-challenge"): la palabra, la zona, el día en que empezó, las letras hechas
   y el lugar de cada letra (así la letra de mañana no cambia de lugar). */
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const PALABRAS_SUGERIDAS = ['CORRÉ', 'META', 'TIEMPO', 'GANÁ'];
const RADIO_ZONA = 1800;   // "Cerca de mí" y "un lugar": la letra cae a menos de 1,8 km
let challenge;
try { challenge = JSON.parse(localStorage.getItem('respira-challenge')); } catch (e) { challenge = null; }
if (!challenge || !challenge.palabra) challenge = { palabra: 'LOVE', hechas: [], inicio: null };
challenge.zona ??= null;          // null = toda la Ciudad · { nombre, lon, lat } = alrededor de ese punto
challenge.lugares ??= {};         // índice de la letra → { lon, lat, giro, alto } (dónde quedó dibujada)
delete challenge.centro;          // v12 guardaba un centro fijo (Primera Junta)
const guardarChallenge = () => { try { localStorage.setItem('respira-challenge', JSON.stringify(challenge)); } catch (e) { /* modo privado */ } };
// Se muestran las tildes ("CORRÉ"), pero cada letra se dibuja con su forma base (É → E, Ñ → N)
const limpiarPalabra = t => t.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').slice(0, 8);
const letraBase = L => L.normalize('NFD').replace(/[̀-ͯ]/g, '');
const letrasCalculadas = {};   // "L|zona|factores|i" → recorrido
let dibujoChallenge = 0, mapasLetras = [], mapaPalabra = null;

function proximaLetra() { return [...challenge.palabra].findIndex((_, i) => !challenge.hechas.includes(i)); }
function etiquetaDia(i) {
  const proxima = proximaLetra();
  if (challenge.hechas.includes(i)) return 'Hecha';
  const d = new Date(); d.setDate(d.getDate() + (i - proxima));
  return i === proxima ? `Hoy · ${DIAS[d.getDay()]}` : DIAS[d.getDay()];
}
function cambiarPalabra(palabra) {
  if (!palabra || palabra === challenge.palabra) return;
  challenge = { ...challenge, palabra, hechas: [], inicio: null, lugares: {} }; guardarChallenge(); dibujarChallenge();
}
function cambiarZona(zona) {
  challenge = { ...challenge, zona, lugares: Object.fromEntries(Object.entries(challenge.lugares).filter(([i]) => challenge.hechas.includes(+i))) };
  guardarChallenge(); dibujarChallenge();
}
const claveLetra = i => `${challenge.palabra[i]}|${challenge.zona ? challenge.zona.lon + ',' + challenge.zona.lat : 'ciudad'}|${factoresElegidos().join()}|${i}`;
async function letraCalculada(i) {
  const clave = claveLetra(i);
  if (!letrasCalculadas[clave]) {
    const forma = LETRAS[letraBase(challenge.palabra[i])];
    const zona = challenge.zona ? { lon: challenge.zona.lon, lat: challenge.zona.lat, radio: RADIO_ZONA } : null;
    const r = await RespiraRed.armarLetra({ trazos: forma.trazos, proporcion: forma.proporcion || 0.7, zona, fijo: challenge.lugares[i] || null,
      factores: factoresElegidos(), nocturno: esDeNoche(), pesos: pesosDelRecorrido(),
      evitar: Object.entries(challenge.lugares).filter(([j]) => +j !== i).map(([, l]) => l) });
    challenge.lugares[i] = r.lugar; guardarChallenge();
    letrasCalculadas[clave] = r;
  }
  return letrasCalculadas[clave];
}

function dibujarZona() {
  const z = challenge.zona;
  $$('[data-zona]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zona === (z ? (z.propia ? 'cerca' : 'lugar') : 'ciudad'))));
  $('#zona-texto').textContent = z ? `Alrededor de ${z.nombre} (hasta ${conComa(RADIO_ZONA / 1000)} km)` : 'La app busca en toda la Ciudad dónde se lee mejor cada letra.';
}

async function dibujarChallenge() {
  const yo = ++dibujoChallenge, palabra = challenge.palabra, proxima = proximaLetra();
  if (document.activeElement !== $('#palabra')) $('#palabra').value = palabra;
  $('#cuenta-letras').textContent = `${palabra.length}/8`;
  dibujarZona();
  mapasLetras.forEach(m => m && m.leaflet.remove()); mapasLetras = [];
  $('#letras').innerHTML = [...palabra].map((L, i) => `
    <button class="letra${i === proxima ? ' letra--proxima' : ''}${challenge.hechas.includes(i) ? ' letra--hecha' : ''}" data-letra="${i}" type="button" aria-label="Letra ${L}, ${etiquetaDia(i)}">
      <span class="letra__mapa" id="letra-mapa-${i}"><span class="letra__cargando">Buscando dónde dibujar la ${L}…</span></span>
      <span class="letra__badge">${challenge.hechas.includes(i) ? icono('check', 'icono--chico') : L}</span>
      <span class="letra__dia">${etiquetaDia(i)}</span>
      <span class="letra__km" id="letra-km-${i}">– km</span>
    </button>`).join('');
  const boton = $('#empezar-letra');
  boton.disabled = true;
  boton.innerHTML = proxima < 0 ? `¡Palabra completa! ${icono('check')}` : 'Buscando en la Ciudad…';
  $('#palabra-ciudad').hidden = true;
  const listas = [];
  for (let i = 0; i < palabra.length; i++) {
    try {
      await new Promise(ok => setTimeout(ok, 0));   // deja dibujar la pantalla entre letra y letra
      const r = await letraCalculada(i);
      if (yo !== dibujoChallenge) return;
      const lugar = $('#letra-mapa-' + i);
      lugar.innerHTML = '';
      mapasLetras[i] = RespiraMapa.miniatura(lugar, r, r.giro);
      $('#letra-km-' + i).textContent = `${conComa(r.km)} km`;
      listas[i] = r;
    } catch (err) {
      if (yo !== dibujoChallenge) return;
      $('#letra-mapa-' + i).innerHTML = `<span class="letra__cargando">${escapar(err.message)}</span>`;
    }
  }
  dibujarPalabraEnLaCiudad(listas);
  if (proxima >= 0 && listas[proxima]) { boton.disabled = false; boton.innerHTML = `Empezar con la ${palabra[proxima]} ${icono('derecha')}`; }
  else if (proxima >= 0) boton.innerHTML = 'No pudimos dibujar esa letra';
}

// "Tu palabra en la Ciudad": el contorno de CABA con cada letra en su lugar (se toca una letra para correrla)
function dibujarPalabraEnLaCiudad(listas) {
  const hay = listas.filter(Boolean);
  $('#palabra-ciudad').hidden = !hay.length;
  if (!hay.length) return;
  if (!mapaPalabra) {
    mapaPalabra = L.map($('#mapa-palabra'), { zoomControl: false, attributionControl: true, dragging: true, scrollWheelZoom: false, doubleClickZoom: true, touchZoom: true, zoomSnap: 0.25 });
    RespiraMapa.capaBase(mapaPalabra);
    mapaPalabra.attributionControl.setPrefix(false);
    // Afuera de la Ciudad queda velado: el challenge es solo en CABA
    const contorno = CABA_CONTORNO.map(([lon, lat]) => [lat, lon]);
    L.polygon([[[-35.2, -59.2], [-35.2, -57.6], [-34.0, -57.6], [-34.0, -59.2]], contorno], { stroke: false, fillColor: '#F7F5EE', fillOpacity: 0.62, interactive: false }).addTo(mapaPalabra);
    L.polygon(contorno, { color: getComputedStyle(document.documentElement).getPropertyValue('--acento-tinta').trim(), weight: 1.5, opacity: 0.7, fill: false, dashArray: '4 5', interactive: false }).addTo(mapaPalabra);
    mapaPalabra.capas = L.layerGroup().addTo(mapaPalabra);
  }
  mapaPalabra.capas.clearLayers();
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  listas.forEach((r, i) => {
    if (!r) return;
    L.polyline(r.coords, { color: css('--acento'), weight: 7, opacity: 0.9, interactive: false }).addTo(mapaPalabra.capas);
    L.polyline(r.coords, { color: css('--acento-tinta'), weight: 2.5, interactive: false }).addTo(mapaPalabra.capas);
    const hecha = challenge.hechas.includes(i);
    L.marker([r.lugar.lat, r.lugar.lon], { keyboard: true, title: `Letra ${challenge.palabra[i]}`,
      icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="letra-pin${i === proximaLetra() ? ' letra-pin--proxima' : ''}${hecha ? ' letra-pin--hecha' : ''}">${challenge.palabra[i]}</div>` }) })
      .on('click', () => correrLetra(i)).addTo(mapaPalabra.capas);
  });
  requestAnimationFrame(() => {
    mapaPalabra.invalidateSize();
    const caja = L.latLngBounds(hay.flatMap(r => r.coords));
    // Con toda la Ciudad se ve el contorno entero; con una zona, se acerca a las letras
    mapaPalabra.fitBounds(challenge.zona ? caja : caja.extend([[CABA.sur, CABA.oeste], [CABA.norte, CABA.este]]), { padding: [10, 10], animate: false });
  });
}
alMostrar.challenge = () => dibujarChallenge();

let esperaPalabra = null;
$('#palabra').addEventListener('input', e => {
  const limpia = limpiarPalabra(e.target.value);
  e.target.value = limpia;
  $('#cuenta-letras').textContent = `${limpia.length}/8`;
  clearTimeout(esperaPalabra);
  esperaPalabra = setTimeout(() => cambiarPalabra(limpia), 700);
});
$('#palabras-sugeridas').innerHTML = PALABRAS_SUGERIDAS.map(p => `<button class="chip chip--palabra" type="button" data-palabra="${p}">${p}</button>`).join('');
$('#palabras-sugeridas').addEventListener('click', e => { const b = e.target.closest('[data-palabra]'); if (b) cambiarPalabra(b.dataset.palabra); });

// Dónde: toda la Ciudad · cerca de mí · un lugar (con el buscador de lugares de los datasets)
$('#zonas').addEventListener('click', async e => {
  const b = e.target.closest('[data-zona]'); if (!b) return;
  $('#buscar-zona').hidden = b.dataset.zona !== 'lugar';
  if (b.dataset.zona === 'ciudad') return cambiarZona(null);
  if (b.dataset.zona === 'lugar') { $('#zona-lugar').focus(); return; }
  $('#zona-texto').textContent = 'Buscando tu ubicación…';
  try {
    const l = await RespiraBuscador.miUbicacion();
    cambiarZona({ nombre: 'tu ubicación', lon: l.lon, lat: l.lat, propia: true });
  } catch (err) { $('#zona-texto').textContent = err.message; }
});
$('#zona-lugar').addEventListener('input', async e => {
  await RespiraBuscador.cargarLugares();
  const lista = RespiraBuscador.local(e.target.value, 5);
  $('#zona-sugerencias').hidden = !lista.length;
  $('#zona-sugerencias').innerHTML = lista.map((l, i) => `<li role="option" data-i="${i}">${icono(l.tipo === 'Calle' ? 'buscar' : 'partida', 'icono--chico')}<span class="sugerencia__textos"><span class="sugerencia__nombre">${escapar(l.nombre)}</span><span class="sugerencia__tipo">${escapar(l.tipo || '')}</span></span></li>`).join('');
  $('#zona-sugerencias').onclick = ev => {
    const li = ev.target.closest('[data-i]'); if (!li) return;
    const l = lista[+li.dataset.i];
    $('#zona-sugerencias').hidden = true; $('#buscar-zona').hidden = true; e.target.value = '';
    cambiarZona({ nombre: l.nombre, lon: l.lon, lat: l.lat });
  };
});

// Tocar una letra (o su pin) o "Empezar con la …": se abre como un recorrido más (mapa, detalle, correr, experiencia).
async function correrLetra(i) {
  if (challenge.hechas.includes(i)) return;
  const r = letrasCalculadas[claveLetra(i)];
  if (!r) return;
  const L = challenge.palabra[i];
  calculo++;   // cancela un cálculo de recorridos que haya quedado en curso
  Object.assign(r, { numero: 1, titulo: `Letra ${L} · Respira challenge`, minutos: minutos(r), recomendado: false,
    explicacion: `Dibujás la ${L} con ${conComa(r.km)} km de calles reales. La app probó cientos de lugares de la Ciudad y eligió este porque la letra se lee bien${r.parecido ? ` (se parece un ${r.parecido} % a la letra ideal)` : ''} y tiene buena respirabilidad: en promedio ${conComa(r.datos.arboles_100m, 0)} árboles cada 100 m y unos ${r.datos.db} dB de ruido de día.`,
    fuenteTexto: 'Calculado por la app con los datasets (no es una interpretación de la IA)' });
  const [ini, fin] = [r.coords[0], r.coords[r.coords.length - 1]];
  Object.assign(estado.busqueda, { partida: { nombre: `Inicio de la ${L}`, lat: ini[0], lon: ini[1] }, llegada: { nombre: `Fin de la ${L}`, lat: fin[0], lon: fin[1] }, circular: false, km: r.km, programar: false });
  estado.challengeLetra = i; estado.clima = null;
  estado.recorridos = [r]; estado.elegido = 0;
  irA('recorridos');
  if (!mapaRecorridos) mapaRecorridos = RespiraMapa.crear($('#mapa-recorridos'), { margenAbajo: altoHojaLista(), margenArriba: 150 });
  $('#mapa-estado').hidden = true;
  dibujarOpciones();
  requestAnimationFrame(() => {
    mapaRecorridos.ponerMargenes({ abajo: altoHojaLista(), arriba: 150 });
    mapaRecorridos.orientar(r.giro);
    mapaRecorridos.mostrarRecorridos([r], { circular: false, alElegir: () => {} });
  });
  $('#ver-recorrido').disabled = false;
}
$('#letras').addEventListener('click', e => { const b = e.target.closest('[data-letra]'); if (b) correrLetra(+b.dataset.letra); });
$('#empezar-letra').addEventListener('click', () => { const i = proximaLetra(); if (i >= 0) correrLetra(i); });
function marcarLetraHecha() {
  if (estado.challengeLetra == null) return;
  if (!challenge.hechas.includes(estado.challengeLetra)) challenge.hechas.push(estado.challengeLetra);
  challenge.inicio ??= new Date().toISOString();
  guardarChallenge(); estado.challengeLetra = null;
}

$('#guardar-corrida').addEventListener('click', async e => {
  marcarLetraHecha();
  estado.corrida.comentario = $('#texto-comentario').value.trim();
  const r = estado.recorridos[estado.elegido], b = estado.busqueda;
  const registro = { fecha: new Date().toISOString(), busqueda: { partida: b.partida, llegada: b.circular ? null : b.llegada, circular: b.circular, km: b.km },
    recorrido: r.titulo, km: estado.corrida.km ?? r.km, min: estado.corrida.min ?? r.minutos, indice: r.indice,
    polen: r.polen ? r.polen.nivel : null, condiciones: [...estado.condiciones], origen: { ...estado.origen }, objetivo: estado.perfil.objetivo,
    sensacion: estado.corrida.sensacion, cumplio: estado.corrida.cumplio, ambiente: [...estado.corrida.ambiente], evaluacion: evaluacionFinal(), comentario: estado.corrida.comentario,
    // v12 · Tu archivo: el lugar, la foto (si sacó) y el dibujo del recorrido (máx. 48 puntos) para la postal sin foto
    lugar: b.partida.nombre, foto: estado.corrida.foto || null, trazo: simplificarTrazo(r.coords) };
  estado.ultimaCorrida = registro;
  try {
    const corridas = leerCorridas();
    corridas.push(registro);
    try { localStorage.setItem('respira-corridas', JSON.stringify(corridas.slice(-30))); }
    catch (lleno) {   // si no entra (fotos), se guardan las fotos de las últimas 12 corridas y el resto queda con su dibujo
      corridas.slice(0, -12).forEach(c => { delete c.foto; });
      localStorage.setItem('respira-corridas', JSON.stringify(corridas.slice(-30)));
    }
  } catch (e) { /* modo privado */ }
  aprender(registro.evaluacion);
  await RespiraCelebracion.guardado(e.currentTarget);   // satisfacción instantánea (celebracion.js)
  // [API IA] FUERA DE ALCANCE (decisiones.md, 3/11/2026) — Leer el comentario con una tarea "experiencia" que detecte
  // quejas que no son de las preferencias elegidas (por ejemplo "había mucha gente"). El aprendizaje usa las respuestas de arriba.
  irA('guardado');
});
$('#volver-inicio').addEventListener('click', irAlInicio);
$('#ver-archivo').addEventListener('click', () => { irAlInicio(); irA('archivo'); });

/* 15b. v12 · TU ARCHIVO: la foto de la corrida (pantalla del comentario) y la tarjeta en "guardado".
   La foto se recorta a 9:16 y se achica a 360 × 644 px antes de guardarla en el teléfono. */
function simplificarTrazo(coords = []) {
  if (coords.length <= 48) return coords.map(c => [+c[0].toFixed(5), +c[1].toFixed(5)]);
  const paso = (coords.length - 1) / 47;
  return Array.from({ length: 48 }, (_, i) => coords[Math.round(i * paso)]).map(c => [+c[0].toFixed(5), +c[1].toFixed(5)]);
}
$('#foto-corrida').addEventListener('change', e => {
  const archivo = e.target.files && e.target.files[0]; if (!archivo) return;
  const img = new Image();
  img.onload = () => {
    const W = 360, H = 644, c = document.createElement('canvas'); c.width = W; c.height = H;
    const k = Math.max(W / img.width, H / img.height), w = img.width * k, h = img.height * k;
    c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    estado.corrida.foto = c.toDataURL('image/jpeg', 0.72);
    URL.revokeObjectURL(img.src);
    dibujarFotoHoy();
  };
  img.src = URL.createObjectURL(archivo);
});
function dibujarFotoHoy() {
  const f = estado.corrida.foto, hoy = $('#foto-hoy'), r = estado.recorridos[estado.elegido];
  hoy.style.backgroundImage = f ? `url('${f}')` : '';
  hoy.classList.toggle('mini-foto--lista', !!f);
  $('#texto-foto').textContent = f ? 'Cambiar foto' : 'Sacar una foto';
  $('#estado-foto').innerHTML = f ? `${icono('check', 'icono--chico')} Lista: se suma a tu archivo con los datos de ${escapar(estado.busqueda.partida ? estado.busqueda.partida.nombre : r ? r.titulo : 'este recorrido')}.`
    : 'Sacate una foto o elegí una del lugar. Si no, guardamos el dibujo de tu recorrido.';
}
alMostrar.comentario = (anterior => () => { if (anterior) anterior(); $('#abanico-sumar').innerHTML = RespiraArchivo.abanico(4); dibujarFotoHoy(); })(alMostrar.comentario);
alMostrar.guardado = (anterior => () => {
  if (anterior) anterior();
  const c = estado.ultimaCorrida;
  $('#guardado-foto').innerHTML = c ? RespiraArchivo.tarjeta({ foto: c.foto, trazo: c.trazo }) : '';
  // Frame 14: "¡Bien Martina! Recorrido guardado." (sin nombre, solo "¡Recorrido guardado!")
  const nombre = (estado.perfil.nombre || '').trim();
  $('#guardado-titulo').innerHTML = nombre ? `¡Bien ${escapar(nombre)}!<br>Recorrido guardado.` : '¡Recorrido guardado!';
  $('#ver-archivo').textContent = c && c.foto ? 'Tu foto ya está en tu archivo · Ver' : 'Ver tu recorrido en tu archivo';
})(alMostrar.guardado);
alMostrar.inicio = (anterior => () => { if (anterior) anterior(); $('#abanico-inicio').innerHTML = RespiraArchivo.abanico(9); })(alMostrar.inicio);

/* ---------- 16. AL ABRIR LA APP ---------- */
marcarChips('nivel', estado.perfil.nivel);
marcarChips('alergias', estado.perfil.alergias);
if (estado.perfil.objetivo) $('#objetivo').value = estado.perfil.objetivo;
$('#nombre').value = estado.perfil.nombre; $('#apellido').value = estado.perfil.apellido;
dibujarFoto(); dibujarAvatares(); dibujarSaludo(); dibujarCondiciones();
RespiraRed.cargar().catch(() => {});   // la red se empieza a bajar mientras el runner completa los datos

let splashTerminado = false;
function salirDelSplash() {
  if (splashTerminado) return;
  splashTerminado = true;
  if (estado.perfil.nombre) { irA('inicio', { reemplazar: true }); estado.historial = []; }
  else irA('bienvenida', { reemplazar: true });
}
setTimeout(salirDelSplash, 2200);
