"""Filtra el GTFS de colectivos a CABA, manteniendo todos los tipos de día (hábil, sábado, domingo, feriado).

Uso:
    python codigo/filtrar_colectivos_gtfs.py datasets/colectivos-gtfs.zip datasets/comunas.zip datasets_procesados

Genera en datasets_procesados/ (solo recorta filas y columnas, no modifica valores):
- colectivos-gtfs__filtrado_stops.csv        paradas dentro de CABA
- colectivos-gtfs__filtrado_stop_times.csv   pasadas por esas paradas (sin timepoint, departure_time ni
                                              shape_dist_traveled: no se usan para contar pasadas)
- colectivos-gtfs__filtrado_trips.csv        viajes que pasan por al menos una parada de CABA
- colectivos-gtfs__filtrado_shapes.csv       recorridos dibujados de esos viajes
- colectivos-gtfs__filtrado_routes.csv       líneas de esos viajes
- colectivos-gtfs__filtrado_calendar_dates.csv  completo: dice qué servicio corre cada día
  (1 = sábado, 2 = domingo, 3 = día hábil, 4 = feriado; programación sept.–dic. 2019)
"""
import io, os, sys, zipfile
import pandas as pd
import shapefile  # pyshp
from shapely.geometry import shape, Point
from shapely.ops import unary_union
from shapely.prepared import prep

gtfs, comunas, carpeta = sys.argv[1:4]
z = zipfile.ZipFile(gtfs)
salida = lambda n: os.path.join(carpeta, f'colectivos-gtfs__filtrado_{n}.csv')

zc = zipfile.ZipFile(comunas)
base = [n[:-4] for n in zc.namelist() if n.endswith('.shp')][0]
r = shapefile.Reader(shp=io.BytesIO(zc.read(base + '.shp')), dbf=io.BytesIO(zc.read(base + '.dbf')),
                     shx=io.BytesIO(zc.read(base + '.shx')))
caba = prep(unary_union([shape(s.__geo_interface__) for s in r.shapes()]))

stops = pd.read_csv(z.open('stops.txt'), dtype=str)
en_caba = [caba.contains(Point(float(lo), float(la))) for lo, la in zip(stops.stop_lon, stops.stop_lat)]
stops = stops[en_caba]
stops.to_csv(salida('stops'), index=False, encoding='utf-8-sig')
ids_paradas = set(stops.stop_id)
print(f'paradas en CABA: {len(stops)}', flush=True)

viajes = set(); filas = 0; primera = True
for parte in pd.read_csv(z.open('stop_times.txt'), dtype=str, chunksize=2_000_000,
                         usecols=['trip_id', 'arrival_time', 'stop_id', 'stop_sequence']):
    parte = parte[parte.stop_id.isin(ids_paradas)]
    parte.to_csv(salida('stop_times'), index=False, mode='w' if primera else 'a', header=primera, encoding='utf-8')
    primera = False; filas += len(parte); viajes.update(parte.trip_id.unique())
print(f'pasadas por paradas de CABA: {filas} · viajes: {len(viajes)}', flush=True)

trips = pd.read_csv(z.open('trips.txt'), dtype=str)
trips = trips[trips.trip_id.isin(viajes)]
trips.to_csv(salida('trips'), index=False, encoding='utf-8-sig')
shapes = pd.read_csv(z.open('shapes.txt'), dtype=str)
shapes[shapes.shape_id.isin(set(trips.shape_id))].to_csv(salida('shapes'), index=False, encoding='utf-8-sig')
routes = pd.read_csv(z.open('routes.txt'), dtype=str)
routes[routes.route_id.isin(set(trips.route_id))].to_csv(salida('routes'), index=False, encoding='utf-8-sig')
pd.read_csv(z.open('calendar_dates.txt'), dtype=str).to_csv(salida('calendar_dates'), index=False, encoding='utf-8-sig')
print('viajes por servicio:', trips.service_id.value_counts().to_dict())
print('líneas:', routes.route_id.isin(set(trips.route_id)).sum(), '· recorridos:', trips.shape_id.nunique())
