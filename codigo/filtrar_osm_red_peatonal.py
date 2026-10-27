"""Filtra la red de calles y sendas de OSM: deja solo las vías donde se puede correr, dentro de CABA.

Uso:
    python codigo/filtrar_osm_red_peatonal.py datasets/osm_red_peatonal_caba.csv datasets/osm_parques_complemento_caba.csv datasets/comunas.zip datasets_procesados/osm_red_peatonal_caba__filtrado.csv

Solo recorta filas y columnas: no modifica ningún valor. Decisiones (ver decisiones.md, 2026-10-27):
- Se suman a la red los parques, reservas y jardines de `osm_parques_complemento_caba.csv` (cargados en OSM
  como relaciones, por ejemplo la Reserva Ecológica Costanera Sur o el Parque Indoamericano).
- Filas que quedan: los tipos de vía de TIPOS_QUE_QUEDAN, más parques, reservas, jardines, pistas y espejos de
  agua (capas de apoyo).
- Filas que salen: service, steps, *_link, trunk, corridor, raceway; todo tramo con foot=no (prohibido caminar);
  elementos sin geometría; y los tramos cuyo punto medio cae fuera de CABA (OSM trae todo lo que toca el límite,
  como la General Paz o el Riachuelo).
- Columnas que salen: foot, access, bicycle, oneway, cant_puntos, maxspeed y lanes (repiten el tipo de vía).
- De `otras_etiquetas` se pasan a columna propia footway, crossing, smoothness, tunnel y area (mismo valor, sin
  cambios); el resto de las etiquetas se descarta junto con la columna `otras_etiquetas`.
  `area=yes` marca plazas secas y explanadas: son superficies, no líneas, y su `largo_m` es el perímetro.
"""
import io, sys, zipfile
import pandas as pd
import shapefile  # pyshp
from shapely import wkt as WKT
from shapely.geometry import shape
from shapely.ops import unary_union

TIPOS_QUE_QUEDAN = ['residential', 'footway', 'secondary', 'tertiary', 'primary', 'pedestrian',
                    'cycleway', 'living_street', 'path', 'unclassified', 'track']
CAPAS_DE_APOYO = {'leisure': ['park', 'track', 'nature_reserve', 'garden'], 'natural': ['water']}
COLUMNAS_QUE_SALEN = ['foot', 'access', 'bicycle', 'oneway', 'cant_puntos', 'maxspeed', 'lanes', 'otras_etiquetas']
ETIQUETAS_A_COLUMNA = ['footway', 'crossing', 'smoothness', 'tunnel', 'area']

def etiqueta(celda, clave):
    """Devuelve el valor de `clave` dentro de otras_etiquetas ('k=v | k=v'), o vacío si no está."""
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

red, complemento, comunas, salida = sys.argv[1:5]
d = pd.concat([pd.read_csv(p, encoding='utf-8-sig', low_memory=False, dtype=str) for p in (red, complemento)],
              ignore_index=True).drop_duplicates(subset=['osm_tipo', 'osm_id'])
n0 = len(d)

es_via = d['highway'].isin(TIPOS_QUE_QUEDAN)
es_capa = d['highway'].isna() & (d['leisure'].isin(CAPAS_DE_APOYO['leisure']) | d['natural'].isin(CAPAS_DE_APOYO['natural']))
prohibido_caminar = d['foot'].eq('no')
sin_geometria = d['wkt'].str.contains('EMPTY') | d['wkt'].str.startswith('GEOMETRYCOLLECTION')
f = d[(es_via | es_capa) & ~prohibido_caminar & ~sin_geometria].copy()
n_tipo = n0 - len(f)

caba = limite_caba(comunas)
dentro = f['wkt'].map(lambda w: caba.contains(WKT.loads(w).representative_point()))
f = f[dentro]

pos = f.columns.get_loc('lit') + 1
for i, clave in enumerate(ETIQUETAS_A_COLUMNA):
    f.insert(pos + i, clave, f['otras_etiquetas'].map(lambda c: etiqueta(c, clave)))
f = f.drop(columns=COLUMNAS_QUE_SALEN)
f.to_csv(salida, index=False, encoding='utf-8-sig')

print(f'Red + complemento: {n0} elementos · Filtrado: {len(f)} · Salieron: {n0 - len(f)}')
print(f'  por tipo de vía, foot=no o sin geometría: {n_tipo} · fuera de CABA: {(~dentro).sum()}')
print(f'Columnas: {list(f.columns)}')
