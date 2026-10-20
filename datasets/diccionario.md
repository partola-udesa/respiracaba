# Diccionario de datos — RESPIRA

Qué contiene cada dataset de `datasets/`, qué significa cada columna, en qué unidad está y qué transformaciones tiene su versión en `datasets_procesados/`.

- Los archivos de `datasets/` mantienen **el nombre con el que se descargaron** y no se modifican.
- Todo lo que se recorta, filtra o reorganiza va a `datasets_procesados/` con el nombre `nombre_original__transformacion.csv`, y el script que lo genera va a `codigo/`.

## Índice

| Archivo en `datasets/` | Variable del índice / uso | Período | Unidad espacial | Procesado |
|---|---|---|---|---|
| `no2_comunas_mensual.csv` | Calidad del aire (NO2 satelital) | 2018-07 → 2026-08, mensual | 15 comunas | — |
| `no2_estaciones_diario.csv` | Calidad del aire (NO2 satelital) | 2018-07 → 2026-08, diario | 3 estaciones | — |
| `era5_meteo_caba.csv` | Control: viento, temperatura, humedad | 2018-07 → 2026-08, diario | CABA | — |
| `arbolado-publico-lineal-2017-2018.csv` ⚠️ no está en git | Cobertura vegetal + especies alergénicas | 2017–2018 | 15 comunas (árbol a árbol) | — |
| `arbolado-en-espacios-verdes.csv` | Cobertura vegetal en parques | 2011 | Árbol a árbol, sin comuna | — |
| `conteo-vehicular.csv` | Flujo vehicular | 2018–2019, días sueltos | 49 cruces (11 comunas) | `conteo-vehicular__con_comuna.csv` |
| `medicion_de_ruido_diurno_2018.csv` / `medicion_de_ruido_nocturno_2018.csv` ⚠️ no están en git | Ruido (resta) | 2018 | Zonas dentro de las 15 comunas | `medicion_de_ruido_2018__promedio_por_comuna.csv` |
| `osm_vias_principales_caba.json` | Presión vial (reemplaza a flujo vehicular) | Estado de OSM al 2026-10-20 | Tramos de vía, 15 comunas | `osm_vias_principales_caba__presion_vial_por_comuna.csv` |
| (combinación de los dos anteriores) | **Presión vial final**, día y noche | — | 15 comunas | `osm_vias_principales_caba__presion_vial_combinada_con_colectivos.csv` |
| GTFS de colectivos ⚠️ no está en git | Presión vial: tránsito pesado, día y noche | Sept.–dic. 2019 | Paradas, 15 comunas | `colectivos-gtfs__pasadas_por_comuna_dia_noche.csv` |
| `comunas.zip` | Límites de las 15 comunas (shapefile, WGS84) | 2026 | 15 comunas | — |
| `MI_DVP_AX03.xlsx` | Valor del inmueble (2 amb.) | 2006 T4 → 2026 T2 | Barrio | `MI_DVP_AX03__formato_csv.csv` |
| `MI_DVP_AX08.xlsx` | Valor del inmueble (3 amb.) | 2015 T1 → 2026 T2 | Comuna | `MI_DVP_AX08__formato_csv.csv` |
| `Nac_Co.xlsx` | Natalidad | 2006–2025 | Comuna | `Nac_Co__formato_csv.csv` |

---

## NO2 satelital por comuna (mensual)

| | |
|---|---|
| **Archivo** | `datasets/no2_comunas_mensual.csv` |
| **Fuente** | Copernicus Sentinel-5P / TROPOMI, exportado desde Google Earth Engine, promediado sobre los polígonos de comunas |
| **Script** | `codigo/` ← subir el script de GEE |
| **Fecha de descarga** | 2026-10-05 (fecha del archivo descargado) |
| **Cobertura temporal** | 2018-07 a 2026-08 (98 meses) |
| **Cobertura espacial** | Las 15 comunas, completas (98 meses × 15 comunas) |
| **Tamaño** | 1.470 filas × 11 columnas |
| **Uso en RESPIRA** | Componente "calidad del aire" del índice, a escala comuna. Es el dataset principal para cubrir las 15 comunas |

### Columnas
| Columna | Descripción |
|---|---|
| `system:index` | ID interno de GEE |
| `comuna`, `id` | Número de comuna (1–15) |
| `barrios` | Barrios que forman la comuna |
| `area`, `perimetro` | Área (m²) y perímetro (m) de la comuna |
| `objeto` | Siempre "COMUNA" |
| `mes` | Mes (AAAA-MM) |
| `mean` | NO2 troposférico promedio del mes en la comuna. **Unidad a confirmar** (probablemente µmol/m²) |
| `count` | Cantidad de mediciones o píxeles promediados (11–38) ← confirmar en el script |
| `.geo` | Geometría vacía (se puede descartar) |

### Observaciones
- Es un promedio mensual que ya calculó el script de GEE, no un dato crudo.
- Algunas comunas son chicas comparadas con el píxel de Sentinel-5P (~5,5 × 3,5 km). Por eso el valor de una comuna está influido por las comunas vecinas.
- Solo mide NO2: no hay PM10 ni CO.

---

## NO2 satelital en las estaciones de monitoreo (diario)

| | |
|---|---|
| **Archivo** | `datasets/no2_estaciones_diario.csv` |
| **Fuente** | Copernicus Sentinel-5P / TROPOMI, exportado desde Google Earth Engine. Colección: `COPERNICUS/S5P/OFFL/L3_NO2` ← confirmar en el script |
| **Script** | `codigo/` ← subir el script de GEE |
| **Fecha de descarga** | 2026-10-05 (fecha del archivo descargado) |
| **Cobertura temporal** | 08-07-2018 a 30-08-2026, diario, con huecos (días nublados o sin pasada del satélite) |
| **Cobertura espacial** | Alrededor de 3 estaciones APrA: Córdoba, Centenario y La Boca |
| **Tamaño** | 7.166 filas × 5 columnas (~2.390 días por estación) |
| **Uso en RESPIRA** | Componente "calidad del aire" del índice. Permite comparar con las mediciones de las estaciones APrA |

### Columnas
| Columna | Descripción |
|---|---|
| `system:index` | ID interno de GEE (imagen + estación) |
| `estacion` | CORDOBA / CENTENARIO / LA_BOCA |
| `fecha` | Fecha |
| `mean` | NO2 troposférico promedio alrededor de la estación. **Unidad a confirmar** en el script (probablemente µmol/m²) |
| `.geo` | Geometría vacía (se puede descartar) |

### Observaciones
- **Es NO2 medido desde el satélite (columna de aire), no la concentración a nivel de calle que miden las estaciones APrA (µg/m³).** No son la misma variable, y hay que aclararlo en la app como "dato duro satelital".
- No incluye la estación Palermo, aunque el catálogo de Estaciones ambientales tiene 4.
- Valores raros: 5 negativos (ruido del sensor) y 372 mayores a 300 (máximo 980). Hay que decidir cómo filtrarlos y anotarlo en `decisiones.md`.
- Falta documentar el radio del área alrededor de cada estación (está en el script).

---

## Meteorología ERA5 (Google Earth Engine)

| | |
|---|---|
| **Archivo** | `datasets/era5_meteo_caba.csv` |
| **Fuente** | ECMWF ERA5, exportado desde Google Earth Engine. Colección: `ECMWF/ERA5_LAND/HOURLY` o `ECMWF/ERA5/HOURLY` ← confirmar en el script |
| **Script** | `codigo/` ← subir el script de GEE que generó este archivo |
| **Fecha de descarga** | 2026-10-05 (fecha del archivo descargado) |
| **Cobertura temporal** | 01-07-2018 a 31-08-2026, diario, horas 16, 17 y 18 UTC |
| **Cobertura espacial** | CABA (un solo valor para toda la ciudad) |
| **Tamaño** | 8.952 filas × 8 columnas (2.984 días × 3 horas) |
| **Uso en RESPIRA** | Variable de control (viento, temperatura y humedad) para el NO2 |

### Columnas
| Columna | Descripción |
|---|---|
| `system:index` | ID interno de GEE (fecha + hora) |
| `fecha` | Fecha (AAAA-MM-DD) |
| `hora_utc` | Hora UTC (16–18 UTC = 13–15 h en Argentina) |
| `temperature_2m` | Temperatura a 2 m, **en Kelvin** (restar 273,15 para °C) |
| `dewpoint_temperature_2m` | Punto de rocío a 2 m, en Kelvin. Sirve para calcular la humedad relativa |
| `u_component_of_wind_10m`, `v_component_of_wind_10m` | Componentes del viento a 10 m (m/s). Velocidad = √(u²+v²) |
| `.geo` | Geometría vacía (columna que agrega GEE al exportar, se puede descartar) |

### Observaciones
- Las horas elegidas coinciden con el paso del satélite Sentinel-5P sobre Buenos Aires (alrededor de las 13:30 h). Por eso se cruza bien con los datasets de NO2.
- Reemplaza al dataset TMI del catálogo, que solo tenía datos de 2011–2012.
- No trae la humedad relativa directamente: hay que calcularla a partir de la temperatura y el punto de rocío.
- No es un dato crudo: ya pasó por el script de GEE. Por eso el script tiene que estar en `codigo/`.

---

## Arbolado público lineal (censo 2017–2018)

> ⚠️ **El archivo NO está en el repositorio** porque pesa 60 MB, más que el límite del repo. Para usarlo, descargalo del link y guardalo en `datasets/` con ese mismo nombre. Git lo ignora porque está en `.gitignore`.

| | |
|---|---|
| **Archivo** | `datasets/arbolado-publico-lineal-2017-2018.csv` |
| **Fuente** | GCBA – Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/arbolado-publico-lineal |
| **Descarga directa** | https://cdn.buenosaires.gob.ar/datosabiertos/datasets/atencion-ciudadana/arbolado-publico-lineal/arbolado-publico-lineal-2017-2018.csv |
| **Fecha de descarga** | 2026-09-22 (fecha del archivo descargado) |
| **Cobertura temporal** | Censo 2017–2018 |
| **Cobertura espacial** | Árboles de vereda de las 15 comunas |
| **Tamaño** | 370.180 filas × 18 columnas · 60 MB |
| **Uso en RESPIRA** | Componente "cobertura vegetal" del índice y especies alergénicas en la calle (plátano, fresno, ligustro). Es el dataset del "arbolado público" que nombra la hipótesis |

### Columnas
| Columna | Descripción |
|---|---|
| `long`, `lat` | Coordenadas WGS84 |
| `nro_registro` | ID del registro |
| `tipo_activ` | Tipo de arbolado (siempre "Lineal", escrito de varias formas) |
| `comuna` | Comuna (1–15) |
| `manzana` | Manzana |
| `calle_nombre`, `calle_altura`, `calle_chapa`, `direccion_normalizada` | Dirección |
| `ubicacion` | Posición respecto de la dirección (Exacta, LD, LA, En frente…) |
| `nombre_cientifico` | Especie |
| `ancho_acera` | Ancho de vereda (m) |
| `estado_plantera`, `ubicacion_plantera`, `nivel_plantera` | Estado y tipo de la cazuela |
| `diametro_altura_pecho` | DAP (cm) |
| `altura_arbol` | Altura (m) |

### Observaciones
- 15.342 árboles no tienen coordenadas, pero sí comuna y dirección.
- Las categorías se escribieron de formas distintas: por ejemplo "Lineal", "Lineal ", "LINEAL" y "calle", u "Ocupada" y "ocupada". Hay que unificarlas al procesar.
- `calle_altura` y `calle_chapa` vienen como texto con decimales (por ejemplo, "1120.0").
- Trae solo especie y tamaño: no tiene un dato de cobertura de copa (m²).

---

## Arbolado en espacios verdes (censo 2011)

| | |
|---|---|
| **Archivo** | `datasets/arbolado-en-espacios-verdes.csv` |
| **Fuente** | GCBA – Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/arbolado-espacios-verdes |
| **Fecha de descarga** | 2026-09-15 (fecha del archivo descargado) |
| **Cobertura temporal** | Censo 2011 (no se actualiza) |
| **Cobertura espacial** | Árboles dentro de parques y plazas de CABA (no incluye árboles de vereda) |
| **Tamaño** | 51.502 filas × 17 columnas · 13,8 MB |
| **Uso en RESPIRA** | Componente "cobertura vegetal" del índice y especies alergénicas en parques |

### Columnas
| Columna | Descripción |
|---|---|
| `long`, `lat` | Coordenadas WGS84 del árbol |
| `id_arbol` | ID del árbol |
| `altura_tot` | Altura total (m) |
| `diametro` | Diámetro (cm) |
| `inclinacio` | Inclinación (grados) |
| `id_especie`, `nombre_com`, `nombre_cie` | Especie: ID, nombre común y nombre científico |
| `tipo_folla` | Tipo de follaje (caducifolio, perenne, palmera, etc.) |
| `espacio_ve` | Nombre del espacio verde |
| `ubicacion` | Calles que delimitan el espacio verde |
| `nombre_fam`, `nombre_gen` | Familia y género botánico |
| `origen` | Exótico / Nativo / No determinado |
| `coord_x`, `coord_y` | Coordenadas planas (Gauss-Krüger BA) |

### Observaciones
- **No trae columna de comuna ni barrio.** Para agregar por comuna hay que hacer un cruce espacial con los límites de comunas.
- Datos de 2011: describen el arbolado de hace 15 años.
- 586 árboles tienen `id_especie = 999` (especie no identificada).
- Hay 973 filas sin `ubicacion` y 3 árboles con `altura_tot = 0`.

---

## Mapa de Ruido 2018 (diurno y nocturno)

> ⚠️ **Los archivos NO están en el repositorio** porque pesan 73 MB y 67 MB. Para usarlos, descargalos del link del readme y guardalos en `datasets/` con el mismo nombre. Git los ignora porque están en `.gitignore`.

| | |
|---|---|
| **Archivos** | `datasets/medicion_de_ruido_diurno_2018.csv`, `datasets/medicion_de_ruido_nocturno_2018.csv` |
| **Fuente** | APrA / DGEVA – GCBA, Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/mapa-ruido (recursos "2018 - Medición de Ruido Diurno (CSV)" y "2018 - Medición de Ruido Nocturno (CSV)") · Licencia CC-BY-2.5-AR |
| **Fecha de descarga** | 2026-09-22 (fecha del archivo descargado) |
| **Cobertura temporal** | 2018. Dos franjas: diurna (7:01 a 22:00 h) y nocturna (22:01 a 7:00 h), según la página del Mapa de Ruido de GCBA |
| **Cobertura espacial** | Las 15 comunas, divididas en zonas (polígonos) |
| **Tamaño** | Diurno: 167 filas · Nocturno: 149 filas |
| **Uso en RESPIRA** | Componente "ruido" del índice (resta) |

### Columnas
| Columna | Descripción |
|---|---|
| `wkt` | Geometría de la zona (polígono, coordenadas WGS84) |
| `limite_inferior_rango_db`, `limite_superior_rango_db` | Rango de ruido de la zona, en dBA |
| `comuna` | Número de comuna (1–15) |
| `leyenda`, `rango_db` | Rango en texto (ej. "65-70 dBA") |
| `color` | Color del mapa original |
| `periodo` | "Diurno" o "Nocturno" |

### Observaciones
- Es un **mapa modelado**, no una serie de mediciones: no tiene fechas ni horas.
- Modela el ruido sobre la **vía pública**: las zonas cubren entre el 22 y el 33 % de la superficie de cada comuna.
- El diurno trae **duplicadas exactas las 10 zonas de la Comuna 10**, más una zona de la Comuna 9. El script las elimina.
- El portal publica dos años: **2018 y 2025**. Los archivos sin año (`medicion_de_ruido_diurno.csv` / `_nocturno.csv`) son la versión 2025. Se eligió 2018 porque en la descarga de 2025 (22-09-2026) la Comuna 1 está casi vacía (2 zonas, 0,03 km²). Se volvió a bajar el 2026-10-19 y sigue igual.

### Versión procesada: `datasets_procesados/medicion_de_ruido_2018__promedio_por_comuna.csv`
- **Script:** `codigo/ruido_promedio_por_comuna.py`
- **Transformación:** una fila por comuna con `dba_dia`, `dba_noche` y `diferencia_dia_noche`, más superficie mapeada, cobertura y cantidad de zonas para control.
- **Método:** a cada zona se le asigna el punto medio de su rango y se promedia ponderando por la superficie de la zona (área calculada desde `wkt`). La ponderación es sobre la superficie mapeada, no sobre la superficie total de la comuna.
- **Limitación:** es un promedio aritmético de dB. Sirve para comparar comunas entre sí, pero no es el promedio energético, que sería el acústicamente exacto.

---

## Vías principales de OpenStreetMap (presión vial)

| | |
|---|---|
| **Archivo** | `datasets/osm_vias_principales_caba.json` |
| **Fuente** | OpenStreetMap, descargado con Overpass API (https://overpass-api.de). Licencia ODbL: hay que citar "© colaboradores de OpenStreetMap" |
| **Consulta** | `codigo/overpass_vias_principales_caba.overpassql`: vías `motorway`, `trunk`, `primary`, `secondary` y sus ramales (`_link`) dentro del límite de CABA |
| **Fecha de descarga** | 2026-10-20 (estado de la base OSM: 2026-10-20 02:32 UTC) |
| **Cobertura** | Las 15 comunas, con el mismo método |
| **Tamaño** | 7.517 tramos de vía (5 MB) |
| **Uso en RESPIRA** | Componente "presión vial" del índice (resta). Reemplaza a "flujo vehicular" |

### Observaciones
- **No mide autos que pasan, sino cuánta vía de tránsito intenso hay** (exposición vial). Se eligió porque es la única fuente que cubre las 15 comunas de forma pareja (ver `decisiones.md`).
- OSM es un mapa colaborativo. La diferencia entre `primary` y `secondary` no siempre es consistente entre barrios (ej.: la Comuna 12 no tiene ninguna avenida marcada `primary`), así que conviene usar el total y no cada clase por separado.
- Las avenidas doble mano con boulevard están dibujadas como dos líneas (una por mano), así que suman su largo dos veces.
- La General Paz y la costanera van por el borde de la ciudad: solo cuenta la parte que cae dentro del polígono de cada comuna.

### Versión procesada: `datasets_procesados/osm_vias_principales_caba__presion_vial_por_comuna.csv`
- **Script:** `codigo/presion_vial_por_comuna.py`
- **Transformación:** una fila por comuna con los km de autopistas, avenidas principales y avenidas secundarias que caen dentro de la comuna, y los km por km² (total, autopistas y avenidas).
- **Indicador para el índice:** `km_por_km2_total`. Va de 2,62 (Comuna 11) a 6,45 (Comuna 1).

---

## Presión vial combinada (red vial + colectivos)

Es el valor de presión vial que usa el índice. No viene de un dataset nuevo: combina los dos procesados anteriores.

| | |
|---|---|
| **Archivo** | `datasets_procesados/osm_vias_principales_caba__presion_vial_combinada_con_colectivos.csv` |
| **Script** | `codigo/presion_vial_combinada.py` |
| **Entradas** | `osm_vias_principales_caba__presion_vial_por_comuna.csv` y `colectivos-gtfs__pasadas_por_comuna_dia_noche.csv` |
| **Uso en RESPIRA** | Componente "presión vial" del índice (resta), con valor de día y de noche para el carrusel |

### Método
1. Cada indicador se expresa **relativo al promedio de la Ciudad** (total de CABA dividido por la superficie de CABA). Promedios: red vial 4,13 km/km², colectivos 871 pasadas/h/km² de día y 405 de noche.
2. **Mismo peso para las dos medidas:** presión vial = 0,5 × red vial relativa + 0,5 × colectivos relativos. La red vial es igual de día y de noche; los colectivos cambian.
3. El resultado se informa también como **% sobre o bajo el promedio de la Ciudad**.

### Columnas
| Columna | Descripción | Unidad |
|---|---|---|
| `comuna` | Número de comuna | 1–15 |
| `red_vial_km_por_km2` | Km de autopistas y avenidas por km² | km/km² |
| `colectivos_dia_por_hora_km2`, `colectivos_noche_por_hora_km2` | Pasadas de colectivo por hora y por km² | pasadas/h/km² |
| `red_vial_rel`, `colectivos_dia_rel`, `colectivos_noche_rel` | Cada indicador dividido por el promedio de CABA | 1 = promedio de la Ciudad |
| `presion_vial_dia`, `presion_vial_noche` | Combinación con el mismo peso | 1 = promedio de la Ciudad |
| `presion_vial_dia_vs_caba_pct`, `presion_vial_noche_vs_caba_pct` | Lo mismo, en % sobre (+) o bajo (−) el promedio | % |

### Observaciones
- Rango de día: de −27 % (Comuna 11) a +52 % (Comuna 1). Rango de noche: de −27 % (Comuna 11) a +48 % (Comuna 1).
- Los pesos (50/50) están al principio del script (`PESO_RED_VIAL`, `PESO_COLECTIVOS`) para poder cambiarlos y regenerar el archivo.

---

## GTFS de colectivos (pasadas por comuna, día y noche)

> ⚠️ **No está en el repositorio:** pesa 209 MB comprimido y 1,4 GB descomprimido. Se descarga del link del readme.

| | |
|---|---|
| **Archivo** | `colectivos-gtfs.zip` (GTFS: `stops.txt`, `trips.txt`, `stop_times.txt`, `calendar_dates.txt`, etc.) |
| **Fuente** | Buenos Aires Data, dataset "colectivos-gtfs" · https://data.buenosaires.gob.ar/dataset/colectivos-gtfs |
| **Fecha de descarga** | 2026-10-20 |
| **Cobertura temporal** | Programación de sept.–dic. 2019. Es lo último publicado: el portal indica que el dataset está "en revisión y corrección" |
| **Cobertura espacial** | Líneas que circulan por el AMBA. Se usan solo las paradas que caen dentro de CABA |
| **Uso en RESPIRA** | Componente "presión vial": indicador de tránsito pesado, separado en día y noche como el ruido |

### Versión procesada: `datasets_procesados/colectivos-gtfs__pasadas_por_comuna_dia_noche.csv`
- **Script:** `codigo/colectivos_por_comuna_dia_noche.py`
- **Transformación:** para un día hábil (servicio de lunes a viernes, 145.990 viajes), cada vez que un colectivo pasa por una parada suma 1 a la comuna de la parada. Se separa en **día (7 a 22 h)** y **noche (22 a 7 h)**, las mismas franjas del Mapa de Ruido, y se normaliza por km² y por hora.
- **Indicadores para el índice:** `pasadas_por_hora_dia_por_km2` y `pasadas_por_hora_noche_por_km2`. De día van de 372 (Comuna 8) a 1.795 (Comuna 3).
- **Limitaciones:** es la programación de 2019, previa a la pandemia y a los recortes de servicio de 2026. Mide colectivos *programados*, no los que efectivamente pasaron. Las comunas con paradas más juntas suman más pasadas.

---

## Conteo vehicular por cruce

| | |
|---|---|
| **Archivo** | `datasets/conteo-vehicular.csv` |
| **Fuente** | GCBA – Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/conteo-vehicular |
| **Fecha de descarga** | 2026-09-15 (fecha del archivo descargado) |
| **Cobertura temporal** | 15-03-2018 a 23-07-2019 (23 días puntuales de conteo) |
| **Cobertura espacial** | 49 cruces de CABA |
| **Tamaño** | 257 filas × 8 columnas |
| **Uso en RESPIRA** | Capa de contexto en el mapa (vehículos por hora en cada cruce). **No entra al índice**: ver `decisiones.md` (2026-10-19) |

### Columnas
| Columna | Descripción |
|---|---|
| `cruce` | Intersección (texto, "CALLE A Y CALLE B") |
| `fecha` | Fecha del conteo |
| `hora_inicio`, `hora_final` | Franja horaria (h) |
| `livianos` | Autos y vehículos livianos |
| `colectivos` | Colectivos ("-" = no se contaron) |
| `pesados` | Camiones y vehículos pesados |
| `observaciones` | Notas, por ejemplo "NO SE CONTARON COLECTIVOS POR METROBUS" |

### Observaciones
- **No trae coordenadas ni comuna.** Se ubicaron con `codigo/ubicar_cruces_conteo_vehicular.py` (ver abajo).
- Los conteos son puntuales: un día y algunas horas por cruce. No sirven como serie temporal, ni cubren las 15 comunas de forma pareja.
- 8 filas tienen `colectivos = "-"` (los de Av. Cabildo, por el Metrobus). Por eso la columna queda como texto.
- 2 filas de Dellepiane y Lacarra cubren la franja de 9 a 17 h en vez de 1 hora: no son comparables con el resto.
- Los nombres de los cruces tienen espacios dobles y formatos distintos.
- Tiene errores de tipeo: "DELLEPIENE" (Dellepiane) y "ELIPIDIO" (Elpidio González). El script los corrige.

### Versión procesada: `datasets_procesados/conteo-vehicular__con_comuna.csv`
- **Script:** `codigo/ubicar_cruces_conteo_vehicular.py`
- **Transformación:** mantiene las 257 filas y las 8 columnas originales y agrega `lat`, `lon`, `comuna`, `dist_arboles_m` y `calidad_ubicacion`.
- **Método (sin servicios externos):** cada calle del cruce se busca en el Arbolado Público Lineal 2017–2018, que trae calle y coordenadas de cada árbol. El cruce se ubica en el punto medio del par de árboles más cercanos entre las dos calles, y la comuna sale de ubicar ese punto dentro de `comunas.zip`.
- **Calidad:** 47 de los 49 cruces quedaron a menos de 65 m (casi todos a menos de 25 m) y se marcan `ok`. Dos tienen pocos árboles cerca y se marcan `revisar`: Elcano y Guzmán (408 m) y Lacroze y Triunvirato (572 m). Igual quedan en la Comuna 15, que es correcta.
- **Cobertura resultante:** 11 comunas (4, 5, 6, 7, 8, 9, 10, 11, 12, 13 y 15). Faltan la 1, la 2, la 3 y la 14. La cobertura es despareja: las comunas 6 y 10 tienen 11 cruces cada una, y la 7, la 8 y la 11 tienen uno solo.
- Los cruces sobre avenidas límite (La Plata, Rivadavia) quedan en la comuna donde cae el punto, pero en la práctica afectan a las dos.

---

## Precio del m² de departamentos usados de 2 ambientes en venta, por barrio

| | |
|---|---|
| **Archivo** | `datasets/MI_DVP_AX03.xlsx` → procesado: `datasets_procesados/MI_DVP_AX03__formato_csv.csv` |
| **Fuente** | Instituto de Estadística y Censos CABA (IDECBA), Banco de datos → Mercado inmobiliario → Ventas. Datos de Buscainmueble (hasta 2011), Adinco (2011–2015) y Argenprop (desde 2015) · https://www.estadisticaciudad.gob.ar ← pegar el link exacto |
| **Fecha de descarga** | 2026-10-05 (fecha del archivo descargado) |
| **Cobertura temporal** | 4.º trimestre 2006 a 2.º trimestre 2026, trimestral |
| **Cobertura espacial** | 48 barrios + total de la Ciudad |
| **Tamaño** | Hoja `MI_DVP_AX03` (~90 filas × 215 columnas) + hoja `Ficha Técnica` |
| **Uso en RESPIRA** | Variable objetivo (valor del inmueble) para 2 ambientes |

### Estructura
- **Formato ancho:** una fila por barrio y una columna por trimestre. El encabezado ocupa dos filas: año en la fila 2 y trimestre en la fila 3.
- Valores: precio promedio de publicación en **USD por m² cubierto**. Se calcula como la suma del valor ofertado dividida por la suma de la superficie ofertada.
- `///` = sin dato (pocos avisos en ese barrio y trimestre).

### Procesado: conversión a CSV (`codigo/convertir_xlsx_a_csv.py`)
`MI_DVP_AX03__formato_csv.csv` tiene los mismos datos que la primera hoja del Excel, pasados a CSV (UTF-8, separado por comas):
- Una sola fila de encabezado: `barrio` y una columna por trimestre con formato `AAAA_tN` (por ejemplo `2015_t1`).
- Se sacaron el título, las notas al pie y la hoja `Ficha Técnica`, que están descriptos en este diccionario.
- Se sacó el asterisco de los encabezados. **Los trimestres de 2025_t1 a 2026_t2 son datos provisorios.**
- Los valores no se tocaron: se mantienen los decimales y los `///` (= sin dato).
- Incluye la fila `Total` (total de la Ciudad).
- Se comprobó que cada celda coincide con el Excel. El CSV tiene 49 filas (48 barrios + Total) y 80 columnas.
- Según IDECBA, hasta 2014 cada trimestre corresponde al primer mes del trimestre, y los datos anteriores a 2010 están en revisión.

### Observaciones
- **Es precio de publicación (oferta), no de venta real.**
- **Está por barrio, mientras que AX08 (3 ambientes) está por comuna.** Para comparar hay que pasar los barrios a comunas o conseguir la misma serie con la misma unidad geográfica.
- Hay muchos `///` en barrios chicos, como Agronomía, Boedo o Coghlan.
- Al procesar hay que pasarlo a formato largo, con columnas `barrio, anio, trimestre, usd_m2`.

---

## Precio del m² de departamentos usados de 3 ambientes en venta, por comuna

| | |
|---|---|
| **Archivo** | `datasets/MI_DVP_AX08.xlsx` → procesado: `datasets_procesados/MI_DVP_AX08__formato_csv.csv` |
| **Fuente** | Instituto de Estadística y Censos CABA (IDECBA), Banco de datos → Mercado inmobiliario → Ventas. Datos de Adinco (hasta junio 2015) y Argenprop · https://www.estadisticaciudad.gob.ar ← pegar el link exacto |
| **Fecha de descarga** | 2026-10-06 (fecha del archivo descargado) |
| **Cobertura temporal** | 1.er trimestre 2015 a 2.º trimestre 2026, trimestral |
| **Cobertura espacial** | 15 comunas + total de la Ciudad |
| **Tamaño** | Hoja `MI_DVP_AX08` (~37 filas × 47 columnas) + hoja `Ficha Técnica` |
| **Uso en RESPIRA** | Variable objetivo (valor del inmueble) para 3 ambientes |

### Estructura
- **Formato ancho:** una fila por comuna y una columna por trimestre, con encabezado de dos filas (año y trimestre).
- Valores en **USD por m² cubierto**, precio de publicación.
- `///` = sin dato.

### Procesado: conversión a CSV (`codigo/convertir_xlsx_a_csv.py`)
`MI_DVP_AX08__formato_csv.csv` tiene los mismos datos que la primera hoja del Excel, pasados a CSV (UTF-8, separado por comas):
- Una sola fila de encabezado: `comuna` y una columna por trimestre con formato `AAAA_tN` (por ejemplo `2015_t1`).
- Se sacaron el título, las notas al pie y la hoja `Ficha Técnica`, que están descriptos en este diccionario.
- Se sacó el asterisco de los encabezados. **Los trimestres de 2025_t1 a 2026_t2 son datos provisorios.**
- Los valores no se tocaron: se mantienen los decimales y los `///` (= sin dato).
- Incluye la fila `Total` (total de la Ciudad).
- Se comprobó que cada celda coincide con el Excel. El CSV tiene 16 filas (15 comunas + Total) y 47 columnas.

### Observaciones
- Es precio de oferta, no de cierre.
- Usa la misma unidad que los datasets de NO2 y nacimientos (comuna), así que se cruza directo con ellos.
- Empieza en 2015 y la serie de NO2 en 2018, así que el período común es 2018–2026.

---

## Nacimientos por comuna de residencia de la madre

| | |
|---|---|
| **Archivo** | `datasets/Nac_Co.xlsx` → procesado: `datasets_procesados/Nac_Co__formato_csv.csv` |
| **Fuente** | Instituto de Estadística y Censos CABA (IDECBA), Estadísticas vitales · https://www.estadisticaciudad.gob.ar/eyc/?p=59650 |
| **Fecha de descarga** | 2026-10-05 (fecha del archivo descargado) |
| **Cobertura temporal** | 2006–2025, anual (año de inscripción) |
| **Cobertura espacial** | 15 comunas + total de la Ciudad |
| **Tamaño** | Hoja `Nac_Co` (~21 filas × 21 columnas) + hoja `Ficha Técnica` |
| **Uso en RESPIRA** | Variable explicativa: natalidad por comuna |

### Estructura
- **Formato ancho:** una fila por comuna y una columna por año.
- Valores: cantidad absoluta de nacidos vivos inscriptos.
- Algunas comunas se identifican con texto ("1a", "2a", "4a", "7a") y otras con número. La "a" remite a una nota al pie.

### Procesado: conversión a CSV (`codigo/convertir_xlsx_a_csv.py`)
`Nac_Co__formato_csv.csv` tiene los mismos datos que la hoja `Nac_Co`, pasados a CSV (UTF-8, separado por comas):
- Columnas: `comuna`, `2006` … `2025`. Son 16 filas: las 15 comunas más `Total` (total de la Ciudad).
- Se sacaron el título, las notas al pie y la hoja `Ficha Técnica`.
- Se sacó la "a" de llamada a nota de las comunas 1, 2, 4 y 7, así que todas quedan como número. "Total Ciudad" quedó como `Total`.
- Los valores no se tocaron, y se comprobó que cada celda coincide con el Excel.

### Observaciones
- **Son cantidades absolutas, no una tasa.** Para tener una tasa de natalidad hace falta la población de cada comuna, que no está en este lote.
- Las comunas 1, 2, 4 y 7 cambiaron de límites desde 2009 (Ley 2.650), así que los datos anteriores a 2009 no son comparables para esas comunas.
- 2020–2021 están afectados por la pandemia: el Registro Civil funcionó con demoras.
- Los nacimientos con residencia de la madre desconocida se repartieron entre las comunas.
- Reemplaza al dataset de Nacimientos 2014–2020 del catálogo, que no estaba desagregado por comuna.
