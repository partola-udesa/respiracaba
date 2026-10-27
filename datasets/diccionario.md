# Diccionario de datos — RESPIRA

Qué contiene cada dataset de `datasets/`, qué significa cada columna, en qué unidad está y qué transformaciones tiene su versión en `datasets_procesados/`.

- Los archivos de `datasets/` mantienen **el nombre con el que se descargaron** y no se modifican.
- Todo lo que se filtra o se calcula va a `datasets_procesados/` con el nombre `nombre_original__transformacion.csv`, y el script que lo genera va a `codigo/`.
- **Unidad de análisis: el tramo de calle** de la red peatonal de OpenStreetMap. Todos los datasets se llevan a un valor por tramo (identificado por `osm_tipo` + `osm_id`).

## Índice

| Archivo en `datasets/` | Variable / uso | Período | Unidad espacial | Procesado en `datasets_procesados/` |
|---|---|---|---|---|
| `osm_red_peatonal_caba.json` / `.csv` | **Unidad común (el tramo)** y senderos | OSM al 2026-10-27 | Tramo de calle o senda | `osm_red_peatonal_caba__filtrado.csv` |
| `osm_parques_complemento_caba.json` / `.csv` | Parques, reservas y jardines (complemento de la red) | OSM al 2026-10-27 | Polígono | se suma a `osm_red_peatonal_caba__filtrado.csv` |
| `osm_vias_principales_caba.json` / `.csv` | Presión vial: tipo de vía, carriles, velocidad, camiones | OSM al 2026-10-20 | Tramo de avenida o autopista | `osm_vias_principales_caba__filtrado.csv` |
| `colectivos-gtfs.zip` ⚠️ no está en git | Presión vial: pasadas de colectivo | Programación sept.–dic. 2019 | Parada y recorrido | `colectivos-gtfs__filtrado_*.csv` y `colectivos-gtfs__pasadas_por_tramo_franja.csv` |
| `arbolado-publico-lineal-2017-2018.csv` ⚠️ no está en git | Vegetación, sombra y alergias | Censo 2017–2018 | Árbol por árbol | `arbolado-publico-lineal-2017-2018__filtrado.csv` |
| `espacio_verde_publico.csv` | Vegetación | Actual | Polígono | `espacio_verde_publico__filtrado.csv` |
| `arbolado-en-espacios-verdes.csv` | Vegetación dentro de parques (complementario) | Censo 2011 | Árbol por árbol | — |
| `medicion_de_ruido_diurno_2018.csv` / `medicion_de_ruido_nocturno_2018.csv` ⚠️ no están en git | Ruido (resta) | Modelo 2018 | Polígonos sobre la vía pública | pendiente |
| `no2_comunas_mensual.csv` | Calidad del aire (NO2 satelital) | 2018-07 → 2026-08, mensual | 15 comunas (a reemplazar por grilla) | pendiente |
| `no2_estaciones_diario.csv` | Calidad del aire (control) | 2018-07 → 2026-08, diario | 3 estaciones | pendiente |
| `era5_meteo_caba.csv` | Control: viento, temperatura, humedad | 2018-07 → 2026-08, diario | CABA | pendiente |
| `comunas.zip` | Límite de CABA para recortar todos los datos | 2026 | 15 comunas | — |

---

## Red de calles y sendas de OpenStreetMap

| | |
|---|---|
| **Archivos** | `datasets/osm_red_peatonal_caba.json` (descarga original) y `datasets/osm_red_peatonal_caba.csv` (el mismo contenido en CSV) |
| **Fuente** | © colaboradores de OpenStreetMap, vía Overpass API (https://overpass-api.de). Licencia ODbL |
| **Consulta** | `codigo/overpass_red_peatonal_caba.overpassql`: calles de todo tipo, veredas, sendas, peatonales, escaleras, caminos y bicisendas dentro de CABA (sin autopistas ni vías con `foot=no`/`access=no`), más pistas, parques y espejos de agua |
| **Conversión a CSV** | `codigo/osm_json_a_csv.py` (no filtra ni modifica: cambia el formato) |
| **Fecha de descarga** | 2026-10-27 (estado de la base OSM: 2026-10-27 05:21 UTC) |
| **Tamaño** | 41.238 elementos · JSON 24 MB · CSV 10 MB |
| **Uso en RESPIRA** | **Unidad común del proyecto: el tramo.** Todos los datasets se llevan a un valor por tramo. También define los senderos de la hipótesis |

### Columnas del CSV
| Columna | Descripción |
|---|---|
| `osm_tipo`, `osm_id` | Tipo (`way` = vía, `relation` = relación) y número del elemento en OSM. El par identifica cada elemento. Se puede ver en `openstreetmap.org/way/<osm_id>` |
| `highway` | Tipo de vía: `residential` (calle), `footway` (vereda o senda), `primary`/`secondary` (avenidas), `tertiary`, `pedestrian` (peatonal), `cycleway`, `living_street` (calle de convivencia), `path`, `service`, `steps`… Vacío en parques, pistas y agua |
| `leisure`, `natural` | `park`, `track` (pista), `fitness_station`… / `water` |
| `name` | Nombre de la calle o del lugar |
| `foot`, `access`, `bicycle` | Permisos de paso (casi siempre vacíos) |
| `sidewalk` | Si tiene vereda: `both`, `right`, `left`, `no`, `separate` |
| `surface` | Tipo de piso: `asphalt`, `concrete`, `paving_stones`, `sett` (adoquín), tierra… |
| `lit` | Iluminación: `yes`, `no`, `24/7` |
| `maxspeed`, `lanes`, `oneway` | Velocidad máxima (km/h), carriles, mano única |
| `otras_etiquetas` | Resto de las etiquetas de OSM, `clave=valor` separadas por ` \| ` |
| `largo_m` | Largo en metros (para polígonos, el perímetro). Aproximación plana |
| `cant_puntos` | Cantidad de puntos de la geometría |
| `wkt` | Geometría (WGS84): `LINESTRING` o `POLYGON` |

### Observaciones
- OSM es un mapa colaborativo: las etiquetas opcionales (`sidewalk`, `lit`, `surface`) están incompletas. Vacío significa "sin información", no "no tiene".
- La consulta trae todo lo que toca el límite de CABA, así que incluye pedazos de la General Paz y del Riachuelo.
- Los parques grandes cargados como relaciones no vienen en esta descarga: ver el complemento de parques.

### Versión procesada: `datasets_procesados/osm_red_peatonal_caba__filtrado.csv`
- **Script:** `codigo/filtrar_osm_red_peatonal.py` (entradas: red, complemento de parques y `comunas.zip`)
- **Transformación:** solo recorta y reorganiza; no modifica valores. Quedan 36.008 elementos.
- **Filas que quedan:** `residential`, `footway`, `secondary`, `tertiary`, `primary`, `pedestrian`, `cycleway`, `living_street`, `path`, `unclassified`, `track`, más parques, reservas, jardines, pistas y agua como capas de apoyo.
- **Filas que salen:** `service`, `steps`, `*_link`, `trunk`, `corridor`, `raceway`; tramos con `foot=no` (pista de ciclismo del Parque Sarmiento); elementos sin geometría; tramos cuyo punto medio cae fuera de CABA (54).
- **Columnas:** `osm_tipo`, `osm_id`, `highway`, `leisure`, `natural`, `name`, `sidewalk`, `surface`, `lit`, `footway`, `crossing`, `smoothness`, `tunnel`, `area`, `largo_m`, `wkt`.
- **Columnas sacadas de `otras_etiquetas`** (mismo valor, en columna propia): `footway` (`sidewalk` = vereda dibujada aparte, `crossing` = cruce peatonal), `crossing` (tipo de cruce: `marked`, `traffic_signals`…), `smoothness` (qué tan liso es el piso), `tunnel` (paso bajo nivel), `area` (`yes` = plaza seca o explanada: es una superficie y su `largo_m` es el perímetro; hay 366).
- **Para el armado del índice:** 588 veredas dibujadas aparte duplican su cuadra; 1.322 tramos miden menos de 5 m; algunos superan los 2 km y habrá que cortarlos en las esquinas; `surface` tiene 26 valores para agrupar; en `lit`, `24/7` equivale a `yes`.

---

## Complemento de parques de OpenStreetMap

| | |
|---|---|
| **Archivos** | `datasets/osm_parques_complemento_caba.json` (descarga original) y `.csv` (mismo contenido, convertido con `codigo/osm_json_a_csv.py`) |
| **Fuente** | © colaboradores de OpenStreetMap, vía Overpass API. Licencia ODbL |
| **Consulta** | `codigo/overpass_parques_complemento_caba.overpassql`: relaciones `leisure=park`/`nature_reserve`/`garden` y vías `nature_reserve`/`garden` dentro de CABA |
| **Fecha de descarga** | 2026-10-27 (estado de la base OSM: 2026-10-27 10:37 UTC) |
| **Tamaño** | 293 elementos (124 relaciones y 169 vías) |
| **Uso en RESPIRA** | Suma a la red los parques que OSM tiene como relaciones: Reserva Ecológica Costanera Sur y Costanera Norte, Parque Indoamericano, Parque Roca, Rosedal Sur, Jardín Botánico, Jardín Japonés, entre otros |

### Observaciones
- Mismas columnas que la red. Las relaciones se arman uniendo sus vías exteriores y restando las interiores (`MULTIPOLYGON`/`POLYGON`).
- Una relación (Paseo El Rosedal) no tiene geometría armable; el Rosedal sí está como vía.
- Los Bosques de Palermo no existen en OSM como un solo parque: están divididos en plazas (Plaza Holanda, Plaza Sicilia…) que vienen en la red.

---

## Vías principales de OpenStreetMap (presión vial)

| | |
|---|---|
| **Archivos** | `datasets/osm_vias_principales_caba.json` (descarga original) y `.csv` (mismo contenido, convertido con `codigo/osm_json_a_csv.py`) |
| **Fuente** | © colaboradores de OpenStreetMap, vía Overpass API. Licencia ODbL |
| **Consulta** | `codigo/overpass_vias_principales_caba.overpassql`: vías `motorway`, `trunk`, `primary`, `secondary` y sus ramales (`_link`) dentro de CABA |
| **Fecha de descarga** | 2026-10-20 (estado de la base OSM: 2026-10-20 02:32 UTC) |
| **Tamaño** | 7.517 tramos (JSON 5 MB) |
| **Uso en RESPIRA** | Presión vial: de dónde viene el tránsito. Incluye autopistas, que no están en la red peatonal pero afectan a las calles de al lado |

### Observaciones
- **No mide autos que pasan**, sino el tipo de vía. La intensidad se aproxima con carriles, velocidad máxima y si es ruta de camiones; el tránsito real por cuadra sale de los colectivos (GTFS).
- La diferencia entre `primary` y `secondary` no siempre es consistente entre barrios (ej.: la Comuna 12 no tiene ninguna avenida marcada `primary`).
- Las avenidas doble mano con boulevard están dibujadas como dos líneas (una por mano): `oneway` permite no contarlas dos veces.

### Versión procesada: `datasets_procesados/osm_vias_principales_caba__filtrado.csv`
- **Script:** `codigo/filtrar_osm_vias_principales.py`
- **Transformación:** solo recorta. Quedan 7.457 tramos: salen 60 cuyo punto medio cae fuera de CABA. Quedan todos los tipos de vía.
- **Columnas:** `osm_tipo`, `osm_id`, `highway`, `name`, `maxspeed` (km/h, 92 % con dato), `lanes` (carriles, 90 %), `oneway`, `hgv` (`designated` = ruta de camiones, `no` = prohibidos), `bridge` (autopista elevada o puente), `tunnel`, `largo_m`, `wkt`.

---

## GTFS de colectivos

> ⚠️ **No está en el repositorio:** pesa 209 MB comprimido (1,4 GB descomprimido). Se descarga del link del readme y se guarda sin descomprimir como `datasets/colectivos-gtfs.zip`.

| | |
|---|---|
| **Archivo** | `datasets/colectivos-gtfs.zip` (`agency`, `calendar_dates`, `routes`, `shapes`, `stops`, `stop_times`, `trips`) |
| **Fuente** | GCBA – Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/colectivos-gtfs |
| **Fecha de descarga** | 2026-10-27 |
| **Cobertura temporal** | Programación del 28-09-2019 al 31-12-2019. Es lo último publicado (el portal indica que está "en revisión y corrección") |
| **Cobertura espacial** | AMBA: 43.594 paradas, 1.052 líneas, 2.066 recorridos, 436.407 viajes |
| **Uso en RESPIRA** | Presión vial: cuántos colectivos por hora pasan por cada tramo, según tipo de día y franja |

### Tablas
| Tabla | Contenido |
|---|---|
| `stops` | Paradas: `stop_id`, `stop_code`, `stop_name`, `stop_lat`, `stop_lon` |
| `routes` | Líneas: `route_id`, `agency_id`, `route_short_name`, `route_long_name`, `route_desc`, `route_type` |
| `trips` | Viajes: `route_id`, `service_id`, `trip_id`, `trip_headsign`, `trip_short_name`, `direction_id`, `block_id`, `shape_id`, `exceptional` |
| `stop_times` | A qué hora pasa cada viaje por cada parada: `trip_id`, `arrival_time`, `departure_time`, `stop_id`, `stop_sequence`, `timepoint`, `shape_dist_traveled` |
| `shapes` | Recorrido dibujado de cada línea, punto por punto: `shape_id`, `shape_pt_lat`, `shape_pt_lon`, `shape_pt_sequence`, `shape_dist_traveled` |
| `calendar_dates` | Qué servicio corre cada día. **`service_id`: 1 = sábado, 2 = domingo, 3 = día hábil, 4 = feriado** (12/10, 18/11, 8/12, 25/12) |

### Observaciones
- Son colectivos **programados**, no los que efectivamente pasaron, y es la programación de 2019 (antes de la pandemia y de los recortes de servicio de 2026).
- `arrival_time` puede superar las 24 h (viajes que terminan después de medianoche).

### Versión procesada: `datasets_procesados/colectivos-gtfs__filtrado_*.csv`
- **Script:** `codigo/filtrar_colectivos_gtfs.py`
- **Transformación:** solo recorta. Paradas dentro de CABA (8.321), sus pasadas (9,7 millones de filas en `stop_times`) y los viajes (252.351), recorridos (1.122) y líneas (573) que pasan por ellas. **Se mantienen los cuatro tipos de día.** `calendar_dates` va completo.
- De `stop_times` salen `departure_time`, `timepoint` y `shape_dist_traveled`.
- ⚠️ `colectivos-gtfs__filtrado_stop_times.csv` pesa 269 MB y no está en git: se regenera con el script (~30 s).

### Versión procesada: `datasets_procesados/colectivos-gtfs__pasadas_por_tramo_franja.csv`
- **Script:** `codigo/colectivos_pasadas_por_tramo.py` (~6 min). Es un procesado: cuenta y agrupa.
- **Método:** un tramo de la red (solo tipos vehiculares: `primary`, `secondary`, `tertiary`, `residential`, `living_street`, `unclassified`) es parte de un recorrido si al menos el 60 % de su largo queda a menos de 12 m de la línea del recorrido. La franja de cada viaje en ese tramo sale de la hora en la parada anterior. Se suman todas las líneas y ambos sentidos.
- **Tamaño:** 189.638 filas (9.585 tramos con colectivo) · 9 MB.

| Columna | Descripción | Unidad |
|---|---|---|
| `osm_tipo`, `osm_id` | Tramo de la red peatonal | — |
| `highway` | Tipo de vía | — |
| `tipo_dia` | `habil`, `sabado`, `domingo`, `feriado` | — |
| `franja` | `madrugada` (0–6 h), `manana` (6–10 h), `mediodia` (10–16 h), `tarde` (16–20 h), `noche` (20–24 h) | — |
| `viajes` | Colectivos que pasan por el tramo en toda la franja | viajes |
| `pasadas_por_hora` | `viajes` dividido por las horas de la franja | colectivos/h |

- **Limitación:** en avenidas con boulevard dibujadas como dos líneas, un recorrido puede quedar asignado a ambas manos y sobrestimar las pasadas.

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
| **Uso en RESPIRA** | Vegetación de cada tramo (árboles por cuadra), sombra (altura y diámetro), espacio para correr (ancho de vereda) y especies alergénicas (plátano, fresno, ligustro) |

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

### Versión procesada: `datasets_procesados/arbolado-publico-lineal-2017-2018__filtrado.csv`
- **Script:** `codigo/filtrar_arbolado_lineal.py`
- **Transformación:** solo recorta. Quedan 354.838 de 370.180 árboles: salen los 15.342 sin coordenadas (solo el 15 % tenía dirección para ubicarlos). Faltan más en las comunas 8 (9,5 %), 1 (8,5 %) y 4 (7 %).
- **Columnas:** `nro_registro`, `long`, `lat`, `nombre_cientifico`, `altura_arbol`, `diametro_altura_pecho`, `ancho_acera`, `calle_nombre`, `calle_altura`.
- **Quedan** los árboles con diámetro 0 (6.378), sin altura (4.322) o de especie "No identificado" (9.411).
- **Especies alergénicas:** `Fraxinus` (fresno, 153.118 en el original), `Platanus x acerifolia` (plátano, 32.319) y `Ligustrum` (ligustro, 17.175). `Acer pseudoplatanus` **no** es plátano: buscar `Platanus`, no "platan".
- **Limitación:** 124.396 árboles comparten la coordenada exacta con otro (el censo ubicó varios árboles de una cuadra en el mismo punto). Sirve para contar árboles por cuadra, no para la posición exacta de cada uno.

---

## Espacios verdes públicos (GCBA)

| | |
|---|---|
| **Archivo** | `datasets/espacio_verde_publico.csv` |
| **Fuente** | GCBA – Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/espacios-verdes |
| **Fecha de descarga** | 2026-09-22 (fecha del archivo descargado) |
| **Cobertura** | Plazas, plazoletas, parques, canteros centrales, jardines y patios de las 15 comunas |
| **Tamaño** | 2.176 filas × 19 columnas · 15 MB |
| **Uso en RESPIRA** | Vegetación: si un tramo atraviesa o bordea un espacio verde. Fuente oficial, con superficie medida |

### Columnas principales
| Columna | Descripción |
|---|---|
| `id` | ID del espacio verde |
| `nombre`, `nom_mapa` | Nombre completo y abreviado (vacío en el 52 %) |
| `barrio`, `comuna` | Ubicación administrativa |
| `ubicacion` | Calles que lo rodean |
| `clasificac` | PLAZOLETA, CANTERO CENTRAL, PLAZA, PARQUE, PARQUE SEMIPÚBLICO, JARDÍN, JARDÍN BOTÁNICO, PASEO, PATIO, PATIO RECREATIVO, PATIO DE JUEGOS INCLUSIVO, BARRIO/COMPLEJO |
| `tiene_pati`, `apadrinada` | Si tiene patio de juegos; empresa padrina |
| `decreto`, `fecha_decr`, `ordenanza_`, `fecha_orde`, `boletin_of`, `fecha_bole` | Datos legales |
| `area`, `perimetro` | Superficie (m²) y perímetro (m) |
| `observacio` | Vacía |
| `geometry` | Polígono (WGS84) |

### Versión procesada: `datasets_procesados/espacio_verde_publico__filtrado.csv`
- **Script:** `codigo/filtrar_espacio_verde_publico.py`
- **Transformación:** solo recorta. Quedan 2.127: salen los patios de juegos (27, chicos y con piso duro), BARRIO/COMPLEJO (Barrio Municipal Soldati, un complejo de viviendas) y 21 polígonos de menos de 10 m² (restos de dibujo).
- **Columnas:** `id`, `nombre`, `clasificac`, `area`, `geometry`.
- **Pendiente para el índice:** se superpone con los parques de OSM. Propuesta: este dataset como fuente principal de verde y OSM para lo que no tiene, como las sendas dentro de los parques.

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
| **Uso en RESPIRA** | Componente "ruido" del índice (resta). Cada tramo de la red toma el dBA del polígono donde cae, de día o de noche según el horario elegido |

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
- **La versión 2025 es el mismo modelo que 2018** (comparado el 2026-10-27): el nocturno es idéntico y, en el diurno, los polígonos coinciden exactamente donde hay datos en ambas versiones; a 2025 le faltan la Comuna 1 y algunas zonas tranquilas. Por eso se usa 2018. En la app se presenta como "Mapa de Ruido APrA, modelo 2018".

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
| **Uso en RESPIRA** | Componente "calidad del aire" del índice. ⚠️ Está por comuna: se reemplazará por la grilla de píxeles de Sentinel-5P (exportación pendiente desde GEE) para asignar un valor a cada tramo |

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

## Límites de comunas

| | |
|---|---|
| **Archivo** | `datasets/comunas.zip` (shapefile: `comunas.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`) |
| **Fuente** | GCBA – Buenos Aires Data · https://data.buenosaires.gob.ar/dataset/comunas |
| **Fecha de descarga** | 2026-10-05 |
| **Sistema de coordenadas** | WGS84 |
| **Uso en RESPIRA** | No es una variable: los scripts lo usan para recortar todos los datos al límite de CABA (un elemento queda si su punto medio cae dentro de la Ciudad) |
