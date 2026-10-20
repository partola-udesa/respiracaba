"""
Presión vial por comuna: km de autopistas y avenidas por km² de comuna, a partir de OpenStreetMap.

Reemplaza a "flujo vehicular" en el índice: no mide autos que pasan, sino cuánta vía de
tránsito intenso hay en cada comuna (exposición vial), con el mismo método para las 15 comunas.

Descarga (Overpass API):
curl -A "RESPIRA" --data-urlencode data@codigo/overpass_vias_principales_caba.overpassql \
    https://overpass-api.de/api/interpreter -o datasets/osm_vias_principales_caba.json

Uso:
python codigo/presion_vial_por_comuna.py datasets/osm_vias_principales_caba.json datasets/comunas.zip \
    datasets_procesados/osm_vias_principales_caba__presion_vial_por_comuna.csv
Requiere: pip install pyshp shapely

Clases (etiqueta `highway` de OSM):
- autopistas: motorway, trunk y sus ramales (_link)
- avenidas_principales: primary y primary_link
- avenidas_secundarias: secondary y secondary_link
Nota: OSM dibuja por separado cada mano de una avenida doble mano con boulevard, así que
esas avenidas suman su largo dos veces (refleja, en parte, su mayor capacidad).
"""
import json, sys, math, zipfile, io, csv
import shapefile
from shapely.geometry import LineString, Polygon, MultiPolygon, shape
from shapely.ops import transform
from shapely.strtree import STRtree

osm_path, comunas_zip, out_path = sys.argv[1:4]
LAT0, R = math.radians(-34.6), 6371000
def a_metros(x, y, z=None):  # proyección local equirectangular (error < 0,5 % en CABA)
    return (math.radians(x) * R * math.cos(LAT0), math.radians(y) * R)
def proyectar(g):
    return transform(lambda xs, ys, zs=None: tuple(zip(*[a_metros(x, y) for x, y in zip(xs, ys)])), g)

CLASE = {"motorway": "autopistas", "motorway_link": "autopistas", "trunk": "autopistas",
         "trunk_link": "autopistas", "primary": "avenidas_principales",
         "primary_link": "avenidas_principales", "secondary": "avenidas_secundarias",
         "secondary_link": "avenidas_secundarias"}

z = zipfile.ZipFile(comunas_zip)
sf = shapefile.Reader(shp=io.BytesIO(z.read("comunas.shp")), dbf=io.BytesIO(z.read("comunas.dbf")),
                      shx=io.BytesIO(z.read("comunas.shx")))
idx = [f[0] for f in sf.fields[1:]].index("comuna")
comunas = {int(sr.record[idx]): proyectar(shape(sr.shape.__geo_interface__)).buffer(0)
           for sr in sf.shapeRecords()}

lineas, clases = [], []
for e in json.load(open(osm_path, encoding="utf-8"))["elements"]:
    if e.get("type") != "way" or "geometry" not in e:
        continue
    c = CLASE.get(e["tags"].get("highway"))
    if c and len(e["geometry"]) > 1:
        lineas.append(LineString([a_metros(p["lon"], p["lat"]) for p in e["geometry"]]))
        clases.append(c)
arbol = STRtree(lineas)

cols = ["comuna", "sup_comuna_km2", "km_autopistas", "km_avenidas_principales",
        "km_avenidas_secundarias", "km_total", "km_por_km2_total",
        "km_por_km2_autopistas", "km_por_km2_avenidas"]
with open(out_path, "w", newline="", encoding="utf-8") as fo:
    w = csv.writer(fo); w.writerow(cols)
    for n in sorted(comunas):
        poly = comunas[n]; km = {"autopistas": 0, "avenidas_principales": 0, "avenidas_secundarias": 0}
        for i in arbol.query(poly):
            km[clases[i]] += lineas[i].intersection(poly).length / 1000
        sup = poly.area / 1e6; tot = sum(km.values())
        w.writerow([n, round(sup, 2), round(km["autopistas"], 1), round(km["avenidas_principales"], 1),
                    round(km["avenidas_secundarias"], 1), round(tot, 1), round(tot / sup, 2),
                    round(km["autopistas"] / sup, 2),
                    round((km["avenidas_principales"] + km["avenidas_secundarias"]) / sup, 2)])
print(open(out_path, encoding="utf-8").read())
