"""Filtra el arbolado público lineal (censo 2017–2018): deja los árboles ubicables y las columnas útiles.

Uso:
    python codigo/filtrar_arbolado_lineal.py datasets/arbolado-publico-lineal-2017-2018.csv datasets_procesados/arbolado-publico-lineal-2017-2018__filtrado.csv

Solo recorta filas y columnas: no modifica ningún valor. Decisiones (ver decisiones.md, 2026-10-27):
- Salen los árboles sin coordenadas (no se pueden asignar a una cuadra).
- Quedan los árboles con diámetro 0, sin altura o de especie "No identificado": el árbol existe aunque falte
  la medida o la especie.
- Columnas que quedan: COLUMNAS_QUE_QUEDAN.
"""
import sys
import pandas as pd

COLUMNAS_QUE_QUEDAN = ['nro_registro', 'long', 'lat', 'nombre_cientifico', 'altura_arbol',
                       'diametro_altura_pecho', 'ancho_acera', 'calle_nombre', 'calle_altura']

entrada, salida = sys.argv[1:3]
d = pd.read_csv(entrada, encoding='utf-8-sig', low_memory=False, dtype=str)
con_coordenadas = d['long'].notna() & d['lat'].notna()
f = d.loc[con_coordenadas, COLUMNAS_QUE_QUEDAN]
f.to_csv(salida, index=False, encoding='utf-8-sig')
print(f'Original: {len(d)} árboles · Filtrado: {len(f)} · Sin coordenadas (salen): {(~con_coordenadas).sum()}')
print(f'Columnas: {list(f.columns)}')
