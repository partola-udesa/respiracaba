/* =====================================================================
   RESPIRA — Condiciones y de qué dataset sale cada una
   Cuando una condición está elegida (= true), el armado de recorridos usa el
   puntaje de ese factor en cada tramo de calle (app/datos/red.json, que genera
   codigo/construir_red_respirabilidad.py a partir de datasets_procesados/).
   ===================================================================== */

const CONDICIONES = [
  // Principales (tarjetas grandes)
  { id: 'vegetacion', titulo: 'Más vegetación', principal: true, elegida: true,
    factor: 'vegetacion', fuente: 'Arbolado lineal + espacios verdes',
    datasets: ['arbolado-publico-lineal-2017-2018__filtrado.csv', 'espacio_verde_publico__filtrado.csv'] },
  { id: 'ruido', titulo: 'Menos ruido', principal: true, elegida: false,
    factor: 'ruido', fuente: 'Mapa de ruido 2018 (día y noche)',
    datasets: ['medicion_de_ruido_diurno_2018__filtrado.csv', 'medicion_de_ruido_nocturno_2018__filtrado.csv'] },
  { id: 'aire', titulo: 'Mejor calidad de aire', principal: true, elegida: true,
    factor: 'aire', fuente: 'NO₂ satelital (Sentinel-5P)',
    datasets: ['no2_grilla_mensual__filtrado.csv'] },
  { id: 'transito', titulo: 'Menos tránsito', principal: true, elegida: false,
    factor: 'transito', fuente: 'Vías principales + colectivos',
    datasets: ['osm_vias_principales_caba__filtrado.csv', 'colectivos-gtfs__pasadas_por_tramo_franja.csv'] },
  // Otras (tarjetas chicas)
  { id: 'sombra', titulo: 'Más sombra', factor: 'sombra', fuente: 'Altura del arbolado',
    datasets: ['arbolado-publico-lineal-2017-2018__filtrado.csv'] },
  { id: 'terreno', titulo: 'Terreno regular', factor: 'terreno', fuente: 'Superficie (OSM)',
    datasets: ['osm_red_peatonal_caba__filtrado.csv'] },
  { id: 'luz', titulo: 'Calles iluminadas', factor: 'luz', fuente: 'Iluminación (OSM)',
    datasets: ['osm_red_peatonal_caba__filtrado.csv'] },
  // Todavía sin dataset: se muestran desactivadas para que se vea qué falta
  { id: 'seguridad', titulo: 'Más seguridad', factor: null, fuente: 'Sin dataset todavía' },
  { id: 'gente', titulo: 'Menos gente', factor: null, fuente: 'Sin dataset todavía' },
  { id: 'agua', titulo: 'Cerca del agua', factor: null, fuente: 'Sin dataset todavía' }
];

// Cómo se nombra cada factor en el detalle de un recorrido (y qué dato duro se muestra al lado).
const FACTORES = {
  vegetacion: { nombre: 'Vegetación', dato: r => `${r.datos.arboles_100m.toFixed(0)} árboles cada 100 m` },
  aire:       { nombre: 'Calidad de aire', dato: r => `NO₂ ${r.datos.no2} µmol/m²` },
  ruido:      { nombre: 'Silencio', dato: r => `${r.datos.db} dB promedio` },
  transito:   { nombre: 'Poco tránsito', dato: () => '' },
  sombra:     { nombre: 'Sombra', dato: () => '' },
  terreno:    { nombre: 'Terreno regular', dato: () => '' },
  luz:        { nombre: 'Iluminación', dato: () => '' }
};

// Ritmo estimado según el nivel del perfil (minutos por km).
const RITMO = { principiante: 7, intermedio: 6, avanzado: 5 };

// Límites de la Ciudad (para el buscador y para "usar mi ubicación").
const CABA = { oeste: -58.535, sur: -34.71, este: -58.33, norte: -34.525 };
