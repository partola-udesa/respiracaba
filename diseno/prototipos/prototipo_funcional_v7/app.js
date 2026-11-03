/* =====================================================================
   RESPIRA — Comportamiento de la app
   Todo lo que PASA cuando el runner toca algo (= el modo Prototype de Figma,
   pero con memoria y lógica). Está ordenado como el recorrido del usuario.

   Dónde entra la IA: buscá "[API IA]" en este archivo. Las que dicen
   PENDIENTE son lugares donde hace falta sumar una llamada nueva a app/api/ia.js.
   ===================================================================== */

/* ---------- 1. ESTADO: la memoria de la app ----------
   Tip: en la consola de Chrome (Cmd + Opción + J) escribí  estado  y Enter para verla. */
const estado = {
  pantalla: 'splash',
  historial: [],
  perfil:   { nombre: '', apellido: '', foto: null, edad: 26, altura: 1.67, peso: 58, nivel: null, objetivo: null, alergias: [] },
  busqueda: { partida: null, llegada: null, circular: false, km: null, programar: false, fecha: null, hora: null },
  condiciones: new Set(CONDICIONES.filter(c => c.elegida).map(c => c.id)),
  clima: null,             // la hora del pronóstico que corresponde a la salida (Open-Meteo)
  recorridos: [],          // las tres opciones calculadas
  elegido: 0,              // índice de la opción elegida en el mapa / la lista
  corrida:  { sensacion: null, cumplio: null, evaluacion: {}, comentario: '' }
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
    const principal = pantallaActual().querySelector('[data-enter]');
    if (principal && !principal.disabled) { e.preventDefault(); principal.click(); }
  }
  if (e.key === 'Escape') { e.preventDefault(); if (!cerrarFlotantes()) volver(); }
});

/* ---------- 5. PIEZAS QUE SE REPITEN ---------- */

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
  $$('.info__boton').forEach(b => b.setAttribute('aria-expanded', 'false'));
  $$('[role="combobox"]').forEach(i => i.setAttribute('aria-expanded', 'false'));
  if (estado.pantalla === 'detalle' && hojaDetalle.abierta) { hojaDetalle.alternar(false); cerro = true; }
  return cerro;
}
document.addEventListener('click', e => {
  if (!e.target.closest('.info__boton, .info__globo')) $$('.info__globo').forEach(g => g.hidden = true);
});

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
    estado.condiciones = new Set(c.condiciones || []);
    irA('recorridos'); calcularRecorridos();
  };
};

/* ---------- 9. DEFINÍ TU RECORRIDO ---------- */

// Buscador de partida y llegada: datasets (al instante) + esquinas + direcciones de OpenStreetMap.
function autocompletar(nombre) {
  const input = $('#' + nombre), lista = $('#sugerencias-' + nombre), borrar = $(`[data-borrar="${nombre}"]`);
  let opciones = [], marcada = 0, espera = null, pedido = null, buscandoRemoto = false;

  const limpiarError = () => { $('#error-' + nombre).hidden = true; $('#campo-' + nombre).classList.remove('campo--error'); };
  function elegir(lugar) {
    if (!lugar) return;
    if (lugar.accion === 'ubicacion') {
      lista.innerHTML = '<li class="sugerencias__estado">Buscando tu ubicación…</li>';
      RespiraBuscador.miUbicacion().then(elegir).catch(err => { lista.innerHTML = `<li class="sugerencias__estado">${escapar(err.message)}</li>`; });
      return;
    }
    input.value = lugar.nombre; estado.busqueda[nombre] = lugar; borrar.hidden = false;
    lista.hidden = true; input.setAttribute('aria-expanded', 'false');
    limpiarError();
  }
  function dibujar() {
    const filas = opciones.map((l, i) => `<li role="option" id="op-${nombre}-${i}" aria-selected="${i === marcada}" data-i="${i}">
        ${icono(l.accion === 'ubicacion' ? 'mi-ubicacion' : l.tipo === 'Calle' || l.tipo === 'Esquina' ? 'buscar' : 'partida', 'icono--chico')}
        <span class="sugerencia__textos"><span class="sugerencia__nombre">${escapar(l.nombre)}</span><span class="sugerencia__tipo">${escapar(l.tipo || '')}</span></span></li>`);
    if (buscandoRemoto) filas.push('<li class="sugerencias__estado">Buscando direcciones…</li>');
    else if (!opciones.length && input.value.trim().length >= 3) filas.push('<li class="sugerencias__estado">No encontramos ese lugar en la Ciudad. Probá con calle y altura, o con una esquina (ej: Corrientes y Callao).</li>');
    lista.innerHTML = filas.join('');
    lista.hidden = !filas.length; input.setAttribute('aria-expanded', String(!!filas.length));
    input.setAttribute('aria-activedescendant', opciones.length ? `op-${nombre}-${marcada}` : '');
  }
  async function buscar() {
    const q = input.value.trim();
    if (!q) { opciones = [{ accion: 'ubicacion', nombre: 'Usar mi ubicación', tipo: 'Ubicación actual' }]; buscandoRemoto = false; marcada = 0; return dibujar(); }
    opciones = RespiraBuscador.local(q); marcada = 0;
    buscandoRemoto = q.length >= 3; dibujar();
    if (!buscandoRemoto) return;
    clearTimeout(espera);
    espera = setTimeout(async () => {
      if (pedido) pedido.abort();
      pedido = new AbortController();
      const [esq, dirs] = await Promise.all([
        RespiraBuscador.esquina(q).catch(() => null),
        RespiraBuscador.direcciones(q, pedido.signal).catch(e => e.name === 'AbortError' ? null : [])
      ]);
      if (dirs === null || input.value.trim() !== q) return;   // ya se escribió otra cosa
      const vistos = new Set(opciones.map(o => o.nombre.toLowerCase()));
      const nuevas = [esq, ...dirs].filter(o => o && !vistos.has(o.nombre.toLowerCase()) && vistos.add(o.nombre.toLowerCase()));
      opciones = [...(esq ? [esq] : []), ...opciones, ...nuevas.filter(o => o !== esq)].slice(0, 8);
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
  return { poner: lugar => { input.value = lugar ? lugar.nombre : ''; borrar.hidden = !lugar; } };
}
const campoPartida = autocompletar('partida');
const campoLlegada = autocompletar('llegada');

$('#circular').addEventListener('click', e => {
  estado.busqueda.circular = !estado.busqueda.circular;
  e.currentTarget.setAttribute('aria-checked', String(estado.busqueda.circular));
  $('#bloque-llegada').hidden = estado.busqueda.circular;
  $('#error-llegada').hidden = true;
});

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
  if (e.target.checked) $('#hora').focus();
});

$('#continuar-definir').addEventListener('click', () => {
  const b = estado.busqueda, error = (id, texto) => { const m = $('#error-' + id); if (texto) m.textContent = texto; m.hidden = false; $('#campo-' + id).classList.add('campo--error'); };
  let ok = true;
  if (!b.partida) { ok = false; error('partida'); }
  if (!b.circular && !b.llegada) { ok = false; error('llegada'); }
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
   "Cerca del agua" usa el río, el Riachuelo y los lagos de OpenStreetMap (app/datos/capas.js). */
function tarjetaCondicion(c) {
  return `<button class="condicion" data-condicion="${c.id}" aria-pressed="${estado.condiciones.has(c.id)}">
    ${icono(c.icono)}
    <span><span class="condicion__titulo">${c.titulo}</span><span class="condicion__fuente">${c.fuente}</span></span>
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
  b.setAttribute('aria-pressed', String(estado.condiciones.has(id)));
});
// Aviso de alergias: se ve solo si alguna especie marcada está en época en la fecha de la salida.
const alergiasActivas = () => (estado.perfil.alergias || []).filter(a => ALERGIAS[a]);
alMostrar.condiciones = () => {
  dibujarCondiciones();
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
  const b = estado.busqueda, factores = factoresElegidos();
  if (!mapaRecorridos) mapaRecorridos = RespiraMapa.crear($('#mapa-recorridos'), { margenAbajo: altoHojaLista(), margenArriba: 150 });
  const aviso = $('#mapa-estado');
  aviso.hidden = false; aviso.className = 'mapa__estado cargando'; aviso.textContent = 'Mirando el viento de esa hora…';
  $('#opciones-recorridos').innerHTML = '<div class="cargando">Cruzando cada tramo de calle con tus condiciones…</div>';
  $('#ver-recorrido').disabled = true;

  estado.clima = await climaDeLaSalida();
  if (yo !== calculo) return;
  aviso.textContent = 'Calculando recorridos con los datasets…';
  const viento = estado.clima && { direccion: estado.clima.wind_direction_10m, kmh: estado.clima.wind_speed_10m };

  let opciones;
  try {
    opciones = await RespiraRed.armarRecorridos({ desde: b.partida, hasta: b.llegada, circular: b.circular, km: b.km, factores,
      pesos: leerAprendizaje().pesos, nocturno: esDeNoche(), alergias: alergiasActivas(), fecha: fechaSalida(), viento });
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
  estado.recorridos = opciones; estado.elegido = 0;

  aviso.hidden = true;
  mapaRecorridos.ponerMargenes({ abajo: altoHojaLista(), arriba: 150 });
  mapaRecorridos.mostrarRecorridos(opciones, { circular: b.circular, alElegir: i => seleccionar(i, { desdeElMapa: true }) });
  dibujarOpciones();
  $('#ver-recorrido').disabled = false;

  // [API IA] La IA interpreta los números (no los cambia): título, explicación y cuál recomienda.
  // Llama a /api/ia con tarea "recorridos". Si no está disponible, queda el resumen automático.
  interpretarConIA(opciones, factores).then(lectura => {
    if (yo !== calculo || !lectura) return;
    for (const l of lectura.recorridos || []) {
      const r = opciones.find(o => o.numero === l.numero);
      if (!r) continue;
      if (l.titulo) r.titulo = l.titulo;
      if (l.explicacion) { r.explicacion = l.explicacion; r.fuenteTexto = 'Interpretación de la IA (Groq) a partir de los datasets'; }
    }
    if (lectura.recomendado) opciones.forEach(r => { r.recomendado = r.numero === lectura.recomendado; });
    dibujarOpciones();
    if (estado.pantalla === 'detalle') dibujarDetalle();
  }).catch(() => {});
}

// Títulos cortos: a cada recorrido le toca aquello en lo que es el mejor de los tres.
function ponerTitulos(opciones, factores) {
  const NOMBRES = { vegetacion: 'Más verde', ruido: 'Más silencioso', aire: 'Mejor aire', transito: 'Menos tránsito', sombra: 'Más sombra', agua: 'Junto al agua', terreno: 'Terreno más parejo', luz: 'Más iluminado' };
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

async function interpretarConIA(opciones, factores) {
  const h = estado.clima;
  const clima = h ? { temperatura: h.temperature_2m, sensacion: h.apparent_temperature, viento_kmh: h.wind_speed_10m, viento_desde_grados: h.wind_direction_10m,
    lluvia_prob: h.precipitation_probability, uv: h.uv_index, fuente: 'Open-Meteo' } : null;
  const nombres = Object.fromEntries(CONDICIONES.map(c => [c.factor, c.titulo]));
  return RespiraIA.interpretarRecorridos({
    preferencias: factores.map(f => nombres[f]),
    horario: estado.busqueda.programar ? `${estado.busqueda.fecha} ${estado.busqueda.hora}` : 'ahora',
    alergias: alergiasActivas().map(a => ALERGIAS[a].nombre),
    nivel: estado.perfil.nivel, circular: estado.busqueda.circular, clima,
    recorridos: opciones.map(r => ({ numero: r.numero, km: r.km, minutos: r.minutos, indice_respirabilidad: r.indice,
      cumplimiento_preferencias: r.preferencias, puntajes: nombresFavorables(r.factores),
      datos: { arboles_cada_100m: r.datos.arboles_100m, ruido_dia_db: r.datos.db, no2_umol_m2: r.datos.no2, metros_al_agua: r.datos.agua_m },
      polen: r.polen ? { riesgo: r.polen.riesgo, nivel: r.polen.nivel, especies: r.polen.especies.map(e => ({ especie: ALERGIAS[e.especie].nombre, epoca: e.estacion, arboles_al_lado: e.arboles_al_lado })) } : null,
      calles: r.calles })),
    aprendizaje: resumenAprendizaje(factores, alergiasActivas().length > 0)
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
      <span><span class="opcion-ruta__titulo">${escapar(r.titulo)}</span>
        <span class="opcion-ruta__sub">${conComa(r.km)} km · ≈ ${r.minutos} min${etiquetaPolen(r)}</span></span>
      <span class="opcion-ruta__indice"><span class="numero">${r.indice}<small>%</small></span><span>${r.recomendado ? 'recomendado' : 'índice'}</span></span>
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
  contenido.addEventListener('pointerdown', e => { if (!e.target.closest('button, a, input')) empezar(e); });
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
    mapaDetalle.mostrarUno(r, { circular: estado.busqueda.circular, polen: !!r.polen });
  });
};

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
  const chips = [`<span class="chip-dato chip-dato--acento">${icono('reloj')}${b.programar ? 'Salida ' + hora : 'Ahora · ' + hora}</span>`];
  if (h && Number.isFinite(h.temperature_2m)) chips.push(`<span class="chip-dato">${icono('sol')}${Math.round(h.temperature_2m)}° · ST ${Math.round(h.apparent_temperature)}°</span>`);
  if (textoViento(h)) chips.push(`<span class="chip-dato">${icono('viento')}${textoViento(h)}</span>`);
  if (r.polen) chips.push(`<span class="chip-dato chip-dato--${r.polen.nivel}">${icono('polen')}Polen ${r.polen.nivel}</span>`);
  $('#chips-detalle').innerHTML = chips.join('');

  $('#detalle-indice').innerHTML = `${r.indice}<small>%</small>`;
  $('#detalle-titulo').textContent = r.titulo;
  $('#detalle-sub').textContent = b.circular ? `Vuelta desde ${b.partida.nombre}` : `${b.partida.nombre} → ${b.llegada.nombre}`;
  $('#detalle-insignia').hidden = !r.recomendado;
  $('#detalle-km').innerHTML = `${conComa(r.km)}<small>km</small>`;
  $('#detalle-datos').innerHTML = `
    <div class="dato"><b>${r.minutos} min</b><span>a ${ritmo()} min/km</span></div>
    <div class="dato"><b>${conComa(r.datos.arboles_100m, 0)}</b><span>árboles / 100 m</span></div>
    <div class="dato"><b>${r.datos.db} dB</b><span>ruido de día</span></div>`;

  // Componentes del índice (dato duro). Se muestran los 4 del índice + los que eligió.
  const mostrar = [...new Set(['vegetacion', 'aire', 'ruido', 'transito', ...factores])];
  $('#detalle-componentes').innerHTML = mostrar.map(f => `
    <div class="componente"><span>${FACTORES[f].nombre}</span><span class="componente__dato">${FACTORES[f].dato(r)}</span>
      <div class="barra" role="img" aria-label="${FACTORES[f].nombre}: ${r.factores[f]} de 100"><i data-v="${r.factores[f]}"${hojaDetalle.abierta ? ` style="width:${r.factores[f]}%"` : ''}></i></div></div>`).join('');
  $('#detalle-fuentes').textContent = 'Índice = promedio de vegetación, aire, ruido y tránsito en cada tramo (0 a 100). Fuentes: arbolado lineal y espacios verdes (BA Data), NO₂ Sentinel-5P, Mapa de ruido 2018, OSM + GTFS.';

  // Polen (solo si el runner tiene alergias en época)
  const sp = $('#seccion-polen');
  sp.hidden = !r.polen;
  if (r.polen) {
    const p = r.polen, maxArb = Math.max(1, ...p.especies.map(e => e.arboles_al_lado));
    const viento = p.viento ? `El viento viene del <b>${p.viento.desde}</b> a ${Math.round(p.viento.kmh)} km/h: suma el polen de los árboles de ese lado.` : 'Sin dato de viento: contamos solo los árboles cercanos.';
    sp.innerHTML = `<span class="seccion__titulo">Polen para vos · ${MESES[p.mes]}</span>
      <div class="tarjeta-dato tarjeta-dato--${p.nivel}">${icono('polen')}<div>
        <b>Riesgo ${p.nivel} en este recorrido.</b> ${viento}
        <div class="especies">${p.especies.map(e => `<div class="especie"><span>${ALERGIAS[e.especie].nombre}</span>
          <div class="barra"><i style="width:${Math.round(e.arboles_al_lado / maxArb * 100)}%"></i></div><span>${e.arboles_al_lado} al lado · época ${Math.round(e.estacion * 100)}%</span></div>`).join('')}</div>
        ${r.tramosPolen.length ? '<p class="nota" style="margin-top:8px">En el mapa, los tramos punteados en rojo son los de más polen.</p>' : ''}
      </div></div>
      <p class="nota">Cruza el arbolado público lineal (especie de cada árbol), el pronóstico de viento y la época del año. No es una medición de polen ni una evaluación médica.</p>`;
  }

  // Clima de la hora de salida
  const sc = $('#seccion-clima');
  sc.hidden = !h;
  if (h) {
    const avisos = RespiraClima.avisosParaCorrer(h);
    const TEXTO = { calor: 'Calor fuerte', frio: 'Frío', uv_alto: 'UV alto', lluvia: 'Probable lluvia', rafagas: 'Ráfagas', viento_fuerte: 'Viento fuerte', de_noche: 'De noche' };
    sc.innerHTML = `<span class="seccion__titulo">Clima a la hora de salida</span>
      <div class="datos-fila"><div class="dato"><b>${Math.round(h.temperature_2m)}°</b><span>ST ${Math.round(h.apparent_temperature)}°</span></div>
        <div class="dato"><b>${Math.round(h.wind_speed_10m)} km/h</b><span>${textoViento(h).split(' · ')[0].toLowerCase()}</span></div>
        <div class="dato"><b>${h.precipitation_probability ?? '–'}%</b><span>lluvia</span></div></div>
      ${avisos.length ? `<div class="chips">${avisos.map(a => `<span class="chip-dato">${TEXTO[a]}</span>`).join('')}</div>` : ''}
      <p class="nota">Pronóstico por hora de Open-Meteo (sin clave, CC BY 4.0).</p>`;
  }

  // IA (inferencia: siempre con su estilo propio)
  $('#detalle-ia').innerHTML = `<div class="ia__etiqueta">${icono('ia')}Interpretación</div><p>${escapar(r.explicacion)}</p><p class="nota">${r.fuenteTexto}</p>`;
  // [API IA] PENDIENTE — Chat sobre el recorrido: acá iría un campo "Preguntale a RESPIRA" que use
  // RespiraIA.nuevoChat().preguntar(texto, { recorrido: r, clima: h }) (tarea "chat" de app/api/ia.js, ya existe en el servidor).
}

$('#empezar').addEventListener('click', () => empezarCorrida(estado.recorridos[estado.elegido]));

/* ---------- 13. EN RECORRIDO (simulación) ----------
   Todavía no hay seguimiento con GPS: un punto avanza sobre la ruta, 1 minuto real = 1 segundo. */
let mapaCorriendo = null, reloj = null;
function empezarCorrida(r) {
  estado.corrida = { sensacion: null, cumplio: null, evaluacion: {}, comentario: '', inicio: Date.now(), fraccion: 0 };
  $$('#completado [data-valor], #experiencia [data-valor]').forEach(c => c.setAttribute('aria-pressed', 'false'));
  $('#texto-comentario').value = '';
  irA('corriendo');
}
alMostrar.corriendo = () => {
  const r = estado.recorridos[estado.elegido];
  if (!mapaCorriendo) mapaCorriendo = RespiraMapa.crear($('#mapa-corriendo'), { interactivo: true });
  mapaCorriendo.ponerMargenes({ abajo: 240, arriba: 110 });
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
$('#terminar').addEventListener('click', () => {
  clearInterval(reloj);
  if (mapaCorriendo) mapaCorriendo.quitarCorredor();
  const r = estado.recorridos[estado.elegido], f = Math.max(0.05, estado.corrida.fraccion || 1);
  $('#completado-km').textContent = conComa(r.km * f);
  $('#completado-min').textContent = Math.round(r.minutos * f);
  $('#completado-ritmo').textContent = `${ritmo()}:00`;
  $('#completado-indice').innerHTML = `${r.indice}<small>%</small>`;
  $('#completado-barra').style.width = '0';
  estado.corrida.km = Math.round(r.km * f * 10) / 10; estado.corrida.min = Math.round(r.minutos * f);
  irA('completado', { reemplazar: true });
});

/* ---------- 14. COMPLETADO ---------- */
let mapaCompletado = null;
alMostrar.completado = () => {
  const r = estado.recorridos[estado.elegido];
  if (!mapaCompletado) mapaCompletado = RespiraMapa.crear($('#mapa-completado'), { interactivo: false });
  setTimeout(() => { mapaCompletado.mostrarUno(r, { circular: estado.busqueda.circular }); $('#completado-barra').style.width = r.indice + '%'; }, 60);
};

/* ---------- 14b. TU EXPERIENCIA: lo que la app aprende de cada corrida ----------
   "¿El recorrido cumplió con lo que esperabas?"
   - Sí: no hay más preguntas. Todas las preferencias elegidas quedan confirmadas.
   - No: aparece una pregunta por cada preferencia elegida (y por el polen, si es alérgico):
     se cumplió / a medias / no se cumplió.
   Cada preferencia tiene un peso (1 = normal) guardado en el teléfono ("respira-aprendizaje"):
   lo que falla pesa más la próxima vez y lo confirmado se refuerza un poco. Los pesos cambian
   el armado de recorridos (red.js) y la IA recibe el historial para no prometer de más. */
const AJUSTE_PESO = { si: 0.05, medias: 0.15, no: 0.3 };
const PESO_MIN = 0.5, PESO_MAX = 2.5;
const RESPUESTAS = [['si', 'Se cumplió'], ['medias', 'A medias'], ['no', 'No se cumplió']];

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
// Lo que se guarda y se aprende: con "Sí", todo confirmado; con "No", lo que respondió en cada fila.
function evaluacionFinal() {
  if (estado.corrida.cumplio === 'si') return Object.fromEntries(preferenciasDeLaCorrida().map(p => [p.factor, 'si']));
  if (estado.corrida.cumplio === 'no') return { ...estado.corrida.evaluacion };
  return {};
}

function dibujarExperiencia() {
  const prefs = preferenciasDeLaCorrida(), cumplio = estado.corrida.cumplio;
  const confirmadas = $('#preferencias-confirmadas');
  confirmadas.hidden = cumplio !== 'si';
  confirmadas.innerHTML = prefs.length
    ? `${icono('check')}<span>¡Genial! Vamos a seguir priorizando <b>${prefs.map(p => escapar(p.titulo.toLowerCase())).join(', ')}</b> en tus próximos recorridos.</span>`
    : `${icono('check')}<span>¡Genial! Lo tenemos en cuenta para tus próximos recorridos.</span>`;
  $('#evaluacion').hidden = cumplio !== 'no';
  $('#evaluacion-lista').innerHTML = prefs.length ? prefs.map(p => `
    <div class="evaluacion__fila">
      <span class="evaluacion__titulo">${icono(p.icono)}${escapar(p.titulo)}</span>
      <div class="chips chips--parejos" role="group" aria-label="${escapar(p.titulo)}" data-evaluar="${p.factor}">
        ${RESPUESTAS.map(([v, t]) => `<button class="chip" data-valor="${v}" aria-pressed="${estado.corrida.evaluacion[p.factor] === v}">${t}</button>`).join('')}
      </div>
    </div>`).join('')
    : '<p class="chico">No elegiste preferencias para este recorrido. Contanos qué pasó en el próximo paso.</p>';
  // Con "No" hace falta al menos una respuesta (si no hay preferencias, alcanza con el comentario).
  const respondio = Object.keys(estado.corrida.evaluacion).length > 0;
  $('#experiencia-siguiente').disabled = !cumplio || (cumplio === 'no' && prefs.length > 0 && !respondio);
}
alMostrar.experiencia = dibujarExperiencia;
$('[data-grupo="cumplio"]').addEventListener('click', dibujarExperiencia);   // corre después del manejo general de chips
$('#evaluacion-lista').addEventListener('click', e => {
  const chip = e.target.closest('[data-valor]'), fila = chip && chip.closest('[data-evaluar]');
  if (!fila) return;
  const f = fila.dataset.evaluar;
  if (estado.corrida.evaluacion[f] === chip.dataset.valor) delete estado.corrida.evaluacion[f];
  else estado.corrida.evaluacion[f] = chip.dataset.valor;
  dibujarExperiencia();
});

/* ---------- 15. COMENTARIO con dictado por voz ----------
   Usa el reconocimiento de voz del navegador (Chrome y Safari).
   [API IA] PENDIENTE — Dictado con Whisper: grabar el audio (MediaRecorder) y mandarlo a una tarea nueva
   "transcribir" en app/api/ia.js (Groq tiene whisper-large-v3). Sirve para los navegadores sin dictado. */
const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
let dictado = null;
$('#microfono').addEventListener('click', () => {
  const aviso = $('#aviso-microfono'), boton = $('#microfono');
  if (!Reconocimiento) { aviso.hidden = false; aviso.textContent = 'Tu navegador no permite dictar. Probá desde Chrome o Safari.'; return; }
  if (dictado) { dictado.stop(); return; }
  dictado = new Reconocimiento();
  dictado.lang = 'es-AR'; dictado.interimResults = false;
  const base = $('#texto-comentario').value;
  dictado.onresult = e => { $('#texto-comentario').value = (base ? base + ' ' : '') + [...e.results].map(r => r[0].transcript).join(' '); };
  dictado.onerror = e => { aviso.hidden = false; aviso.textContent = e.error === 'not-allowed' ? 'Para dictar, permití el uso del micrófono.' : 'No se pudo usar el micrófono. Probá de nuevo.'; };
  dictado.onend = () => { dictado = null; boton.setAttribute('aria-pressed', 'false'); };
  boton.setAttribute('aria-pressed', 'true'); aviso.hidden = true;
  dictado.start();
});

$('#guardar-corrida').addEventListener('click', () => {
  estado.corrida.comentario = $('#texto-comentario').value.trim();
  const r = estado.recorridos[estado.elegido], b = estado.busqueda;
  const registro = { fecha: new Date().toISOString(), busqueda: { partida: b.partida, llegada: b.circular ? null : b.llegada, circular: b.circular, km: b.km },
    recorrido: r.titulo, km: estado.corrida.km ?? r.km, min: estado.corrida.min ?? r.minutos, indice: r.indice,
    polen: r.polen ? r.polen.nivel : null, condiciones: [...estado.condiciones],
    sensacion: estado.corrida.sensacion, cumplio: estado.corrida.cumplio, evaluacion: evaluacionFinal(), comentario: estado.corrida.comentario };
  try {
    const corridas = leerCorridas();
    corridas.push(registro);
    localStorage.setItem('respira-corridas', JSON.stringify(corridas.slice(-30)));
  } catch (e) { /* modo privado */ }
  aprender(registro.evaluacion);
  // [API IA] PENDIENTE — Leer el comentario: mandarlo a una tarea nueva "experiencia" en app/api/ia.js que detecte
  // quejas que no son de las preferencias elegidas (por ejemplo "había mucha gente") y sugiera condiciones nuevas.
  irA('guardado');
});
$('#volver-inicio').addEventListener('click', irAlInicio);

/* ---------- 16. AL ABRIR LA APP ---------- */
marcarChips('nivel', estado.perfil.nivel);
marcarChips('alergias', estado.perfil.alergias);
if (estado.perfil.objetivo) $('#objetivo').value = estado.perfil.objetivo;
$('#nombre').value = estado.perfil.nombre; $('#apellido').value = estado.perfil.apellido;
dibujarFoto(); dibujarAvatares(); dibujarSaludo(); dibujarCondiciones();
RespiraRed.cargar().catch(() => {});   // la red se empieza a bajar mientras el runner completa los datos
// [API IA] PENDIENTE — Búsqueda en texto libre ("8 km desde Plaza Italia mañana a las 7, con poco ruido"):
// RespiraIA.interpretarBusqueda(texto) ya existe (tarea "busqueda" en app/api/ia.js); falta el campo en "¿Qué querés hacer hoy?"
// que complete partida, llegada, km, horario y condiciones con lo que devuelve.

let splashTerminado = false;
function salirDelSplash() {
  if (splashTerminado) return;
  splashTerminado = true;
  if (estado.perfil.nombre) { irA('inicio', { reemplazar: true }); estado.historial = []; }
  else irA('bienvenida', { reemplazar: true });
}
setTimeout(salirDelSplash, 2200);
