"""Convierte una descarga de Overpass (JSON con 'out tags geom') a CSV: una fila por elemento de OSM.

Uso:
    python codigo/osm_json_a_csv.py datasets/osm_red_peatonal_caba.json datasets/osm_red_peatonal_caba.csv

- No filtra ni agrega nada: mantiene todos los elementos del JSON.
- `osm_tipo`: 'way' (vía) o 'relation' (relación: parques grandes cargados como multipolígono).
  El par (osm_tipo, osm_id) identifica cada elemento.
- La geometría queda en la columna `wkt`: LINESTRING para calles y sendas; POLYGON si la vía es cerrada y es
  parque, reserva, jardín o agua; MULTIPOLYGON/POLYGON para las relaciones (se arman uniendo sus vías 'outer'
  y restando las 'inner').
- `largo_m`: largo de la línea en metros (para polígonos, su perímetro). Aproximación plana, suficiente para CABA.
- Las etiquetas menos usadas van juntas en `otras_etiquetas` (clave=valor, separadas por " | ").
"""
import csv, json, math, sys
from shapely.geometry import LineString, Polygon, MultiPolygon
from shapely.ops import polygonize, unary_union

COLUMNAS_ETIQUETAS = ['highway', 'leisure', 'natural', 'name', 'foot', 'sidewalk', 'surface',
                      'lit', 'access', 'bicycle', 'maxspeed', 'lanes', 'oneway']
AREAS = {('leisure', 'park'), ('leisure', 'nature_reserve'), ('leisure', 'garden'), ('natural', 'water')}

def metros(coords):
    return sum(math.hypot((b[0] - a[0]) * 111320 * math.cos(math.radians(a[1])), (b[1] - a[1]) * 110540)
               for a, b in zip(coords, coords[1:]))

def geometria_via(e, t):
    pts = [(p['lon'], p['lat']) for p in e.get('geometry', [])]
    es_area = any(t.get(k) == v for k, v in AREAS)
    if es_area and len(pts) >= 4 and pts[0] == pts[-1]:
        return Polygon(pts), metros(pts)
    return LineString(pts), metros(pts)

def geometria_relacion(e):
    lineas = {'outer': [], 'inner': []}
    for m in e.get('members', []):
        if m.get('type') == 'way' and m.get('geometry'):
            pts = [(p['lon'], p['lat']) for p in m['geometry'] if p]
            if len(pts) >= 2:
                lineas['inner' if m.get('role') == 'inner' else 'outer'].append(LineString(pts))
    exterior = unary_union(list(polygonize(unary_union(lineas['outer'])))) if lineas['outer'] else Polygon()
    interior = unary_union(list(polygonize(unary_union(lineas['inner'])))) if lineas['inner'] else Polygon()
    geom = exterior.difference(interior) if not interior.is_empty else exterior
    perimetro = sum(metros(list(l.coords)) for l in lineas['outer'])
    return geom, perimetro

entrada, salida = sys.argv[1], sys.argv[2]
datos = json.load(open(entrada, encoding='utf-8'))
with open(salida, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['osm_tipo', 'osm_id'] + COLUMNAS_ETIQUETAS + ['otras_etiquetas', 'largo_m', 'cant_puntos', 'wkt'])
    sin_geometria = 0
    for e in datos['elements']:
        t = e.get('tags', {})
        geom, largo = geometria_relacion(e) if e['type'] == 'relation' else geometria_via(e, t)
        if geom.is_empty:
            sin_geometria += 1
        otras = ' | '.join(f'{k}={v}' for k, v in sorted(t.items()) if k not in COLUMNAS_ETIQUETAS)
        puntos = len(e.get('geometry', [])) or sum(len(m.get('geometry', [])) for m in e.get('members', []))
        w.writerow([e['type'], e['id']] + [t.get(k, '') for k in COLUMNAS_ETIQUETAS] +
                   [otras, round(largo, 1), puntos, geom.wkt])
print('OK', salida, '· elementos sin geometría armable:', sin_geometria)
