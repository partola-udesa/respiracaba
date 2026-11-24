/* =====================================================================
   RESPIRA — Buscador de lugares para la partida y la llegada
   Junta tres fuentes, de la más cercana a la más amplia:
   1. Los datasets cargados (app/datos/lugares.js): los 2.100 espacios verdes
      públicos y todas las calles de la red peatonal. Responde al instante.
   2. Esquinas ("Corrientes y Callao"), buscadas en la propia red de calles.
   3. Cualquier dirección con altura ("Av. Corrientes 1500") con el geocodificador
      libre de OpenStreetMap (Photon; si falla, Nominatim).
   Todo lo que queda fuera del contorno de la Ciudad (dentroDeCABA, en datos.js) se
   descarta: si una búsqueda solo encuentra lugares de afuera, se avisa
   ZONA_NO_DISPONIBLE en vez de "no encontramos".
   ===================================================================== */
(function () {
  let lugares = null;
  const simple = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  async function cargarLugares() {
    if (lugares) return lugares;
    try {
      const j = await RespiraRed.cargarScript('datos/lugares.js', 'RESPIRA_LUGARES');   // espacios verdes y calles (sale de los datasets)
      lugares = j.map(l => ({ nombre: l.n, tipo: l.t, lon: l.lon, lat: l.lat, clave: simple(l.n) }));
    } catch (e) { lugares = []; }
    return lugares;
  }
  cargarLugares();

  // 1. Datasets: primero lo que empieza igual, después lo que contiene todas las palabras. Parques y plazas antes que calles.
  function local(q, max = 5) {
    if (!lugares || q.trim().length < 2) return [];
    const palabras = simple(q).split(/\s+/).filter(Boolean);
    const out = [];
    for (const l of lugares) {
      if (!palabras.every(p => l.clave.includes(p))) continue;
      const puntos = (l.clave.startsWith(palabras[0]) ? 0 : l.clave.includes(' ' + palabras[0]) ? 1 : 2) + (l.tipo === 'Calle' ? 0.5 : 0);
      out.push([puntos, l.nombre.length, l]);
    }
    return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, max).map(x => x[2]);
  }

  // 2. Esquinas
  async function esquina(q) {
    const m = q.match(/^(.+?)\s+(?:y|e|esq\.?|esquina)\s+(.+)$/i);
    if (!m || !globalThis.RespiraRed) return null;
    const l = await RespiraRed.buscarEsquina(m[1], m[2]);
    return l && dentroDeCABA(l.lon, l.lat) ? l : null;
  }

  /* 3. Direcciones (OpenStreetMap)
     Devuelve { lugares, fuera }: solo los lugares de la Ciudad y, si no hubo ninguno,
     si el lugar existe pero está fuera de CABA (para avisar en vez de decir "no encontramos"). */
  const caja = `${CABA.oeste},${CABA.sur},${CABA.este},${CABA.norte}`;
  async function photon(q, senal, enCaja) {
    const donde = enCaja ? `bbox=${caja}` : 'lat=-34.61&lon=-58.44';   // afuera de la caja: igual, lo más cerca de la Ciudad primero
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&${donde}`, { signal: senal });
    if (!r.ok) throw new Error('photon ' + r.status);
    const j = await r.json();
    return j.features.map(f => {
      const p = f.properties, [lon, lat] = f.geometry.coordinates;
      const calle = p.street ? `${p.street}${p.housenumber ? ' ' + p.housenumber : ''}` : '';
      const nombre = p.name && p.name !== p.street ? p.name : calle || p.name;
      return { nombre, tipo: [p.name && calle && p.name !== calle ? calle : '', p.district || p.locality || 'CABA'].filter(Boolean).join(' · '), lon, lat };
    }).filter(l => l.nombre);
  }
  async function nominatim(q, senal, enCaja) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=es&countrycodes=ar&viewbox=${caja}${enCaja ? '&bounded=1' : ''}&q=${encodeURIComponent(q)}`, { signal: senal });
    const j = await r.json();
    return j.map(l => ({ nombre: l.display_name.split(',').slice(0, 2).join(','), tipo: 'Dirección', lon: +l.lon, lat: +l.lat }));
  }
  async function direcciones(q, senal) {
    if (q.trim().length < 3) return { lugares: [], fuera: false };
    let buscar = photon, todos;
    try { todos = await photon(q, senal, true); }
    catch (e) { if (e.name === 'AbortError') throw e; buscar = nominatim; todos = await nominatim(q, senal, true); }   // respaldo: Nominatim
    const lugares = todos.filter(l => dentroDeCABA(l.lon, l.lat));
    if (lugares.length) return { lugares, fuera: false };
    // Nada en la Ciudad: ¿existe afuera? (la caja incluye partes del conurbano, y un lugar como "Tigre" ni entra en la caja)
    if (todos.length) return { lugares, fuera: true };
    const afuera = await buscar(q, senal, false).catch(e => { if (e.name === 'AbortError') throw e; return []; });
    return { lugares, fuera: afuera.length > 0 };
  }

  // Ubicación actual del teléfono
  function miUbicacion() {
    return new Promise((ok, mal) => {
      if (!navigator.geolocation) return mal(new Error('Tu navegador no permite usar la ubicación.'));
      navigator.geolocation.getCurrentPosition(p => {
        const { longitude: lon, latitude: lat } = p.coords;
        if (!dentroDeCABA(lon, lat)) return mal(new Error(ZONA_NO_DISPONIBLE + ' Tu ubicación está fuera de la Ciudad de Buenos Aires.'));
        ok({ nombre: 'Mi ubicación', tipo: 'Ubicación actual', lon, lat });
      }, () => mal(new Error('No pudimos acceder a tu ubicación. Revisá los permisos.')), { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  // v14 · Para el pin del mapa: el espacio verde (o lugar con nombre) más cercano a un punto, a menos de `max` metros
  async function cercano(lon, lat, max = 140) {
    await cargarLugares();
    const kx = 111320 * Math.cos(lat * Math.PI / 180);
    let mejor = null, dMejor = max;
    for (const l of lugares) {
      if (l.tipo === 'Calle') continue;
      const d = Math.hypot((l.lon - lon) * kx, (l.lat - lat) * 110540);
      if (d < dMejor) { dMejor = d; mejor = l; }
    }
    return mejor && { nombre: mejor.nombre, tipo: mejor.tipo, distancia: Math.round(dMejor) };
  }

  globalThis.RespiraBuscador = { cercano, cargarLugares, local, esquina, direcciones, miUbicacion };
})();
