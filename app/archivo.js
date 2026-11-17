/* =====================================================================
   RESPIRA · TU ARCHIVO (v12 · la pirueta)
   Cada recorrido terminado deja una foto. El archivo las ordena en una onda 3D que respira:
   - "Tu onda": las fotos viajan por una cinta ondulada (en orden de fecha). Se arrastra para recorrer el tiempo.
   - "Tu respiración": la misma onda se acomoda como un gráfico. La altura de cada foto es la respirabilidad
     de ese recorrido (dato calculado con la red de calles) y la línea punteada es el promedio de TODAS las
     calles de CABA. Lo que queda arriba de la línea es donde respiraste mejor que la Ciudad: la hipótesis
     del proyecto, contada con las fotos del runner.
   Las fotos se guardan solo en este teléfono (localStorage, "respira-corridas").
   Usa de app.js: $, $$, estado, irA, alMostrar, escapar, conComa, icono, leerCorridas, calcularRecorridos.
   ===================================================================== */
(function () {
  /* ---------- 1. Recorridos de ejemplo (fotos generadas en Figma, frame "Pirueta") ----------
     km, minutos y sensación son de ejemplo. La respirabilidad NO: se calcula al abrir el archivo con las
     calles a 400 m del lugar (RespiraRed.indiceZona). */
  const EJEMPLOS = [
    { id: 'costanera-norte',   lugar: 'Costanera Norte',      sub: 'Paseo junto al río',               desc: 'El río de un lado y la ciudad del otro. Viento de frente casi siempre.', lat: -34.5585, lon: -58.4005, km: 7.2, min: 43, fecha: '2026-09-06T07:10', sensacion: 'comoda' },
    { id: 'barrancas-belgrano',lugar: 'Barrancas de Belgrano', sub: 'La glorieta y las barrancas',     desc: 'Subidas cortas y sombra de tipas: buen lugar para trabajar cuestas.', lat: -34.5612, lon: -58.4518, km: 3.8, min: 24, fecha: '2026-09-13T18:20', sensacion: 'comoda' },
    { id: 'plaza-san-martin',  lugar: 'Plaza San Martín',     sub: 'Retiro, frente al Kavanagh',        desc: 'Mucho verde en el medio del centro, rodeado de avenidas.', lat: -34.5953, lon: -58.3752, km: 3.1, min: 20, fecha: '2026-09-20T08:00', sensacion: 'regular' },
    { id: 'lagos-palermo',     lugar: 'Lagos de Palermo',     sub: 'Parque Tres de Febrero',            desc: 'La vuelta clásica a los lagos, plana y con árboles grandes.', lat: -34.5718, lon: -58.4195, km: 5.4, min: 32, fecha: '2026-09-27T07:30', sensacion: 'comoda' },
    { id: 'parque-lezama',     lugar: 'Parque Lezama',        sub: 'San Telmo, la cúpula rusa',         desc: 'Escaleras, palmeras y el barrio alrededor. Corto pero con desnivel.', lat: -34.6283, lon: -58.3693, km: 3.5, min: 23, fecha: '2026-10-04T09:00', sensacion: 'regular' },
    { id: 'parque-centenario', lugar: 'Parque Centenario',    sub: 'Caballito, bajo los jacarandás',    desc: 'En noviembre el camino queda violeta. El anillo mide 1,1 km.', lat: -34.6066, lon: -58.4357, km: 4.2, min: 26, fecha: '2026-10-11T18:40', sensacion: 'comoda' },
    { id: 'reserva-ecologica', lugar: 'Reserva Ecológica',    sub: 'Costanera Sur',                     desc: 'Senderos de tierra entre cortaderas, con la ciudad de fondo.', lat: -34.6150, lon: -58.3548, km: 8.2, min: 50, fecha: '2026-10-18T08:15', sensacion: 'comoda' },
    { id: 'parque-avellaneda', lugar: 'Parque Avellaneda',    sub: 'La casona de los Olivera',          desc: 'Eucaliptos, pasto y caminos de tierra en el oeste de la Ciudad.', lat: -34.6455, lon: -58.4775, km: 5.8, min: 35, fecha: '2026-10-25T17:50', sensacion: 'comoda' },
    { id: 'lago-regatas',      lugar: 'Lago de Regatas',      sub: 'El puente blanco',                  desc: 'Atardecer sobre el lago y mucha gente corriendo a la misma hora.', lat: -34.5675, lon: -58.4125, km: 6.1, min: 37, fecha: '2026-11-01T19:10', sensacion: 'cansada' },
    { id: 'puerto-madero',     lugar: 'Puerto Madero',        sub: 'Diques y Puente de la Mujer',       desc: 'Los diques, el Puente de la Mujer y los docks de ladrillo: todo plano y con el agua al lado.', lat: -34.6095, lon: -58.3638, km: 7.4, min: 44, fecha: '2026-11-05T06:50', sensacion: 'comoda' },
    { id: 'planetario',        lugar: 'Planetario',           sub: 'Palermo, al atardecer',              desc: 'La cúpula reflejada en el lago. Buen cierre para una vuelta larga.', lat: -34.5697, lon: -58.4116, km: 5.0, min: 30, fecha: '2026-11-09T19:30', sensacion: 'comoda' },
    { id: 'rosedal',           lugar: 'El Rosedal',           sub: 'Plaza Holanda',                     desc: 'Rosas, el puente blanco y el lago. Uno de los tramos más verdes de la Ciudad.', lat: -34.5717, lon: -58.4170, km: 4.6, min: 28, fecha: '2026-11-14T07:20', sensacion: 'comoda' }
  ].map(e => ({ ...e, foto: `datos/archivo/${e.id}.jpg`, ejemplo: true, indice: null }));
  const SENSACION = { comoda: 'Te sentiste cómoda', regular: 'Te sentiste regular', cansada: 'Terminaste cansada' };
  const MIS_RECORRIDOS_PARA_OCULTAR_EJEMPLOS = 8;

  /* ---------- 2. El archivo: ejemplos + recorridos del runner, en orden de fecha ---------- */
  function propios() {
    return leerCorridas().filter(c => c.busqueda && c.busqueda.partida).map((c, i) => ({
      id: 'propio-' + i, propio: true, fecha: c.fecha,
      lugar: c.lugar || c.busqueda.partida.nombre,
      sub: c.busqueda.circular ? 'Vuelta' : c.busqueda.llegada ? '→ ' + c.busqueda.llegada.nombre : c.recorrido || '',
      desc: c.comentario ? `“${c.comentario}”` : (c.recorrido ? `Elegiste "${c.recorrido}".` : ''),
      lat: c.busqueda.partida.lat, lon: c.busqueda.partida.lon,
      km: c.km, min: c.min, indice: c.indice, polen: c.polen, sensacion: c.sensacion,
      foto: c.foto || null, trazo: c.trazo || null, corrida: c
    }));
  }
  function todos() {
    const mios = propios();
    const lista = mios.length >= MIS_RECORRIDOS_PARA_OCULTAR_EJEMPLOS ? mios : [...EJEMPLOS, ...mios];
    return lista.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }
  // Respirabilidad de los ejemplos: calculada sobre las calles (una vez)
  let calculados = null;
  async function completarIndices() {
    if (calculados) return calculados;
    calculados = (async () => {
      const ciudad = await RespiraRed.promedioCiudad();
      for (const e of EJEMPLOS) e.indice = (await RespiraRed.indiceZona(e.lon, e.lat, 400)) ?? (await RespiraRed.indiceZona(e.lon, e.lat, 800));   // junto al río, a 400 m puede no haber calles
      return ciudad;
    })();
    return calculados;
  }

  /* ---------- 3. La tarjeta: foto, o el dibujo del recorrido si no hubo foto ---------- */
  function dibujoTrazo(trazo, clase = '') {
    if (!trazo || trazo.length < 2) return `<svg class="postal__dibujo ${clase}" viewBox="0 0 60 100"><path d="M10 80 C 20 20, 40 90, 50 20"/></svg>`;
    const cos = Math.cos(trazo[0][0] * Math.PI / 180), xs = trazo.map(c => c[1] * cos), ys = trazo.map(c => -c[0]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min(44 / (x1 - x0 || 1), 80 / (y1 - y0 || 1)), ox = (60 - (x1 - x0) * k) / 2, oy = (100 - (y1 - y0) * k) / 2;
    const pts = xs.map((x, i) => `${(ox + (x - x0) * k).toFixed(1)},${(oy + (ys[i] - y0) * k).toFixed(1)}`).join(' ');
    return `<svg class="postal__dibujo ${clase}" viewBox="0 0 60 100" preserveAspectRatio="xMidYMid meet"><polyline points="${pts}"/></svg>`;
  }
  const fondo = r => r.foto ? `style="background-image:url('${r.foto}')"` : '';
  const contenidoTarjeta = r => r.foto ? '' : `<span class="postal">${dibujoTrazo(r.trazo)}</span>`;
  const fechaCorta = f => new Date(f).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  const horaCorta = f => new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  /* ---------- 4. LA ONDA: motor de la animación ----------
     Cada foto tiene una posición en la onda (t = distancia al foco). Por cuadro se calcula x, y, z y el giro.
     modo 0 = "Tu onda" (cinta que viaja y se tuerce), modo 1 = "Tu respiración" (gráfico). Se pasa de uno a
     otro con una mezcla suave, así las fotos se reacomodan solas. */
  const escena = () => $('#onda-escena');
  let lista = [], tarjetas = [], ciudad = null;
  let foco = 0, focoVisual = 0, velocidad = 0, modo = 0, modoVisual = 0, fase = 0;
  let animando = false, ultimo = 0, entrada = 0, quieto = 0, arrastre = null;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function armar() {
    lista = todos();
    const n = lista.length;
    escena().innerHTML = lista.map((r, i) => `
      <button class="foto-onda${r.propio ? ' foto-onda--propia' : ''}${r.foto ? '' : ' foto-onda--postal'}" data-i="${i}" ${fondo(r)} aria-label="${escapar(r.lugar)}, ${fechaCorta(r.fecha)}">
        ${contenidoTarjeta(r)}<span class="foto-onda__valor" data-valor="${i}"></span>
      </button>`).join('');
    tarjetas = [...escena().querySelectorAll('.foto-onda')];
    foco = focoVisual = n - 1;      // empieza en el más reciente
    entrada = 0; quieto = -3;   // al abrir, la onda se queda quieta en tu último recorrido unos segundos
    dibujarResumen();
    dibujarPie();
    completarIndices().then(c => { ciudad = c; dibujarValores(); dibujarPie(); dibujarLinea(); });
  }

  function posiciones(i, n, ancho) {
    // --- modo onda: cinta infinita que da la vuelta ---
    let t = ((i - focoVisual) % n + n) % n; if (t > n / 2) t -= n;
    const gap = Math.min(27, (ancho - 40) / Math.max(n, 6));
    const ang = t * 0.62 + fase;
    const onda = { x: t * gap, y: -Math.sin(ang) * 62, z: -Math.abs(t) * 6, ry: Math.cos(ang) * 38, rz: Math.cos(ang) * -8, h: 1 };
    // --- modo respiración: gráfico fijo, de izquierda (más viejo) a derecha (más nuevo) ---
    const paso = Math.min(28, (ancho - 104) / Math.max(n - 1, 1));
    const v = lista[i].indice ?? ciudad ?? 50, base = ciudad ?? 50;
    const resp = { x: (i - (n - 1) / 2) * paso + 10, y: -(v - base) * 7, z: 0, ry: 0, rz: 0, h: 0.45 + Math.min(lista[i].km || 4, 10) * 0.05, s: 0.55 };
    const m = modoVisual, mix = (a, b) => a + (b - a) * m;
    const p = { x: mix(onda.x, resp.x), y: mix(onda.y, resp.y), z: mix(onda.z, resp.z), ry: mix(onda.ry, resp.ry), rz: mix(onda.rz, resp.rz), h: mix(onda.h, resp.h), base: mix(0.82, resp.s) };
    // foco: la foto del centro (o la elegida en el gráfico) crece y se adelanta
    const dg = i - focoVisual, cerca = Math.exp(-(t * t) / 0.55) * (1 - m) + Math.exp(-(dg * dg) / 0.55) * m;
    p.s = p.base * (1 + cerca * (0.32 - 0.05 * m));
    p.z += cerca * 60;
    p.ry *= 1 - cerca * 0.8;
    return p;
  }

  function cuadro(ahora) {
    if (!animando) return;
    const dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000); ultimo = ahora;
    const n = lista.length, ancho = escena().clientWidth || 393;
    // inercia del arrastre + imán al número entero más cercano
    if (!arrastre) {
      foco += velocidad * dt; velocidad *= Math.pow(0.04, dt);
      if (Math.abs(velocidad) < 0.4) foco += (Math.round(foco) - foco) * Math.min(1, dt * 8);
      quieto += dt;
      // si nadie la toca, la onda avanza sola una foto cada 3 s (solo en "Tu onda")
      if (!reducido && modo === 0 && quieto > 3.2) { foco = Math.round(foco) + 1; quieto = 0.4; }
    }
    if (modo === 1) foco = Math.max(0, Math.min(n - 1, foco));
    focoVisual += (circular(foco) - focoVisual) * Math.min(1, dt * 7);
    modoVisual += (modo - modoVisual) * Math.min(1, dt * 3.2);
    if (!reducido) fase += dt * (0.55 - 0.35 * modoVisual);    // la onda respira
    entrada = Math.min(1, entrada + dt * 0.9);
    tarjetas.forEach((el, i) => {
      const p = posiciones(i, n, ancho);
      // entrada: las fotos salen de un mazo en el centro y se despliegan
      const e = suave(Math.max(0, Math.min(1, entrada * 1.9 - i / Math.max(n, 1) * 0.9)));
      const x = p.x * e, y = p.y * e + (1 - e) * 30, s = p.s * (0.6 + 0.4 * e);
      el.style.transform = `translate3d(${x}px, ${y}px, ${p.z}px) rotateY(${p.ry * e}deg) rotateZ(${p.rz * e + (1 - e) * (i % 2 ? 6 : -6)}deg) scale(${s}) scaleY(${p.h})`;
      el.style.opacity = e;
      el.style.zIndex = Math.round(100 + p.z);
    });
    actualizarFoco();
    requestAnimationFrame(cuadro);
  }
  const suave = x => 1 - Math.pow(1 - x, 3);
  // En "Tu onda" el foco da la vuelta; el valor visual sigue al más cercano sin saltar
  function circular(f) {
    if (modo === 1) return f;
    const n = lista.length; let d = ((f - focoVisual) % n + n) % n; if (d > n / 2) d -= n;
    return focoVisual + d;
  }
  const indiceFoco = () => ((Math.round(focoVisual) % lista.length) + lista.length) % lista.length;

  let focoMostrado = -1;
  function actualizarFoco() {
    const i = indiceFoco();
    if (i === focoMostrado) return;
    focoMostrado = i;
    tarjetas.forEach((el, j) => el.classList.toggle('foto-onda--foco', j === i));
    const r = lista[i];
    $('#archivo-foco').innerHTML = `
      <span class="archivo-foco__fecha">${r.ejemplo ? '<b class="etiqueta-ejemplo">Ejemplo</b>' : r.propio ? '<b class="etiqueta-propia">Tuyo</b>' : ''}${fechaCorta(r.fecha)} · ${horaCorta(r.fecha)}</span>
      <span class="archivo-foco__lugar">${escapar(r.lugar)}</span>
      <span class="archivo-foco__datos">${conComa(r.km)} km · ${r.indice != null ? r.indice + '% respirable' : 'calculando…'}</span>`;
  }

  /* ---------- 5. Lo que acompaña a la onda ---------- */
  function dibujarResumen() {
    const lugares = new Set(lista.map(r => r.lugar)).size, km = lista.reduce((s, r) => s + (+r.km || 0), 0);
    $('#archivo-resumen').innerHTML = `
      <div class="dato"><b>${lista.length}</b><span>recorridos</span></div>
      <div class="dato"><b>${lugares}</b><span>lugares</span></div>
      <div class="dato"><b>${conComa(km)}</b><span>kilómetros</span></div>`;
  }
  function dibujarValores() {
    lista.forEach((r, i) => { const v = escena().querySelector(`[data-valor="${i}"]`); if (v) v.textContent = r.indice != null ? r.indice : ''; });
  }
  function dibujarLinea() {
    const l = $('#onda-ciudad');
    l.querySelector('span').textContent = ciudad != null ? `Promedio de las calles de CABA · ${ciudad}%` : 'Promedio de las calles de CABA';
  }
  function dibujarPie() {
    const mios = lista.filter(r => r.propio).length, ej = lista.filter(r => r.ejemplo).length;
    const arriba = ciudad == null ? null : lista.filter(r => r.indice != null && r.indice > ciudad).length;
    $('#archivo-nota').innerHTML = modo === 1
      ? (arriba == null ? 'Calculando la respirabilidad de cada lugar con las calles de la Ciudad…'
        : `<b>${arriba} de ${lista.length}</b> recorridos quedan arriba del promedio de la Ciudad: ahí respiraste mejor que en la calle típica de CABA. La altura de cada foto es la respirabilidad de las calles a 400 m (dato calculado) y su largo, los km.`)
      : ej ? `Por ahora ves ${ej} recorridos de ejemplo${mios ? ` y ${mios} tuyo${mios > 1 ? 's' : ''}` : ''}. Cuando termines uno y te saques una foto, se suma a la onda.`
        : 'Arrastrá la onda para recorrer tu historial. Tocá una foto para ver ese lugar y tus datos.';
  }
  function cambiarModo(m) {
    modo = m; quieto = 0;
    if (m === 1) { foco = indiceFoco(); focoVisual = foco + (focoVisual - Math.round(focoVisual)); }
    $$('#archivo-modos [data-modo]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.modo === m)));
    $('#onda').classList.toggle('onda--grafico', m === 1);
    dibujarPie();
  }
  $('#archivo-modos').addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (b) cambiarModo(+b.dataset.modo); });

  /* ---------- 6. Arrastrar, tocar y teclado ---------- */
  const onda = $('#onda');
  onda.addEventListener('pointerdown', e => {
    arrastre = { x: e.clientX, x0: e.clientX, t: performance.now(), foco, movio: false, id: e.pointerId };
    velocidad = 0; quieto = 0;
  });
  onda.addEventListener('pointermove', e => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x, ahora = performance.now();
    if (Math.abs(e.clientX - arrastre.x0) > 6 && !arrastre.movio) { arrastre.movio = true; try { onda.setPointerCapture(e.pointerId); } catch (_) {} }
    if (!arrastre.movio) return;
    const paso = modo === 1 ? 22 : 28;
    foco -= dx / paso;
    velocidad = -dx / paso / Math.max(0.008, (ahora - arrastre.t) / 1000);
    arrastre.x = e.clientX; arrastre.t = ahora;
  });
  const soltar = e => {
    if (!arrastre) return;
    const tocado = !arrastre.movio && e.target.closest && e.target.closest('.foto-onda');
    arrastre = null; quieto = 0;
    if (tocado) {
      const i = +tocado.dataset.i;
      if (i === indiceFoco()) abrirFicha(i);
      else {
        const n = lista.length; let d = ((i - focoVisual) % n + n) % n; if (d > n / 2) d -= n;
        foco = modo === 1 ? i : focoVisual + d; velocidad = 0;
      }
    }
  };
  onda.addEventListener('pointerup', soltar);
  onda.addEventListener('pointercancel', () => { arrastre = null; });
  onda.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { foco = Math.round(foco) + 1; quieto = 0; }
    else if (e.key === 'ArrowLeft') { foco = Math.round(foco) - 1; quieto = 0; }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(indiceFoco()); }
  });

  /* ---------- 7. Ficha del lugar ---------- */
  let fichaAbierta = null;
  function abrirFicha(i) {
    const r = lista[i]; fichaAbierta = r;
    const v = r.indice;
    $('#ficha').innerHTML = `
      <div class="ficha__foto${r.foto ? '' : ' ficha__foto--postal'}" ${fondo(r)}>${r.foto ? '' : dibujoTrazo(r.trazo, 'postal__dibujo--grande')}</div>
      <span class="ficha__fecha">${fechaCorta(r.fecha)} · ${horaCorta(r.fecha)}</span>
      <button class="ficha__cerrar" id="cerrar-ficha" aria-label="Cerrar">${icono('cerrar')}</button>
      <div class="ficha__panel">
        ${r.ejemplo ? '<span class="etiqueta-ejemplo">Recorrido de ejemplo</span>' : ''}
        <h2 class="ficha__lugar">${escapar(r.lugar)}</h2>
        <p class="ficha__sub">${escapar(r.sub || '')}</p>
        ${r.desc ? `<p class="ficha__desc">${escapar(r.desc)}</p>` : ''}
        <div class="ficha__datos">
          <div><b>${conComa(r.km, 2)}<small>km</small></b><span>Distancia</span></div>
          <div><b>${r.min ?? '–'}<small>min</small></b><span>Tiempo</span></div>
          <div><b>${v ?? '–'}<small>%</small></b><span>Respirabilidad ${ayuda(r.ejemplo ? 'Promedio del índice de las calles a 400 m del lugar. Lo calcula la app con los datasets, no la IA.' : 'Índice del recorrido que corriste, calculado tramo por tramo con los datasets.')}</span>
            <i class="ficha__barra"><i style="width:${v ?? 0}%"></i></i></div>
        </div>
        ${ciudad != null && v != null ? `<p class="ficha__comparacion">${v > ciudad ? `${v - ciudad} puntos <b>más respirable</b> que la calle promedio de CABA (${ciudad}%).` : v < ciudad ? `${ciudad - v} puntos por debajo de la calle promedio de CABA (${ciudad}%).` : `Igual que la calle promedio de CABA (${ciudad}%).`}</p>` : ''}
        <div class="ficha__chips">
          ${r.polen ? `<span class="chip-dato">Polen ${r.polen}</span>` : ''}
          ${r.sensacion && SENSACION[r.sensacion] ? `<span class="chip-dato">${SENSACION[r.sensacion]}</span>` : ''}
        </div>
      </div>
      <button class="boton ficha__repetir" id="repetir-ficha">Repetir este trayecto ${icono('repetir')}</button>`;
    $('#ficha-fondo').hidden = false;
    requestAnimationFrame(() => $('#ficha-fondo').classList.add('abierta'));
    $('#cerrar-ficha').addEventListener('click', cerrarFicha);
    $('#repetir-ficha').addEventListener('click', () => repetir(r));
    $('#cerrar-ficha').focus();
  }
  function cerrarFicha() {
    const f = $('#ficha-fondo'); if (f.hidden) return false;
    f.classList.remove('abierta'); setTimeout(() => { f.hidden = true; }, 300); fichaAbierta = null;
    return true;
  }
  $('#ficha-fondo').addEventListener('click', e => { if (e.target.id === 'ficha-fondo') cerrarFicha(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarFicha(); });
  globalThis.cerrarFichaArchivo = cerrarFicha;

  // Repetir: un recorrido propio vuelve con su búsqueda; un ejemplo, como vuelta desde ese lugar con los mismos km.
  function repetir(r) {
    cerrarFicha();
    const c = r.corrida;
    if (c) {
      Object.assign(estado.busqueda, c.busqueda, { programar: false });
      estado.condiciones = new Set(c.condiciones || []); estado.origen = c.origen || {}; estado.condicionesTocadas = true;
    } else {
      Object.assign(estado.busqueda, { partida: { nombre: r.lugar, lat: r.lat, lon: r.lon }, llegada: null, circular: true, km: r.km, programar: false });
      estado.condicionesTocadas = false; aplicarPerfil();
    }
    irA('recorridos'); calcularRecorridos();
  }

  /* ---------- 8. Abrir y cerrar la pantalla ---------- */
  alMostrar.archivo = () => {
    cambiarModo(0);
    armar();
    if (!animando) { animando = true; ultimo = 0; requestAnimationFrame(cuadro); }
    $('#onda').focus({ preventScroll: true });
  };
  // La animación se apaga cuando se sale de la pantalla
  new MutationObserver(() => { if ($('#archivo').hidden) { animando = false; cerrarFicha(); } }).observe($('#archivo'), { attributes: true, attributeFilter: ['hidden'] });

  /* ---------- 9. Las mismas fotos, en chico, en otras pantallas ---------- */
  // Abanico de fotos: inicio (tarjeta "Tu archivo"), comentario ("Sumá esta corrida") y guardado.
  globalThis.RespiraArchivo = {
    abanico(cuantas = 5) {
      return todos().slice(-cuantas).map((r, i, a) => {
        const t = i - (a.length - 1) / 2;
        return `<span class="mini-foto${r.foto ? '' : ' foto-onda--postal'}" ${fondo(r)} style="--t:${t}">${contenidoTarjeta(r)}</span>`;
      }).join('');
    },
    tarjeta(r) { return `<span class="mini-foto mini-foto--sola${r.foto ? '' : ' foto-onda--postal'}" ${fondo(r)}>${contenidoTarjeta(r)}</span>`; },
    dibujoTrazo
  };
})();
