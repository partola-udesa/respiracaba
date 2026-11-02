/* RESPIRA — Clima hora por hora para armar rutas de running
 *
 * Fuente: Open-Meteo (https://open-meteo.com), API de pronóstico. Gratis para uso no comercial,
 * sin clave. Datos © Open-Meteo, licencia CC BY 4.0 (hay que citarlo en la app).
 * No se guarda ningún dataset: la app consulta el pronóstico cada vez que se abre.
 *
 * Uso en la página:
 *   <script src="clima.js"></script>
 *   const horas = await RespiraClima.obtenerClimaPorHora(-34.60, -58.38);   // punto de partida del runner
 *   const h = RespiraClima.climaALaHora(horas, new Date('2026-11-02T18:00'));
 *   const avisos = RespiraClima.avisosParaCorrer(h);
 *   const v = RespiraClima.vientoEnTramo(rumboDelTramo, h);                  // + en contra, − a favor
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

  /** Pide el pronóstico hora por hora para un punto. Devuelve una lista de horas. */
  async function obtenerClimaPorHora(lat, lon, dias = 2) {
    const params = new URLSearchParams({
      latitude: lat, longitude: lon,
      hourly: VARIABLES.join(','),
      timezone: 'America/Argentina/Buenos_Aires',
      wind_speed_unit: 'kmh',
      forecast_days: dias
    });
    const r = await fetch('https://api.open-meteo.com/v1/forecast?' + params);
    if (!r.ok) throw new Error('Open-Meteo respondió ' + r.status);
    const j = await r.json();
    return j.hourly.time.map((t, i) => {
      const h = { hora: t };
      VARIABLES.forEach(v => { h[v] = j.hourly[v][i]; });
      return h;
    });
  }

  /** Devuelve la hora del pronóstico más cercana a una fecha (Date o texto 'AAAA-MM-DDTHH:MM'). */
  function climaALaHora(horas, cuando) {
    const objetivo = typeof cuando === 'string' ? cuando : formatoLocal(cuando);
    const clave = objetivo.slice(0, 13); // 'AAAA-MM-DDTHH'
    return horas.find(h => h.hora.startsWith(clave)) || null;
  }

  function formatoLocal(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
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
   *  Positivo = en contra, negativo = a favor, cerca de 0 = de costado. */
  function vientoEnTramo(rumboTramo, horaClima) {
    const dif = (rumboTramo - horaClima.wind_direction_10m) * Math.PI / 180;
    return Math.round(horaClima.wind_speed_10m * Math.cos(dif) * 10) / 10;
  }

  /** Avisos simples para mostrar en la app (inferencia a partir del pronóstico, no dato duro). */
  function avisosParaCorrer(h) {
    const a = [];
    if (!h) return a;
    if (h.apparent_temperature >= UMBRALES.calor) a.push('calor');
    if (h.apparent_temperature <= UMBRALES.frio) a.push('frio');
    if (h.uv_index >= UMBRALES.uvAlto && h.is_day) a.push('uv_alto');
    if (h.precipitation_probability >= UMBRALES.lluvia) a.push('lluvia');
    if (h.wind_gusts_10m >= UMBRALES.rafagas) a.push('rafagas');
    else if (h.wind_speed_10m >= UMBRALES.vientoFuerte) a.push('viento_fuerte');
    if (!h.is_day) a.push('de_noche');
    return a;
  }

  window.RespiraClima = { obtenerClimaPorHora, climaALaHora, rumbo, vientoEnTramo, avisosParaCorrer, UMBRALES, VARIABLES };
})();
