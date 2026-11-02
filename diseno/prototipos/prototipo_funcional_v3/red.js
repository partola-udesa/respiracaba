/* =====================================================================
   RESPIRA — Armado de recorridos sobre la red de calles con índice por tramo
   1. Carga app/datos/red.json (la red peatonal de CABA cortada en tramos de
      esquina a esquina, con un puntaje 0–100 por condición en cada tramo).
   2. Con las condiciones elegidas calcula cuánto "cuesta" correr por cada tramo:
      un tramo con mal puntaje cuesta como si fuera más largo.
   3. Busca el camino de menor costo (algoritmo de Dijkstra) y arma tres opciones
      distintas. Devuelve para cada una el largo, el índice y los datos duros.
   Uso: const opciones = await RespiraRed.armarRecorridos({ desde, hasta, circular, km, factores, nocturno });
   ===================================================================== */
(function () {
  const URL_RED = 'datos/red.js';   // define window.RESPIRA_RED (se carga con <script> para que funcione también sin servidor)
  const FACTORES = ['vegetacion', 'aire', 'ruido', 'transito', 'sombra', 'terreno', 'luz'];
  let red = null, cargando = null;

  /* ---------- 1. Cargar la red y preparar las estructuras ---------- */
  function cargar() {
    if (red) return Promise.resolve(red);
    if (cargando) return cargando;
    cargando = cargarScript(URL_RED, 'RESPIRA_RED').then(j => {
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
        fuentes: j.fuentes, nN, nT
      };
      delete globalThis.RESPIRA_RED;   // ya se copió a estructuras compactas: se libera la memoria
      return red;
    });
    cargando.catch(() => { cargando = null; });
    return cargando;
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
  function puntajePreferencias(factores, nocturno) {
    const p = new Float32Array(red.nT);
    const arrays = factores.map(f => f === 'ruido' ? red[nocturno ? 'ruido_noche' : 'ruido_dia'] : red[f]).filter(Boolean);
    if (!arrays.length) { p.set(red.indice); return p; }
    for (let i = 0; i < red.nT; i++) {
      let s = 0;
      for (const arr of arrays) s += arr[i];
      p[i] = s / arrays.length;
    }
    return p;
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

  function costos(pref, lambda, penal) {
    const c = new Float32Array(red.nT);
    for (let i = 0; i < red.nT; i++) c[i] = red.largo[i] * (1 + lambda * (100 - pref[i]) / 100) * (penal ? penal[i] : 1);
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
  async function armarRecorridos({ desde, hasta, circular, km, factores, nocturno = false }) {
    await cargar();
    const A = esquinaCercana(desde.lon, desde.lat);
    if (A.distancia > 500) throw new Error('El punto de partida está lejos de las calles de la Ciudad.');
    const B = circular ? A : esquinaCercana(hasta.lon, hasta.lat);
    if (B.distancia > 500) throw new Error('El punto de llegada está lejos de las calles de la Ciudad.');
    const pref = puntajePreferencias(factores, nocturno);
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
    return listas.filter(Boolean).map(p => describir(p, pref, nocturno));
  }

  /* ---------- 5. Describir un recorrido: geometría, índice y datos duros ---------- */
  function describir(pasos, pref, nocturno) {
    const E = 1e5;
    let largo = 0, sIndice = 0, sPref = 0, sArb = 0, sDb = 0, sNo2 = 0;
    const sF = Object.fromEntries(FACTORES.map(f => [f, 0]));
    const porCalle = new Map(), tramos = [], coords = [];
    for (const { tramo: e, alReves } of pasos) {
      const L = red.largo[e];
      largo += L; sIndice += red.indice[e] * L; sPref += pref[e] * L;
      sArb += red.arboles_100m[e] * L; sDb += red.db_dia[e] * L; sNo2 += red.no2[e] * L;
      for (const f of FACTORES) sF[f] += (f === 'ruido' ? red[nocturno ? 'ruido_noche' : 'ruido_dia'][e] : red[f][e]) * L;
      if (red.nombre[e] >= 0) { const n = red.nombres[red.nombre[e]]; porCalle.set(n, (porCalle.get(n) || 0) + L); }
      // geometría del tramo, en el sentido en que se corre
      const g = red.geo[e], pts = [[red.lat[red.a[e]], red.lon[red.a[e]]]];
      for (let k = 0; k < g.length; k += 2) pts.push([g[k + 1] / E, g[k] / E]);
      pts.push([red.lat[red.b[e]], red.lon[red.b[e]]]);
      if (alReves) pts.reverse();
      tramos.push({ coords: pts, indice: red.indice[e] });
      coords.push(...(coords.length ? pts.slice(1) : pts));
    }
    const prom = s => Math.round(s / Math.max(largo, 1));
    const calles = [...porCalle.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n);
    return {
      largo: Math.round(largo), km: Math.round(largo / 100) / 10,
      indice: prom(sIndice), preferencias: prom(sPref),
      factores: Object.fromEntries(FACTORES.map(f => [f, prom(sF[f])])),
      datos: { arboles_100m: Math.round(sArb / Math.max(largo, 1) * 10) / 10, db: prom(sDb), no2: prom(sNo2) },
      calles, tramos: unirTramos(tramos), coords
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

  globalThis.RespiraRed = { cargar, cargarScript, armarRecorridos, buscarEsquina, metros, get fuentes() { return red && red.fuentes; } };
})();
