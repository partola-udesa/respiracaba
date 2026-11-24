/* =====================================================================
   RESPIRA · TUS RECORRIDAS (v12 · la pirueta; v15 · corridas y ranking)
   Cada recorrida terminada deja una foto. Las fotos forman un gráfico: la altura de cada una es la
   respirabilidad de ese recorrido (dato calculado con la red de calles) y la línea punteada es el promedio
   de TODAS las calles de CABA. Lo que queda arriba de la línea es donde respiraste mejor que la Ciudad:
   la hipótesis del proyecto, contada con las fotos del runner.
   - "Tus corridas": en orden de fecha. - "Tu ranking": de la más respirable a la menos.
   Se desliza para recorrerlas; tocar la foto del centro repite ese recorrido.
   Las fotos se guardan solo en este teléfono (localStorage, "respira-corridas").
   Usa de app.js: $, $$, estado, irA, alMostrar, escapar, conComa, leerCorridas, calcularRecorridos, aplicarPerfil.
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

  /* ---------- 4. EL GRÁFICO: motor de la animación (v15) ----------
     Cada foto es una cápsula. Su altura respecto de la línea punteada es la respirabilidad comparada con la
     calle promedio de CABA (dato calculado). La foto del foco queda en el centro y las demás a los costados.
     modo 0 = "Tus corridas": en orden de fecha, empieza en la más reciente.
     modo 1 = "Tu ranking": de la más respirable a la menos, empieza en la #1.
     Al cambiar de modo las fotos se deslizan a su nuevo lugar. */
  const escena = () => $('#onda-escena');
  const PASO = 58, PUNTOS_A_PX = 5.4, TOPE = 92;   // px entre fotos, alto de la foto, px por punto de índice, máx. sobre/bajo la línea
  let lista = [], capsulas = [], orden = [], ciudad = null;
  let foco = 0, focoVisual = 0, velocidad = 0, modo = 0;
  let animando = false, ultimo = 0, arrastre = null;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fechaChica = f => new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '').replace(/ (\S)/, (_, l) => ' ' + l.toUpperCase());   // "14 Nov"

  function armar() {
    lista = todos();
    escena().innerHTML = lista.map((r, i) => `
      <div class="capsula${r.propio ? ' capsula--propia' : ''}" data-i="${i}">
        <span class="capsula__valor" data-valor="${i}"></span>
        <button class="capsula__foto${r.foto ? '' : ' foto-onda--postal'}" ${fondo(r)} tabindex="-1" aria-label="${escapar(r.lugar)}, ${fechaCorta(r.fecha)}">${contenidoTarjeta(r)}</button>
        <span class="capsula__pie" data-pie="${i}"></span>
      </div>`).join('');
    capsulas = [...escena().querySelectorAll('.capsula')].map(el => ({ el, x: 0, y: 0, entrada: 0 }));
    dibujarResumen();
    ordenar(true);
    completarIndices().then(c => { ciudad = c; dibujarValores(); dibujarLinea(); ordenar(modo === 1); focoMostrado = -1; });
  }

  // El orden de las fotos según el modo; "reiniciar" lleva el foco a la más reciente o a la #1
  function ordenar(reiniciar) {
    const idx = lista.map((_, i) => i);
    orden = modo === 1 ? idx.sort((a, b) => (lista[b].indice ?? -1) - (lista[a].indice ?? -1)) : idx;
    const lugar = []; orden.forEach((i, pos) => { lugar[i] = pos; });
    capsulas.forEach((c, i) => { c.pos = lugar[i]; });
    lista.forEach((r, i) => { const p = escena().querySelector(`[data-pie="${i}"]`); if (p) p.textContent = modo === 1 ? `#${lugar[i] + 1}` : fechaChica(r.fecha); });
    if (reiniciar) { foco = modo === 1 ? 0 : lista.length - 1; velocidad = 0; }
    if (reiniciar && reducido) focoVisual = foco;
    focoMostrado = -1;
  }

  function altura(r) {
    if (ciudad == null || r.indice == null) return 0;
    return Math.max(-TOPE, Math.min(TOPE, -(r.indice - ciudad) * PUNTOS_A_PX));
  }

  function cuadro(ahora) {
    if (!animando) return;
    const dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000); ultimo = ahora;
    const n = lista.length, k = reducido ? 1 : Math.min(1, dt * 8);
    // inercia del arrastre + imán a la foto más cercana
    if (!arrastre) {
      foco += velocidad * dt; velocidad *= Math.pow(0.04, dt);
      if (Math.abs(velocidad) < 0.4) foco += (Math.round(foco) - foco) * Math.min(1, dt * 8);
    }
    foco = Math.max(0, Math.min(n - 1, foco));
    focoVisual += (foco - focoVisual) * (reducido ? 1 : Math.min(1, dt * 7));
    const puntos = [];
    capsulas.forEach((c, i) => {
      const d = c.pos - focoVisual, cerca = Math.exp(-(d * d) / 0.5);
      c.x += (d * PASO - c.x) * k;
      c.y += (altura(lista[i]) - c.y) * k;
      // entrada: las fotos suben desde la línea, de a una
      c.entrada = Math.min(1, c.entrada + dt * 2.2 * (reducido ? 10 : 1));
      const e = 1 - Math.pow(1 - Math.max(0, Math.min(1, c.entrada * 1.6 - c.pos / Math.max(n, 1) * 0.6)), 3);
      c.el.style.transform = `translate(${c.x}px, ${c.y * e}px) scale(${1 + cerca * 0.08})`;
      c.el.style.opacity = e;
      c.el.style.zIndex = Math.round(100 + cerca * 50);
      puntos[c.pos] = [c.x, c.y * e];
    });
    dibujarCamino(puntos);
    actualizarFoco();
    requestAnimationFrame(cuadro);
  }

  // La línea fina que une las fotos, en el orden del modo
  function dibujarCamino(puntos) {
    const svg = $('#onda-camino'), w = svg.clientWidth / 2, h = svg.clientHeight / 2;
    svg.querySelector('polyline').setAttribute('points', puntos.filter(Boolean).map(([x, y]) => `${(w + x).toFixed(1)},${(h + y).toFixed(1)}`).join(' '));
  }

  const indiceFoco = () => orden[Math.max(0, Math.min(lista.length - 1, Math.round(focoVisual)))];

  let focoMostrado = -1;
  function actualizarFoco() {
    const i = indiceFoco();
    if (i === focoMostrado) return;
    focoMostrado = i;
    capsulas.forEach((c, j) => c.el.classList.toggle('capsula--foco', j === i));
    const r = lista[i], dif = ciudad != null && r.indice != null ? r.indice - ciudad : null;
    $('#archivo-foco').innerHTML = `
      <span class="archivo-foco__fecha">${r.ejemplo ? '<b class="etiqueta-ejemplo">Ejemplo</b>' : r.propio ? '<b class="etiqueta-propia">Tuyo</b>' : ''}${modo === 1 ? `#${capsulas[i].pos + 1}/${lista.length} · ` : ''}${fechaCorta(r.fecha)} · ${horaCorta(r.fecha)}</span>
      <span class="archivo-foco__lugar">${escapar(r.lugar)}</span>
      <span class="archivo-foco__datos">${conComa(r.km)} km · ${r.indice != null ? r.indice + '% respirable' : 'calculando…'}${dif != null ? ` · <b class="archivo-foco__vs${dif < 0 ? ' archivo-foco__vs--menos' : ''}">${dif > 0 ? '+' : dif < 0 ? '−' : ''}${Math.abs(dif)} vs. CABA</b>` : ''}</span>`;
  }

  /* ---------- 5. Lo que acompaña al gráfico ---------- */
  function dibujarResumen() {
    const lugares = new Set(lista.map(r => r.lugar)).size, km = lista.reduce((s, r) => s + (+r.km || 0), 0);
    $('#archivo-resumen').innerHTML = `
      <div class="dato"><b>${lista.length}</b><span>${lista.length === 1 ? 'recorrida' : 'recorridas'}</span></div>
      <div class="dato"><b>${lugares}</b><span>${lugares === 1 ? 'lugar' : 'lugares'}</span></div>
      <div class="dato"><b>${conComa(km)}</b><span>kilómetros</span></div>`;
  }
  function dibujarValores() {
    lista.forEach((r, i) => { const v = escena().querySelector(`[data-valor="${i}"]`); if (v) v.textContent = r.indice != null ? r.indice + '%' : ''; });
  }
  function dibujarLinea() {
    $('#onda-ciudad span').textContent = ciudad != null ? `Calle promedio de CABA · ${ciudad}%` : 'Calle promedio de CABA';
  }
  function cambiarModo(m) {
    if (m === modo && capsulas.length) return;
    modo = m;
    $$('#archivo-modos [data-modo]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.modo === m)));
    ordenar(true);
  }
  $('#archivo-modos').addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (b) cambiarModo(+b.dataset.modo); });

  /* ---------- 6. Deslizar, tocar y teclado ----------
     Tocar una foto la trae al centro; tocar la del centro repite ese recorrido. */
  const onda = $('#onda');
  onda.addEventListener('pointerdown', e => {
    arrastre = { x: e.clientX, x0: e.clientX, t: performance.now(), movio: false, id: e.pointerId };
    velocidad = 0;
  });
  onda.addEventListener('pointermove', e => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x, ahora = performance.now();
    if (Math.abs(e.clientX - arrastre.x0) > 6 && !arrastre.movio) { arrastre.movio = true; try { onda.setPointerCapture(e.pointerId); } catch (_) {} }
    if (!arrastre.movio) return;
    foco -= dx / PASO;
    velocidad = -dx / PASO / Math.max(0.008, (ahora - arrastre.t) / 1000);
    arrastre.x = e.clientX; arrastre.t = ahora;
  });
  onda.addEventListener('pointerup', e => {
    if (!arrastre) return;
    const tocada = !arrastre.movio && e.target.closest && e.target.closest('.capsula');
    arrastre = null;
    if (!tocada) return;
    const i = +tocada.dataset.i;
    if (i === indiceFoco()) repetir(lista[i]);
    else { foco = capsulas[i].pos; velocidad = 0; }
  });
  onda.addEventListener('pointercancel', () => { arrastre = null; });
  onda.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') foco = Math.round(foco) + 1;
    else if (e.key === 'ArrowLeft') foco = Math.round(foco) - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); repetir(lista[indiceFoco()]); }
  });

  /* ---------- 7. Repetir: te llevamos directo ----------
     Un recorrido propio vuelve con su búsqueda; un ejemplo, como vuelta desde ese lugar con los mismos km. */
  function repetir(r) {
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
    modo = 0;
    $$('#archivo-modos [data-modo]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.modo === 0)));
    armar();
    focoVisual = foco;
    if (!animando) { animando = true; ultimo = 0; requestAnimationFrame(cuadro); }
    $('#onda').focus({ preventScroll: true });
  };
  // La animación se apaga cuando se sale de la pantalla
  new MutationObserver(() => { if ($('#archivo').hidden) animando = false; }).observe($('#archivo'), { attributes: true, attributeFilter: ['hidden'] });

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
