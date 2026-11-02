/* =====================================================================
   RESPIRA — Datos de la app
   Por ahora son DATOS DE EJEMPLO (los mismos del diseño de Figma).
   Cuando esté calculado el índice por tramo (paso 4 del plan), RECORRIDOS
   se va a llenar a partir de app/datos/, y lo demás queda igual.
   ===================================================================== */

// Lugares para autocompletar partida y llegada (coordenadas aproximadas, sirven para pedir el clima).
const LUGARES = [
  { nombre: 'Plaza Italia', barrio: 'Palermo', lat: -34.5810, lon: -58.4210 },
  { nombre: 'Bosques de Palermo (Parque Tres de Febrero)', barrio: 'Palermo', lat: -34.5710, lon: -58.4175 },
  { nombre: 'Rosedal de Palermo', barrio: 'Palermo', lat: -34.5717, lon: -58.4180 },
  { nombre: 'Parque Las Heras', barrio: 'Palermo', lat: -34.5852, lon: -58.4049 },
  { nombre: 'Parque Centenario', barrio: 'Caballito', lat: -34.6066, lon: -58.4357 },
  { nombre: 'Parque Rivadavia', barrio: 'Caballito', lat: -34.6189, lon: -58.4362 },
  { nombre: 'Parque Chacabuco', barrio: 'Parque Chacabuco', lat: -34.6361, lon: -58.4383 },
  { nombre: 'Parque Avellaneda', barrio: 'Parque Avellaneda', lat: -34.6462, lon: -58.4789 },
  { nombre: 'Parque Saavedra', barrio: 'Saavedra', lat: -34.5528, lon: -58.4884 },
  { nombre: 'Parque de la Memoria (Costanera Norte)', barrio: 'Belgrano', lat: -34.5465, lon: -58.4375 },
  { nombre: 'Reserva Ecológica Costanera Sur', barrio: 'Puerto Madero', lat: -34.6107, lon: -58.3529 },
  { nombre: 'Puerto Madero', barrio: 'Puerto Madero', lat: -34.6118, lon: -58.3624 },
  { nombre: 'Plaza San Martín', barrio: 'Retiro', lat: -34.5954, lon: -58.3758 },
  { nombre: 'Parque Lezama', barrio: 'San Telmo', lat: -34.6285, lon: -58.3695 }
];

// Condiciones (= tarjetas de "Personalizá tus condiciones").
const CONDICIONES_PRINCIPALES = [
  { id: 'vegetacion', titulo: 'Más vegetación',        icono: 'i-hoja',     elegida: true },
  { id: 'ruido',      titulo: 'Menos ruido',           icono: 'i-silencio', elegida: false },
  { id: 'aire',       titulo: 'Mejor calidad de aire', icono: 'i-viento',   elegida: true },
  { id: 'transito',   titulo: 'Menos tránsito',        icono: 'i-auto',     elegida: false }
];
const CONDICIONES_OTRAS = [
  { id: 'sombra',    titulo: 'Más sombra',              icono: 'i-sol' },
  { id: 'seguridad', titulo: 'Más seguridad',           icono: 'i-escudo' },
  { id: 'gente',     titulo: 'Menos densidad de gente', icono: 'i-gente' },
  { id: 'terreno',   titulo: 'Terreno regular',         icono: 'i-montana' },
  { id: 'agua',      titulo: 'Cerca del agua',          icono: 'i-agua' },
  { id: 'urbano',    titulo: 'Entorno urbano',          icono: 'i-edificio' }
];

// Recorridos de ejemplo (dato duro simulado). Componentes en 0–100: cuánto hay de cada cosa en el recorrido.
const RECORRIDOS = [
  { id: 1, nombre: 'Recorrido 1', tipo: 'Más verde', icono: 'i-hoja', km: 5.1, min: 28, indice: 92,
    componentes: { vegetacion: 93, sombra: 78, ruido: 22, transito: 18 },
    ia: 'La IA priorizó parques y calles arboladas, con buena sombra y bajo flujo vehicular.',
    ruta: 'M34 205L58 168L96 150L112 104L150 84L176 60L214 74L246 50L300 84', etiqueta: [72, 22] },
  { id: 2, nombre: 'Recorrido 2', tipo: 'Más tranquilo', icono: 'i-arbol', km: 5.3, min: 30, indice: 88,
    componentes: { vegetacion: 72, sombra: 70, ruido: 28, transito: 26 },
    ia: 'La IA seleccionó un recorrido tranquilo, con menor ruido y pocas interrupciones.',
    ruta: 'M34 205L82 186L120 160L168 150L206 128L250 112L300 84', etiqueta: [150, 112] },
  { id: 3, nombre: 'Recorrido 3', tipo: 'Más directo', icono: 'i-rayo', km: 5.0, min: 26, indice: 76,
    componentes: { vegetacion: 64, sombra: 64, ruido: 36, transito: 42 },
    ia: 'La IA priorizó la menor distancia, manteniendo zonas verdes y condiciones de confort.',
    ruta: 'M34 205L96 196L132 172L190 182L232 140L300 84', etiqueta: [214, 186] }
];

// Mapa ilustrado (el mismo de Figma: "Mapa / Base"). Se reemplaza por el mapa real con Leaflet en el paso 5.
function dibujarMapa({ rutas = [], conEtiquetas = false, alto = 250 }) {
  const parques = [[38,36,70,44],[118,108,62,36],[196,176,78,46],[152,22,50,30],[18,118,40,30],[184,92,44,28],[290,196,50,40]]
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--mapa-parque)"/>`).join('');
  const lineas = rutas.map(r => `<path d="${r.ruta}" fill="none" stroke="${r.activa ? 'var(--verde-primario)' : 'var(--mapa-inactivo)'}" stroke-width="${r.activa ? 4.5 : 3.5}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const marcadores = rutas.length ? '<circle cx="34" cy="205" r="7" fill="#fff" stroke="var(--verde-primario)" stroke-width="4"/><circle cx="300" cy="84" r="7" fill="#fff" stroke="var(--verde-primario)" stroke-width="4"/>' : '';
  const etiquetas = conEtiquetas ? rutas.map(r => {
    const [x, y] = r.etiqueta;
    return `<g transform="translate(${x} ${y})"><rect width="${r.activa ? 74 : 72}" height="34" rx="8" fill="${r.activa ? 'var(--verde-primario)' : 'var(--texto-terciario)'}"/>
      <text x="${r.activa ? 37 : 36}" y="15" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">${r.nombre}</text>
      <text x="${r.activa ? 37 : 36}" y="27" text-anchor="middle" font-size="8" fill="#fff">${r.km.toFixed(1).replace('.', ',')} km · ${r.min} min</text></g>`;
  }).join('') : '';
  // Cuando el mapa es más bajo (detalle y recorrido completado) se muestra solo la franja donde están los recorridos.
  const y0 = alto < 250 ? 40 : 0;
  return `<svg viewBox="0 ${y0} 354 ${alto}" role="img" aria-label="Mapa del recorrido">
    <rect width="354" height="250" fill="var(--mapa-tierra)"/>
    <path d="M0 62L354 18M0 132L354 92M0 204L354 164M0 248L354 216M58 0L108 250M148 0L198 250M238 0L288 250M0 26L180 0" stroke="var(--mapa-calle)" stroke-width="5" fill="none"/>
    ${parques}
    <path d="M258 0H354V146C330 124 296 74 258 0Z" fill="var(--mapa-agua)"/>
    ${lineas}${marcadores}${etiquetas}</svg>`;
}
