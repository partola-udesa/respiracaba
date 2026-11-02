/* =====================================================================
   RESPIRA — Comportamiento de la app
   Todo lo que PASA cuando el runner toca algo. Es el equivalente al
   modo Prototype de Figma, pero con memoria y lógica.
   ===================================================================== */

/* ---------- 1. ESTADO: la memoria de la app ----------
   Tip: abrí la consola de Chrome (Cmd + Opción + J), escribí  estado  y apretá Enter para verlo. */
const estado = {
  pantalla: 'splash',
  historial: [],     // las pantallas por las que pasó, para poder volver
  perfil: {
    edad: null,      // años
    altura: null,    // cm
    peso: null,      // kg, con un decimal
    nivel: null,     // 'principiante' | 'intermedio' | 'avanzado'
    objetivo: null,
    alergias: []     // por ejemplo ['platano', 'fresno']
  }
};
window.estado = estado;

const $ = selector => document.querySelector(selector);
const pantallaActual = () => document.getElementById(estado.pantalla);

/* ---------- 2. NAVEGACIÓN ----------
   irA('inicio') = conexión de prototipo "Navigate to".
   volver()      = "Back". También funciona con el gesto o el botón "atrás" del celular. */
function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach(p => { p.hidden = (p.id !== id); });
  estado.pantalla = id;
  // El botón de volver se ve siempre que haya una pantalla anterior.
  pantallaActual().querySelectorAll('[data-volver]').forEach(b => { b.hidden = estado.historial.length === 0; });
  const contenido = pantallaActual().querySelector('.contenido');
  if (contenido) contenido.scrollTop = 0;
}

function irA(id, { reemplazar = false } = {}) {
  if (!document.getElementById(id)) {
    console.warn(`La pantalla "${id}" todavía no existe. La vamos a armar en los próximos pasos.`);
    return;
  }
  if (id === estado.pantalla) return;
  // Si la pantalla a la que vamos es justo la anterior, es lo mismo que volver.
  if (!reemplazar && estado.historial[estado.historial.length - 1] === id) return volver();
  if (reemplazar) {
    history.replaceState({ pantalla: id }, '');
  } else {
    estado.historial.push(estado.pantalla);
    history.pushState({ pantalla: id }, '');
  }
  mostrar(id);
}

function volver() {
  if (hojaAbierta) return cerrarHoja();
  if (estado.historial.length) history.back();     // dispara "popstate", que hace el cambio de pantalla
}
window.addEventListener('popstate', () => {
  if (hojaAbierta) cerrarHoja();
  if (estado.historial.length) mostrar(estado.historial.pop());
});

// Un solo "escuchador" de clics para toda la app.
document.addEventListener('click', evento => {
  const ir = evento.target.closest('[data-ir]');
  if (ir) return irA(ir.dataset.ir);
  if (evento.target.closest('[data-volver]')) return volver();
  const selector = evento.target.closest('[data-selector]');
  if (selector) return abrirSelector(selector.dataset.selector);
});

/* ---------- 3. TECLADO (en la compu) ----------
   Enter = hace la acción principal de la pantalla (el botón marcado con data-enter),
           o confirma la rueda / balanza si está abierta.
   Esc   = cierra la rueda / balanza, o vuelve a la pantalla anterior. */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (hojaAbierta) { e.preventDefault(); return confirmarHoja(); }
    if (estado.pantalla === 'splash') { e.preventDefault(); return salirDelSplash(); }
    const foco = e.target.tagName;
    if (foco === 'BUTTON' || foco === 'SELECT' || foco === 'TEXTAREA' || foco === 'SUMMARY') return;  // ya tienen su propio Enter
    const principal = pantallaActual().querySelector('[data-enter]');
    if (principal) { e.preventDefault(); principal.click(); }
  }
  if (e.key === 'Escape') { e.preventDefault(); volver(); }
});

/* ---------- 4. RUEDA Y BALANZA (hoja inferior) ---------- */
const SELECTORES = {
  edad:   { titulo: 'Tu edad',   herramienta: 'rueda',   desde: 14,  hasta: 90,  unidad: 'años', inicial: 30 },
  altura: { titulo: 'Tu altura', herramienta: 'rueda',   desde: 130, hasta: 210, unidad: 'cm',   inicial: 165 },
  peso:   { titulo: 'Tu peso',   herramienta: 'balanza', desde: 35,  hasta: 150, unidad: 'kg',   inicial: 60 }
};
let hojaAbierta = null;   // { campo, control } mientras la hoja está abierta

function abrirSelector(campo) {
  const c = SELECTORES[campo];
  $('#hoja-titulo').textContent = c.titulo;
  $('#hoja-fondo').hidden = false;
  $('#hoja').hidden = false;                       // primero se muestra, después se arma (necesita medir su ancho)
  const control = RespiraSelectores[c.herramienta]($('#hoja-cuerpo'), {
    desde: c.desde, hasta: c.hasta, unidad: c.unidad, etiqueta: c.titulo,
    valor: estado.perfil[campo] ?? c.inicial
  });
  hojaAbierta = { campo, control };
}

function confirmarHoja() {
  const { campo, control } = hojaAbierta;
  estado.perfil[campo] = control.valor();
  mostrarValor(campo);
  const boton = document.querySelector(`[data-selector="${campo}"]`);
  cerrarHoja();
  boton.focus();
}

function cerrarHoja() {
  $('#hoja').hidden = true;
  $('#hoja-fondo').hidden = true;
  $('#hoja-cuerpo').innerHTML = '';
  hojaAbierta = null;
}
$('#hoja-listo').addEventListener('click', confirmarHoja);
$('#hoja-fondo').addEventListener('click', cerrarHoja);

function mostrarValor(campo) {
  const v = estado.perfil[campo];
  const span = document.querySelector(`[data-selector="${campo}"] .campo__valor`);
  span.classList.toggle('campo__valor--vacio', v == null);
  if (v == null) span.textContent = 'Elegí';
  else if (campo === 'peso') span.textContent = v.toFixed(1).replace('.', ',') + ' kg';
  else span.textContent = `${v} ${SELECTORES[campo].unidad}`;
}

/* ---------- 5. PERFIL ---------- */
const NOMBRES_ALERGIAS = { platano: 'Plátano', fresno: 'Fresno', ligustro: 'Ligustro' };

// Chips. data-tipo="uno" → una sola opción (nivel). data-tipo="varios" → varias (alergias).
document.querySelectorAll('.chips').forEach(grupo => {
  grupo.addEventListener('click', evento => {
    const chip = evento.target.closest('.chip');
    if (!chip) return;
    const nombreGrupo = grupo.dataset.grupo;
    const valor = chip.dataset.valor;
    const estaba = chip.getAttribute('aria-pressed') === 'true';

    if (grupo.dataset.tipo === 'uno') {
      grupo.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(!estaba));
      estado.perfil[nombreGrupo] = estaba ? null : valor;
    } else {
      // "No tengo" apaga las demás, y elegir una especie apaga "No tengo".
      chip.setAttribute('aria-pressed', String(!estaba));
      if (valor === 'ninguna' && !estaba) grupo.querySelectorAll('.chip').forEach(c => { if (c !== chip) c.setAttribute('aria-pressed', 'false'); });
      else if (valor !== 'ninguna') grupo.querySelector('[data-valor="ninguna"]').setAttribute('aria-pressed', 'false');
      estado.perfil.alergias = [...grupo.querySelectorAll('.chip[aria-pressed="true"]')].map(c => c.dataset.valor).filter(v => v !== 'ninguna');
      resumirAlergias();
    }
  });
});

function resumirAlergias() {
  const span = $('#alergias-resumen');
  const ninguna = $('[data-valor="ninguna"]').getAttribute('aria-pressed') === 'true';
  const lista = estado.perfil.alergias.map(a => NOMBRES_ALERGIAS[a]);
  span.textContent = ninguna ? 'No tengo' : lista.length ? lista.join(', ') : 'Ninguna elegida';
  span.classList.toggle('campo__valor--vacio', !ninguna && !lista.length);
}

$('#objetivo').addEventListener('change', e => { estado.perfil.objetivo = e.target.value || null; });

// Tooltip de alergias: se abre y se cierra con un toque (y en la compu, también al pasar el mouse).
const infoBoton = $('.info__boton'), infoGlobo = $('#info-alergias');
infoBoton.addEventListener('click', e => {
  e.stopPropagation();
  infoGlobo.hidden = !infoGlobo.hidden;
  infoBoton.setAttribute('aria-expanded', String(!infoGlobo.hidden));
});
document.addEventListener('click', e => { if (!e.target.closest('.info')) { infoGlobo.hidden = true; infoBoton.setAttribute('aria-expanded', 'false'); } });

// Guardar el perfil en el navegador, para no pedirlo cada vez que se abre la app.
$('#guardar-perfil').addEventListener('click', () => {
  try { localStorage.setItem('respira-perfil', JSON.stringify(estado.perfil)); } catch (e) { /* modo privado: no pasa nada */ }
  irA('inicio');
});

/* ---------- 6. AL ABRIR LA APP ----------
   Splash 1,5 segundos (o hasta que aprieten Enter). Después, el inicio.
   La primera vez se muestra el perfil arriba del inicio, así "volver" o "Ahora no" llevan al inicio. */
let perfilGuardado = null;
try { perfilGuardado = JSON.parse(localStorage.getItem('respira-perfil')); } catch (e) { perfilGuardado = null; }
if (perfilGuardado) {
  Object.assign(estado.perfil, perfilGuardado);
  ['edad', 'altura', 'peso'].forEach(mostrarValor);
  if (estado.perfil.nivel) $(`[data-grupo="nivel"] [data-valor="${estado.perfil.nivel}"]`).setAttribute('aria-pressed', 'true');
  estado.perfil.alergias.forEach(a => $(`[data-grupo="alergias"] [data-valor="${a}"]`)?.setAttribute('aria-pressed', 'true'));
  resumirAlergias();
  if (estado.perfil.objetivo) $('#objetivo').value = estado.perfil.objetivo;
}

let splashTerminado = false;
function salirDelSplash() {
  if (splashTerminado) return;
  splashTerminado = true;
  irA('inicio', { reemplazar: true });
  if (!perfilGuardado) irA('perfil');
}
setTimeout(salirDelSplash, 1500);
