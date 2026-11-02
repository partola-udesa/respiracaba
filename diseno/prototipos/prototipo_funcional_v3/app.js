/* =====================================================================
   RESPIRA — Comportamiento de la app
   Todo lo que PASA cuando el runner toca algo (= el modo Prototype de Figma,
   pero con memoria y lógica). Está ordenado como el recorrido del usuario.
   ===================================================================== */

/* ---------- 1. ESTADO: la memoria de la app ----------
   Tip: en la consola de Chrome (Cmd + Opción + J) escribí  estado  y Enter para verla. */
const estado = {
  pantalla: 'splash',
  historial: [],
  perfil:   { edad: 26, altura: 1.67, peso: 58, nivel: null, objetivo: null, alergias: [] },
  busqueda: { partida: null, llegada: null, circular: false, km: null, programar: false, fecha: null, hora: null },
  condiciones: new Set(CONDICIONES.filter(c => c.elegida).map(c => c.id)),
  recorridos: [],          // las tres opciones calculadas
  elegido: 0,              // índice de la opción elegida en el mapa / la lista
  corrida:  { sensacion: null, cumplio: null, ambiente: [], comentario: '' }
};
window.estado = estado;

let perfilGuardado = null;
try { perfilGuardado = JSON.parse(localStorage.getItem('respira-perfil')); } catch (e) { perfilGuardado = null; }
if (perfilGuardado) Object.assign(estado.perfil, perfilGuardado);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const conComa = (n, d = 1) => n.toFixed(d).replace('.', ',');   // 5 → "5,0"
const pantallaActual = () => document.getElementById(estado.pantalla);
const icono = (id, clase = '') => `<svg class="icono ${clase}"><use href="#i-${id}"/></svg>`;
const escapar = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 2. ENCABEZADO (volver · RESPIRA · perfil) en todas las pantallas menos el splash ---------- */
$$('.pantalla:not(#splash)').forEach(p => p.insertAdjacentHTML('afterbegin', `
  <header class="header">
    <button class="header__boton" data-volver aria-label="Volver">${icono('volver')}</button>
    <span class="header__marca">RESPIRA</span>
    <button class="header__boton" data-ir="perfil" aria-label="Mi perfil">${icono('perfil')}</button>
  </header>`));

/* ---------- 3. NAVEGACIÓN ----------
   irA('inicio') = "Navigate to". volver() = "Back" (también con el gesto atrás del celular y con Esc). */
const selectores = [];   // ruedas y balanza: se acomodan cuando aparece su pantalla
const alMostrar = {};    // cosas que hay que hacer cuando aparece una pantalla (p. ej. ajustar el mapa)

function mostrar(id) {
  $$('.pantalla').forEach(p => { p.hidden = (p.id !== id); });
  estado.pantalla = id;
  const pantalla = pantallaActual();
  pantalla.querySelectorAll('[data-volver]').forEach(b => b.classList.toggle('invisible', estado.historial.length === 0));
  const contenido = pantalla.querySelector('.contenido');
  if (contenido) contenido.scrollTop = 0;
  selectores.filter(r => pantalla.contains(r.lugar)).forEach(r => r.control.sincronizar());
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
window.addEventListener('popstate', () => { if (estado.historial.length) mostrar(estado.historial.pop()); });

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
const DESTINO_CHIPS = { nivel: () => estado.perfil, sensacion: () => estado.corrida, cumplio: () => estado.corrida, ambiente: () => estado.corrida };
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
    destino[nombre] = [...grupo.querySelectorAll('[aria-pressed="true"]')].map(c => c.dataset.valor);
  }
}));

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

// 5d. Cerrar todo lo flotante (sugerencias, lista de alergias, globos). Devuelve true si cerró algo.
function cerrarFlotantes() {
  let cerro = false;
  $$('.sugerencias:not([hidden]), .info__globo:not([hidden])').forEach(el => { el.hidden = true; cerro = true; });
  $$('.info__boton').forEach(b => b.setAttribute('aria-expanded', 'false'));
  $$('[role="combobox"]').forEach(i => i.setAttribute('aria-expanded', 'false'));
  if ($('#alergias').dataset.abierto === 'true') { abrirAlergias(false); cerro = true; }
  return cerro;
}
document.addEventListener('click', e => {
  if (!e.target.closest('.info__boton, .info__globo')) $$('.info__globo').forEach(g => g.hidden = true);
  if (!e.target.closest('#alergias')) abrirAlergias(false);
});

/* ---------- 6. PERFIL CORREDOR ---------- */
crearSelector('rueda', 'edad', { valores: rango(14, 90), unidad: 'años', etiqueta: 'Edad', valor: estado.perfil.edad, alCambiar: v => estado.perfil.edad = v });
crearSelector('rueda', 'altura', { valores: rango(1.40, 2.10, 0.01), formato: v => conComa(v, 2), unidad: 'm', etiqueta: 'Altura', valor: estado.perfil.altura, alCambiar: v => estado.perfil.altura = v });
crearSelector('balanza', 'peso', { desde: 35, hasta: 150, valor: estado.perfil.peso, unidad: 'kg', etiqueta: 'Peso', alCambiar: v => estado.perfil.peso = v });
$('#objetivo').addEventListener('change', e => { estado.perfil.objetivo = e.target.value || null; });

const ALERGIAS = { ninguna: 'Ninguna', platano: 'Plátano', fresno: 'Fresno', ligustro: 'Ligustro' };
function dibujarAlergias() {
  const elegidas = estado.perfil.alergias;
  $('#alergias-elegidas').innerHTML = elegidas.length
    ? elegidas.map(a => `<span class="etiqueta-quitable">${ALERGIAS[a]}<button data-quitar="${a}" aria-label="Quitar ${ALERGIAS[a]}">${icono('cerrar')}</button></span>`).join('')
    : '<span class="multiselect__vacio">Seleccioná tus alergias</span>';
  $('#alergias-lista').innerHTML = Object.keys(ALERGIAS).filter(a => !elegidas.includes(a))
    .map(a => `<li><button data-agregar="${a}">${ALERGIAS[a]}</button></li>`).join('');
}
function abrirAlergias(abrir) {
  $('#alergias').dataset.abierto = String(abrir);
  $('#alergias-lista').hidden = !abrir;
  $('#alergias .multiselect__cabeza').setAttribute('aria-expanded', String(abrir));
}
$('#alergias').addEventListener('click', e => {
  e.stopPropagation();
  const quitar = e.target.closest('[data-quitar]'), agregar = e.target.closest('[data-agregar]');
  if (quitar) { estado.perfil.alergias = estado.perfil.alergias.filter(a => a !== quitar.dataset.quitar); dibujarAlergias(); return; }
  if (agregar) {
    const a = agregar.dataset.agregar;
    estado.perfil.alergias = a === 'ninguna' ? ['ninguna'] : [...estado.perfil.alergias.filter(x => x !== 'ninguna'), a];
    dibujarAlergias(); return;
  }
  if (e.target.closest('.multiselect__cabeza')) abrirAlergias($('#alergias').dataset.abierto !== 'true');
});
$('#alergias .multiselect__cabeza').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirAlergias($('#alergias').dataset.abierto !== 'true'); }
});

$('#guardar-perfil').addEventListener('click', () => {
  try { localStorage.setItem('respira-perfil', JSON.stringify(estado.perfil)); } catch (e) { /* modo privado */ }
  irA('inicio');
});

/* ---------- 7. DEFINÍ TU RECORRIDO ---------- */

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
}
autocompletar('partida');
autocompletar('llegada');

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

/* ---------- 8. PERSONALIZÁ TUS CONDICIONES ----------
   Cada tarjeta muestra de qué dataset sale. Las que todavía no tienen dataset quedan desactivadas. */
function tarjetaCondicion(c) {
  const sinDatos = !c.factor;
  return `<button class="condicion ${c.principal ? '' : 'condicion--chica'}" data-condicion="${c.id}" aria-pressed="${estado.condiciones.has(c.id)}" ${sinDatos ? 'disabled' : ''}>
    <span class="condicion__titulo">${c.titulo}</span><span class="condicion__fuente">${c.fuente}</span>
    <span class="condicion__check">${icono('check')}</span></button>`;
}
$('#condiciones-principales').innerHTML = CONDICIONES.filter(c => c.principal).map(tarjetaCondicion).join('');
$('#condiciones-otras').innerHTML = CONDICIONES.filter(c => !c.principal).map(tarjetaCondicion).join('');
$('#condiciones').addEventListener('click', e => {
  const b = e.target.closest('[data-condicion]');
  if (!b || b.disabled) return;
  const id = b.dataset.condicion;
  estado.condiciones.has(id) ? estado.condiciones.delete(id) : estado.condiciones.add(id);
  b.setAttribute('aria-pressed', String(estado.condiciones.has(id)));
});
$('#buscar-recorridos').addEventListener('click', () => { irA('recorridos'); calcularRecorridos(); });

/* ---------- 9. TUS RECORRIDOS IDEALES: cálculo + IA + mapa interactivo ---------- */
let mapaRecorridos = null, calculo = 0;
alMostrar.recorridos = () => { if (mapaRecorridos) setTimeout(() => mapaRecorridos.encuadrar(), 0); };

const factoresElegidos = () => CONDICIONES.filter(c => c.factor && estado.condiciones.has(c.id)).map(c => c.factor);
const ritmo = () => RITMO[estado.perfil.nivel] || 6;
const minutos = r => Math.round(r.km * ritmo());
function esDeNoche() { const h = Number((estado.busqueda.hora || '12').slice(0, 2)); return h < 7 || h >= 20; }

async function calcularRecorridos() {
  const yo = ++calculo;
  const b = estado.busqueda, factores = factoresElegidos();
  if (!mapaRecorridos) mapaRecorridos = RespiraMapa.crear($('#mapa-recorridos'));
  $('#mapa-estado').hidden = false; $('#mapa-estado').textContent = 'Calculando recorridos con los datasets…';
  $('#opciones-recorridos').innerHTML = '<div class="cargando">Cruzando cada tramo de calle con tus condiciones…</div>';
  $('#nota-recorridos').textContent = '';
  let opciones;
  try {
    opciones = await RespiraRed.armarRecorridos({ desde: b.partida, hasta: b.llegada, circular: b.circular, km: b.km, factores, nocturno: esDeNoche() });
  } catch (err) {
    if (yo !== calculo) return;
    $('#mapa-estado').textContent = err.message;
    $('#opciones-recorridos').innerHTML = `<p class="cuerpo-chico">${escapar(err.message)} Volvé y probá con otro punto.</p>`;
    return;
  }
  if (yo !== calculo) return;
  if (!opciones.length) { $('#mapa-estado').textContent = 'No encontramos recorridos. Probá con otros puntos.'; $('#opciones-recorridos').innerHTML = ''; return; }

  // Se ordenan por cuánto cumplen las preferencias. El índice que se muestra es siempre el mismo (dato duro).
  opciones.sort((x, y) => y.preferencias - x.preferencias);
  ponerTitulos(opciones, factores);
  opciones.forEach((r, i) => { r.numero = i + 1; r.minutos = minutos(r); r.explicacion = explicacionLocal(r, i, opciones); r.fuenteTexto = 'Resumen automático a partir de los datasets'; });
  estado.recorridos = opciones; estado.elegido = 0;

  $('#mapa-estado').hidden = true;
  mapaRecorridos.mostrarRecorridos(opciones, { circular: b.circular, alElegir: i => seleccionar(i, { desdeElMapa: true }) });
  dibujarOpciones();
  $('#nota-recorridos').textContent = `Índice de respirabilidad: promedio de vegetación, aire, ruido y tránsito en cada tramo (0 a 100). Tiempo estimado a ${ritmo()} min/km.`;

  // La IA interpreta los números (no los cambia). Si no está disponible, queda el resumen automático.
  interpretarConIA(opciones, factores).then(lectura => {
    if (yo !== calculo || !lectura) return;
    for (const l of lectura.recorridos || []) {
      const r = opciones.find(o => o.numero === l.numero);
      if (!r) continue;
      if (l.titulo) r.titulo = l.titulo;
      if (l.explicacion) { r.explicacion = l.explicacion; r.fuenteTexto = 'Interpretación de la IA a partir de los datasets'; }
    }
    if (lectura.recomendado) opciones.forEach(r => { r.recomendado = r.numero === lectura.recomendado; });
    dibujarOpciones();
  }).catch(() => {});
}

// Títulos cortos: a cada recorrido le toca aquello en lo que es el mejor de los tres.
function ponerTitulos(opciones, factores) {
  const NOMBRES = { vegetacion: 'Más verde', ruido: 'Más silencioso', aire: 'Mejor aire', transito: 'Menos tránsito', sombra: 'Más sombra', terreno: 'Terreno más parejo', luz: 'Más iluminado' };
  const orden = [...factores, ...Object.keys(NOMBRES).filter(f => !factores.includes(f))];
  const usados = new Set();
  opciones.forEach((r, i) => {
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
  partes.push(`Tiene en promedio ${conComa(r.datos.arboles_100m, 0)} árboles cada 100 m (arbolado lineal) y unos ${r.datos.db} dB de ruido de día (Mapa de ruido 2018).`);
  if (i === 0 && opciones.length > 1) partes.push('Es el que mejor cumple las condiciones que elegiste.');
  return partes.join(' ');
}

async function interpretarConIA(opciones, factores) {
  let clima = null;
  try {
    const p = estado.busqueda.partida;
    const horas = await Promise.race([RespiraClima.obtenerClimaPorHora(p.lat, p.lon), new Promise((_, no) => setTimeout(() => no(), 4000))]);
    const cuando = estado.busqueda.programar ? `${estado.busqueda.fecha}T${estado.busqueda.hora}` : new Date();
    const h = RespiraClima.climaALaHora(horas, cuando);
    if (h) clima = { temperatura: h.temperature_2m, sensacion: h.apparent_temperature, viento_kmh: h.wind_speed_10m, lluvia_prob: h.precipitation_probability, uv: h.uv_index, fuente: 'Open-Meteo' };
  } catch (e) { /* sin clima */ }
  const nombres = Object.fromEntries(CONDICIONES.map(c => [c.factor, c.titulo]));
  return RespiraIA.interpretarRecorridos({
    preferencias: factores.map(f => nombres[f]),
    horario: estado.busqueda.programar ? `${estado.busqueda.fecha} ${estado.busqueda.hora}` : 'ahora',
    nivel: estado.perfil.nivel, circular: estado.busqueda.circular, clima,
    recorridos: opciones.map(r => ({ numero: r.numero, km: r.km, minutos: r.minutos, indice_respirabilidad: r.indice,
      cumplimiento_preferencias: r.preferencias, puntajes: r.factores, datos: { arboles_cada_100m: r.datos.arboles_100m, ruido_dia_db: r.datos.db, no2_umol_m2: r.datos.no2 }, calles: r.calles }))
  });
}

function dibujarOpciones() {
  const factores = factoresElegidos();
  const mostrarFactores = factores.length ? factores : ['vegetacion', 'aire', 'ruido', 'transito'];
  $('#opciones-recorridos').innerHTML = estado.recorridos.map((r, i) => {
    const elegido = i === estado.elegido;
    return `
    <article class="opcion-ruta" aria-current="${elegido}" data-opcion="${i}">
      <button class="opcion-ruta__cabeza" role="radio" aria-checked="${elegido}" data-elegir="${i}">
        <span class="opcion-ruta__numero">${r.numero}</span>
        <span><span class="opcion-ruta__titulo">${escapar(r.titulo)}</span>
          <span class="opcion-ruta__sub">${conComa(r.km)} km · ≈ ${r.minutos} min${r.recomendado ? ' · Recomendado' : ''}</span></span>
        <span class="opcion-ruta__indice"><span class="numero">${r.indice}</span><small>Índice</small></span>
      </button>
      <div class="opcion-ruta__detalle">
        <div class="componentes">${mostrarFactores.map(f => `
          <div class="componente"><span>${FACTORES[f].nombre}</span><span class="componente__dato">${FACTORES[f].dato(r)}</span>
            <div class="barra" role="img" aria-label="${FACTORES[f].nombre}: ${r.factores[f]} de 100"><i style="width:${r.factores[f]}%"></i></div></div>`).join('')}
        </div>
        <div class="inferencia">${icono('ia')}<span>${escapar(r.explicacion)}<span class="inferencia__fuente">${r.fuenteTexto}</span></span></div>
        <button class="boton" data-elegir-recorrido="${i}" ${elegido ? 'data-enter' : ''}>Elegir este recorrido</button>
      </div>
    </article>`;
  }).join('');
}

function seleccionar(i, { desdeElMapa = false } = {}) {
  if (i === estado.elegido) return;
  estado.elegido = i;
  if (!desdeElMapa) mapaRecorridos.elegir(i);
  dibujarOpciones();
  const tarjeta = $(`[data-opcion="${i}"]`);
  if (desdeElMapa && tarjeta) tarjeta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// Tocar una opción la elige (y la marca en el mapa). Solo "Elegir este recorrido" pasa de pantalla.
$('#opciones-recorridos').addEventListener('click', e => {
  const cabeza = e.target.closest('[data-elegir]');
  if (cabeza) return seleccionar(+cabeza.dataset.elegir);
  const boton = e.target.closest('[data-elegir-recorrido]');
  if (boton) empezarCorrida(estado.recorridos[+boton.dataset.elegirRecorrido]);
});

/* ---------- 10. CORRIDA (por ahora salta directo al final: todavía no hay seguimiento en vivo) ---------- */
let mapaCompletado = null;
function empezarCorrida(r) {
  estado.corrida = { sensacion: null, cumplio: null, ambiente: [], comentario: '' };
  $$('#completado [data-valor], #experiencia [data-valor]').forEach(c => c.setAttribute('aria-pressed', 'false'));
  $('#texto-comentario').value = '';
  $('#completado-km').innerHTML = `${conComa(r.km)}<small>km</small>`;
  $('#completado-min').innerHTML = `${r.minutos}<small>min</small>`;
  $('#completado-ritmo').innerHTML = `${ritmo()}:00<small>/km</small>`;
  $('#completado-indice').textContent = r.indice;
  $('#completado-barra').style.width = r.indice + '%';
  irA('completado');
  if (!mapaCompletado) mapaCompletado = RespiraMapa.crear($('#mapa-completado'), { interactivo: false });
  mapaCompletado.mostrarUno(r, { circular: estado.busqueda.circular });
}
alMostrar.completado = () => { if (mapaCompletado) setTimeout(() => mapaCompletado.encuadrar(), 0); };

/* ---------- 11. COMENTARIO con dictado por voz ----------
   Usa el reconocimiento de voz del navegador (Chrome y Safari). Más adelante: Whisper a través de Groq. */
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
  const registro = { fecha: new Date().toISOString(), partida: b.partida && b.partida.nombre, llegada: b.circular ? null : b.llegada && b.llegada.nombre,
    circular: b.circular, recorrido: r.titulo, km: r.km, min: r.minutos, indice: r.indice, condiciones: [...estado.condiciones], ...estado.corrida };
  try {
    const corridas = JSON.parse(localStorage.getItem('respira-corridas') || '[]');
    corridas.push(registro);
    localStorage.setItem('respira-corridas', JSON.stringify(corridas));
  } catch (e) { /* modo privado */ }
  irA('guardado');
});
$('#volver-inicio').addEventListener('click', irAlInicio);

/* ---------- 12. AL ABRIR LA APP ---------- */
if (estado.perfil.nivel) $(`[data-grupo="nivel"] [data-valor="${estado.perfil.nivel}"]`).setAttribute('aria-pressed', 'true');
if (estado.perfil.objetivo) $('#objetivo').value = estado.perfil.objetivo;
dibujarAlergias();
RespiraRed.cargar().catch(() => {});   // la red se empieza a bajar mientras el runner completa los datos

let splashTerminado = false;
function salirDelSplash() {
  if (splashTerminado) return;
  splashTerminado = true;
  irA('inicio', { reemplazar: true });
  if (!perfilGuardado) irA('perfil');
}
setTimeout(salirDelSplash, 1500);
