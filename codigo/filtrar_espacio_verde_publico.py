"""Filtra los espacios verdes públicos del GCBA: deja los que suman verde y las columnas útiles.

Uso:
    python codigo/filtrar_espacio_verde_publico.py datasets/espacio_verde_publico.csv datasets_procesados/espacio_verde_publico__filtrado.csv

Solo recorta filas y columnas: no modifica ningún valor. Decisiones (ver decisiones.md, 2026-10-27):
- Salen los patios de juegos (PATIO, PATIO RECREATIVO, PATIO DE JUEGOS INCLUSIVO: chicos y con piso duro),
  BARRIO/COMPLEJO (complejo de viviendas) y los polígonos de menos de 10 m² (restos de dibujo).
- Columnas que quedan: id, nombre, clasificac, area (m²) y geometry.
"""
import sys
import pandas as pd

CLASIFICACIONES_QUE_SALEN = ['PATIO', 'PATIO RECREATIVO', 'PATIO DE JUEGOS INCLUSIVO', 'BARRIO/COMPLEJO']
AREA_MINIMA_M2 = 10
COLUMNAS_QUE_QUEDAN = ['id', 'nombre', 'clasificac', 'area', 'geometry']

entrada, salida = sys.argv[1:3]
d = pd.read_csv(entrada, encoding='utf-8-sig', low_memory=False, dtype=str)
por_tipo = d['clasificac'].isin(CLASIFICACIONES_QUE_SALEN)
por_area = d['area'].astype(float) < AREA_MINIMA_M2
f = d.loc[~por_tipo & ~por_area, COLUMNAS_QUE_QUEDAN]
f.to_csv(salida, index=False, encoding='utf-8-sig')
print(f'Original: {len(d)} · Filtrado: {len(f)} · Salen por tipo: {por_tipo.sum()} · por área < {AREA_MINIMA_M2} m²: {(por_area & ~por_tipo).sum()}')
print(f.clasificac.value_counts().to_dict())
