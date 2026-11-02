// =====================================================================
// RESPIRA — Viento, temperatura y humedad en CABA (ERA5-Land, Copernicus)
// Se corre en Google Earth Engine: https://code.earthengine.google.com
// Exporta a Google Drive (carpeta "RESPIRA_GEE") el archivo era5_meteo_caba.csv
// con datos horarios de 16, 17 y 18 UTC (13 a 15 h de Buenos Aires),
// que es la franja en la que pasa el satélite Sentinel-5P.
// Sirve para: (1) probar si el viento explica el ranking de NO2 por comuna,
//             (2) controlar el clima en el análisis (reemplaza al dataset TMI).
//
// Recuperado el 2026-11-02 de la conversación del 2026-10-05 en la que se
// escribió y se corrió. Se corrió tal cual, sin cambios.
// =====================================================================

// Punto de referencia: Parque Centenario (centro geográfico de CABA, sobre tierra;
// ERA5-Land no tiene datos sobre el río).
var punto = ee.Geometry.Point([-58.4325, -34.6066]);

var inicio = '2018-07-01';
var fin = '2026-09-01'; // exclusivo

var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
  .filterDate(inicio, fin)
  .filter(ee.Filter.calendarRange(16, 18, 'hour'))
  .select([
    'u_component_of_wind_10m',   // viento oeste→este (m/s)
    'v_component_of_wind_10m',   // viento sur→norte (m/s)
    'temperature_2m',            // temperatura (Kelvin)
    'dewpoint_temperature_2m'    // punto de rocío (Kelvin), para calcular humedad
  ]);

var tabla = era5.map(function (img) {
  var valores = img.reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: punto,
    scale: 11132 // grilla de ERA5-Land (~11 km)
  });
  return ee.Feature(null, valores)
    .set('fecha', img.date().format('YYYY-MM-dd'))
    .set('hora_utc', img.date().get('hour'));
});

Export.table.toDrive({
  collection: tabla,
  description: 'era5_meteo_caba',
  folder: 'RESPIRA_GEE',
  fileFormat: 'CSV'
});
