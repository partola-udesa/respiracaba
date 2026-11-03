/* =====================================================================
   RESPIRA — Mapa interactivo (Leaflet + mapa base gris claro de Esri)
   - mostrarRecorridos: las tres opciones. Tocar una línea o su etiqueta la elige
     (y avisa a la lista con alElegir). La elegida va en el color de acento, con
     brillo y animación de dibujo; las otras quedan grises.
   - mostrarUno: un solo recorrido (detalle, corrida, completado). Si hay tramos
     con mucho polen para el runner, se marcan encima.
   - corredor: un punto que avanza sobre la ruta (simulación de "En recorrido").
   Uso:
     const mapa = RespiraMapa.crear(elemento, { interactivo, margenAbajo });
     mapa.mostrarRecorridos(opciones, { alElegir: i => … });
     mapa.elegir(1);
   ===================================================================== */
(function () {
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function crear(elemento, { interactivo = true, margenAbajo = 0, margenArriba = 0 } = {}) {
    const mapa = L.map(elemento, {
      zoomControl: false, attributionControl: true, dragging: interactivo, scrollWheelZoom: interactivo,
      doubleClickZoom: interactivo, touchZoom: interactivo, boxZoom: false, keyboard: interactivo, zoomSnap: 0.25
    }).setView([-34.61, -58.44], 12);
    L.tileLayer(CONFIG.teselas, { attribution: CONFIG.atribucion, maxNativeZoom: CONFIG.teselasZoomMax, maxZoom: 19 }).addTo(mapa);
    mapa.attributionControl.setPrefix(false);
    let capas = [], extras = L.layerGroup().addTo(mapa), rutas = [], elegida = -1, alElegir = () => {}, corredor = null;
    let margenes = { abajo: margenAbajo, arriba: margenArriba };

    const icono = (clase, tam = 16) => L.divIcon({ className: '', html: `<div class="marcador ${clase}"></div>`, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] });
    function marcadores(inicio, fin) {
      extras.clearLayers();
      L.marker(inicio, { icon: icono(''), interactive: false, keyboard: false }).addTo(extras);
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
      const acento = css('--acento'), gris = css('--ruta-inactiva'), peligro = css('--peligro');
      // Primero las no elegidas (quedan abajo), después la elegida.
      const orden = rutas.map((_, i) => i).sort((a, b) => (a === elegida) - (b === elegida));
      capas = [];
      for (const i of orden) {
        const r = rutas[i], g = L.featureGroup(), activa = i === elegida;
        if (activa) {
          L.polyline(r.coords, { color: acento, weight: 14, opacity: 0.3, className: 'ruta-brillo', interactive: false }).addTo(g);
          const linea = L.polyline(r.coords, { color: acento, weight: 4.5, opacity: 1, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(g);
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
      if (caja.isValid()) mapa.fitBounds(caja, { paddingTopLeft: [28, 28 + margenes.arriba], paddingBottomRight: [28, 28 + margenes.abajo], animate: false });
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

    return { mostrarRecorridos, mostrarUno, elegir, encuadrar, ponerMargenes, moverCorredor, quitarCorredor, leaflet: mapa };
  }

  globalThis.RespiraMapa = { crear };
})();
