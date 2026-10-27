"""Filtra las vías principales de OSM (fuentes de presión vial: avenidas y autopistas) a CABA.

Uso:
    python codigo/filtrar_osm_vias_principales.py datasets/osm_vias_principales_caba.csv datasets/comunas.zip datasets_procesados/osm_vias_principales_caba__filtrado.csv

Solo recorta filas y columnas: no modifica ningún valor. Decisiones (ver decisiones.md, 2026-10-27):
- Quedan todos los tipos de vía (autopistas, avenidas y sus ramales): todos son tránsito.
- Salen los tramos cuyo punto medio cae fuera de CABA.
- Quedan `lanes` y `maxspeed` (acá están completas en ~90 % y miden la intensidad del tránsito) y `oneway`
  (las avenidas con boulevard están dibujadas como dos líneas de mano única: sirve para no contarlas dos veces).
- De `otras_etiquetas` pasan a columna propia `hgv` (tránsito pesado), `bridge` (autopista elevada) y `tunnel`.
- Salen las columnas de caminabilidad (ya están en la red peatonal) y el resto de `otras_etiquetas`.
"""
import io, sys, zipfile
import pandas as pd
import shapefile  # pyshp
from shapely import wkt as WKT
from shapely.geometry import shape
from shapely.ops import unary_union

COLUMNAS_QUE_SALEN = ['foot', 'sidewalk', 'surface', 'lit', 'access', 'bicycle', 'leisure', 'natural',
                      'cant_puntos', 'otras_etiquetas']
ETIQUETAS_A_COLUMNA = ['hgv', 'bridge', 'tunnel']

def etiqueta(celda, clave):
    if not isinstance(celda, str):
        return None
    for par in celda.split(' | '):
        k, _, v = par.partition('=')
        if k.strip() == clave:
            return v.strip()
    return None

def limite_caba(ruta_zip):
    z = zipfile.ZipFile(ruta_zip)
    base = [n[:-4] for n in z.namelist() if n.endswith('.shp')][0]
    r = shapefile.Reader(shp=io.BytesIO(z.read(base + '.shp')), dbf=io.BytesIO(z.read(base + '.dbf')),
                         shx=io.BytesIO(z.read(base + '.shx')))
    return unary_union([shape(s.__geo_interface__) for s in r.shapes()])

entrada, comunas, salida = sys.argv[1:4]
d = pd.read_csv(entrada, encoding='utf-8-sig', low_memory=False, dtype=str)
caba = limite_caba(comunas)
dentro = d['wkt'].map(lambda w: caba.contains(WKT.loads(w).representative_point()))
f = d[dentro].copy()
pos = f.columns.get_loc('oneway') + 1
for i, clave in enumerate(ETIQUETAS_A_COLUMNA):
    f.insert(pos + i, clave, f['otras_etiquetas'].map(lambda c: etiqueta(c, clave)))
f = f.drop(columns=COLUMNAS_QUE_SALEN)
f.to_csv(salida, index=False, encoding='utf-8-sig')
print(f'Original: {len(d)} · Filtrado: {len(f)} · Fuera de CABA: {(~dentro).sum()}')
print(f'Columnas: {list(f.columns)}')
