// =====================================================================
// RESPIRA — NO2 troposférico (Sentinel-5P / TROPOMI) para CABA
// Se corre en Google Earth Engine: https://code.earthengine.google.com
// Produce 2 CSV en tu Google Drive (carpeta "RESPIRA_GEE"):
//   1. no2_comunas_mensual.csv  -> promedio mensual de NO2 por comuna
//   2. no2_estaciones_diario.csv -> NO2 diario alrededor de las estaciones APrA
//      (sirve para validar el dato satelital contra las mediciones de tierra)
// Unidad de salida: micromoles por m² (µmol/m²) de NO2 en la columna troposférica.
//
// Recuperado el 2026-11-02 de la conversación del 2026-10-05 en la que se
// escribió y se corrió (versión final, con el selector de año en el mapa).
// Los CSV de datasets/ salieron de esta versión, con la línea de "comunas"
// apuntando al asset del proyecto (projects/respiracaba/assets/comunas).
// =====================================================================

// ---------- 1. CONFIGURACIÓN (lo único que hay que tocar) ----------

// Ruta del asset con los polígonos de las comunas subidos a Earth Engine
// (el shapefile de datasets/comunas.zip). Se ve en la pestaña "Assets".
var comunas = ee.FeatureCollection('projects/respiracaba/assets/comunas');

// Período: el satélite tiene datos desde julio de 2018.
// "fin" es exclusivo: '2026-09-01' incluye hasta agosto de 2026.
var inicio = '2018-07-01';
var fin = '2026-09-01';

// Estaciones APrA (coordenadas APROXIMADAS: verificarlas con el dataset
// "Estaciones ambientales" de data.buenosaires.gob.ar y corregir si hace falta).
var estaciones = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-58.3913, -34.5996]).buffer(2000), {estacion: 'CORDOBA'}),
  ee.Feature(ee.Geometry.Point([-58.4325, -34.6066]).buffer(2000), {estacion: 'CENTENARIO'}),
  ee.Feature(ee.Geometry.Point([-58.3658, -34.6252]).buffer(2000), {estacion: 'LA_BOCA'})
]);

// ---------- 2. DATOS SATELITALES ----------

// Producto L3 "offline" de Copernicus. Earth Engine ya descarta los píxeles
// de baja calidad (qa_value < 0.75), por ejemplo los nublados.
var no2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
  .select('tropospheric_NO2_column_number_density')
  .filterDate(inicio, fin)
  .filterBounds(comunas);

var ESCALA = 1113.2; // tamaño de grilla del producto (~1,1 km)

// ---------- 3. PROMEDIO MENSUAL POR COMUNA ----------

var start = ee.Date(inicio);
var nMeses = ee.Date(fin).difference(start, 'month').round();
var meses = ee.List.sequence(0, nMeses.subtract(1));

var porMes = ee.FeatureCollection(meses.map(function (m) {
  var d0 = start.advance(m, 'month');
  var d1 = d0.advance(1, 'month');
  var img = no2.filterDate(d0, d1).mean()
    .multiply(1e6)                 // mol/m² -> µmol/m²
    .rename('no2_umol_m2');
  var stats = img.reduceRegions({
    collection: comunas,
    // mean = promedio de la comuna; count = cuántos píxeles válidos entraron
    reducer: ee.Reducer.mean().combine(ee.Reducer.count(), '', true),
    scale: ESCALA
  });
  return stats.map(function (f) {
    return f.set('mes', d0.format('YYYY-MM')).setGeometry(null);
  });
})).flatten();

Export.table.toDrive({
  collection: porMes,
  description: 'no2_comunas_mensual',
  folder: 'RESPIRA_GEE',
  fileFormat: 'CSV'
});

// ---------- 4. SERIE DIARIA EN LAS ESTACIONES (validación) ----------

var diario = no2.filterBounds(estaciones).map(function (img) {
  var stats = img.multiply(1e6).reduceRegions({
    collection: estaciones,
    reducer: ee.Reducer.mean(),
    scale: ESCALA
  });
  return stats.map(function (f) {
    return f.set('fecha', img.date().format('YYYY-MM-dd')).setGeometry(null);
  });
}).flatten().filter(ee.Filter.notNull(['mean'])); // descarta días nublados

Export.table.toDrive({
  collection: diario,
  description: 'no2_estaciones_diario',
  folder: 'RESPIRA_GEE',
  fileFormat: 'CSV'
});

// ---------- 5. MAPA CON SELECTOR DE AÑO (opcional) ----------
// Arriba a la izquierda del mapa aparece un menú para elegir el año.
// 2018 empieza en julio y 2026 llega hasta agosto (años incompletos).

var visParams = {min: 40, max: 160,
  palette: ['#2E4322', '#9DBB61', '#F6E7B4', '#EB473E', '#7A1C17']};
var capaComunas = comunas.style({color: 'black', fillColor: '00000000', width: 1});

function mostrarAnio(anio) {
  var a = Number(anio);
  var promedio = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
    .select('tropospheric_NO2_column_number_density')
    .filterDate(a + '-01-01', (a + 1) + '-01-01')
    .mean().multiply(1e6);
  Map.layers().reset();
  Map.addLayer(promedio, visParams, 'NO2 promedio ' + a + ' (µmol/m²)');
  Map.addLayer(capaComunas, {}, 'Comunas');
  Map.addLayer(estaciones, {color: 'blue'}, 'Estaciones APrA (radio 2 km)');
}

var selectorAnio = ui.Select({
  items: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
  value: '2019',
  onChange: mostrarAnio
});
Map.add(ui.Panel([ui.Label('Año del mapa de NO2:'), selectorAnio],
  ui.Panel.Layout.flow('horizontal'), {position: 'top-left'}));

Map.centerObject(comunas, 12);
mostrarAnio('2019');
