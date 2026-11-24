/* =====================================================================
   RESPIRA — Armado de recorridos sobre la red de calles con índice por tramo
   1. Carga app/datos/red.json (la red peatonal de CABA cortada en tramos de
      esquina a esquina, con un puntaje 0–100 por condición en cada tramo).
   2. Con las condiciones elegidas calcula cuánto "cuesta" correr por cada tramo:
      un tramo con mal puntaje cuesta como si fuera más largo.
   3. Busca el camino de menor costo (algoritmo de Dijkstra) y arma tres opciones
      distintas. Devuelve para cada una el largo, el índice y los datos duros.
   4. ALERGIAS: si el runner marcó plátano, fresno o ligustro, cada tramo suma un
      "riesgo de polen" según los árboles de esa especie que tiene al lado, los que
      quedan del lado de donde viene el viento (pronóstico por hora) y la época del
      año (ESTACION_POLEN en datos.js). Un tramo con mucho riesgo cuesta más.
   Uso: const opciones = await RespiraRed.armarRecorridos({ desde, hasta, circular, km, factores, pesos, nocturno, alergias, fecha, viento });
   ===================================================================== */
(function () {
  const URL_RED = 'datos/red.js';     // define window.RESPIRA_RED (se carga con <script> para que funcione también sin servidor)
  const URL_CAPAS = 'datos/capas.js'; // define window.RESPIRA_CAPAS: polen por tramo (también trae agua, que ya no se usa)
  const FACTORES = ['vegetacion', 'aire', 'ruido', 'transito', 'sombra', 'terreno', 'luz'];
  const SECTORES = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  let red = null, cargando = null;

  /* ---------- 1. Cargar la red y preparar las estructuras ---------- */
  function cargar() {
    if (red) return Promise.resolve(red);
    if (cargando) return cargando;
    cargando = Promise.all([cargarScript(URL_RED, 'RESPIRA_RED'), cargarScript(URL_CAPAS, 'RESPIRA_CAPAS')]).then(([j, capas]) => {
      const E = j.escala_coordenadas, t = j.tramos;
      const nN = j.nodos.lon.length, nT = t.a.length;
      const lon = Float64Array.from(j.nodos.lon, v => v / E), lat = Float64Array.from(j.nodos.lat, v => v / E);
      // Lista de tramos que salen de cada esquina (formato "CSR": compacto y rápido)
      const grado = new Int32Array(nN + 1);
      for (let i = 0; i < nT; i++) { grado[t.a[i] + 1]++; grado[t.b[i] + 1]++; }
      for (let i = 0; i < nN; i++) grado[i + 1] += grado[i];
      const vecinoTramo = new Int32Array(2 * nT), lleno = grado.slice(0, nN);
      for (let i = 0; i < nT; i++) { vecinoTramo[lleno[t.a[i]]++] = i; vecinoTramo[lleno[t.b[i]]++] = i; }
      // Grilla de esquinas para encontrar la más cercana a un punto
      const celdas = new Map(), C = 0.004;
      for (let i = 0; i < nN; i++) {
        const k = Math.floor(lon[i] / C) + ',' + Math.floor(lat[i] / C);
        if (!celdas.has(k)) celdas.set(k, []);
        celdas.get(k).push(i);
      }
      const u8 = k => Uint8Array.from(t[k]);
      red = {
        lon, lat, a: Int32Array.from(t.a), b: Int32Array.from(t.b), largo: Float32Array.from(t.largo, v => Math.max(v, 1)),
        geo: t.geo, nombre: Int32Array.from(t.nombre), nombres: j.nombres, grado, vecinoTramo, celdas, C,
        indice: u8('indice'), vegetacion: u8('vegetacion'), aire: u8('aire'), ruido_dia: u8('ruido_dia'), ruido_noche: u8('ruido_noche'),
        transito: u8('transito'), sombra: u8('sombra'), terreno: u8('terreno'), luz: u8('luz'),
        arboles_100m: Float32Array.from(t.arboles_100m), db_dia: Uint8Array.from(t.db_dia), no2: Uint16Array.from(t.no2),
        fuentes: { ...j.fuentes, ...capas.fuentes }, nN, nT,
        // capas.js: un carácter en base 36 por número (0-9, a-z)
        polen: Object.fromEntries(Object.entries(capas.polen).map(([k, v]) => [k, { cerca: base36(v.cerca), sectores: base36(v.sectores), tope: v.tope_100m || 10 }]))
      };
      if (capas.tramos !== nT) console.warn('capas.js no coincide con red.js: volvé a correr codigo/construir_capas_alergias_agua.py');
      delete globalThis.RESPIRA_RED; delete globalThis.RESPIRA_CAPAS;   // ya se copió a estructuras compactas: se libera la memoria
      return red;
    });
    cargando.catch(() => { cargando = null; });
    return cargando;
  }

  function base36(texto) {
    const v = new Uint8Array(texto.length);
    for (let i = 0; i < texto.length; i++) { const c = texto.charCodeAt(i); v[i] = c <= 57 ? c - 48 : c - 87; }
    return v;
  }

  function cargarScript(src, variable) {
    if (globalThis[variable]) return Promise.resolve(globalThis[variable]);
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => globalThis[variable] ? ok(globalThis[variable]) : mal(new Error('No se pudo leer la red de calles.'));
      s.onerror = () => mal(new Error('No se pudo cargar la red de calles.'));
      document.head.appendChild(s);
    });
  }

  // Distancia aproximada en metros entre dos puntos (alcanza para una ciudad)
  function metros(lon1, lat1, lon2, lat2) {
    const x = (lon2 - lon1) * 111320 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180), y = (lat2 - lat1) * 110540;
    return Math.hypot(x, y);
  }

  function esquinaCercana(lon, lat) {
    const { celdas, C } = red;
    const cx = Math.floor(lon / C), cy = Math.floor(lat / C);
    let mejor = -1, dMejor = Infinity;
    for (let r = 0; r <= 3 && mejor < 0; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        for (const i of celdas.get((cx + dx) + ',' + (cy + dy)) || []) {
          const d = metros(lon, lat, red.lon[i], red.lat[i]);
          if (d < dMejor) { dMejor = d; mejor = i; }
        }
      }
    }
    return { nodo: mejor, distancia: dMejor };
  }

  /* ---------- 2. Puntaje según las preferencias y costo de cada tramo ---------- */
  // Promedio de los factores elegidos, ponderado por lo que la app aprendió del runner (pesos: 1 = normal;
  // más alto = una preferencia que en corridas anteriores no se cumplió y ahora hay que cuidar más).
  function puntajePreferencias(factores, nocturno, pesos = {}) {
    const p = new Float32Array(red.nT);
    const usados = factores.map(f => ({ arr: f === 'ruido' ? red[nocturno ? 'ruido_noche' : 'ruido_dia'] : red[f], w: pesos[f] ?? 1 })).filter(u => u.arr);
    if (!usados.length) { p.set(red.indice); return p; }
    const total = usados.reduce((t, u) => t + u.w, 0);
    for (let i = 0; i < red.nT; i++) {
      let s = 0;
      for (const u of usados) s += u.arr[i] * u.w;
      p[i] = s / total;
    }
    return p;
  }

  /* ---------- 2b. Riesgo de polen por tramo (0 = nada, 100 = mucho) ----------
     Para cada especie marcada en el perfil:
       árboles equivalentes = árboles al lado del tramo (≤ 25 m)
                            + arrastre del viento × árboles del lado de donde viene el viento (25–120 m)
     y eso se multiplica por la época del año (ESTACION_POLEN). Se pasa a "cada 100 m" para que
     un tramo largo no parezca peor solo por ser largo. Escala por especie: 100 = lo que tiene el 5 % de
     los tramos más cargados de esa especie (tope_100m en capas.js), porque el fresno está en casi todas
     las cuadras y el ligustro en pocas. Si marcás varias especies, se suman. */
  function riesgoPolen(alergias, fecha, viento) {
    const especies = (alergias || []).filter(a => red.polen[a]);
    const mes = (fecha || new Date()).getMonth();
    const activas = especies.map(a => ({ a, estacion: ESTACION_POLEN[a][mes] })).filter(x => x.estacion > 0);
    if (!activas.length) return null;
    // Viento: de qué sector viene y cuánto arrastra (sin viento, el polen queda cerca del árbol).
    const hayViento = viento && Number.isFinite(viento.direccion) && Number.isFinite(viento.kmh);
    const s = hayViento ? Math.round(viento.direccion / 45) % 8 : -1;
    const arrastre = hayViento ? Math.min(1, viento.kmh / 20) : 0;
    const r = new Float32Array(red.nT);
    for (const { a, estacion } of activas) {
      const { cerca, sectores, tope } = red.polen[a];
      for (let i = 0; i < red.nT; i++) {
        let lejos;
        if (s >= 0) lejos = sectores[i * 8 + s] + 0.5 * (sectores[i * 8 + (s + 1) % 8] + sectores[i * 8 + (s + 7) % 8]);
        else { lejos = 0; for (let k = 0; k < 8; k++) lejos += sectores[i * 8 + k]; lejos *= 0.1; }   // sin dato de viento: un poco de todo
        const equivalentes = cerca[i] + (hayViento ? 0.6 * arrastre : 1) * lejos;
        r[i] += estacion * equivalentes * 100 / Math.max(red.largo[i], 30) / tope * 100;
      }
    }
    for (let i = 0; i < red.nT; i++) r[i] = Math.min(100, r[i]);
    return { r, activas, viento: hayViento ? { ...viento, desde: SECTORES[s] } : null, mes };
  }

  /* ---------- 3. Dijkstra: el camino de menor costo entre dos esquinas ---------- */
  function camino(desde, hasta, costo) {
    const n = red.nN, dist = new Float64Array(n).fill(Infinity), previo = new Int32Array(n).fill(-1);
    const heap = new MonticuloMinimo();
    dist[desde] = 0; heap.push(desde, 0);
    while (heap.size) {
      const [u, d] = heap.pop();
      if (u === hasta) break;
      if (d > dist[u]) continue;
      for (let k = red.grado[u]; k < red.grado[u + 1]; k++) {
        const e = red.vecinoTramo[k], v = red.a[e] === u ? red.b[e] : red.a[e];
        const nd = d + costo[e];
        if (nd < dist[v]) { dist[v] = nd; previo[v] = e; heap.push(v, nd); }
      }
    }
    if (desde !== hasta && previo[hasta] < 0) return null;
    const pasos = [];   // [{ tramo, alReves }]
    for (let v = hasta; v !== desde;) {
      const e = previo[v], alReves = red.a[e] === v;   // si llegamos al nodo "a", el tramo se recorrió de b → a
      pasos.push({ tramo: e, alReves });
      v = alReves ? red.b[e] : red.a[e];
    }
    return pasos.reverse();
  }

  class MonticuloMinimo {
    constructor() { this.n = []; this.p = []; }
    get size() { return this.n.length; }
    push(nodo, prioridad) {
      const n = this.n, p = this.p; let i = n.length; n.push(nodo); p.push(prioridad);
      while (i > 0) { const j = (i - 1) >> 1; if (p[j] <= p[i]) break; [n[i], n[j]] = [n[j], n[i]]; [p[i], p[j]] = [p[j], p[i]]; i = j; }
    }
    pop() {
      const n = this.n, p = this.p, top = [n[0], p[0]], ln = n.pop(), lp = p.pop();
      if (n.length) {
        n[0] = ln; p[0] = lp; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < n.length && p[l] < p[m]) m = l;
          if (r < n.length && p[r] < p[m]) m = r;
          if (m === i) break;
          [n[i], n[m]] = [n[m], n[i]]; [p[i], p[m]] = [p[m], p[i]]; i = m;
        }
      }
      return top;
    }
  }

  // Costo de cada tramo: más largo si tiene mal puntaje en lo que elegiste y, si tenés alergia,
  // si tiene riesgo de polen. polenActual lo arma armarRecorridos antes de buscar.
  let polenActual = null;
  const LAMBDA_POLEN = 3;
  function costos(pref, lambda, penal) {
    const c = new Float32Array(red.nT), pol = polenActual && polenActual.r;
    for (let i = 0; i < red.nT; i++) {
      c[i] = red.largo[i] * (1 + lambda * (100 - pref[i]) / 100) * (penal ? penal[i] : 1);
      if (pol) c[i] *= 1 + LAMBDA_POLEN * pol[i] / 100;
    }
    return c;
  }
  function penalizar(penal, pasos, factor) { for (const p of pasos) penal[p.tramo] *= factor; }

  // Un recorrido por varios puntos (A → V1 → V2 → B). Los tramos ya usados se penalizan para no volver por la misma calle.
  function porPuntos(puntos, pref, lambda, penalBase) {
    const penal = penalBase ? Float32Array.from(penalBase) : new Float32Array(red.nT).fill(1);
    let pasos = [];
    for (let i = 0; i < puntos.length - 1; i++) {
      const tramo = camino(puntos[i], puntos[i + 1], costos(pref, lambda, penal));
      if (!tramo) return null;
      penalizar(penal, tramo, 4);
      pasos = pasos.concat(tramo);
    }
    return pasos;
  }

  // Punto de la red a cierta distancia y rumbo desde una esquina
  function puntoA(nodo, distancia, anguloGrados) {
    const ang = anguloGrados * Math.PI / 180;
    const lon = red.lon[nodo] + distancia * Math.sin(ang) / (111320 * Math.cos(red.lat[nodo] * Math.PI / 180));
    const lat = red.lat[nodo] + distancia * Math.cos(ang) / 110540;
    return esquinaCercana(lon, lat).nodo;
  }
  function rumbo(n1, n2) {
    const x = (red.lon[n2] - red.lon[n1]) * Math.cos(red.lat[n1] * Math.PI / 180), y = red.lat[n2] - red.lat[n1];
    return Math.atan2(x, y) * 180 / Math.PI;
  }

  /* ---------- 4. Las tres opciones ---------- */
  async function armarRecorridos({ desde, hasta, circular, km, factores, pesos = {}, nocturno = false, alergias = [], fecha = new Date(), viento = null }) {
    await cargar();
    polenActual = riesgoPolen(alergias, fecha, viento);
    const A = esquinaCercana(desde.lon, desde.lat);
    if (A.distancia > 500) throw new Error('El punto de partida está lejos de las calles de la Ciudad.');
    const B = circular ? A : esquinaCercana(hasta.lon, hasta.lat);
    if (B.distancia > 500) throw new Error('El punto de llegada está lejos de las calles de la Ciudad.');
    const pref = puntajePreferencias(factores, nocturno, pesos);
    const objetivo = km ? km * 1000 : null;
    const listas = [];

    if (circular) {
      // Vuelta en triángulo: A → V1 → V2 → A. Tres direcciones distintas.
      const meta = objetivo || 5000;
      for (const base of [0, 120, 240]) {
        // Se prueba un triángulo y, si quedó muy largo o muy corto (por el río, las vías o un parque), se ajusta el tamaño.
        let mejor = null;
        for (const giro of [0, 35, -35]) {               // si en esa dirección no se puede (río, vías), se gira un poco
          let d = meta / 4.1;
          for (let intento = 0; intento < 4; intento++) {
            const v1 = puntoA(A.nodo, d, base + giro - 40), v2 = puntoA(A.nodo, d, base + giro + 40);
            const p = porPuntos([A.nodo, v1, v2, A.nodo], pref, 2.5);
            if (!p) break;
            const largo = p.reduce((s, x) => s + red.largo[x.tramo], 0);
            if (!mejor || Math.abs(largo - meta) < Math.abs(mejor.largo - meta)) mejor = { p, largo };
            if (Math.abs(largo - meta) / meta < 0.12) break;
            d *= meta / largo;
          }
          if (mejor && Math.abs(mejor.largo - meta) / meta < 0.15) break;
        }
        if (mejor) listas.push(mejor.p);
      }
    } else {
      const directo = camino(A.nodo, B.nodo, costos(pref, 0));
      if (!directo) throw new Error('No encontramos un camino entre esos dos puntos.');
      const largoDirecto = directo.reduce((s, p) => s + red.largo[p.tramo], 0);
      if (objetivo && objetivo > largoDirecto * 1.3) {
        // Hay que dar una vuelta para llegar a los km pedidos: se pasa por un punto al costado del camino directo.
        const r = rumbo(A.nodo, B.nodo), mitad = largoDirecto / 2;
        const desvio = Math.sqrt(Math.max(0, (objetivo / 2.5) ** 2 - mitad ** 2));
        // Tres desvíos: a la izquierda, a la derecha y uno más corto a la derecha.
        for (const [lado, cuanto] of [[-1, 1], [1, 1], [1, 0.55]]) {
          const d = desvio * cuanto, lejos = Math.hypot(mitad, d), ang = Math.atan2(d, mitad) * 180 / Math.PI;
          const p = porPuntos([A.nodo, puntoA(A.nodo, lejos, r + lado * ang), B.nodo], pref, cuanto === 1 ? 2.5 : 1);
          if (p) listas.push(p);
        }
      } else {
        const penal = new Float32Array(red.nT).fill(1);
        const r1 = camino(A.nodo, B.nodo, costos(pref, 3));          // el que más respeta las preferencias
        penalizar(penal, r1, 1.8);
        const r2 = camino(A.nodo, B.nodo, costos(pref, 1.2, penal)); // equilibrado
        penalizar(penal, r2, 1.5);
        const r3 = camino(A.nodo, B.nodo, costos(pref, 0.3, penal)); // casi el más corto
        listas.push(r1, r2, r3);
      }
    }
    return listas.filter(Boolean).map(p => describir(p, pref, nocturno, polenActual));
  }

  /* Km del camino más corto por las calles entre dos puntos (v11: distancia automática en "Definí tu recorrido") */
  async function distanciaDirecta(desde, hasta) {
    await cargar();
    const A = esquinaCercana(desde.lon, desde.lat), B = esquinaCercana(hasta.lon, hasta.lat);
    if (A.distancia > 500 || B.distancia > 500) throw new Error('Uno de los puntos está lejos de las calles de la Ciudad.');
    const pol = polenActual; polenActual = null;   // el más corto de verdad, sin el desvío por polen
    const c = camino(A.nodo, B.nodo, costos(new Float32Array(red.nT), 0));
    polenActual = pol;
    if (!c) throw new Error('No encontramos un camino entre esos dos puntos.');
    return c.reduce((s, p) => s + red.largo[p.tramo], 0);
  }

  /* ---------- v13 · RESPIRA CHALLENGE: una letra dibujada con calles, en toda la Ciudad ----------
     trazos: lista de trazos; cada trazo es una lista de vértices [x, y] entre 0 y 1 (0,0 = abajo a la izquierda).
     1. DÓNDE: se prueban lugares en una grilla cada ~650 m dentro de CABA (o cada ~300 m alrededor de un punto,
        si el runner eligió una zona). En cada lugar la letra se gira para seguir la grilla de calles; si la letra
        tiene diagonales, también se prueba girada 45°. Primero una pasada rápida con un tamaño y después se
        afinan los mejores lugares con otro tamaño.
     2. CÓMO: cada vértice va a la esquina más cercana y cada trazo se recorre por un "corredor": un tramo cuesta
        más cuanto más se aleja de la línea ideal del trazo (así la letra no se deforma) y un poco más si tiene
        mal puntaje en las condiciones elegidas. Entre un trazo y el siguiente también se corre ("enlace").
     3. CUÁL: a cada intento se le mide cuánto se aleja de la letra ideal (promedio en las dos direcciones:
        del recorrido a la letra y de la letra al recorrido), en proporción al alto de la letra. Entre los que se
        leen casi igual de bien (hasta 8 % más de error que el mejor) gana el de mejor puntaje en las condiciones.
     Todo es cálculo de la app sobre la red de calles y los datasets; la IA no participa. */
  const CORREDOR_K = 4;          // cuánto castiga alejarse de la línea del trazo
  let buf = null;                 // memoria que se reutiliza en las miles de búsquedas cortas
  function memoria() {
    if (!buf) buf = { dist: new Float64Array(red.nN).fill(Infinity), previo: new Int32Array(red.nN).fill(-1), tocados: [],
      costo: new Float32Array(red.nT).fill(Infinity), marca: new Int32Array(red.nT), ronda: 0 };
    return buf;
  }
  // Dijkstra que solo pisa los tramos con costo finito (el corredor) y deja la memoria limpia al terminar
  function caminoCorto(desde, hasta, costo) {
    const m = memoria(), { dist, previo, tocados } = m, heap = new MonticuloMinimo();
    dist[desde] = 0; tocados.push(desde); heap.push(desde, 0);
    while (heap.size) {
      const [u, d] = heap.pop();
      if (u === hasta) break;
      if (d > dist[u]) continue;
      for (let k = red.grado[u]; k < red.grado[u + 1]; k++) {
        const e = red.vecinoTramo[k], c = costo[e];
        if (c === Infinity) continue;
        const v = red.a[e] === u ? red.b[e] : red.a[e], nd = d + c;
        if (nd < dist[v]) { if (dist[v] === Infinity) tocados.push(v); dist[v] = nd; previo[v] = e; heap.push(v, nd); }
      }
    }
    let pasos = null;
    if (desde === hasta) pasos = [];
    else if (previo[hasta] >= 0) {
      pasos = [];
      for (let v = hasta; v !== desde;) { const e = previo[v], alReves = red.a[e] === v; pasos.push({ tramo: e, alReves }); v = alReves ? red.b[e] : red.a[e]; }
      pasos.reverse();
    }
    for (const v of tocados) { dist[v] = Infinity; previo[v] = -1; }
    tocados.length = 0;
    return pasos;
  }

  // Marco local de un lugar: metros al este (x) y al norte (y) desde el centro
  function marco(cLon, cLat) {
    const kx = 111320 * Math.cos(cLat * Math.PI / 180), ky = 110540;
    return { kx, ky, x: lon => (lon - cLon) * kx, y: lat => (lat - cLat) * ky, lon: x => cLon + x / kx, lat: y => cLat + y / ky };
  }
  // Tramos con algún extremo dentro de una caja (en lon/lat), usando la grilla de esquinas
  function tramosEnCaja(lon0, lat0, lon1, lat1, fn) {
    const { celdas, C } = red, m = memoria(), ronda = ++m.ronda;
    for (let cx = Math.floor(lon0 / C); cx <= Math.floor(lon1 / C); cx++) for (let cy = Math.floor(lat0 / C); cy <= Math.floor(lat1 / C); cy++) {
      for (const n of celdas.get(cx + ',' + cy) || []) for (let k = red.grado[n]; k < red.grado[n + 1]; k++) {
        const e = red.vecinoTramo[k];
        if (m.marca[e] !== ronda) { m.marca[e] = ronda; fn(e); }
      }
    }
  }
  // Rumbo de la grilla de calles alrededor de una esquina (0–90° → −45…45°), con los tramos a menos de 450 m
  function rumboLocal(nodo) {
    const cajas = new Float32Array(18), lon = red.lon[nodo], lat = red.lat[nodo], d = 0.0045;
    tramosEnCaja(lon - d, lat - d, lon + d, lat + d, e => {
      const g = ((rumbo(red.a[e], red.b[e]) % 90) + 90) % 90;
      cajas[Math.floor(g / 5) % 18] += red.largo[e];
    });
    let mejor = 0; cajas.forEach((v, i) => { if (v > cajas[mejor]) mejor = i; });
    const g = mejor * 5 + 2.5;
    return g > 45 ? g - 90 : g;
  }
  const distSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };

  // Un intento: la letra en un lugar, con un giro y un alto. Devuelve los pasos y el error de forma (o null).
  function intentarLetra(trazos, cLon, cLat, giro, alto, proporcion, pref, lambda) {
    const M = marco(cLon, cLat), ancho = alto * proporcion, cos = Math.cos(giro), sin = Math.sin(giro);
    const aXY = ([x, y]) => { const dx = (x - 0.5) * ancho, dy = (y - 0.5) * alto; return [dx * cos + dy * sin, -dx * sin + dy * cos]; };
    // Las 4 esquinas de la letra tienen que caer dentro de la Ciudad
    for (const q of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const [x, y] = aXY(q); if (!dentroDeCABA(M.lon(x), M.lat(y))) return null; }
    const tau = Math.max(30, alto * 0.08), margen = tau * 3.2, mem = memoria(), costo = mem.costo;
    const nodoDe = xy => { const c = esquinaCercana(M.lon(xy[0]), M.lat(xy[1])); return c.distancia > tau * 2.2 ? -1 : c.nodo; };
    // Recorre un segmento ideal (a → b, en metros) por su corredor; devuelve los pasos o null
    function corredor(nA, nB, a, b, tol) {
      const mg = tol * 3.2, lons = [M.lon(Math.min(a[0], b[0]) - mg), M.lon(Math.max(a[0], b[0]) + mg)], lats = [M.lat(Math.min(a[1], b[1]) - mg), M.lat(Math.max(a[1], b[1]) + mg)];
      const usados = [];
      tramosEnCaja(lons[0], lats[0], lons[1], lats[1], e => {
        const ia = red.a[e], ib = red.b[e];
        const mx = M.x((red.lon[ia] + red.lon[ib]) / 2), my = M.y((red.lat[ia] + red.lat[ib]) / 2);
        const d = distSeg(mx, my, a[0], a[1], b[0], b[1]);
        if (d > mg) return;
        costo[e] = red.largo[e] * (1 + CORREDOR_K * (d / tol) ** 2) * (1 + lambda * (100 - pref[e]) / 100);
        usados.push(e);
      });
      const pasos = caminoCorto(nA, nB, costo);
      for (const e of usados) costo[e] = Infinity;
      return pasos;
    }
    let pasos = [], actual = -1, actualXY = null, error = 0, largoIdeal = 0, enlaces = 0;
    const hechos = new Map();   // "a>b" → pasos: si un trazo vuelve por donde vino (la barra de la E), usa las mismas calles
    for (const trazo of trazos) {
      const pts = trazo.map(aXY), nodos = pts.map(nodoDe);
      if (nodos.includes(-1)) return null;
      if (actual >= 0 && actual !== nodos[0]) {
        const enlace = corredor(actual, nodos[0], actualXY, pts[0], tau * 2.5);
        if (!enlace) return null;
        enlaces += enlace.reduce((s, p) => s + red.largo[p.tramo], 0);
        pasos = pasos.concat(enlace);
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], ida = hechos.get(nodos[i + 1] + '>' + nodos[i]);
        const tramo = nodos[i] === nodos[i + 1] ? [] : ida ? ida.map(p => ({ tramo: p.tramo, alReves: !p.alReves })).reverse() : corredor(nodos[i], nodos[i + 1], a, b, tau);
        if (!tramo) return null;
        hechos.set(nodos[i] + '>' + nodos[i + 1], tramo);
        // Error de forma de este segmento: del recorrido a la línea ideal y de la línea ideal al recorrido
        const xy = [[M.x(red.lon[nodos[i]]), M.y(red.lat[nodos[i]])]];
        for (const { tramo: e, alReves } of tramo) { const n = alReves ? red.a[e] : red.b[e]; xy.push([M.x(red.lon[n]), M.y(red.lat[n])]); }
        let haciaLaLinea = 0; for (const [x, y] of xy) haciaLaLinea += distSeg(x, y, a[0], a[1], b[0], b[1]);
        let vuelta = 0;
        for (let s = 0; s <= 8; s++) {
          const px = a[0] + (b[0] - a[0]) * s / 8, py = a[1] + (b[1] - a[1]) * s / 8;
          let dm = Infinity; for (let k = 0; k < xy.length - 1; k++) dm = Math.min(dm, distSeg(px, py, xy[k][0], xy[k][1], xy[k + 1][0], xy[k + 1][1]));
          if (xy.length === 1) dm = Math.hypot(px - xy[0][0], py - xy[0][1]);
          vuelta += dm;
        }
        const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
        error += largo * (haciaLaLinea / xy.length + vuelta / 9) / 2;
        largoIdeal += largo;
        pasos = pasos.concat(tramo);
      }
      actual = nodos[nodos.length - 1]; actualXY = pts[pts.length - 1];
    }
    if (!pasos.length) return null;
    let sPref = 0, sLargo = 0;
    for (const { tramo: e } of pasos) { sPref += pref[e] * red.largo[e]; sLargo += red.largo[e]; }
    return { pasos, error: error / largoIdeal / alto, pref: sPref / sLargo, enlaces };
  }

  // Lugares candidatos: la Ciudad entera o alrededor de un punto (zona = { lon, lat, radio })
  function candidatos(zona) {
    const lista = [], paso = zona ? 300 : 650;
    const lat0 = zona ? zona.lat : -34.615, k = marco(0, lat0);
    const caja = zona
      ? [zona.lon - zona.radio / k.kx, zona.lat - zona.radio / k.ky, zona.lon + zona.radio / k.kx, zona.lat + zona.radio / k.ky]
      : [CABA.oeste, CABA.sur, CABA.este, CABA.norte];
    for (let lon = caja[0]; lon <= caja[2]; lon += paso / k.kx) for (let lat = caja[1]; lat <= caja[3]; lat += paso / k.ky) {
      if (!dentroDeCABA(lon, lat)) continue;
      if (zona && metros(lon, lat, zona.lon, zona.lat) > zona.radio) continue;
      const c = esquinaCercana(lon, lat);
      if (c.nodo >= 0 && c.distancia < 150) lista.push(c.nodo);
    }
    return [...new Set(lista)];
  }

  // evitar: lugares de las otras letras de la palabra. En toda la Ciudad, entre los lugares donde la letra se lee
  // bien, se prefieren los que quedan a más de 1,5 km de las otras: la palabra recorre varios barrios.
  async function armarLetra({ trazos, zona = null, fijo = null, proporcion = 0.7, factores = [], nocturno = false, pesos = {}, evitar = [] }) {
    await cargar();
    const pref = puntajePreferencias(factores, nocturno, pesos), lambda = 0.35;
    const diagonal = trazos.some(t => t.some((p, i) => i && Math.abs(p[0] - t[i - 1][0]) > 0.05 && Math.abs(p[1] - t[i - 1][1]) > 0.05));
    let elegido = null;
    if (fijo) {   // la letra ya tiene lugar (se guardó en el challenge): solo se vuelve a armar
      const r = intentarLetra(trazos, fijo.lon, fijo.lat, fijo.giro, fijo.alto, proporcion, pref, lambda);
      if (r) elegido = { ...r, ...fijo };
    }
    if (!elegido) {
      // Las letras con diagonales van más grandes: el "serrucho" de la grilla queda más fino y la letra se lee mejor
      const ALTOS = diagonal ? [950, 1150] : [700, 900], prueba = [];
      // Pasada rápida: todos los lugares, un tamaño, giro de la grilla (y otros tres giros si la letra tiene diagonales)
      for (const n of candidatos(zona)) {
        const g = rumboLocal(n) * Math.PI / 180, giros = diagonal ? [g, g + Math.PI / 4, g + Math.PI / 8, g - Math.PI / 8] : [g];
        for (const giro of giros) {
          const r = intentarLetra(trazos, red.lon[n], red.lat[n], giro, ALTOS[0], proporcion, pref, lambda);
          if (r) prueba.push({ ...r, lon: red.lon[n], lat: red.lat[n], giro, alto: ALTOS[0] });
        }
      }
      if (!prueba.length) throw new Error(zona ? 'No pudimos dibujar esa letra con las calles de esa zona. Probá con toda la Ciudad.' : 'No pudimos dibujar esa letra con las calles de la Ciudad.');
      // Afinar: los 12 mejores, con el otro tamaño
      prueba.sort((a, b) => a.error - b.error);
      for (const c of prueba.slice(0, 12)) {
        const r = intentarLetra(trazos, c.lon, c.lat, c.giro, ALTOS[1], proporcion, pref, lambda);
        if (r) prueba.push({ ...r, lon: c.lon, lat: c.lat, giro: c.giro, alto: ALTOS[1] });
      }
      const mejorError = Math.min(...prueba.map(p => p.error));
      const lejos = p => zona || evitar.every(o => metros(p.lon, p.lat, o.lon, o.lat) > 1500);
      elegido = prueba.filter(p => p.error <= mejorError * 1.08 + 0.002).sort((a, b) => (lejos(b) - lejos(a)) || (b.pref - a.pref))[0];
    }
    const r = describir(elegido.pasos, pref, nocturno, null);
    r.enlaceKm = Math.round(elegido.enlaces / 100) / 10;
    r.giro = elegido.giro;   // para dibujar la letra derecha (tarjetas y mapas giran el mapa)
    r.lugar = { lon: elegido.lon, lat: elegido.lat, giro: elegido.giro, alto: elegido.alto };
    r.parecido = Math.max(0, Math.round(100 - elegido.error * 400));   // 100 = idéntica a la letra ideal
    return r;
  }

  /* ---------- v12 · TU ARCHIVO: índice de una zona y promedio de la Ciudad ----------
     Respirabilidad promedio (pesada por largo) de las calles a menos de `radio` metros de un punto,
     y de todas las calles de CABA. Sirve para comparar los recorridos del runner con el resto de la Ciudad
     (la hipótesis: donde ya corren los runners se respira mejor). */
  let promedio = null;
  async function promedioCiudad() {
    await cargar();
    if (promedio == null) { let s = 0, l = 0; for (let e = 0; e < red.nT; e++) { s += red.indice[e] * red.largo[e]; l += red.largo[e]; } promedio = Math.round(s / l); }
    return promedio;
  }
  async function indiceZona(lon, lat, radio = 400) {
    await cargar();
    const dLat = radio / 110540, dLon = radio / (111320 * Math.cos(lat * Math.PI / 180));
    let s = 0, l = 0;
    for (let e = 0; e < red.nT; e++) {
      const a = red.a[e];
      if (Math.abs(red.lat[a] - lat) > dLat || Math.abs(red.lon[a] - lon) > dLon) continue;
      s += red.indice[e] * red.largo[e]; l += red.largo[e];
    }
    return l ? Math.round(s / l) : null;
  }

  /* ---------- 5. Describir un recorrido: geometría, índice y datos duros ---------- */
  function describir(pasos, pref, nocturno, polen) {
    const E = 1e5;
    let largo = 0, sIndice = 0, sPref = 0, sArb = 0, sDb = 0, sNo2 = 0, sPolen = 0;
    const arbolesAlLado = {};
    const sF = Object.fromEntries(FACTORES.map(f => [f, 0]));
    const porCalle = new Map(), tramos = [], coords = [];
    for (const { tramo: e, alReves } of pasos) {
      const L = red.largo[e];
      largo += L; sIndice += red.indice[e] * L; sPref += pref[e] * L;
      sArb += red.arboles_100m[e] * L; sDb += red.db_dia[e] * L; sNo2 += red.no2[e] * L;
      if (polen) { sPolen += polen.r[e] * L; for (const { a } of polen.activas) arbolesAlLado[a] = (arbolesAlLado[a] || 0) + red.polen[a].cerca[e]; }
      for (const f of FACTORES) sF[f] += (f === 'ruido' ? red[nocturno ? 'ruido_noche' : 'ruido_dia'][e] : red[f][e]) * L;
      if (red.nombre[e] >= 0) { const n = red.nombres[red.nombre[e]]; porCalle.set(n, (porCalle.get(n) || 0) + L); }
      // geometría del tramo, en el sentido en que se corre
      const g = red.geo[e], pts = [[red.lat[red.a[e]], red.lon[red.a[e]]]];
      for (let k = 0; k < g.length; k += 2) pts.push([g[k + 1] / E, g[k] / E]);
      pts.push([red.lat[red.b[e]], red.lon[red.b[e]]]);
      if (alReves) pts.reverse();
      tramos.push({ coords: pts, indice: red.indice[e], polen: polen ? polen.r[e] : 0 });
      coords.push(...(coords.length ? pts.slice(1) : pts));
    }
    const prom = s => Math.round(s / Math.max(largo, 1));
    const calles = [...porCalle.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n);
    return {
      largo: Math.round(largo), km: Math.round(largo / 100) / 10,
      indice: prom(sIndice), preferencias: prom(sPref),
      factores: Object.fromEntries(FACTORES.map(f => [f, prom(sF[f])])),
      datos: { arboles_100m: Math.round(sArb / Math.max(largo, 1) * 10) / 10, db: prom(sDb), no2: prom(sNo2) },
      polen: polen ? {
        riesgo: prom(sPolen),                                  // 0–100, promedio pesado por largo
        nivel: prom(sPolen) >= 45 ? 'alto' : prom(sPolen) >= 18 ? 'medio' : 'bajo',
        especies: polen.activas.map(({ a, estacion }) => ({ especie: a, estacion, arboles_al_lado: arbolesAlLado[a] || 0 })),
        viento: polen.viento, mes: polen.mes
      } : null,
      calles, tramos: unirTramos(tramos), coords,
      tramosPolen: polen ? tramos.filter(t => t.polen >= 45).map(t => t.coords) : []   // para marcarlos en el mapa
    };
  }
  // Une tramos seguidos con índice parecido, para dibujar menos líneas en el mapa
  function unirTramos(tramos) {
    const nivel = i => i >= 60 ? 2 : i >= 40 ? 1 : 0, out = [];
    for (const t of tramos) {
      const ult = out[out.length - 1];
      if (ult && ult.nivel === nivel(t.indice)) { ult.coords.push(...t.coords.slice(1)); ult.suma += t.indice; ult.n++; }
      else out.push({ nivel: nivel(t.indice), coords: t.coords.slice(), suma: t.indice, n: 1 });
    }
    return out;
  }

  /* ---------- 6. Esquinas: "Corrientes y Callao" → la esquina donde se cruzan ---------- */
  const simple = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^(avenida|av\.?|calle|pasaje)\s+/, '');
  async function buscarEsquina(calle1, calle2) {
    await cargar();
    const q1 = simple(calle1.trim()), q2 = simple(calle2.trim());
    if (q1.length < 3 || q2.length < 3) return null;
    const coincide = (q) => { const ok = new Uint8Array(red.nombres.length); red.nombres.forEach((n, i) => { if (simple(n).includes(q)) ok[i] = 1; }); return ok; };
    const ok1 = coincide(q1), ok2 = coincide(q2);
    for (let u = 0; u < red.nN; u++) {
      let n1 = null, n2 = null;
      for (let k = red.grado[u]; k < red.grado[u + 1]; k++) {
        const ni = red.nombre[red.vecinoTramo[k]];
        if (ni < 0) continue;
        if (ok1[ni] && !n1) n1 = red.nombres[ni]; else if (ok2[ni] && !n2) n2 = red.nombres[ni];
      }
      if (n1 && n2 && n1 !== n2) return { nombre: `${n1} y ${n2}`, tipo: 'Esquina', lon: red.lon[u], lat: red.lat[u] };
    }
    return null;
  }

  // v14 · Para el pin del mapa: la esquina de la red más cercana y los nombres de las calles que se cruzan ahí
  async function esquinaConNombre(lon, lat) {
    await cargar();
    const c = esquinaCercana(lon, lat);
    if (c.nodo < 0) return null;
    const calles = [];
    for (let k = red.grado[c.nodo]; k < red.grado[c.nodo + 1]; k++) {
      const ni = red.nombre[red.vecinoTramo[k]];
      if (ni >= 0 && !calles.includes(red.nombres[ni])) calles.push(red.nombres[ni]);
    }
    return { calles: calles.slice(0, 2), distancia: Math.round(c.distancia), lon: red.lon[c.nodo], lat: red.lat[c.nodo] };
  }

  globalThis.RespiraRed = { esquinaConNombre, cargar, cargarScript, armarRecorridos, distanciaDirecta, armarLetra, promedioCiudad, indiceZona, buscarEsquina, metros, get fuentes() { return red && red.fuentes; } };
})();
