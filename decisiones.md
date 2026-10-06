# Registro de decisiones

Qué probamos, qué descartamos y por qué. La entrada más nueva va arriba.

<!-- Formato:
## AAAA-MM-DD — Título corto
- **Qué:** …
- **Por qué:** …
- **Alternativa descartada:** …
-->

## 2026-10-06 — Armado del repositorio y revisión de datasets
- **Qué:** Los originales quedaron en `datasets/` con el nombre de descarga y documentados en `diccionario.md`. Los 3 Excel de IDECBA se convirtieron a CSV con `codigo/convertir_xlsx_a_csv.py`, que guarda los resultados en `datasets_procesados/`.
- **Por qué:** Así se puede rastrear cada procesado hasta su original, y el paso a CSV se puede repetir corriendo el script.
- **Qué quedó afuera:** `arbolado-publico-lineal-2017-2018.csv` (60 MB) no se sube. Está en `.gitignore`, y su link y fecha de descarga están en el readme.

## 2026-10-06 — Meteorología: ERA5 en lugar de TMI
- **Qué:** El control climático se hace con ERA5 (Google Earth Engine), a las horas 16–18 UTC.
- **Por qué:** TMI (GCBA) solo tenía series de 2011–2012 y no se puede cruzar con NO2 2018–2026. Las horas de ERA5 coinciden con el paso de Sentinel-5P.
- **Alternativa descartada:** TMI.

## 2026-10-06 — Calidad del aire: NO2 satelital (Sentinel-5P)
- **Qué:** Se usa NO2 troposférico satelital, mensual por comuna y diario en 3 estaciones.
- **Por qué:** Cubre las 15 comunas, mientras que las estaciones APrA solo cubren su entorno.
- **Limitación:** Es columna de aire, no concentración a nivel de calle. No hay PM10 ni CO. Hay valores raros por resolver: 5 negativos y 372 mayores a 300 en el archivo de estaciones.

## 2026-10 — Alcance geográfico: las 15 comunas
- **Qué:** El proyecto trabaja con las 15 comunas.
- **Alternativa descartada:** limitarlo a las comunas 1, 4 y 6, alrededor de las estaciones APrA.

## 2026-10 — Hipótesis: "valor" en lugar de "demanda"
- **Qué:** La hipótesis predice el valor del inmueble (USD/m²) y no la demanda.
- **Por qué:** Hay series de precio por comuna y por ambientes (IDECBA), pero no hay datos de demanda.

## Pendientes
- [ ] Conseguir Ruido, Flujo vehicular, polígonos de Espacios verdes, precios de alquiler, población por comuna y límites de comunas.
- [ ] Unificar unidad geográfica de precios: AX03 está por barrio y AX08 por comuna.
- [ ] Decidir cómo filtrar los valores raros de NO2.
- [ ] Subir los scripts de Google Earth Engine a `codigo/`.
