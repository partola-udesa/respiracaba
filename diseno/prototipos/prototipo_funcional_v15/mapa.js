/* =====================================================================
   RESPIRA — Mapa interactivo (Leaflet + teselas de OpenStreetMap)
   - mostrarRecorridos: las tres opciones. Tocar una línea o su etiqueta la elige
     (y avisa a la lista con alElegir). La elegida va en el color de acento, con
     brillo y animación de dibujo; las otras quedan grises.
   - mostrarUno: un solo recorrido (detalle, corrida, completado). Si hay tramos
     con mucho polen para el runner, se marcan encima.
   - corredor: un punto que avanza sobre la ruta (simulación de "En recorrido").
   - orientar(giro): v13 · gira el mapa para que una letra del Respira challenge se lea derecha
     (como en Figma: las calles quedan inclinadas y la letra parada). Con el mapa girado no se arrastra.
   - miniatura: el mapa chiquito de cada tarjeta del challenge (sin interacción, con la letra girada).
   Uso:
     const mapa = RespiraMapa.crear(elemento, { interactivo, margenAbajo });
     mapa.mostrarRecorridos(opciones, { alElegir: i => … });
     mapa.elegir(1);
   ===================================================================== */
(function () {
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* Mapa base: siempre OpenStreetMap. En una página servida (Vercel, GitHub Pages, un servidor local) van las teselas
     oficiales. Abierta como archivo (file://) no hay "Referer" y el servidor oficial las bloquea: se usa el de
     OpenStreetMap France, que sirve el mismo mapa sin pedirlo (config.js). */
  const sinServidor = location.protocol === 'file:';
  function capaBase(mapa) {
    const c = sinServidor
      ? { url: CONFIG.teselasSinServidor, zoom: CONFIG.teselasSinServidorZoomMax, atribucion: CONFIG.atribucionSinServidor }
      : { url: CONFIG.teselas, zoom: CONFIG.teselasZoomMax, atribucion: CONFIG.atribucion };
    return L.tileLayer(c.url, { attribution: c.atribucion, subdomains: 'abc', maxNativeZoom: c.zoom, maxZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin' }).addTo(mapa);
  }

  function crear(elemento, { interactivo = true, margenAbajo = 0, margenArriba = 0, atribucion = true, estilo = '' } = {}) {
    const mapa = L.map(elemento, {
      zoomControl: false, attributionControl: atribucion, dragging: interactivo, scrollWheelZoom: interactivo,
      doubleClickZoom: interactivo, touchZoom: interactivo, boxZoom: false, keyboard: interactivo, zoomSnap: 0.25
    }).setView([-34.61, -58.44], 12);
    capaBase(mapa);
    if (atribucion) mapa.attributionControl.setPrefix(false);
    let capas = [], extras = L.layerGroup().addTo(mapa), rutas = [], elegida = -1, alElegir = () => {}, corredor = null, giro = null;
    let margenes = { abajo: margenAbajo, arriba: margenArriba };

    const icono = (clase, tam = 16) => L.divIcon({ className: '', html: `<div class="marcador ${clase}"></div>`, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] });
    function marcadores(inicio, fin) {
      extras.clearLayers();
      L.marker(inicio, { icon: icono(estilo === 'letra' ? 'marcador--letra' : '', estilo === 'letra' ? 12 : 16), interactive: false, keyboard: false }).addTo(extras);
      if (fin) L.marker(fin, { icon: icono('marcador--llegada'), interactive: false, keyboard: false }).addTo(extras);
    }

    // Animación de "dibujo": la línea aparece de punta a punta (como en el prototipo de estilo)
    function animarDibujo(linea) {
      const el = linea.getElement && linea.getElement();
      if (!el || !el.getTotalLength) return;
      const largo = Math.ceil(el.getTotalLength());
      el.style.strokeDasharray = largo; el.style.setProperty('--largo', largo);
      el.classList.remove('ruta-dibujo'); void el.getBoundingClientRect(); el.classList.add('ruta-dibujo');
      el.addEventListener('animationend', () => { el.style.strokeDasharray = ''; }, { once: true });
    }

    function dibujar({ animar = true, polen = false } = {}) {
      capas.forEach(c => c.remove());
      const acento = css('--acento'), tinta = css('--acento-tinta'), gris = css('--ruta-inactiva'), peligro = css('--peligro');
      // Primero las no elegidas (quedan abajo), después la elegida.
      const orden = rutas.map((_, i) => i).sort((a, b) => (a === elegida) - (b === elegida));
      capas = [];
      for (const i of orden) {
        const r = rutas[i], g = L.featureGroup(), activa = i === elegida;
        if (activa && estilo === 'letra') {
          // Tarjeta del challenge (frame 05c): trazo lima ancho con el centro verde oscuro
          L.polyline(r.coords, { color: acento, weight: 9, opacity: 0.95, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(g);
          L.polyline(r.coords, { color: tinta, weight: 3, opacity: 1, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(g);
          g.addTo(mapa);
        } else if (activa) {
          L.polyline(r.coords, { color: acento, weight: 14, opacity: 0.3, className: 'ruta-brillo', interactive: false }).addTo(g);
          const linea = L.polyline(r.coords, { color: tinta, weight: 4.5, opacity: 1, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(g);
          if (polen) (r.tramosPolen || []).forEach(c => L.polyline(c, { color: peligro, weight: 5, opacity: 0.95, dashArray: '2 7', lineCap: 'round', interactive: false }).addTo(g));
          g.addTo(mapa);
          if (animar) animarDibujo(linea);
        } else {
          L.polyline(r.coords, { color: gris, weight: 3.5, opacity: 1, dashArray: '1 7', lineCap: 'round', interactive: false }).addTo(g);
          g.addTo(mapa);
        }
        if (interactivo && rutas.length > 1) {
          // Línea invisible y ancha para que sea fácil tocarla con el dedo
          const toque = L.polyline(r.coords, { color: '#000', weight: 26, opacity: 0.001 }).addTo(g);
          toque.on('click', () => elegir(i, true));
          const medio = r.coords[Math.floor(r.coords.length * (0.22 + 0.22 * i))];
          const etiqueta = L.marker(medio, { keyboard: true, title: `Recorrido ${i + 1}`, zIndexOffset: activa ? 1000 : 0,
            icon: L.divIcon({ className: '', iconSize: [0, 0],
              html: `<div class="etiqueta-ruta${activa ? ' etiqueta-ruta--activa' : ''}" role="button" aria-label="Elegir recorrido ${i + 1}"><b>${i + 1}</b>${conComaNum(r.km)} km <span>· ${r.indice}%</span></div>` }) });
          etiqueta.on('click', () => elegir(i, true));
          g.addLayer(etiqueta);
        }
        capas[i] = g;
      }
    }

    function mostrarRecorridos(lista, opciones = {}) {
      rutas = lista; elegida = opciones.elegida ?? 0; alElegir = opciones.alElegir || alElegir;
      const primera = lista[0].coords, ultima = primera[primera.length - 1];
      marcadores(primera[0], opciones.circular ? null : ultima);
      dibujar(); encuadrar();
    }
    function encuadrar() {
      const caja = L.latLngBounds(rutas.flatMap(r => r.coords));
      mapa.invalidateSize();
      if (!caja.isValid()) return;
      if (giro == null) { mapa.fitBounds(caja, { paddingTopLeft: [28, 28 + margenes.arriba], paddingBottomRight: [28, 28 + margenes.abajo], animate: false }); return; }
      encuadrarGirado(caja);
    }

    /* Mapa girado: el contenedor se agranda hasta la diagonal de su caja (para que no se vean las esquinas)
       y se rota −giro. Para encuadrar, los puntos de la ruta se llevan a la pantalla (rotados) y se ajustan
       zoom y centro hasta que la letra entra entre los márgenes. */
    function orientar(nuevo) {
      giro = nuevo == null ? null : nuevo;
      const el = mapa.getContainer(), caja = el.parentElement;
      if (giro == null) {
        el.classList.remove('mapa--girado'); el.style.cssText = '';
        if (interactivo) { mapa.dragging.enable(); mapa.touchZoom.enable(); mapa.doubleClickZoom.enable(); mapa.scrollWheelZoom.enable(); }
      } else {
        const W = caja.clientWidth, H = caja.clientHeight, D = Math.ceil(Math.hypot(W, H)) + 4;
        el.classList.add('mapa--girado');
        Object.assign(el.style, { position: 'absolute', right: 'auto', bottom: 'auto', width: D + 'px', height: D + 'px', left: (W - D) / 2 + 'px', top: (H - D) / 2 + 'px', transform: `rotate(${-giro}rad)` });
        mapa.dragging.disable(); mapa.touchZoom.disable(); mapa.doubleClickZoom.disable(); mapa.scrollWheelZoom.disable();
      }
      mapa.invalidateSize();
    }
    // De un punto del contenedor (px) a la pantalla, relativo al centro: rotación de −giro (en pantalla, y hacia abajo)
    const aPantalla = (p, c) => { const x = p.x - c.x, y = p.y - c.y, a = -giro; return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }; };
    function encuadrarGirado(caja) {
      const el = mapa.getContainer(), visible = el.parentElement, W = visible.clientWidth, H = visible.clientHeight;
      const puntos = rutas.flatMap(r => r.coords);
      const borde = Math.min(24, W * 0.08), libreW = W - 2 * borde, libreH = H - margenes.arriba - margenes.abajo - 2 * borde;
      mapa.setView(caja.getCenter(), mapa.getZoom() || 14, { animate: false });
      for (let vuelta = 0; vuelta < 3; vuelta++) {
        const c = mapa.getSize().divideBy(2), pts = puntos.map(q => aPantalla(mapa.latLngToContainerPoint(q), c));
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const bw = Math.max(...xs) - Math.min(...xs) || 1, bh = Math.max(...ys) - Math.min(...ys) || 1;
        const zoom = Math.min(18, mapa.getZoom() + Math.log2(Math.min(libreW / bw, libreH / bh)));
        // centro de la letra en pantalla → hay que llevarlo al centro del espacio libre
        const ox = (Math.max(...xs) + Math.min(...xs)) / 2, oy = (Math.max(...ys) + Math.min(...ys)) / 2 - (margenes.arriba - margenes.abajo) / 2;
        // vector de pantalla → contenedor: rotación de +giro
        const a = giro, px = ox * Math.cos(a) - oy * Math.sin(a), py = ox * Math.sin(a) + oy * Math.cos(a);
        const nuevoCentro = mapa.containerPointToLatLng(c.add([px, py]));
        mapa.setView(nuevoCentro, zoom, { animate: false });
      }
    }
    function elegir(i, desdeElMapa = false) {
      if (i === elegida) { if (desdeElMapa) alElegir(i); return; }
      elegida = i; dibujar();
      if (desdeElMapa) alElegir(i);
    }
    function mostrarUno(ruta, { circular, polen = false } = {}) {
      rutas = [ruta]; elegida = 0;
      marcadores(ruta.coords[0], circular ? null : ruta.coords[ruta.coords.length - 1]);
      dibujar({ polen }); encuadrar();
    }
    function ponerMargenes(m) { margenes = { ...margenes, ...m }; }

    // Punto del runner (simulación): se mueve a la fracción f (0–1) del recorrido.
    function moverCorredor(f) {
      const r = rutas[elegida]; if (!r) return;
      const c = r.coords, idx = Math.min(c.length - 1, Math.floor(f * (c.length - 1)));
      if (!corredor) corredor = L.marker(c[idx], { icon: icono('marcador--runner', 18), interactive: false, keyboard: false, zIndexOffset: 2000 }).addTo(mapa);
      else corredor.setLatLng(c[idx]);
    }
    function quitarCorredor() { if (corredor) { corredor.remove(); corredor = null; } }

    return { mostrarRecorridos, mostrarUno, elegir, encuadrar, ponerMargenes, moverCorredor, quitarCorredor, orientar, leaflet: mapa };
  }

  // Mapa chiquito de una tarjeta del challenge: la letra derecha sobre el mapa real (sin tocar)
  function miniatura(elemento, ruta, giro) {
    const m = crear(elemento, { interactivo: false, atribucion: false, estilo: 'letra' });
    m.ponerMargenes({ arriba: 6, abajo: 6 });
    m.orientar(giro);
    m.mostrarUno(ruta, { circular: true });   // solo el punto de inicio, como en el frame 05c
    return m;
  }

  globalThis.RespiraMapa = { crear, miniatura, capaBase };
})();
