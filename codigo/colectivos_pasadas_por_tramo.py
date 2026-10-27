"""Cuenta cuántos colectivos por hora pasan por cada tramo de la red peatonal, por tipo de día y franja horaria.

Uso:
    python codigo/colectivos_pasadas_por_tramo.py datasets_procesados datasets_procesados/osm_red_peatonal_caba__filtrado.csv datasets_procesados/colectivos-gtfs__pasadas_por_tramo_franja.csv

Entradas: los archivos colectivos-gtfs__filtrado_*.csv y la red peatonal filtrada.
Es un PROCESADO (cuenta y agrupa), no un filtrado. Método:
1. Tramos posibles: solo los de la red por donde circulan vehículos (TIPOS_VEHICULARES).
2. Cada recorrido dibujado (shape) se compara con los tramos: un tramo es parte del recorrido si al menos el
   60 % de su largo queda a menos de 12 m de la línea del recorrido.
3. A cada tramo se le asigna la parada anterior del recorrido (la última parada antes del tramo, medida a lo
   largo de la línea). La hora a la que cada viaje pasa por esa parada define su franja horaria.
4. Por tramo, tipo de día y franja se suman los viajes de todas las líneas y se dividen por las horas de la
   franja: el resultado es `pasadas_por_hora` (promedio de la franja, según la programación de 2019).
"""
import os, sys, math, time
import numpy as np
import pandas as pd
from shapely import wkt as WKT
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree
from shapely.ops import transform  # (tarda ~6 min: correrlo en una compu sin límite de tiempo)

TIPOS_VEHICULARES = ['primary', 'secondary', 'tertiary', 'residential', 'living_street', 'unclassified']
FRANJAS = [('madrugada', 0, 6), ('manana', 6, 10), ('mediodia', 10, 16), ('tarde', 16, 20), ('noche', 20, 24)]
TIPO_DIA = {'1': 'sabado', '2': 'domingo', '3': 'habil', '4': 'feriado'}
DISTANCIA_M, PROPORCION_MIN = 12, 0.6

t0 = time.time()
carpeta, ruta_red, salida = sys.argv[1:4]
leer = lambda n, **k: pd.read_csv(os.path.join(carpeta, f'colectivos-gtfs__filtrado_{n}.csv'), dtype=str, **k)

# Proyección plana local en metros (suficiente para CABA)
LAT0 = -34.61; KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
a_metros = lambda g: transform(lambda x, y, z=None: (np.asarray(x) * KX, np.asarray(y) * KY), g)

red = pd.read_csv(ruta_red, dtype=str, encoding='utf-8-sig', usecols=['osm_tipo', 'osm_id', 'highway', 'wkt'])
red = red[red.highway.isin(TIPOS_VEHICULARES)].reset_index(drop=True)
tramos = [a_metros(WKT.loads(w)) for w in red.wkt]
arbol = STRtree(tramos)

shapes = leer('shapes').astype({'shape_pt_lat': float, 'shape_pt_lon': float, 'shape_pt_sequence': int})
shapes = shapes.sort_values(['shape_id', 'shape_pt_sequence'])
stops = leer('stops').astype({'stop_lat': float, 'stop_lon': float}).set_index('stop_id')
trips = leer('trips', usecols=['trip_id', 'service_id', 'shape_id'])
st = leer('stop_times')
st['stop_sequence'] = st.stop_sequence.astype(int)
print(f'datos cargados ({time.time()-t0:.0f} s)', flush=True)

# Paradas de cada recorrido: se toma un viaje representativo por shape
st = st.merge(trips, on='trip_id')
rep = st.drop_duplicates('shape_id')[['shape_id', 'trip_id']]
paradas_rep = st[st.trip_id.isin(rep.trip_id)][['shape_id', 'stop_id', 'stop_sequence']]

asignacion = []  # (shape_id, índice del tramo, stop_sequence de la parada anterior)
for shape_id, pts in shapes.groupby('shape_id'):
    if len(pts) < 2:
        continue
    linea = a_metros(LineString(zip(pts.shape_pt_lon, pts.shape_pt_lat)))
    zona = linea.buffer(DISTANCIA_M)
    par = paradas_rep[paradas_rep.shape_id == shape_id]
    if par.empty:
        continue
    pos_paradas = np.array([linea.project(a_metros(Point(stops.at[s, 'stop_lon'], stops.at[s, 'stop_lat'])))
                            for s in par.stop_id])
    seqs = par.stop_sequence.to_numpy()
    orden = np.argsort(pos_paradas); pos_paradas, seqs = pos_paradas[orden], seqs[orden]
    for i in arbol.query(zona):
        tr = tramos[i]
        if tr.length == 0 or tr.intersection(zona).length / tr.length < PROPORCION_MIN:
            continue
        pos = linea.project(tr.interpolate(0.5, normalized=True))
        k = max(np.searchsorted(pos_paradas, pos, side='right') - 1, 0)
        asignacion.append((shape_id, i, seqs[k]))
asig = pd.DataFrame(asignacion, columns=['shape_id', 'tramo', 'stop_sequence'])
print(f'tramos con colectivo: {asig.tramo.nunique()} ({time.time()-t0:.0f} s)', flush=True)

# Viajes por (shape, parada, tipo de día, franja)
hora = st.arrival_time.str.slice(0, 2).astype(int) % 24
st['franja'] = pd.cut(hora, bins=[f[1] for f in FRANJAS] + [24], labels=[f[0] for f in FRANJAS], right=False)
conteo = (st.groupby(['shape_id', 'stop_sequence', 'service_id', 'franja'], observed=True)
            .size().rename('viajes').reset_index())

r = asig.merge(conteo, on=['shape_id', 'stop_sequence'])
r = r.groupby(['tramo', 'service_id', 'franja'], observed=True).viajes.sum().reset_index()
horas = {f[0]: f[2] - f[1] for f in FRANJAS}
r['pasadas_por_hora'] = (r.viajes / r.franja.astype(str).map(horas)).round(1)
r['tipo_dia'] = r.service_id.map(TIPO_DIA)
r = r.join(red[['osm_tipo', 'osm_id', 'highway']], on='tramo')
r = r[['osm_tipo', 'osm_id', 'highway', 'tipo_dia', 'franja', 'viajes', 'pasadas_por_hora']]
r.to_csv(salida, index=False, encoding='utf-8-sig')
print(f'OK {salida}: {len(r)} filas ({time.time()-t0:.0f} s)')
