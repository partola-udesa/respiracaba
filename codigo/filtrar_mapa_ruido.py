"""Filtra el Mapa de Ruido 2018 (APrA), diurno o nocturno: saca duplicados y columnas que no se usan.

Uso:
    python codigo/filtrar_mapa_ruido.py datasets/medicion_de_ruido_diurno_2018.csv datasets_procesados/medicion_de_ruido_diurno_2018__filtrado.csv
    python codigo/filtrar_mapa_ruido.py datasets/medicion_de_ruido_nocturno_2018.csv datasets_procesados/medicion_de_ruido_nocturno_2018__filtrado.csv

Solo recorta filas y columnas: no modifica ningún valor. Decisiones (ver decisiones.md, 2026-10-27):
- Salen las filas duplicadas exactas (en el diurno: 10 zonas de la Comuna 10 y 1 de la Comuna 9).
- Quedan las geometrías inválidas (bordes que se cruzan): se corrigen en el procesado, no en el filtrado.
- Columnas que quedan: wkt, limite_inferior_rango_db, limite_superior_rango_db y periodo.
  Salen rango_db (repite los límites en texto), leyenda (agrupa rangos y tiene errores), color y comuna.
"""
import sys
import pandas as pd

COLUMNAS_QUE_QUEDAN = ['wkt', 'limite_inferior_rango_db', 'limite_superior_rango_db', 'periodo']

entrada, salida = sys.argv[1:3]
d = pd.read_csv(entrada, encoding='utf-8-sig', dtype=str)
duplicados = d.duplicated()
f = d.loc[~duplicados, COLUMNAS_QUE_QUEDAN]
f.to_csv(salida, index=False, encoding='utf-8-sig')
print(f'{entrada}: {len(d)} zonas · filtrado: {len(f)} · duplicados (salen): {duplicados.sum()}')
