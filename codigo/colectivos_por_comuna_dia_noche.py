"""
Pasadas de colectivo por comuna en un día hábil, separadas en día (7 a 22 h) y noche (22 a 7 h).

Sirve como indicador de tránsito pesado (colectivos) para el componente de presión vial,
con las mismas franjas que el Mapa de Ruido (diurno 7:01-22:00 / nocturno 22:01-7:00).

Fuente: GTFS de colectivos, Buenos Aires Data (dataset "colectivos-gtfs").
El archivo publicado corresponde a septiembre-diciembre de 2019 (el portal lo tiene "en revisión").
Es pesado (209 MB comprimido, 1,4 GB descomprimido): no se sube al repo.

Método:
1. Se toman los viajes del servicio de días hábiles (service_id con fechas de lunes a viernes).
2. Cada parada se ubica en su comuna con los polígonos de `comunas.zip`.
3. Cada registro de `stop_times` (un colectivo pasando por una parada) suma 1 a la comuna
   de la parada, en la franja que corresponde a su horario.
4. Se normaliza por superficie de la comuna (pasadas por km²).

Uso:
python codigo/colectivos_por_comuna_dia_noche.py carpeta_gtfs_descomprimido datasets/comunas.zip \
    datasets_procesados/colectivos-gtfs__pasadas_por_comuna_dia_noche.csv
Requiere: pip install pyshp shapely
"""
import csv, sys, zipfile, io, datetime, collections
import shapefile
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

gtfs, comunas_zip, out_path = sys.argv[1:4]

z = zipfile.ZipFile(comunas_zip)
sf = shapefile.Reader(shp=io.BytesIO(z.read("comunas.shp")), dbf=io.BytesIO(z.read("comunas.dbf")),
                      shx=io.BytesIO(z.read("comunas.shx")))
campos = [f[0] for f in sf.fields[1:]]
polys, nums, area = [], [], {}
for sr in sf.shapeRecords():
    n = int(sr.record[campos.index("comuna")])
    polys.append(shape(sr.shape.__geo_interface__).buffer(0)); nums.append(n)
    area[n] = float(sr.record[campos.index("area")]) / 1e6
arbol = STRtree(polys)

# 1. Servicio de días hábiles: el service_id cuyas fechas son todas de lunes a viernes y es el más largo
fechas = collections.defaultdict(list)
for r in csv.DictReader(open(f"{gtfs}/calendar_dates.txt", encoding="utf-8-sig")):
    if r["exception_type"] == "1":
        fechas[r["service_id"]].append(datetime.datetime.strptime(r["date"], "%Y%m%d"))
habiles = max((s for s, f in fechas.items() if all(d.weekday() < 5 for d in f)),
              key=lambda s: len(fechas[s]))
viajes = {r["trip_id"] for r in csv.DictReader(open(f"{gtfs}/trips.txt", encoding="utf-8-sig"))
          if r["service_id"] == habiles}

# 2. Paradas -> comuna
parada_comuna = {}
for r in csv.DictReader(open(f"{gtfs}/stops.txt", encoding="utf-8-sig")):
    p = Point(float(r["stop_lon"]), float(r["stop_lat"]))
    for i in arbol.query(p):
        if polys[i].contains(p):
            parada_comuna[r["stop_id"]] = nums[i]; break

# 3. Recorrer stop_times
dia, noche = collections.Counter(), collections.Counter()
with open(f"{gtfs}/stop_times.txt", encoding="utf-8-sig") as f:
    cab = f.readline().strip().split(",")
    it, ia, isp = cab.index("trip_id"), cab.index("arrival_time"), cab.index("stop_id")
    for linea in f:
        c = linea.split(",")
        stop = c[isp].strip('"')
        com = parada_comuna.get(stop)
        if com is None or c[it].strip('"') not in viajes:
            continue
        hora = int(c[ia].strip('"')[:2]) % 24
        (dia if 7 <= hora < 22 else noche)[com] += 1

cols = ["comuna", "sup_comuna_km2", "paradas", "pasadas_dia", "pasadas_noche",
        "pasadas_dia_por_km2", "pasadas_noche_por_km2", "pasadas_por_hora_dia_por_km2",
        "pasadas_por_hora_noche_por_km2"]
paradas = collections.Counter(parada_comuna.values())
with open(out_path, "w", newline="", encoding="utf-8") as fo:
    w = csv.writer(fo); w.writerow(cols)
    for n in sorted(area):
        a = area[n]
        w.writerow([n, round(a, 2), paradas[n], dia[n], noche[n], round(dia[n]/a), round(noche[n]/a),
                    round(dia[n]/a/15), round(noche[n]/a/9)])
print("service_id dias habiles:", habiles, "| viajes:", len(viajes))
print(open(out_path, encoding="utf-8").read())
