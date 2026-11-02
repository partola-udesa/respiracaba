/* RESPIRA — Clima hora por hora para armar rutas de running
 *
 * Fuente: Open-Meteo (https://open-meteo.com), API de pronóstico. Gratis para uso no comercial,
 * sin clave. Datos © Open-Meteo, licencia CC BY 4.0 (hay que citarlo en la app).
 * No se guarda ningún dataset: la app consulta el pronóstico cada vez que se abre.
 *
 * Uso en la página:
 *   <script src="clima.js"></script>
 *   const horas = await RespiraClima.obtenerClimaPorHora(-34.60, -58.38);   // punto de partida del runner
 *   const h = RespiraClima.climaALaHora(horas, new Date());                  // o '2026-11-02T18:00' (hora de Buenos Aires)
 *   const avisos = RespiraClima.avisosParaCorrer(h);
 *   const r = RespiraClima.rumbo(lon1, lat1, lon2, lat2);                    // rumbo del tramo
 *   const v = RespiraClima.vientoEnTramo(r, h);                              // + en contra, − a favor
 *
 * Las horas del pronóstico vienen en hora de Buenos Aires (UTC−3, sin horario de verano desde 2009),
 * así que las fechas se pasan a esa hora sin importar la zona horaria del navegador.
 */
(function () {
  const VARIABLES = [
    'temperature_2m',            // °C
    'apparent_temperature',      // °C, sensación térmica
    'relative_humidity_2m',      // %
    'precipitation_probability', // %
    'wind_speed_10m',            // km/h, viento medio a 10 m
    'wind_direction_10m',        // °, DE DÓNDE viene el viento (0 = norte, 90 = este)
    'wind_gusts_10m',            // km/h, ráfagas
    'uv_index',
    'is_day'                     // 1 de día, 0 de noche
  ];

  // Umbrales para los avisos. Son una decisión de diseño del equipo (ver decisiones.md), no dato duro.
  const UMBRALES = {
    calor: 28,          // sensación térmica °C
    frio: 5,            // sensación térmica °C
    uvAlto: 6,
    lluvia: 50,         // % de probabilidad
    rafagas: 40,        // km/h
    vientoFuerte: 25    // km/h
  };

  const ZONA = 'America/Argentina/Buenos_Aires';
  const DESFASE_BA_MS = -3 * 3600 * 1000;  // UTC−3
  const ESPERA_MAX_MS = 10000;

  const esNumero = x => typeof x === 'number' && Number.isFinite(x);

  /** Pide el pronóstico hora por hora para un punto. Devuelve una lista de horas. */
  async function obtenerClimaPorHora(lat, lon, dias = 2) {
    if (!esNumero(lat) || !esNumero(lon)) throw new Error('Latitud y longitud tienen que ser números');
    const params = new URLSearchParams({
      latitude: lat, longitude: lon,
      hourly: VARIABLES.join(','),
      timezone: ZONA,
      wind_speed_unit: 'kmh',
      forecast_days: Math.min(Math.max(Math.round(dias), 1), 16)
    });
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), ESPERA_MAX_MS);
    let r;
    try {
      r = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: corte.signal });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'Open-Meteo no respondió a tiempo' : 'No se pudo conectar con Open-Meteo');
    } finally {
      clearTimeout(reloj);
    }
    if (!r.ok) throw new Error('Open-Meteo respondió ' + r.status);
    const j = await r.json();
    if (!j.hourly || !Array.isArray(j.hourly.time)) throw new Error('Open-Meteo devolvió un formato inesperado');
    return j.hourly.time.map((t, i) => {
      const h = { hora: t };
      VARIABLES.forEach(v => { h[v] = j.hourly[v]?.[i] ?? null; });
      return h;
    });
  }

  /** Devuelve la hora del pronóstico más cercana a una fecha (Date, o texto 'AAAA-MM-DDTHH:MM' en hora
   *  de Buenos Aires). Devuelve null si la fecha queda fuera del pronóstico. */
  function climaALaHora(horas, cuando) {
    if (!Array.isArray(horas) || !cuando) return null;
    const fecha = typeof cuando === 'string' ? new Date(cuando.slice(0, 16) + ':00-03:00') : cuando;
    if (!(fecha instanceof Date) || isNaN(fecha)) return null;
    const redondeada = new Date(fecha.getTime() + 30 * 60 * 1000);  // :30 o más pasa a la hora siguiente
    const clave = formatoBA(redondeada).slice(0, 13);              // 'AAAA-MM-DDTHH'
    return horas.find(h => h.hora.startsWith(clave)) || null;
  }

  function formatoBA(d) {
    const p = n => String(n).padStart(2, '0');
    const ba = new Date(d.getTime() + DESFASE_BA_MS);
    return `${ba.getUTCFullYear()}-${p(ba.getUTCMonth() + 1)}-${p(ba.getUTCDate())}T${p(ba.getUTCHours())}:00`;
  }

  /** Rumbo de un tramo en grados (0 = hacia el norte, 90 = hacia el este). */
  function rumbo(lon1, lat1, lon2, lat2) {
    const rad = x => x * Math.PI / 180;
    const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
    const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
              Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /** Cuánto viento le pega de frente al runner en un tramo (km/h).
   *  Positivo = en contra, negativo = a favor, cerca de 0 = de costado. null si falta el dato. */
  function vientoEnTramo(rumboTramo, horaClima) {
    if (!horaClima || !esNumero(rumboTramo) ||
        !esNumero(horaClima.wind_speed_10m) || !esNumero(horaClima.wind_direction_10m)) return null;
    const dif = (rumboTramo - horaClima.wind_direction_10m) * Math.PI / 180;
    return Math.round(horaClima.wind_speed_10m * Math.cos(dif) * 10) / 10;
  }

  /** Avisos simples para mostrar en la app (inferencia a partir del pronóstico, no dato duro).
   *  Un dato que falta (null) no genera aviso. */
  function avisosParaCorrer(h) {
    const a = [];
    if (!h) return a;
    const supera = (v, u) => esNumero(v) && v >= u;
    if (supera(h.apparent_temperature, UMBRALES.calor)) a.push('calor');
    if (esNumero(h.apparent_temperature) && h.apparent_temperature <= UMBRALES.frio) a.push('frio');
    if (supera(h.uv_index, UMBRALES.uvAlto) && h.is_day === 1) a.push('uv_alto');
    if (supera(h.precipitation_probability, UMBRALES.lluvia)) a.push('lluvia');
    if (supera(h.wind_gusts_10m, UMBRALES.rafagas)) a.push('rafagas');
    else if (supera(h.wind_speed_10m, UMBRALES.vientoFuerte)) a.push('viento_fuerte');
    if (h.is_day === 0) a.push('de_noche');
    return a;
  }

  globalThis.RespiraClima = { obtenerClimaPorHora, climaALaHora, rumbo, vientoEnTramo, avisosParaCorrer, UMBRALES, VARIABLES };
})();
