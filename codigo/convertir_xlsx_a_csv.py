"""
Convierte los 3 Excel de IDECBA (datasets/) a CSV (datasets_procesados/).

Qué hace:
- Saca el título, las notas al pie y la hoja "Ficha Técnica".
- Une el encabezado de dos filas (año + trimestre) en una sola fila con formato AAAA_tN.
- Saca las marcas de nota: "*" (dato provisorio) en los trimestres y "a" en las comunas 1, 2, 4 y 7.
- NO cambia ningún valor: los "///" (sin dato) y todos los decimales quedan igual.

Uso (desde la raíz del repo):  python codigo/convertir_xlsx_a_csv.py
Requiere: pip install openpyxl
"""
import csv
import re
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / "datasets"
PROC = RAIZ / "datasets_procesados"
TRIM = {"1er": "t1", "2do": "t2", "3er": "t3", "4to": "t4"}
FIN_TABLA = ("*", "///", "Nota", "Hasta", "Los datos", "La información", "Fuente", "a A partir")


def leer_hoja(nombre):
    wb = openpyxl.load_workbook(ORIG / nombre, data_only=True)
    return list(wb.worksheets[0].iter_rows(values_only=True))


def es_fin(celda):
    return celda is None or str(celda).startswith(FIN_TABLA)


def valor(v):
    return "" if v is None else v


def precios_trimestrales(nombre, col_clave, salida):
    filas = leer_hoja(nombre)
    anios, trims = filas[1], filas[2]
    ultima = max(i for i, t in enumerate(trims) if t is not None)
    encabezado, anio = [col_clave], None
    for i in range(1, ultima + 1):
        if anios[i] is not None:
            anio = int(anios[i])  # el año está en celdas combinadas: se arrastra
        encabezado.append(f"{anio}_{TRIM[trims[i].split('.')[0].strip()]}")
    datos = []
    for f in filas[3:]:
        if es_fin(f[0]):
            break
        datos.append([str(f[0]).strip()] + [valor(x) for x in f[1:ultima + 1]])
    escribir(salida, encabezado, datos)


def nacimientos(nombre, salida):
    filas = leer_hoja(nombre)
    encabezado = ["comuna"] + [int(a) for a in filas[1][1:] if a is not None]
    datos = []
    for f in filas[2:]:
        if es_fin(f[0]):
            break
        etiqueta = str(f[0]).strip()
        etiqueta = "Total" if etiqueta.startswith("Total") else re.sub(r"a$", "", etiqueta)
        datos.append([etiqueta] + list(f[1:len(encabezado)]))
    escribir(salida, encabezado, datos)


def escribir(nombre, encabezado, datos):
    PROC.mkdir(exist_ok=True)
    with open(PROC / nombre, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(encabezado)
        w.writerows(datos)
    print(f"{nombre}: {len(datos)} filas x {len(encabezado)} columnas")


if __name__ == "__main__":
    precios_trimestrales("MI_DVP_AX03.xlsx", "barrio", "MI_DVP_AX03__formato_csv.csv")
    precios_trimestrales("MI_DVP_AX08.xlsx", "comuna", "MI_DVP_AX08__formato_csv.csv")
    nacimientos("Nac_Co.xlsx", "Nac_Co__formato_csv.csv")
