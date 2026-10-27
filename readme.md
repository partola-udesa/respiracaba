# RESPIRA

Web app para **runners de la Ciudad de Buenos Aires** que priorizan la calidad del aire al elegir por dónde correr. El usuario indica punto de partida, punto de llegada, kilómetros y horario, y RESPIRA propone recorridos que maximizan un **índice de respirabilidad** calculado calle por calle: arbolado, espacios verdes, calidad del aire, ruido y presión vial. La recomendación es una alternativa más para que el runner decida. La app siempre distingue el *dato duro*, calculado a partir de los datasets, de la *inferencia del LLM*.

**Materia:** IA Aplicada al diseño de productos digitales (Sistemas generativos para Diseño) · Segundo semestre de 2026

## Hipótesis
Los senderos y circuitos donde ya corren los runners de CABA van a presentar mejores valores de respirabilidad que el resto de las calles de la Ciudad.

- **Senderos y circuitos:** sendas y caminos dentro de parques (OSM `footway`/`path` dentro de un parque), costaneras y calles peatonales (OSM `pedestrian`) y circuitos conocidos marcados a mano (Bosques de Palermo, Rosedal, Reserva Ecológica Costanera Sur, Parque Centenario, entre otros).
- **Se confirma** si el índice promedio por km de los senderos supera al del resto de las calles; **se refuta** si es igual o menor.

## Recorte
- **Dónde:** las 15 comunas de CABA. La unidad de análisis es el **tramo de calle** (red peatonal de OpenStreetMap): todos los datos se llevan a una ubicación geolocalizada, no por barrio ni por comuna.
- **Cuándo:** datos que cambian en el tiempo (NO2, meteorología) de julio de 2018 a agosto de 2026; datos que son una "foto" de la ciudad, del último relevamiento disponible de cada uno (arbolado 2017–2018, ruido 2018, colectivos 2019, OpenStreetMap y espacios verdes 2026).

## Variables
- **Índice de respirabilidad:** calidad del aire (NO2) + arbolado público lineal + espacios verdes − ruido − presión vial (tipo de vía y pasadas de colectivo por hora).
- **Variables del usuario:** senderos para correr (OpenStreetMap) y condiciones meteorológicas.

## Integrantes
- Paulina Artola
- Emma Sangra
- Malena Sciaroni Bouer

## Sitio
🔗 _link a Netlify (completar)_

<!-- Captura de la app: agregar la imagen en entregas/entrega_N/ y enlazarla acá -->

## Fuentes de datos
El detalle de cada dataset (columnas, unidades y transformaciones) está en [`datasets/diccionario.md`](datasets/diccionario.md). Las decisiones sobre qué se usa, qué se descarta y por qué están en [`decisiones.md`](decisiones.md).

| Dataset | Uso en RESPIRA | Fuente | Link | Fecha de descarga* |
|---|---|---|---|---|
| Red de calles y sendas (OpenStreetMap) | Unidad común (el tramo) y senderos | © colaboradores de OpenStreetMap, vía Overpass API (licencia ODbL) | https://overpass-api.de · consulta en `codigo/overpass_red_peatonal_caba.overpassql` | 2026-10-27 |
| Parques, reservas y jardines (OpenStreetMap) | Complemento de la red: parques cargados como relaciones | © colaboradores de OpenStreetMap, vía Overpass API (licencia ODbL) | https://overpass-api.de · consulta en `codigo/overpass_parques_complemento_caba.overpassql` | 2026-10-27 |
| Vías principales (OpenStreetMap) | Presión vial: tipo de vía, carriles, velocidad, camiones | © colaboradores de OpenStreetMap, vía Overpass API (licencia ODbL) | https://overpass-api.de · consulta en `codigo/overpass_vias_principales_caba.overpassql` | 2026-10-20 |
| GTFS de colectivos (programación sept.–dic. 2019) ⚠️ | Presión vial: pasadas de colectivo por tramo, tipo de día y franja | GCBA – Buenos Aires Data | https://cdn.buenosaires.gob.ar/datosabiertos/datasets/transporte-y-obras-publicas/colectivos-gtfs/colectivos-gtfs.zip | 2026-10-27 |
| Arbolado público lineal 2017–2018 ⚠️ | Vegetación, sombra y especies alergénicas | GCBA – Buenos Aires Data | https://cdn.buenosaires.gob.ar/datosabiertos/datasets/atencion-ciudadana/arbolado-publico-lineal/arbolado-publico-lineal-2017-2018.csv | 2026-09-22 |
| Espacios verdes públicos | Vegetación | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/espacios-verdes | 2026-09-22 |
| Arbolado en espacios verdes (censo 2011) | Vegetación dentro de parques (complementario) | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/arbolado-espacios-verdes | 2026-09-15 |
| Mapa de Ruido, diurno y nocturno (modelo 2018) ⚠️ | Ruido | APrA / GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/mapa-ruido · CSV diurno: https://data.buenosaires.gob.ar/dataset/mapa-ruido/resource/ce377913-43ac-4686-b244-0ac4c55012da · CSV nocturno: https://data.buenosaires.gob.ar/dataset/mapa-ruido/resource/cc46de8c-04a9-49b1-8329-2dd800dd2a49 | 2026-09-22 |
| NO2 por comuna (mensual) y por estación (diario) | Calidad del aire | Copernicus Sentinel-5P vía Google Earth Engine | https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_NO2 | 2026-10-05 |
| Meteorología ERA5 | Control climático (viento, temperatura, humedad) | ECMWF ERA5 vía Google Earth Engine | _colección GEE (completar)_ | 2026-10-05 |
| Comunas (límites) | Recorte de todos los datos al límite de CABA | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/comunas | 2026-10-05 |

\* Fecha del archivo descargado en la computadora del equipo. Para OpenStreetMap es la fecha de la consulta (el estado de la base OSM queda registrado dentro de cada JSON).

### Archivos pesados que no están en el repo ⚠️
Superan el límite de tamaño del repositorio y están en `.gitignore`. Se descargan del link de la tabla y se guardan en `datasets/` con el nombre indicado:

| Archivo | Tamaño | Dónde va |
|---|---|---|
| `arbolado-publico-lineal-2017-2018.csv` | 60 MB | `datasets/` |
| `medicion_de_ruido_diurno_2018.csv` | 73 MB | `datasets/` |
| `medicion_de_ruido_nocturno_2018.csv` | 67 MB | `datasets/` |
| `colectivos-gtfs.zip` (sin descomprimir) | 209 MB | `datasets/` |
| `colectivos-gtfs__filtrado_stop_times.csv` | 269 MB | `datasets_procesados/` · no se descarga: se regenera con `codigo/filtrar_colectivos_gtfs.py` |

## Cómo reproducir los datos procesados
```bash
pip install pandas numpy shapely pyshp

# 1. Descargas de OpenStreetMap (Overpass API) y conversión a CSV
curl -X POST --data-urlencode data@codigo/overpass_red_peatonal_caba.overpassql https://overpass-api.de/api/interpreter -o datasets/osm_red_peatonal_caba.json
curl -X POST --data-urlencode data@codigo/overpass_parques_complemento_caba.overpassql https://overpass-api.de/api/interpreter -o datasets/osm_parques_complemento_caba.json
curl -X POST --data-urlencode data@codigo/overpass_vias_principales_caba.overpassql https://overpass-api.de/api/interpreter -o datasets/osm_vias_principales_caba.json
python codigo/osm_json_a_csv.py datasets/osm_red_peatonal_caba.json datasets/osm_red_peatonal_caba.csv
python codigo/osm_json_a_csv.py datasets/osm_parques_complemento_caba.json datasets/osm_parques_complemento_caba.csv
python codigo/osm_json_a_csv.py datasets/osm_vias_principales_caba.json datasets/osm_vias_principales_caba.csv

# 2. Filtrados
python codigo/filtrar_osm_red_peatonal.py datasets/osm_red_peatonal_caba.csv datasets/osm_parques_complemento_caba.csv datasets/comunas.zip datasets_procesados/osm_red_peatonal_caba__filtrado.csv
python codigo/filtrar_osm_vias_principales.py datasets/osm_vias_principales_caba.csv datasets/comunas.zip datasets_procesados/osm_vias_principales_caba__filtrado.csv
python codigo/filtrar_colectivos_gtfs.py datasets/colectivos-gtfs.zip datasets/comunas.zip datasets_procesados
python codigo/filtrar_arbolado_lineal.py datasets/arbolado-publico-lineal-2017-2018.csv datasets_procesados/arbolado-publico-lineal-2017-2018__filtrado.csv
python codigo/filtrar_espacio_verde_publico.py datasets/espacio_verde_publico.csv datasets_procesados/espacio_verde_publico__filtrado.csv

# 3. Procesados (tarda ~6 minutos)
python codigo/colectivos_pasadas_por_tramo.py datasets_procesados datasets_procesados/osm_red_peatonal_caba__filtrado.csv datasets_procesados/colectivos-gtfs__pasadas_por_tramo_franja.csv
```
Las descargas de OpenStreetMap devuelven el estado actual de la base, que cambia con el tiempo: para obtener exactamente los mismos datos, usar los JSON del repositorio.

## Estructura del repositorio
| Carpeta / archivo | Contenido |
|---|---|
| `readme.md` | Este archivo |
| `decisiones.md` | Registro fechado de qué se probó, qué se descartó y por qué |
| `.gitignore` | Archivos que no se suben (datasets pesados, claves, archivos del sistema) |
| `datasets/` | Datos originales con el nombre de descarga, sin modificar, más `diccionario.md` |
| `datasets_procesados/` | Versiones filtradas o calculadas a partir de los originales (`original__transformacion.csv`) |
| `codigo/` | Scripts de descarga, conversión, filtrado y procesado, nombrados por lo que hacen |
| `prompts/` | Prompts del LLM, versionados (`prompts_v1.md`, `_v2`…) |
| `diseno/` | Referencias (`referencias/`) y prototipos (`prototipos/`, una carpeta por versión) |
| `entregas/` | Estado del proyecto en cada entrega (`entrega_N/`: capturas de la app y link al sitio) |
| `app/` | Solo lo que se publica en Netlify |
