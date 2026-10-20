"""
Ubica los cruces de conteo-vehicular.csv (que no trae coordenadas) y les asigna comuna.

Método (sin internet):
1. Para cada calle del cruce se buscan los árboles del Arbolado Público Lineal 2017-2018
   ubicados sobre esa calle (el dataset trae calle + coordenadas de cada árbol).
2. El cruce se ubica en el punto medio del par de árboles más cercanos entre ambas calles.
3. La comuna se asigna ubicando ese punto dentro de los polígonos oficiales de comunas.

Uso:
python codigo/ubicar_cruces_conteo_vehicular.py datasets/conteo-vehicular.csv \
    datasets/arbolado-publico-lineal-2017-2018.csv datasets/comunas.zip \
    datasets_procesados/conteo-vehicular__con_comuna.csv
Requiere: pip install pyshp
"""
import csv, re, math, sys, unicodedata, collections, zipfile, io
import shapefile

conteo_path, arbolado_path, comunas_zip, out_path = sys.argv[1:5]
csv.field_size_limit(10**9)

# Errores de tipeo del dataset original -> nombre correcto
CORRECCIONES = {"DELLEPIENE": "DELLEPIANE", "ELIPIDIO": "ELPIDIO"}
DIST_MAX_OK = 150  # metros: por encima, la ubicación se marca como "revisar"

def norm(s):
    s = unicodedata.normalize("NFD", s.upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    for k, v in CORRECCIONES.items():
        s = s.replace(k, v)
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    stop = {"AV","AVDA","AVENIDA","Y","DE","DEL","LA","LOS","LAS","EL","GRAL","TTE","DR",
            "PRES","PRESIDENTE","SUR","NORTE","PJE","CNEL","ING"}
    return frozenset(t for t in s.split() if t not in stop and len(t) > 1)

# 1. Calles del arbolado
calles = collections.defaultdict(list)
for x in csv.DictReader(open(arbolado_path, encoding="utf-8-sig", errors="ignore")):
    try:
        calles[x["calle_nombre"]].append((float(x["long"]), float(x["lat"])))
    except (ValueError, KeyError):
        pass
calles_norm = {k: norm(k) for k in calles}

def candidatas(nombre):
    q = norm(nombre)
    return [k for k, n in calles_norm.items()
            if n and (q == n or q <= n or (n <= q and (len(n) > 1 or len(q) == 1)))]

def dist_m(a, b):
    return math.hypot((a[0]-b[0]) * 91500, (a[1]-b[1]) * 111000)

# 2. Comunas
z = zipfile.ZipFile(comunas_zip)
sf = shapefile.Reader(shp=io.BytesIO(z.read("comunas.shp")),
                      dbf=io.BytesIO(z.read("comunas.dbf")),
                      shx=io.BytesIO(z.read("comunas.shx")))
idx = [f[0] for f in sf.fields[1:]].index("comuna")
comunas = []
for sr in sf.shapeRecords():
    pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
    comunas.append((int(sr.record[idx]), [pts[parts[i]:parts[i+1]] for i in range(len(parts)-1)]))

def en_anillo(x, y, ring):
    dentro = False
    for i in range(len(ring)):
        x1, y1 = ring[i-1]; x2, y2 = ring[i]
        if (y1 > y) != (y2 > y) and x < (x2-x1) * (y-y1) / (y2-y1) + x1:
            dentro = not dentro
    return dentro

def comuna_de(lon, lat):
    for c, rings in comunas:
        if sum(en_anillo(lon, lat, r) for r in rings) % 2 == 1:
            return c
    return None

# 3. Ubicar cada cruce
filas = list(csv.DictReader(open(conteo_path, encoding="utf-8-sig", errors="ignore")))
ubic = {}
for cruce in dict.fromkeys(f["cruce"].strip() for f in filas):
    a, b = [p.strip() for p in re.split(r"\s+Y\s+", cruce, maxsplit=1)]
    mejor = None
    for ca in candidatas(a):
        for cb in candidatas(b):
            if ca == cb:
                continue
            for p in calles[ca]:
                for q in calles[cb]:
                    d = dist_m(p, q)
                    if mejor is None or d < mejor[0]:
                        mejor = (d, p, q)
    if mejor:
        d, p, q = mejor
        lon, lat = (p[0]+q[0]) / 2, (p[1]+q[1]) / 2
        ubic[cruce] = (round(lat, 6), round(lon, 6), comuna_de(lon, lat), round(d),
                       "ok" if d <= DIST_MAX_OK else "revisar")
    else:
        ubic[cruce] = ("", "", "", "", "sin ubicar")

campos = list(filas[0].keys()) + ["lat", "lon", "comuna", "dist_arboles_m", "calidad_ubicacion"]
with open(out_path, "w", newline="", encoding="utf-8") as fo:
    w = csv.writer(fo); w.writerow(campos)
    for f in filas:
        w.writerow(list(f.values()) + list(ubic[f["cruce"].strip()]))

for k, v in ubic.items():
    print(v[2], v[4], v[3], "|", k)
