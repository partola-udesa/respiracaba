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
  busqueda: { partida: null, llegada: null, circular: false, distancia: 5, programar: false, fecha: null, hora: null },
  condiciones: new Set([...CONDICIONES_PRINCIPALES.filter(c => c.elegida).map(c => c.id), 'agua']),
  recorridoElegido: null,
  corrida:  { sensacion: null, cumplio: null, ambiente: [], comentario: '' }
};
window.estado = estado;

// Si el perfil ya se había guardado antes, se recupera (antes de armar las pantallas).
let perfilGuardado = null;
try { perfilGuardado = JSON.parse(localStorage.getItem('respira-perfil')); } catch (e) { perfilGuardado = null; }
if (perfilGuardado) Object.assign(estado.perfil, perfilGuardado);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const conComa = n => n.toFixed(1).replace('.', ',');   // 5 → "5,0"
const pantallaActual = () => document.getElementById(estado.pantalla);

/* ---------- 2. ENCABEZADO (volver · RESPIRA · menú) en todas las pantallas menos el splash ---------- */
$$('.pantalla:not(#splash)').forEach(p => p.insertAdjacentHTML('afterbegin', `
  <header class="header">
    <button class="header__boton" data-volver aria-label="Volver"><svg class="icono"><use href="#i-flecha-izquierda"/></svg></button>
    <span class="header__marca">RESPIRA</span>
    <button class="header__boton" data-ir="perfil" aria-label="Mi perfil"><svg class="icono"><use href="#i-menu"/></svg></button>
  </header>`));

/* ---------- 3. NAVEGACIÓN ----------
   irA('inicio') = "Navigate to". volver() = "Back" (también con el gesto atrás del celular y con Esc). */
const ruedas = [];   // las ruedas de números, para acomodarlas cuando aparece su pantalla

function mostrar(id) {
  $$('.pantalla').forEach(p => { p.hidden = (p.id !== id); });
  estado.pantalla = id;
  const pantalla = pantallaActual();
  pantalla.querySelectorAll('[data-volver]').forEach(b => b.classList.toggle('invisible', estado.historial.length === 0));
  const contenido = pantalla.querySelector('.contenido');
  if (contenido) contenido.scrollTop = 0;
  ruedas.filter(r => pantalla.contains(r.lugar)).forEach(r => r.control.sincronizar());
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

function irAlInicio() {      // al terminar un recorrido: el inicio pasa a ser la primera pantalla otra vez
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
    if (e.defaultPrevented) return;                                       // ya lo resolvió otro (p. ej. las sugerencias)
    const etiqueta = e.target.tagName;
    if (['BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(etiqueta) || e.target.getAttribute('role') === 'button') return;
    const principal = pantallaActual().querySelector('[data-enter]');
    if (principal) { e.preventDefault(); principal.click(); }
  }
  if (e.key === 'Escape') { e.preventDefault(); if (!cerrarFlotantes()) volver(); }   // Esc: primero cierra lo abierto
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
    destino[nombre] = grupo.querySelectorAll('[aria-pressed="true"]').length
      ? [...grupo.querySelectorAll('[aria-pressed="true"]')].map(c => c.dataset.valor) : [];
  }
}));

// 5b. Globos de información (ícono "i").
$$('.info__boton').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  const globo = document.getElementById(b.getAttribute('aria-controls'));
  globo.hidden = !globo.hidden;
  b.setAttribute('aria-expanded', String(!globo.hidden));
}));

// 5c. Ruedas de números.
function crearRueda(nombre, opciones) {
  const lugar = document.querySelector(`[data-rueda="${nombre}"]`);
  const control = RespiraSelectores.ruedaHorizontal(lugar, opciones);
  ruedas.push({ lugar, control });
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
crearRueda('edad',   { valores: rango(14, 90), unidad: 'años', etiqueta: 'Edad', valor: estado.perfil.edad, alCambiar: v => estado.perfil.edad = v });
crearRueda('altura', { valores: rango(1.40, 2.10, 0.01), formato: v => v.toFixed(2).replace('.', ','), unidad: 'm', etiqueta: 'Altura', valor: estado.perfil.altura, alCambiar: v => estado.perfil.altura = v });
crearRueda('peso',   { valores: rango(35, 150), unidad: 'kg', etiqueta: 'Peso', valor: estado.perfil.peso, alCambiar: v => estado.perfil.peso = v });
$('#objetivo').addEventListener('change', e => { estado.perfil.objetivo = e.target.value || null; });

// Alergias: desplegable con opción múltiple. Las elegidas aparecen como etiquetas con "×".
const ALERGIAS = { ninguna: 'Ninguna', platano: 'Plátano', fresno: 'Fresno', ligustro: 'Ligustro' };
function dibujarAlergias() {
  const elegidas = estado.perfil.alergias;
  $('#alergias-elegidas').innerHTML = elegidas.length
    ? elegidas.map(a => `<span class="etiqueta-quitable">${ALERGIAS[a]}<button data-quitar="${a}" aria-label="Quitar ${ALERGIAS[a]}">×</button></span>`).join('')
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
  e.stopPropagation();   // los clics adentro de la lista no la cierran
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
const sinTildes = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Autocompletado de partida y llegada.
function autocompletar(nombre) {
  const input = $('#' + nombre), lista = $('#sugerencias-' + nombre);
  let opciones = [], marcada = 0;
  const elegir = lugar => {
    input.value = lugar.nombre; estado.busqueda[nombre] = lugar;
    lista.hidden = true; input.setAttribute('aria-expanded', 'false');
    $('#error-' + nombre).hidden = true; $('#campo-' + nombre).classList.remove('campo--error');
  };
  const dibujar = () => {
    lista.innerHTML = opciones.map((l, i) => `<li role="option" aria-selected="${i === marcada}" data-i="${i}"><svg class="icono icono--chico"><use href="#i-ubicacion"/></svg><span>${l.nombre}<br><small style="color:var(--texto-terciario)">${l.barrio}</small></span></li>`).join('');
    lista.hidden = !opciones.length; input.setAttribute('aria-expanded', String(!!opciones.length));
  };
  input.addEventListener('input', () => {
    const q = sinTildes(input.value.trim());
    estado.busqueda[nombre] = input.value.trim() ? { nombre: input.value.trim() } : null;   // texto libre también vale
    opciones = q ? LUGARES.filter(l => sinTildes(l.nombre + ' ' + l.barrio).includes(q)).slice(0, 5) : [];
    marcada = 0; dibujar();
  });
  input.addEventListener('keydown', e => {
    if (lista.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcada = (marcada + 1) % opciones.length; dibujar(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); marcada = (marcada - 1 + opciones.length) % opciones.length; dibujar(); }
    if (e.key === 'Enter')     { e.preventDefault(); elegir(opciones[marcada]); }   // Enter elige la sugerencia (no avanza)
  });
  lista.addEventListener('mousedown', e => { const li = e.target.closest('li'); if (li) { e.preventDefault(); elegir(opciones[+li.dataset.i]); } });
  input.addEventListener('blur', () => setTimeout(() => { lista.hidden = true; }, 120));
}
autocompletar('partida');
autocompletar('llegada');

// Trayecto circular: si está activo, no hace falta punto de llegada.
$('#circular').addEventListener('click', e => {
  estado.busqueda.circular = !estado.busqueda.circular;
  e.currentTarget.setAttribute('aria-checked', String(estado.busqueda.circular));
  $('#bloque-llegada').hidden = estado.busqueda.circular;
  $('#error-llegada').hidden = true;
});

crearRueda('distancia', { valores: rango(1, 42), unidad: 'km', etiqueta: 'Distancia', valor: estado.busqueda.distancia, alCambiar: v => estado.busqueda.distancia = v });

// Día y hora: "ahora" por defecto; se pueden cambiar si se tilda "Programar para más tarde".
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
  let ok = true;
  if (!estado.busqueda.partida) { ok = false; $('#error-partida').hidden = false; $('#campo-partida').classList.add('campo--error'); }
  if (!estado.busqueda.circular && !estado.busqueda.llegada) { ok = false; $('#error-llegada').hidden = false; $('#campo-llegada').classList.add('campo--error'); }
  if (!ok) return;
  estado.busqueda.fecha = $('#fecha').value; estado.busqueda.hora = $('#hora').value;
  irA('condiciones');
});
['partida', 'llegada'].forEach(n => $('#' + n).addEventListener('input', () => { $('#error-' + n).hidden = true; $('#campo-' + n).classList.remove('campo--error'); }));

/* ---------- 8. PERSONALIZÁ TUS CONDICIONES ---------- */
$('#condiciones-principales').innerHTML = CONDICIONES_PRINCIPALES.map(c => `
  <button class="condicion" data-condicion="${c.id}" aria-pressed="${estado.condiciones.has(c.id)}">
    <span class="condicion__arriba"><svg class="icono icono--grande"><use href="#${c.icono}"/></svg><span class="condicion__check"><svg class="icono"><use href="#i-check"/></svg></span></span>
    ${c.titulo}</button>`).join('');
$('#condiciones-otras').innerHTML = CONDICIONES_OTRAS.map(c => `
  <button class="condicion-chica" data-condicion="${c.id}" aria-pressed="${estado.condiciones.has(c.id)}"><svg class="icono icono--chico"><use href="#${c.icono}"/></svg>${c.titulo}</button>`).join('');
$('#condiciones').addEventListener('click', e => {
  const b = e.target.closest('[data-condicion]');
  if (!b) return;
  const id = b.dataset.condicion;
  estado.condiciones.has(id) ? estado.condiciones.delete(id) : estado.condiciones.add(id);
  b.setAttribute('aria-pressed', String(estado.condiciones.has(id)));
});
$('#buscar-recorridos').addEventListener('click', () => { dibujarRecorridos(); irA('recorridos'); });

/* ---------- 9. TUS RECORRIDOS IDEALES ----------
   Se ordenan según las condiciones elegidas. El índice que se muestra es siempre el mismo (dato duro). */
function puntajeSegun(r) {
  const c = r.componentes, partes = [];
  if (estado.condiciones.has('vegetacion')) partes.push(c.vegetacion);
  if (estado.condiciones.has('ruido'))      partes.push(100 - c.ruido);
  if (estado.condiciones.has('aire'))       partes.push(r.indice);
  if (estado.condiciones.has('transito'))   partes.push(100 - c.transito);
  if (estado.condiciones.has('sombra'))     partes.push(c.sombra);
  return partes.length ? partes.reduce((a, b) => a + b, 0) / partes.length : r.indice;
}
function dibujarRecorridos() {
  const ordenados = [...RECORRIDOS].sort((a, b) => puntajeSegun(b) - puntajeSegun(a));
  $('#mapa-todos').innerHTML = dibujarMapa({ rutas: [...ordenados].reverse().map((r, i, arr) => ({ ...r, activa: i === arr.length - 1 })), conEtiquetas: true });
  $('#lista-recorridos').innerHTML = ordenados.map((r, i) => `
    <button class="fila-recorrido ${i === 0 ? 'fila-recorrido--destacada' : ''}" data-recorrido="${r.id}">
      <svg class="icono"><use href="#i-recorrido"/></svg>
      <span class="fila-recorrido__textos"><span class="fila-recorrido__titulo">${r.nombre}</span><span class="fila-recorrido__sub">${r.tipo}</span></span>
      <span class="fila-recorrido__datos"><span>${conComa(r.km)} km</span><span class="puntaje"><svg class="icono"><use href="#i-hoja"/></svg>${r.indice}/100</span></span>
      <svg class="icono icono--chico"><use href="#i-chevron-derecha"/></svg>
    </button>`).join('');
}
$('#lista-recorridos').addEventListener('click', e => { const b = e.target.closest('[data-recorrido]'); if (b) abrirDetalle(+b.dataset.recorrido); });

/* ---------- 10. DETALLE DE UN RECORRIDO (una plantilla para los tres) ---------- */
const COMPONENTES = [['vegetacion', 'Vegetación', 'i-hoja'], ['sombra', 'Sombra', 'i-sol'], ['ruido', 'Ruido', 'i-ruido'], ['transito', 'Tránsito', 'i-auto']];
function abrirDetalle(id) {
  const r = RECORRIDOS.find(x => x.id === id);
  estado.recorridoElegido = id;
  $('#detalle-titulo').textContent = r.nombre;
  $('#detalle-subtitulo').textContent = r.tipo;
  $('#detalle-insignia').setAttribute('href', '#' + r.icono);
  $('#detalle-mapa').innerHTML = dibujarMapa({ rutas: [{ ...r, activa: true }], alto: 175 });
  $('#detalle-indice').textContent = `${r.indice}/100`;
  const llenos = Math.floor(r.indice / 100 * 6);
  $('#detalle-segmentos').innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="${i < llenos ? 'lleno' : ''}"></span>`).join('');
  // Solo barras, sin porcentajes (devolución del profe).
  $('#detalle-componentes').innerHTML = COMPONENTES.map(([k, nombre, icono]) => `
    <div class="componente"><svg class="icono icono--chico"><use href="#${icono}"/></svg><span>${nombre}</span><div class="barra" role="img" aria-label="${nombre}: ${r.componentes[k]} de 100"><i style="width:${r.componentes[k]}%"></i></div></div>`).join('');
  $('#detalle-ia').textContent = r.ia;
  $('#detalle-km').textContent = `${conComa(r.km)} km`;
  $('#detalle-min').textContent = `≈ ${r.min} min`;
  irA('detalle');
}

// "Elegir este recorrido": por ahora salta directo al final de la corrida (todavía no hay seguimiento en vivo).
$('#elegir-recorrido').addEventListener('click', () => {
  const r = RECORRIDOS.find(x => x.id === estado.recorridoElegido);
  estado.corrida = { sensacion: null, cumplio: null, ambiente: [], comentario: '' };
  $$('#completado [data-valor], #experiencia [data-valor]').forEach(c => c.setAttribute('aria-pressed', 'false'));
  $('#texto-comentario').value = '';
  $('#completado-mapa').innerHTML = dibujarMapa({ rutas: [{ ...r, activa: true }], alto: 175 });
  $('#completado-km').textContent = `${conComa(r.km)} km`;
  $('#completado-min').textContent = `${r.min} min`;
  $('#completado-indice').textContent = `${r.indice}/100`;
  $('#completado-barra').style.width = r.indice + '%';
  irA('completado');
});

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
  const r = RECORRIDOS.find(x => x.id === estado.recorridoElegido);
  const registro = { fecha: new Date().toISOString(), recorrido: r.nombre, km: r.km, min: r.min, indice: r.indice, ...estado.corrida };
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

let splashTerminado = false;
function salirDelSplash() {
  if (splashTerminado) return;
  splashTerminado = true;
  irA('inicio', { reemplazar: true });
  if (!perfilGuardado) irA('perfil');
}
setTimeout(salirDelSplash, 1500);
