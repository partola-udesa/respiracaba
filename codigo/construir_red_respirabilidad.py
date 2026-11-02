"""
RESPIRA — Red peatonal con índice de respirabilidad por tramo
=============================================================

Qué hace
--------
Toma la red peatonal de OpenStreetMap (calles y sendas de CABA), la corta en
tramos de esquina a esquina y a cada tramo le calcula un puntaje por condición
cruzándolo con los datasets procesados:

    condición (pantalla "Personalizá…")   dataset que la alimenta
    ------------------------------------  ---------------------------------------------
    Más vegetación                         arbolado público lineal + espacios verdes
    Mejor calidad de aire                  NO2 satelital en grilla (Sentinel-5P)
    Menos ruido                            Mapa de ruido 2018 (diurno y nocturno)
    Menos tránsito                         vías principales OSM + pasadas de colectivos (GTFS)
    Más sombra                             arbolado público lineal (altura de los árboles)
    Terreno regular                        superficie y estado del tramo (OSM surface/smoothness)
    Calles iluminadas                      iluminación del tramo (OSM lit)

Todos los puntajes van de 0 a 100 y "más alto = mejor para correr".
El índice de respirabilidad del tramo es el promedio de los cuatro principales
(vegetación, aire, ruido de día y tránsito) y NO cambia con las preferencias:
las preferencias solo cambian qué recorrido se elige.

Salida
------
    app/datos/red.js       la red (nodos, tramos y puntajes) que usa la app para armar recorridos
    app/datos/lugares.js   espacios verdes y calles para sugerir puntos de partida y llegada
    Son archivos .js (y no .json) para que la app funcione también abriendo index.html
    con doble clic, sin servidor: un <script> se puede cargar desde el disco y un fetch no.

Cómo correrlo (desde la carpeta del repo)
-----------------------------------------
    pip install shapely numpy
    python3 codigo/construir_red_respirabilidad.py
"""
import csv
import json
import math
import re
import time
from collections import defaultdict
from datetime import date

import numpy as np
import shapely

csv.field_size_limit(10**9)
BASE = 'datasets_procesados/'
SALIDA = 'app/datos/'
t0 = time.time()
def log(*a): print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)

# --- Proyección simple a metros (alcanza para una ciudad del tamaño de CABA) ---
LON0, LAT0 = -58.44, -34.61
KX = 111320 * math.cos(math.radians(LAT0))
KY = 110540
def a_metros(c):  # c: array (n, 2) lon/lat → metros
    return np.column_stack(((c[:, 0] - LON0) * KX, (c[:, 1] - LAT0) * KY))
def geom_metros(g):
    return shapely.transform(g, a_metros)

NUM = re.compile(r'-?\d+\.?\d*')
def coords_linestring(wkt):
    v = [float(x) for x in NUM.findall(wkt)]
    return list(zip(v[0::2], v[1::2]))

def leer(nombre):
    with open(BASE + nombre, encoding='utf-8-sig') as f:
        yield from csv.DictReader(f)

# =========================================================================
# 1. RED PEATONAL → tramos de esquina a esquina
# =========================================================================
CLASE_TRANSITO = {  # cuánto tránsito vehicular implica cada tipo de vía (0–100)
    'motorway': 100, 'trunk': 95, 'primary': 85, 'secondary': 70, 'tertiary': 50, 'unclassified': 35,
    'residential': 25, 'service': 20, 'living_street': 10, 'pedestrian': 5, 'cycleway': 5,
    'footway': 0, 'path': 0, 'track': 0, 'steps': 0}
CALLES = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service'}

vias = []
for r in leer('osm_red_peatonal_caba__filtrado.csv'):
    if not r['highway'] or not r['wkt'].startswith('LINESTRING') or r['area'] == 'yes':
        continue
    c = [(round(x, 7), round(y, 7)) for x, y in coords_linestring(r['wkt'])]
    if len(c) >= 2:
        vias.append((c, r))
log('vías leídas', len(vias))

usos = defaultdict(int)
for c, _ in vias:
    for p in set(c):
        usos[p] += 1
    usos[c[0]] += 1; usos[c[-1]] += 1   # los extremos siempre cortan

tramos = []  # (coords, fila)
for c, r in vias:
    actual = [c[0]]
    for p in c[1:]:
        actual.append(p)
        if usos[p] >= 2:
            if len(actual) >= 2: tramos.append((actual, r))
            actual = [p]
    if len(actual) >= 2: tramos.append((actual, r))

# Nodos = esquinas. Nos quedamos con la parte conectada más grande de la red.
id_nodo = {}
def nodo(p):
    if p not in id_nodo: id_nodo[p] = len(id_nodo)
    return id_nodo[p]
ab = [(nodo(c[0]), nodo(c[-1])) for c, _ in tramos]
padre = list(range(len(id_nodo)))
def raiz(i):
    while padre[i] != i:
        padre[i] = padre[padre[i]]; i = padre[i]
    return i
for a, b in ab:
    ra, rb = raiz(a), raiz(b)
    if ra != rb: padre[ra] = rb
tam = defaultdict(int)
for i in range(len(padre)): tam[raiz(i)] += 1
mayor = max(tam, key=tam.get)
tramos = [t for t, (a, b) in zip(tramos, ab) if raiz(a) == mayor and a != b]
log('tramos en la red conectada', len(tramos), f'(nodos {tam[mayor]} de {len(padre)})')

# Geometría de cada tramo en metros, largo y puntos de muestra cada ~20 m
lineas = np.array([shapely.linestrings(c) for c, _ in tramos], dtype=object)
lineas_m = geom_metros(lineas)
largos = shapely.length(lineas_m)
n_muestras = np.maximum(1, np.round(largos / 20)).astype(int)
muestra_tramo = np.repeat(np.arange(len(tramos)), n_muestras)
fracciones = np.concatenate([(np.arange(n) + 0.5) / n for n in n_muestras])
muestras = shapely.line_interpolate_point(lineas_m[muestra_tramo], fracciones, normalized=True)
mx, my = shapely.get_x(muestras), shapely.get_y(muestras)
log('puntos de muestra', len(muestras))

def promedio_por_tramo(valores_muestra):
    """Promedio por tramo ignorando NaN."""
    ok = ~np.isnan(valores_muestra)
    s = np.bincount(muestra_tramo[ok], weights=valores_muestra[ok], minlength=len(tramos))
    n = np.bincount(muestra_tramo[ok], minlength=len(tramos))
    with np.errstate(invalid='ignore', divide='ignore'):
        return np.where(n > 0, s / np.maximum(n, 1), np.nan)

# =========================================================================
# 2. VEGETACIÓN y SOMBRA — arbolado lineal + espacios verdes
# =========================================================================
arb_xy, arb_alto = [], []
for r in leer('arbolado-publico-lineal-2017-2018__filtrado.csv'):
    try:
        arb_xy.append((float(r['long']), float(r['lat'])))
        arb_alto.append(min(float(r['altura_arbol'] or 0), 25))
    except ValueError:
        pass
arb_m = a_metros(np.array(arb_xy)); arb_alto = np.array(arb_alto)
arbol_tree = shapely.STRtree(shapely.points(arb_m))
i_m, i_a = arbol_tree.query(muestras, predicate='dwithin', distance=15)
pares = np.unique(np.column_stack((muestra_tramo[i_m], i_a)), axis=0)   # cada árbol cuenta una vez por tramo
arboles = np.bincount(pares[:, 0], minlength=len(tramos))
altura_sum = np.bincount(pares[:, 0], weights=arb_alto[pares[:, 1]], minlength=len(tramos))
cada100 = 100 / np.maximum(largos, 20)
arboles_100m = arboles * cada100
log('árboles cruzados', len(arb_xy))

verdes, verdes_nombre, verdes_peso = [], [], []
for r in leer('espacio_verde_publico__filtrado.csv'):
    try:
        verdes.append(shapely.from_wkt(r['geometry'])); verdes_nombre.append((r['nombre'], r['clasificac']))
        # Cuánto "verde" aporta: una plaza de 1 ha o más cuenta entero; un cantero central de avenida, poco.
        peso = min(1.0, math.sqrt(float(r['area'] or 0) / 10000))
        verdes_peso.append(peso * (0.25 if r['clasificac'] == 'CANTERO CENTRAL' else 1.0))
    except Exception:
        pass
verdes_peso = np.array(verdes_peso)
verdes_m = geom_metros(np.array(verdes, dtype=object))
verde_tree = shapely.STRtree(verdes_m)
i_m, i_v = verde_tree.query(muestras, predicate='dwithin', distance=20)
cerca_verde = np.zeros(len(muestras)); np.maximum.at(cerca_verde, i_m, verdes_peso[i_v])
frac_verde = promedio_por_tramo(cerca_verde)
en_parque = np.array([r['leisure'] in ('park', 'garden', 'nature_reserve') for _, r in tramos])
frac_verde = np.where(en_parque, 1.0, frac_verde)
log('espacios verdes', len(verdes))

# =========================================================================
# 3. RUIDO — Mapa de ruido 2018 (polígonos por rango de dB)
# =========================================================================
def ruido(nombre):
    partes, valor = [], []
    for r in leer(nombre):
        g = shapely.get_parts(shapely.from_wkt(r['wkt']))
        db = (float(r['limite_inferior_rango_db']) + float(r['limite_superior_rango_db'])) / 2
        partes.extend(g); valor.extend([db] * len(g))
    partes = geom_metros(np.array(partes, dtype=object)); valor = np.array(valor)
    tree = shapely.STRtree(partes)
    i_m, i_p = tree.query(muestras, predicate='within')
    db = np.full(len(muestras), np.nan)
    db[i_m] = valor[i_p]
    return promedio_por_tramo(db)
db_dia = ruido('medicion_de_ruido_diurno_2018__filtrado.csv')
db_noche = ruido('medicion_de_ruido_nocturno_2018__filtrado.csv')
log('ruido: tramos sin dato', int(np.isnan(db_dia).sum()))

# =========================================================================
# 4. AIRE — NO2 satelital (promedio de los 12 meses más recientes, por píxel de ~1 km)
# =========================================================================
no2_val = defaultdict(list)
meses = sorted({r['mes'] for r in leer('no2_grilla_mensual__filtrado.csv')})[-12:]
for r in leer('no2_grilla_mensual__filtrado.csv'):
    if r['mes'] in meses:
        no2_val[(round(float(r['longitude']), 3), round(float(r['latitude']), 3))].append(float(r['no2_umol_m2']))
pix = np.array(list(no2_val.keys())); pix_v = np.array([np.mean(v) for v in no2_val.values()])
pix_tree = shapely.STRtree(shapely.points(a_metros(pix)))
medio = shapely.line_interpolate_point(lineas_m, 0.5, normalized=True)
cerca = pix_tree.query_nearest(medio, all_matches=False)[1]   # píxel más cercano al centro del tramo
no2 = pix_v[cerca]
log('NO2: meses', meses[0], '→', meses[-1])

# =========================================================================
# 5. TRÁNSITO — tipo de vía (OSM) + pasadas de colectivos por hora (GTFS)
# =========================================================================
pasadas = defaultdict(list)
for r in leer('colectivos-gtfs__pasadas_por_tramo_franja.csv'):
    if r['tipo_dia'] == 'habil' and r['franja'] in ('manana', 'mediodia', 'tarde'):
        pasadas[r['osm_id']].append(float(r['pasadas_por_hora']))
pasadas = {k: sum(v) / 3 for k, v in pasadas.items()}

calles_geo, calles_carga = [], []
def carga_de(highway, osm_id):
    bus = min(100, pasadas.get(osm_id, 0) * 1.5)
    return 0.7 * CLASE_TRANSITO.get(highway, 20) + 0.3 * bus
for c, r in vias:
    if r['highway'] in CALLES:
        calles_geo.append(shapely.linestrings(c)); calles_carga.append(carga_de(r['highway'], r['osm_id']))
for r in leer('osm_vias_principales_caba__filtrado.csv'):
    if r['wkt'].startswith('LINESTRING'):
        calles_geo.append(shapely.linestrings(coords_linestring(r['wkt']))); calles_carga.append(carga_de(r['highway'], r['osm_id']))
calles_m = geom_metros(np.array(calles_geo, dtype=object)); calles_carga = np.array(calles_carga)
calle_tree = shapely.STRtree(calles_m)
i_t, i_c = calle_tree.query(medio, predicate='dwithin', distance=18)   # la vereda "hereda" el tránsito de la calle de al lado
carga = np.array([carga_de(r['highway'], r['osm_id']) for _, r in tramos])
np.maximum.at(carga, i_t, calles_carga[i_c])
log('tránsito cruzado con', len(calles_geo), 'calles')

# =========================================================================
# 6. TERRENO e ILUMINACIÓN — atributos OSM del tramo
# =========================================================================
SUPERFICIE = {'asphalt': 100, 'concrete': 95, 'paving_stones': 85, 'paved': 90, 'concrete:plates': 85, 'metal': 70,
              'sett': 60, 'cobblestone': 50, 'pebblestone': 45, 'clay': 55, 'compacted': 70, 'fine_gravel': 65,
              'gravel': 45, 'dirt': 40, 'ground': 40, 'grass': 35, 'unpaved': 45, 'sand': 25}
ESTADO = {'excellent': 10, 'good': 5, 'intermediate': -10, 'bad': -25, 'very_bad': -40, 'horrible': -50}
terreno = np.array([max(0, min(100, SUPERFICIE.get(r['surface'], 80) + ESTADO.get(r['smoothness'], 0))) for _, r in tramos])
luz = np.array([100 if r['lit'] not in ('', 'no') else (15 if r['lit'] == 'no' else 55) for _, r in tramos])

# =========================================================================
# 7. PUNTAJES 0–100 (más alto = mejor para correr)
# =========================================================================
def recortar(v): return np.clip(np.nan_to_num(v, nan=50), 0, 100).round().astype(int)
def rellenar(v):  # tramos sin dato: mediana de los tramos del mismo tipo de vía
    v = v.copy(); tipos = np.array([r['highway'] for _, r in tramos])
    for t in set(tipos):
        m = tipos == t
        if np.isnan(v[m]).all(): continue
        v[m & np.isnan(v)] = np.nanmedian(v[m])
    v[np.isnan(v)] = np.nanmedian(v)
    return v
db_dia, db_noche = rellenar(db_dia), rellenar(db_noche)

p_arbol = np.clip(arboles_100m / 14 * 100, 0, 100)                # 14 árboles cada 100 m (una cuadra bien arbolada, dos veredas) = 100
p_veg = recortar(0.55 * p_arbol + 0.45 * frac_verde * 100)
p_sombra = recortar(altura_sum * cada100 / 180 * 100)              # ~14 árboles de 13 m cada 100 m = 100
lo, hi = np.percentile(no2, [5, 95])
p_aire = recortar((hi - no2) / (hi - lo) * 100)                      # relativo a CABA: el NO2 más bajo de la ciudad = 100
p_ruido_dia = recortar((80 - db_dia) / 25 * 100)                     # 55 dB = 100 · 80 dB = 0
p_ruido_noche = recortar((75 - db_noche) / 25 * 100)                 # 50 dB = 100 · 75 dB = 0
p_transito = recortar(100 - carga)
p_terreno, p_luz = recortar(terreno), recortar(luz)
indice = np.round((p_veg + p_aire + p_ruido_dia + p_transito) / 4).astype(int)
log('índice medio de la red', round(float(np.average(indice, weights=largos)), 1))

# =========================================================================
# 8. EXPORTAR para la app
# =========================================================================
E5 = 1e5
lista_nodos = sorted(id_nodo.items(), key=lambda kv: kv[1])
usados = sorted({id_nodo[c[0]] for c, _ in tramos} | {id_nodo[c[-1]] for c, _ in tramos})
renum = {v: i for i, v in enumerate(usados)}
nodos_lon = [round(lista_nodos[v][0][0] * E5) for v in usados]
nodos_lat = [round(lista_nodos[v][0][1] * E5) for v in usados]

nombres, id_nombre = [], {}
def nombre_idx(n):
    if not n: return -1
    if n not in id_nombre: id_nombre[n] = len(nombres); nombres.append(n)
    return id_nombre[n]

geo = []
for linea in shapely.simplify(lineas, 0.00002):
    c = np.round(shapely.get_coordinates(linea) * E5).astype(int)[1:-1]   # solo los puntos intermedios
    plano = []
    for x, y in c: plano += [int(x), int(y)]
    geo.append(plano)

red = {
    'version': 1,
    'generado': date.today().isoformat(),
    'escala_coordenadas': E5,
    'fuentes': {
        'red': 'OpenStreetMap — red peatonal de CABA (osm_red_peatonal_caba__filtrado.csv)',
        'vegetacion': 'Arbolado público lineal 2017-2018 + Espacios verdes públicos (BA Data)',
        'sombra': 'Arbolado público lineal 2017-2018 (altura de los árboles)',
        'aire': f'NO2 troposférico Sentinel-5P, promedio {meses[0]} a {meses[-1]}',
        'ruido': 'Mapa de ruido de la Ciudad 2018, diurno y nocturno (BA Data)',
        'transito': 'Tipo de vía (OSM) + pasadas de colectivos por hora en día hábil (GTFS)',
        'terreno': 'Superficie y estado del tramo (OSM surface/smoothness)',
        'luz': 'Iluminación del tramo (OSM lit)'},
    'nodos': {'lon': nodos_lon, 'lat': nodos_lat},
    'tramos': {
        'a': [renum[id_nodo[c[0]]] for c, _ in tramos],
        'b': [renum[id_nodo[c[-1]]] for c, _ in tramos],
        'largo': np.round(largos).astype(int).tolist(),
        'geo': geo,
        'nombre': [nombre_idx(r['name']) for _, r in tramos],
        'indice': indice.tolist(),
        'vegetacion': p_veg.tolist(), 'aire': p_aire.tolist(),
        'ruido_dia': p_ruido_dia.tolist(), 'ruido_noche': p_ruido_noche.tolist(),
        'transito': p_transito.tolist(), 'sombra': p_sombra.tolist(),
        'terreno': p_terreno.tolist(), 'luz': p_luz.tolist(),
        # datos duros (para explicar con números reales)
        'arboles_100m': np.round(arboles_100m, 1).tolist(),
        'db_dia': np.round(db_dia).astype(int).tolist(),
        'no2': np.round(no2).astype(int).tolist()},
    'nombres': nombres}
with open(SALIDA + 'red.js', 'w', encoding='utf-8') as f:
    f.write('/* Generado por codigo/construir_red_respirabilidad.py — no editar a mano */\nwindow.RESPIRA_RED=')
    json.dump(red, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
log('red.js listo:', len(tramos), 'tramos,', len(usados), 'nodos')

# --- Lugares para el buscador: espacios verdes (centro) y calles (punto medio del tramo más largo)
lugares = []
vistos = set()
for g, (n, tipo) in zip(verdes, verdes_nombre):
    if not n or n.upper() in ('S/N', 'SIN NOMBRE'): continue
    p = shapely.point_on_surface(g)
    clave = (n.lower(), round(p.x, 2), round(p.y, 2))
    if clave in vistos: continue
    vistos.add(clave)
    lugares.append({'n': n.title() if n.isupper() else n, 't': tipo.capitalize(), 'lon': round(p.x, 5), 'lat': round(p.y, 5)})
mejor_calle = {}
for i, (c, r) in enumerate(tramos):
    n = r['name']
    if n and (n not in mejor_calle or largos[i] > largos[mejor_calle[n]]): mejor_calle[n] = i
for n, i in mejor_calle.items():
    p = shapely.line_interpolate_point(lineas[i], 0.5, normalized=True)
    lugares.append({'n': n, 't': 'Calle', 'lon': round(p.x, 5), 'lat': round(p.y, 5)})
with open(SALIDA + 'lugares.js', 'w', encoding='utf-8') as f:
    f.write('/* Generado por codigo/construir_red_respirabilidad.py — no editar a mano */\nwindow.RESPIRA_LUGARES=')
    json.dump(lugares, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
log('lugares.js listo:', len(lugares), 'lugares')
