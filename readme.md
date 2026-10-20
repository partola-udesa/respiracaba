# RESPIRA

Web app que ayuda a familias a decidir dónde comprar o alquilar en la Ciudad de Buenos Aires. Combina un **índice de respirabilidad** (calidad del aire, verde y arbolado, menos presión vial y ruido) con el **precio del m²** y la **natalidad por comuna**. Siempre distingue el *dato duro*, calculado a partir de los datasets, de la *inferencia del LLM*.

**Materia:** IA Aplicada al diseño de productos digitales (Sistemas generativos para Diseño)

## Hipótesis
Podemos predecir el valor de los inmuebles según su cantidad de ambientes a partir de la tasa de natalidad de las comunas y del índice de respirabilidad de la zona.

## Integrantes
- Paulina Artola
- Emma Sangra
- Malena Sciaroni Bouer

## Sitio
🔗 _link a Netlify (completar)_

![Captura de la app](entregas/entrega_1/captura.png)
<!-- reemplazar por la captura más reciente -->

## Fuentes de datos
El detalle de cada dataset (columnas, unidades y transformaciones) está en [`datasets/diccionario.md`](datasets/diccionario.md).

| Dataset | Fuente | Link | Fecha de descarga* |
|---|---|---|---|
| NO2 por comuna (mensual) y por estación (diario) | Copernicus Sentinel-5P vía Google Earth Engine | _colección GEE (completar)_ | 2026-10-05 |
| Meteorología ERA5 | ECMWF ERA5 vía Google Earth Engine | _colección GEE (completar)_ | 2026-10-05 |
| Arbolado público lineal 2017–2018 ⚠️ | GCBA – Buenos Aires Data | https://cdn.buenosaires.gob.ar/datosabiertos/datasets/atencion-ciudadana/arbolado-publico-lineal/arbolado-publico-lineal-2017-2018.csv | 2026-09-22 |
| Arbolado en espacios verdes | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/arbolado-espacios-verdes | 2026-09-15 |
| Conteo vehicular | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/conteo-vehicular | 2026-09-15 |
| Mapa de Ruido 2018, diurno y nocturno ⚠️ | APrA / GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/mapa-ruido · CSV diurno: https://data.buenosaires.gob.ar/dataset/mapa-ruido/resource/ce377913-43ac-4686-b244-0ac4c55012da · CSV nocturno: https://data.buenosaires.gob.ar/dataset/mapa-ruido/resource/cc46de8c-04a9-49b1-8329-2dd800dd2a49 | 2026-09-22 |
| Vías principales (OpenStreetMap) | © colaboradores de OpenStreetMap, vía Overpass API (licencia ODbL) | https://overpass-api.de · consulta en `codigo/overpass_vias_principales_caba.overpassql` | 2026-10-20 |
| GTFS de colectivos (programación 2019) ⚠️ | GCBA – Buenos Aires Data | https://cdn.buenosaires.gob.ar/datosabiertos/datasets/transporte-y-obras-publicas/colectivos-gtfs/colectivos-gtfs.zip | 2026-10-20 |
| Comunas (límites) | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/comunas | 2026-10-05 |
| Precio m² venta 2 amb. usados por barrio (MI_DVP_AX03) | IDECBA | https://www.estadisticaciudad.gob.ar/eyc/banco-datos/precio-promedio-de-publicacion-del-metro-cuadrado-dolares-de-departamentos-en-venta-de-2-ambientes-usados-por-barrio-ciudad-de-buenos-aires-4to-trimestre-de-2006-2do-trimestre-de-2024/ | 2026-10-05 |
| Precio m² venta 3 amb. usados por comuna (MI_DVP_AX08) | IDECBA | https://www.estadisticaciudad.gob.ar/eyc/banco-datos/precio-promedio-de-publicacion-del-metro-cuadrado-dolares-de-departamentos-en-venta-de-3-ambientes-usados-por-comuna-ciudad-de-buenos-aires-1er-trimestre-de-2015-2do-trimestre-de-2024/ | 2026-10-06 |
| Nacimientos por comuna (Nac_Co) | IDECBA | https://www.estadisticaciudad.gob.ar/eyc/?p=59650 | 2026-10-05 |

\* Fecha del archivo descargado en la computadora del equipo.

⚠️ **Archivos pesados que no están en el repo:** `arbolado-publico-lineal-2017-2018.csv` (60 MB), `medicion_de_ruido_diurno_2018.csv` (73 MB) y `medicion_de_ruido_nocturno_2018.csv` (67 MB), y el GTFS de colectivos (209 MB, se descomprime en una carpeta aparte). Se descargan del link de la tabla y se guardan en `datasets/` con ese mismo nombre.

## Cómo reproducir los datos procesados
```bash
pip install openpyxl pyshp shapely
python codigo/convertir_xlsx_a_csv.py
python codigo/ubicar_cruces_conteo_vehicular.py datasets/conteo-vehicular.csv datasets/arbolado-publico-lineal-2017-2018.csv datasets/comunas.zip datasets_procesados/conteo-vehicular__con_comuna.csv
python codigo/ruido_promedio_por_comuna.py datasets/medicion_de_ruido_diurno_2018.csv datasets/medicion_de_ruido_nocturno_2018.csv datasets/comunas.zip datasets_procesados/medicion_de_ruido_2018__promedio_por_comuna.csv
python codigo/presion_vial_por_comuna.py datasets/osm_vias_principales_caba.json datasets/comunas.zip datasets_procesados/osm_vias_principales_caba__presion_vial_por_comuna.csv
python codigo/colectivos_por_comuna_dia_noche.py carpeta_gtfs datasets/comunas.zip datasets_procesados/colectivos-gtfs__pasadas_por_comuna_dia_noche.csv
python codigo/presion_vial_combinada.py datasets_procesados/osm_vias_principales_caba__presion_vial_por_comuna.csv datasets_procesados/colectivos-gtfs__pasadas_por_comuna_dia_noche.csv datasets_procesados/osm_vias_principales_caba__presion_vial_combinada_con_colectivos.csv
```

## Estructura del repositorio
| Carpeta | Contenido |
|---|---|
| `datasets/` | Datos originales con el nombre de descarga, más `diccionario.md` |
| `datasets_procesados/` | Versiones recortadas o reorganizadas (`original__transformacion.csv`) |
| `codigo/` | Scripts de descarga, conversión y limpieza |
| `prompts/` | Prompts del LLM, versionados (`prompt_x_v1.md`, `_v2`…) |
| `diseno/` | Referencias y prototipos |
| `entregas/` | Estado del proyecto en cada entrega |
| `app/` | Lo que se publica en Netlify |
