/* =====================================================================
   RESPIRA — Comportamiento de la app
   Todo lo que PASA cuando el runner toca algo. Es el equivalente al
   modo Prototype de Figma, pero con memoria y lógica.
   ===================================================================== */

/* ---------- 1. ESTADO: la memoria de la app ----------
   Acá se guarda lo que el runner va eligiendo. Las pantallas se dibujan a partir de esto.
   Tip: abrí la consola de Chrome (Cmd + Opción + J), escribí  estado  y apretá Enter para verlo. */
const estado = {
  pantalla: 'splash',
  perfil: {
    nombre: '',
    edad: null,      // años
    altura: null,    // cm
    peso: null,      // kg
    alergias: [],    // por ejemplo ['platano', 'fresno']
    nivel: null,     // 'principiante' | 'intermedio' | 'avanzado'
    objetivo: null
  }
};
window.estado = estado;   // para poder mirarlo desde la consola

/* ---------- 2. NAVEGACIÓN: mostrar una pantalla y esconder las demás ----------
   Es lo mismo que una conexión de prototipo "On tap → Navigate to". */
function irA(id) {
  const destino = document.getElementById(id);
  if (!destino) {
    console.warn(`La pantalla "${id}" todavía no existe. La vamos a armar en los próximos pasos.`);
    return;
  }
  document.querySelectorAll('.pantalla').forEach(p => { p.hidden = (p.id !== id); });
  estado.pantalla = id;
  window.scrollTo(0, 0);
}

// Un solo "escuchador" para toda la página: si tocan algo con data-ir, vamos a esa pantalla.
document.addEventListener('click', evento => {
  const boton = evento.target.closest('[data-ir]');
  if (boton) irA(boton.dataset.ir);
});

/* ---------- 3. PERFIL ---------- */

// 3a. Llenar los <select> de edad, altura y peso con sus opciones (en vez de escribirlas a mano en el HTML).
function llenarSelect(id, desde, hasta) {
  const select = document.getElementById(id);
  const unidad = select.dataset.unidad;
  select.add(new Option('Elegí', ''));
  for (let n = desde; n <= hasta; n++) select.add(new Option(`${n} ${unidad}`, n));
}
llenarSelect('edad', 14, 90);
llenarSelect('altura', 130, 210);
llenarSelect('peso', 35, 150);

// 3b. Cada vez que cambia un campo, se guarda en el estado.
document.getElementById('nombre').addEventListener('input', e => { estado.perfil.nombre = e.target.value.trim(); });
for (const id of ['edad', 'altura', 'peso']) {
  document.getElementById(id).addEventListener('change', e => {
    estado.perfil[id] = e.target.value ? Number(e.target.value) : null;
  });
}
document.getElementById('objetivo').addEventListener('change', e => { estado.perfil.objetivo = e.target.value || null; });

// 3c. Chips. data-tipo="uno" → se elige una sola opción (nivel). data-tipo="varios" → varias (alergias).
document.querySelectorAll('.chips').forEach(grupo => {
  grupo.addEventListener('click', evento => {
    const chip = evento.target.closest('.chip');
    if (!chip) return;
    const nombreGrupo = grupo.dataset.grupo;      // 'alergias' o 'nivel'
    const valor = chip.dataset.valor;
    const estaba = chip.getAttribute('aria-pressed') === 'true';

    if (grupo.dataset.tipo === 'uno') {
      // Selección única: se apagan todos y se prende el tocado.
      grupo.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(!estaba));
      estado.perfil[nombreGrupo] = estaba ? null : valor;
    } else {
      // Selección múltiple. "Ninguna" apaga las demás, y elegir una especie apaga "Ninguna".
      chip.setAttribute('aria-pressed', String(!estaba));
      if (valor === 'ninguna' && !estaba) {
        grupo.querySelectorAll('.chip').forEach(c => { if (c !== chip) c.setAttribute('aria-pressed', 'false'); });
      } else if (valor !== 'ninguna') {
        grupo.querySelector('[data-valor="ninguna"]').setAttribute('aria-pressed', 'false');
      }
      estado.perfil[nombreGrupo] = [...grupo.querySelectorAll('.chip[aria-pressed="true"]')]
        .map(c => c.dataset.valor).filter(v => v !== 'ninguna');
    }
  });
});

// 3d. Guardar el perfil en el navegador, para no pedirlo cada vez que se abre la app.
document.getElementById('guardar-perfil').addEventListener('click', () => {
  try { localStorage.setItem('respira-perfil', JSON.stringify(estado.perfil)); } catch (e) { /* modo privado: no pasa nada */ }
  irA('inicio');
});

/* ---------- 4. AL ABRIR LA APP ----------
   Se muestra el splash 1,5 segundos. Si el perfil ya estaba guardado, va directo al inicio. */
let perfilGuardado = null;
try { perfilGuardado = JSON.parse(localStorage.getItem('respira-perfil')); } catch (e) { perfilGuardado = null; }
if (perfilGuardado) Object.assign(estado.perfil, perfilGuardado);

setTimeout(() => irA(perfilGuardado ? 'inicio' : 'bienvenida'), 1500);
