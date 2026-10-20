"""
Resume el Mapa de Ruido 2018 (APrA) en un valor de dBA por comuna, para el día y para la noche.

El mapa divide cada comuna en zonas (polígonos) con un rango de dB. Para cada comuna:
1. Se eliminan las zonas duplicadas exactas (misma comuna, rango y geometría).
   El archivo diurno trae duplicadas las 10 zonas de la Comuna 10.
2. Se calcula el área de cada zona a partir de su geometría (columna `wkt`).
3. A cada zona se le asigna el punto medio de su rango (ej. 65-70 -> 67,5 dBA).
4. Se promedia ponderando por superficie: las zonas más grandes pesan más.

El mapa modela el ruido sobre la vía pública: cubre ~25-35 % de la superficie de cada comuna.
La ponderación se hace sobre la superficie mapeada, no sobre la superficie total de la comuna.
Nota: es un promedio aritmético de dB, que sirve para comparar comunas entre sí
(no es el promedio energético).

Uso:
python codigo/ruido_promedio_por_comuna.py datasets/medicion_de_ruido_diurno_2018.csv \
    datasets/medicion_de_ruido_nocturno_2018.csv datasets/comunas.zip \
    datasets_procesados/medicion_de_ruido_2018__promedio_por_comuna.csv
Requiere: pip install pyshp
"""
import csv, re, math, sys, zipfile, io, hashlib, collections
import shapefile

diurno, nocturno, comunas_zip, out_path = sys.argv[1:5]
csv.field_size_limit(10**9)
LAT0, R = math.radians(-34.6), 6371000  # proyección local para medir en metros

def area_anillo(pts):
    xy = [(math.radians(x) * R * math.cos(LAT0), math.radians(y) * R) for x, y in pts]
    return abs(sum(xy[i][0]*xy[i-1][1] - xy[i-1][0]*xy[i][1] for i in range(len(xy)))) / 2

def area_wkt(w):
    total = 0
    for poly in re.split(r"\)\)\s*,\s*\(\(", w[w.index("("):]):
        for i, ring in enumerate(re.split(r"\)\s*,\s*\(", poly)):
            pts = [tuple(map(float, p.split()[:2]))
                   for p in re.findall(r"-?\d+\.?\d*\s+-?\d+\.?\d*", ring)]
            a = area_anillo(pts)
            total += a if i == 0 else -a  # los anillos interiores son huecos
    return total

# Superficie oficial de cada comuna
z = zipfile.ZipFile(comunas_zip)
sf = shapefile.Reader(dbf=io.BytesIO(z.read("comunas.dbf")))
campos = [f[0] for f in sf.fields[1:]]
sup_comuna = {int(r[campos.index("comuna")]): float(r[campos.index("area")]) for r in sf.records()}

def resumir(path):
    vistos, dups = set(), collections.Counter()
    zonas = collections.defaultdict(list)
    for x in csv.DictReader(open(path, encoding="utf-8-sig", errors="ignore")):
        c = int(x["comuna"])
        clave = (c, x["rango_db"], hashlib.md5(x["wkt"].encode()).hexdigest())
        if clave in vistos:
            dups[c] += 1
            continue
        vistos.add(clave)
        medio = (float(x["limite_inferior_rango_db"]) + float(x["limite_superior_rango_db"])) / 2
        zonas[c].append((medio, area_wkt(x["wkt"])))
    out = {}
    for c, zs in zonas.items():
        sup = sum(a for _, a in zs)
        out[c] = dict(dba=sum(m * a for m, a in zs) / sup, sup=sup, zonas=len(zs), dups=dups[c])
    return out

dia, noche = resumir(diurno), resumir(nocturno)
cols = ["comuna", "dba_dia", "dba_noche", "diferencia_dia_noche",
        "sup_mapeada_dia_km2", "sup_mapeada_noche_km2", "sup_comuna_km2",
        "cobertura_dia_pct", "cobertura_noche_pct", "zonas_dia", "zonas_noche",
        "duplicados_eliminados"]
with open(out_path, "w", newline="", encoding="utf-8") as fo:
    w = csv.writer(fo); w.writerow(cols)
    for c in sorted(sup_comuna):
        d, n, s = dia[c], noche[c], sup_comuna[c]
        w.writerow([c, round(d["dba"], 1), round(n["dba"], 1), round(d["dba"] - n["dba"], 1),
                    round(d["sup"]/1e6, 2), round(n["sup"]/1e6, 2), round(s/1e6, 2),
                    round(100*d["sup"]/s), round(100*n["sup"]/s), d["zonas"], n["zonas"],
                    d["dups"] + n["dups"]])
print(open(out_path, encoding="utf-8").read())
