// RESPIRA — NO2 satelital en grilla (un valor por píxel y por mes)
// Se corre en https://code.earthengine.google.com (pegar todo y tocar "Run").
// Fuente: Copernicus Sentinel-5P / TROPOMI, colección COPERNICUS/S5P/OFFL/L3_NO2
// Banda: tropospheric_NO2_column_number_density (mol/m²) → se pasa a µmol/m² (× 1.000.000),
//        la misma unidad que no2_comunas_mensual.csv y no2_estaciones_diario.csv.
// Píxel: el de la colección en GEE (0,01° ≈ 1,1 km). OJO: es una grilla remuestreada; el
// satélite mide en manchas de ~3,5 × 5,5 km. Es NO2 "de la zona", no "de la cuadra".
// No se recorta a CABA acá: se baja un rectángulo un poco más grande y el recorte con
// comunas.zip se hace después en Python.
// Salida: datasets/no2_grilla_mensual.csv

var zona = ee.Geometry.Rectangle([-58.55, -34.72, -58.32, -34.51]);  // CABA + margen
var banda = 'tropospheric_NO2_column_number_density';

var col = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
  .select(banda)
  .filterBounds(zona);

var proj = col.first().projection();           // grilla original del satélite
var inicio = ee.Date('2018-07-01');            // mismo período que los otros NO2
var fin = ee.Date('2026-09-01');               // (no incluido: termina en agosto 2026)
var nMeses = fin.difference(inicio, 'month').round();
var meses = ee.List.sequence(0, nMeses.subtract(1));

var porMes = ee.FeatureCollection(meses.map(function (i) {
  var d0 = inicio.advance(i, 'month');
  var d1 = d0.advance(1, 'month');
  var delMes = col.filterDate(d0, d1);
  var puntos = ee.Algorithms.If(
    delMes.size().gt(0),
    delMes.mean().multiply(1e6).rename('no2_umol_m2')
      .addBands(delMes.count().rename('n_obs'))      // cuántas pasadas válidas tuvo el píxel
      .addBands(ee.Image.pixelLonLat())               // centro del píxel
      .sample({region: zona, projection: proj, geometries: false})
      .map(function (f) { return f.set('mes', d0.format('YYYY-MM')); }),
    ee.FeatureCollection([])
  );
  return ee.FeatureCollection(puntos);
})).flatten();

print('Ejemplo de filas:', porMes.limit(5));
Map.centerObject(zona, 11);
Map.addLayer(col.filterDate(inicio, fin).mean().multiply(1e6),
  {min: 50, max: 250, palette: ['2c7bb6', 'ffffbf', 'd7191c']}, 'NO2 promedio 2018–2026');

Export.table.toDrive({
  collection: porMes,
  description: 'no2_grilla_mensual',
  fileFormat: 'CSV',
  selectors: ['mes', 'longitude', 'latitude', 'no2_umol_m2', 'n_obs']
});
