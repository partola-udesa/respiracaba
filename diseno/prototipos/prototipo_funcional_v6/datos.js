/* =====================================================================
   RESPIRA — Condiciones, alergias y de qué dataset sale cada cosa
   Cuando una condición está elegida, el armado de recorridos usa el puntaje
   de ese factor en cada tramo de calle:
   - app/datos/red.js   (codigo/construir_red_respirabilidad.py)
   - app/datos/capas.js (codigo/construir_capas_alergias_agua.py): agua y polen
   ===================================================================== */

const CONDICIONES = [
  // Principales (tarjetas grandes)
  { id: 'vegetacion', titulo: 'Más vegetación', principal: true, elegida: true, icono: 'hoja',
    factor: 'vegetacion', fuente: 'Arbolado lineal + espacios verdes' },
  { id: 'ruido', titulo: 'Menos ruido', principal: true, elegida: false, icono: 'silencio',
    factor: 'ruido', fuente: 'Mapa de ruido 2018' },
  { id: 'aire', titulo: 'Mejor calidad de aire', principal: true, elegida: true, icono: 'aire',
    factor: 'aire', fuente: 'NO₂ satelital' },
  { id: 'transito', titulo: 'Menos tránsito', principal: true, elegida: false, icono: 'auto',
    factor: 'transito', fuente: 'Vías + colectivos' },
  // Otras (tarjetas chicas)
  { id: 'sombra', titulo: 'Más sombra', icono: 'sol', factor: 'sombra', fuente: 'Altura del arbolado' },
  { id: 'agua', titulo: 'Cerca del agua', icono: 'agua', factor: 'agua', fuente: 'Río, Riachuelo y lagos (OSM)' },
  { id: 'terreno', titulo: 'Terreno regular', icono: 'terreno', factor: 'terreno', fuente: 'Superficie (OSM)' },
  { id: 'luz', titulo: 'Calles iluminadas', icono: 'luz', factor: 'luz', fuente: 'Iluminación (OSM)' }
];

// Cómo se nombra cada factor en el detalle de un recorrido (y qué dato duro se muestra al lado).
const FACTORES = {
  vegetacion: { nombre: 'Vegetación', dato: r => `${conComaNum(r.datos.arboles_100m, 0)} árboles / 100 m` },
  aire:       { nombre: 'Calidad de aire', dato: r => `NO₂ ${r.datos.no2} µmol/m²` },
  ruido:      { nombre: 'Silencio', dato: r => `${r.datos.db} dB` },
  transito:   { nombre: 'Poco tránsito', dato: () => '' },
  sombra:     { nombre: 'Sombra', dato: () => '' },
  agua:       { nombre: 'Cerca del agua', dato: r => r.datos.agua_m < 1000 ? `a ${r.datos.agua_m} m` : '' },
  terreno:    { nombre: 'Terreno regular', dato: () => '' },
  luz:        { nombre: 'Iluminación', dato: () => '' }
};
function conComaNum(n, d = 1) { return Number(n).toFixed(d).replace('.', ','); }

/* ---------- ALERGIAS ----------
   Especies del arbolado público lineal que el runner puede marcar en su perfil. */
const ALERGIAS = {
  platano:  { nombre: 'Plátano',  cientifico: 'Platanus x acerifolia' },
  fresno:   { nombre: 'Fresno',   cientifico: 'Fraxinus (pennsylvanica, americana, excelsior…)' },
  ligustro: { nombre: 'Ligustro', cientifico: 'Ligustrum lucidum' }
};

/* Época de polen en Buenos Aires: cuánto pesa cada especie según el mes (0 = nada, 1 = pico).
   DECISIÓN DE DISEÑO (no dato duro), armada con el calendario que ya usaba la app
   (fresno jul–sep, plátano ago–oct, ligustro nov–ene) y con que el plátano además suelta
   pelusas hasta fines de noviembre o principios de diciembre (ver decisiones.md).
   Si el plátano está en 1 en septiembre y en 0 en junio, un tramo lleno de plátanos
   cuenta como "malo" para un alérgico en primavera y como neutro en invierno.
                     ene   feb   mar   abr   may   jun   jul   ago   sep   oct   nov   dic */
const ESTACION_POLEN = {
  platano:  [0.15, 0.05, 0,    0,    0,    0,    0.05, 0.5,  1,    1,    0.8,  0.4],
  fresno:   [0,    0,    0,    0,    0,    0.1,  0.7,  1,    0.8,  0.2,  0,    0  ],
  ligustro: [0.6,  0.2,  0,    0,    0,    0,    0,    0,    0,    0.2,  0.8,  1  ]
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Ritmo estimado según el nivel del perfil (minutos por km).
const RITMO = { principiante: 7, intermedio: 6, avanzado: 5 };

// Límites de la Ciudad (para el buscador y para "usar mi ubicación").
const CABA = { oeste: -58.535, sur: -34.71, este: -58.33, norte: -34.525 };
