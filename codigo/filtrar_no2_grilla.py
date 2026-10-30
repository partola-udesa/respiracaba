"""Recorta la grilla mensual de NO2 satelital (Sentinel-5P) a los píxeles que tocan CABA.

Uso:
    python codigo/filtrar_no2_grilla.py datasets/no2_grilla_mensual.csv datasets/comunas.zip datasets_procesados/no2_grilla_mensual__filtrado.csv

Solo recorta filas: no modifica ningún valor ni columna. Decisiones (ver decisiones.md, 2026-10-30):
- Cada fila es un píxel de 0,01° × 0,01° (≈ 1,1 km) en un mes; longitude/latitude son su centro.
- Queda el píxel si su cuadrado toca el límite de CABA (aunque sea en parte), no solo si el centro cae
  adentro: así las calles del borde (General Paz, Riachuelo, Costanera) también reciben un valor de NO2.
"""
import io, sys, zipfile
import pandas as pd
import shapefile  # pyshp
from shapely.geometry import shape, box
from shapely.ops import unary_union

MEDIO_PIXEL = 0.005  # grados

def limite_caba(ruta_zip):
    z = zipfile.ZipFile(ruta_zip)
    base = [n[:-4] for n in z.namelist() if n.endswith('.shp')][0]
    r = shapefile.Reader(shp=io.BytesIO(z.read(base + '.shp')), dbf=io.BytesIO(z.read(base + '.dbf')),
                         shx=io.BytesIO(z.read(base + '.shx')))
    return unary_union([shape(s.__geo_interface__) for s in r.shapes()])

entrada, comunas, salida = sys.argv[1:4]
d = pd.read_csv(entrada, dtype=str)
caba = limite_caba(comunas)
pixeles = d[['longitude', 'latitude']].drop_duplicates()
toca = {}
centro_adentro = 0
for lon_s, lat_s in pixeles.itertuples(index=False):
    lon, lat = float(lon_s), float(lat_s)
    cuadrado = box(lon - MEDIO_PIXEL, lat - MEDIO_PIXEL, lon + MEDIO_PIXEL, lat + MEDIO_PIXEL)
    toca[(lon_s, lat_s)] = caba.intersects(cuadrado)
    centro_adentro += caba.contains(cuadrado.centroid)
dentro = [toca[(a, b)] for a, b in zip(d['longitude'], d['latitude'])]
f = d[dentro]
f.to_csv(salida, index=False)
n_quedan = sum(toca.values())
print(f'Píxeles: {len(pixeles)} · tocan CABA: {n_quedan} (con el centro adentro: {centro_adentro}) · salen: {len(pixeles) - n_quedan}')
print(f'Filas: {len(d)} → {len(f)} · meses: {f["mes"].nunique()}')
