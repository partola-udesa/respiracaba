"""
RESPIRA — Capas extra por tramo: alergias a árboles y cercanía al agua
======================================================================

Qué hace
--------
Toma la red que arma codigo/construir_red_respirabilidad.py (app/datos/red.js)
y le agrega a cada tramo dos datos más, en un archivo aparte (app/datos/capas.js):

1. ALERGIAS (arbolado público lineal 2017-2018, especie por árbol)
   Para cada especie que el runner puede marcar en su perfil
   (plátano, fresno y ligustro) se cuenta, por tramo:
   - "cerca": árboles de esa especie a 25 m o menos del tramo (los que tiene al lado).
   - "sectores": árboles de esa especie entre 25 y 120 m del centro del tramo,
     repartidos en 8 direcciones (N, NE, E, SE, S, SO, O, NO).
   La app usa los sectores con el viento del pronóstico (Open-Meteo, hora por hora):
   los árboles que quedan del lado DE DONDE viene el viento son los que le
   tiran el polen encima al runner. La época del año se aplica en la app
   (app/datos.js, ESTACION_POLEN), porque cambia según la fecha de la salida.

2. AGUA (OpenStreetMap + límites de comunas)
   Distancia del centro del tramo al agua más cercana:
   - lagos y lagunas: polígonos natural=water de la red peatonal OSM
     (Lagos de Palermo, Lago Lugano, lagunas de la Reserva Ecológica…);
   - el Río de la Plata y el Riachuelo: el borde de la Ciudad (comunas.zip)
     menos el tramo que limita con la Av. General Paz, que no es agua.
   Puntaje: 150 m o menos = 100 · 800 m o más = 0.

Salida
------
    app/datos/capas.js   window.RESPIRA_CAPAS (se carga junto con red.js)
    Los conteos de árboles van como texto: un carácter por número en base 36
    (0-9 y a-z, tope 35) para que el archivo pese poco.
    "tope_100m" (por especie): árboles cada 100 m que tiene el 5 % de los tramos más cargados;
    la app lo usa como el 100 de la escala de riesgo.

Cómo correrlo (desde la carpeta del repo, después de construir_red_respirabilidad.py)
-------------------------------------------------------------------------------------
    pip install shapely numpy pyshp
    python3 codigo/construir_capas_alergias_agua.py
"""
import csv
import io
import json
import math
import time
import zipfile
from datetime import date

import numpy as np
import shapefile  # pyshp
import shapely

csv.field_size_limit(10**9)
t0 = time.time()
def log(*a): print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)

LON0, LAT0 = -58.44, -34.61
KX = 111320 * math.cos(math.radians(LAT0))
KY = 110540
def a_metros(c):
    c = np.asarray(c, dtype=float)
    return np.column_stack(((c[:, 0] - LON0) * KX, (c[:, 1] - LAT0) * KY))

def leer(ruta):
    with open(ruta, encoding='utf-8-sig') as f:
        yield from csv.DictReader(f)

# ---------------------------------------------------------------------------
# 0. La red ya armada
# ---------------------------------------------------------------------------
texto = open('app/datos/red.js', encoding='utf-8').read()
red = json.loads(texto[texto.index('=') + 1: texto.rstrip().rindex(';')])
E = red['escala_coordenadas']
nlon = np.array(red['nodos']['lon']) / E
nlat = np.array(red['nodos']['lat']) / E
t = red['tramos']
nT = len(t['a'])
lineas = []
for i in range(nT):
    a, b, g = t['a'][i], t['b'][i], t['geo'][i]
    pts = [(nlon[a], nlat[a])] + [(g[k] / E, g[k + 1] / E) for k in range(0, len(g), 2)] + [(nlon[b], nlat[b])]
    lineas.append(a_metros(pts))
lineas_m = np.array([shapely.linestrings(l) for l in lineas], dtype=object)
medio = shapely.line_interpolate_point(lineas_m, 0.5, normalized=True)
mx, my = shapely.get_x(medio), shapely.get_y(medio)
log('red leída:', nT, 'tramos')

# ---------------------------------------------------------------------------
# 1. ALERGIAS
# ---------------------------------------------------------------------------
ESPECIES = {   # género del nombre científico → clave de la app
    'platano': 'Platanus',
    'fresno': 'Fraxinus',
    'ligustro': 'Ligustrum',
}
CERCA_M, LEJOS_M = 25, 120
B36 = '0123456789abcdefghijklmnopqrstuvwxyz'
def a_texto(v):
    return ''.join(B36[min(35, int(x))] for x in v)

xy = {k: [] for k in ESPECIES}
for r in leer('datasets_procesados/arbolado-publico-lineal-2017-2018__filtrado.csv'):
    nombre = r['nombre_cientifico'] or ''
    for clave, genero in ESPECIES.items():
        if nombre.startswith(genero):
            try:
                xy[clave].append((float(r['long']), float(r['lat'])))
            except ValueError:
                pass
            break

linea_tree = shapely.STRtree(lineas_m)
polen = {}
for clave, puntos in xy.items():
    p = a_metros(puntos)
    geo = shapely.points(p)
    # a) al lado del tramo
    i_arbol, i_tramo = linea_tree.query(geo, predicate='dwithin', distance=CERCA_M)
    cerca = np.bincount(i_tramo, minlength=nT)
    # b) alrededor, por dirección (desde el centro del tramo hacia el árbol)
    arbol_tree = shapely.STRtree(geo)
    i_t, i_a = arbol_tree.query(medio, predicate='dwithin', distance=LEJOS_M)
    dx, dy = p[i_a, 0] - mx[i_t], p[i_a, 1] - my[i_t]
    lejos = np.hypot(dx, dy) > CERCA_M
    i_t, dx, dy = i_t[lejos], dx[lejos], dy[lejos]
    rumbo = (np.degrees(np.arctan2(dx, dy)) + 360) % 360          # 0 = norte, 90 = este
    sector = np.round(rumbo / 45).astype(int) % 8                    # 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SO, 6 O, 7 NO
    sectores = np.bincount(i_t * 8 + sector, minlength=nT * 8)
    # Tope de la escala: el 5 % de los tramos con más árboles de esa especie al lado (cada 100 m) = 100.
    # Es por especie porque el fresno es el 40 % del arbolado y el ligustro mucho menos.
    por100 = np.minimum(cerca, 35) * 100 / np.maximum(shapely.length(lineas_m), 30)
    tope = float(np.percentile(por100, 95))
    polen[clave] = {'cerca': a_texto(cerca), 'sectores': a_texto(sectores), 'tope_100m': round(max(tope, 1.0), 1)}
    log(f'{clave}: {len(puntos)} árboles · tope {tope:.1f} cada 100 m · tramos con alguno al lado: {int((cerca > 0).sum())}'
        f' · p95 cerca {np.percentile(cerca, 95):.0f} · p95 sector {np.percentile(sectores, 95):.0f}')

# ---------------------------------------------------------------------------
# 2. AGUA
# ---------------------------------------------------------------------------
lagos = []
for r in leer('datasets_procesados/osm_red_peatonal_caba__filtrado.csv'):
    if r['natural'] == 'water' and r['wkt'].startswith(('POLYGON', 'MULTIPOLYGON')):
        lagos.append(shapely.transform(shapely.from_wkt(r['wkt']), a_metros))
log('lagos y lagunas OSM:', len(lagos))

with zipfile.ZipFile('datasets/comunas.zip') as z:
    base = next(n[:-4] for n in z.namelist() if n.lower().endswith('.shp'))
    sf = shapefile.Reader(shp=io.BytesIO(z.read(base + '.shp')), shx=io.BytesIO(z.read(base + '.shx')),
                          dbf=io.BytesIO(z.read(base + '.dbf')))
    comunas = [shapely.geometry.shape(s.__geo_interface__) for s in sf.shapes()]
ciudad = shapely.union_all([shapely.transform(c, a_metros) for c in comunas]).buffer(1).buffer(-1)
borde = shapely.boundary(ciudad)

gral_paz = []
for r in leer('datasets_procesados/osm_vias_principales_caba__filtrado.csv'):
    if 'General Paz' in (r['name'] or '') and r['wkt'].startswith('LINESTRING'):
        gral_paz.append(shapely.transform(shapely.from_wkt(r['wkt']), a_metros))
costa = shapely.difference(borde, shapely.union_all(gral_paz).buffer(400))
log(f'borde de la Ciudad {shapely.length(borde)/1000:.1f} km · costa (río + Riachuelo) {shapely.length(costa)/1000:.1f} km')

agua_geo = shapely.union_all(lagos + [costa])
agua_m = shapely.distance(medio, agua_geo)
agua = np.clip((800 - agua_m) / (800 - 150) * 100, 0, 100).round().astype(int)
log('tramos a 150 m o menos del agua:', int((agua_m <= 150).sum()))

# ---------------------------------------------------------------------------
# 3. EXPORTAR
# ---------------------------------------------------------------------------
capas = {
    'version': 1,
    'generado': date.today().isoformat(),
    'tramos': nT,
    'fuentes': {
        'polen': 'Arbolado público lineal 2017-2018 (BA Data): especie y ubicación de cada árbol',
        'agua': 'OpenStreetMap (natural=water) + borde de la Ciudad (comunas, BA Data) sin el límite de la Av. General Paz',
    },
    'polen_parametros': {'cerca_m': CERCA_M, 'lejos_m': LEJOS_M,
                         'sectores': ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], 'tope': 35},
    'polen': polen,
    'agua': agua.tolist(),
    'agua_m': np.minimum(agua_m, 5000).round().astype(int).tolist(),
}
with open('app/datos/capas.js', 'w', encoding='utf-8') as f:
    f.write('/* Generado por codigo/construir_capas_alergias_agua.py — no editar a mano */\nwindow.RESPIRA_CAPAS=')
    json.dump(capas, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
log('capas.js listo')
