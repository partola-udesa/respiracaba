/* =====================================================================
   RESPIRA — Mapa interactivo (Leaflet + OpenStreetMap)
   Dibuja las tres opciones de recorrido. Tocar una línea o su etiqueta la
   elige (y avisa a la lista de abajo con alElegir). La opción elegida se
   pinta tramo por tramo según su índice de respirabilidad.
   Uso:
     const mapa = RespiraMapa.crear(elemento);
     mapa.mostrarRecorridos(opciones, { alElegir: i => … });
     mapa.elegir(1);
   ===================================================================== */
(function () {
  const COLOR = { activo: '#1F5B2D', inactivo: '#9AA096', borde: '#FFFDF8', niveles: ['#C9894B', '#A9B65A', '#2E7A3E'] };
  const TESELAS = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';   // mapa base claro (CARTO, datos de OpenStreetMap)
  const ATRIBUCION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';

  function crear(elemento, { interactivo = true } = {}) {
    const mapa = L.map(elemento, {
      zoomControl: interactivo, attributionControl: true, dragging: interactivo, scrollWheelZoom: interactivo,
      doubleClickZoom: interactivo, touchZoom: interactivo, boxZoom: false, keyboard: interactivo
    }).setView([-34.61, -58.44], 12);
    L.tileLayer(TESELAS, { attribution: ATRIBUCION, subdomains: 'abcd', maxZoom: 19 }).addTo(mapa);
    mapa.attributionControl.setPrefix(false);
    let capas = [], extras = L.layerGroup().addTo(mapa), rutas = [], elegida = -1, alElegir = () => {};

    function marcadores(coordsInicio, coordsFin) {
      extras.clearLayers();
      const icono = clase => L.divIcon({ className: '', html: `<div class="marcador ${clase}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker(coordsInicio, { icon: icono(''), interactive: false, keyboard: false }).addTo(extras);
      if (coordsFin) L.marker(coordsFin, { icon: icono('marcador--llegada'), interactive: false, keyboard: false }).addTo(extras);
    }

    function dibujar() {
      capas.forEach(c => c.remove());
      capas = rutas.map((r, i) => {
        const g = L.featureGroup();
        const activa = i === elegida;
        if (activa) {
          L.polyline(r.coords, { color: COLOR.borde, weight: 10, opacity: 1, interactive: false }).addTo(g);
          r.tramos.forEach(t => L.polyline(t.coords, { color: COLOR.niveles[t.nivel], weight: 6, opacity: 1, lineJoin: 'round', interactive: false }).addTo(g));
        } else {
          L.polyline(r.coords, { color: COLOR.inactivo, weight: 5, opacity: 0.85, dashArray: null, interactive: false }).addTo(g);
        }
        if (interactivo) {
          // Línea invisible y ancha para que sea fácil tocarla con el dedo
          const toque = L.polyline(r.coords, { color: '#000', weight: 24, opacity: 0.001 }).addTo(g);
          toque.on('click', () => elegir(i, true));
          const medio = r.coords[Math.floor(r.coords.length * (0.3 + 0.2 * i))];
          const etiqueta = L.marker(medio, { keyboard: false, title: `Recorrido ${i + 1}`, zIndexOffset: activa ? 1000 : 0,
            icon: L.divIcon({ className: '', html: `<div class="etiqueta-ruta${activa ? ' etiqueta-ruta--activa' : ''}">${i + 1}</div>`, iconSize: [26, 24], iconAnchor: [13, 12] }) });
          etiqueta.on('click', () => elegir(i, true));
          g.addLayer(etiqueta);
        }
        g.addTo(mapa);
        return g;
      });
      if (capas[elegida]) capas[elegida].bringToFront();
    }

    function mostrarRecorridos(lista, opciones = {}) {
      rutas = lista; elegida = opciones.elegida ?? 0; alElegir = opciones.alElegir || alElegir;
      const primera = lista[0].coords, ultima = primera[primera.length - 1];
      marcadores(primera[0], opciones.circular ? null : ultima);
      dibujar();
      encuadrar();
    }
    function encuadrar() {
      const caja = L.latLngBounds(rutas.flatMap(r => r.coords));
      mapa.invalidateSize();
      if (caja.isValid()) mapa.fitBounds(caja, { padding: [24, 24] });
    }
    function elegir(i, desdeElMapa = false) {
      if (i === elegida && !desdeElMapa) return;
      elegida = i; dibujar();
      if (desdeElMapa) alElegir(i);
    }
    function mostrarUno(ruta, { circular } = {}) {
      rutas = [ruta]; elegida = 0;
      marcadores(ruta.coords[0], circular ? null : ruta.coords[ruta.coords.length - 1]);
      dibujar(); encuadrar();
    }
    return { mostrarRecorridos, mostrarUno, elegir, encuadrar, leaflet: mapa };
  }

  globalThis.RespiraMapa = { crear };
})();
