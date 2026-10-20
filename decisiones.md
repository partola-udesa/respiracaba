# Registro de decisiones

Qué probamos, qué descartamos y por qué. La entrada más nueva va arriba.

<!-- Formato:
## AAAA-MM-DD — Título corto
- **Qué:** …
- **Por qué:** …
- **Alternativa descartada:** …
-->

## 2026-10-19 — Presión vial: cómo se combinan red vial y colectivos
- **Qué:** La presión vial de cada comuna es el promedio, **con el mismo peso (50/50)**, de dos indicadores expresados relativos al promedio de la Ciudad:
  - km de autopistas y avenidas por km² (OpenStreetMap);
  - pasadas de colectivo por hora y por km² (GTFS).
  Se calcula un valor de día y otro de noche (`osm_vias_principales_caba__presion_vial_combinada_con_colectivos.csv`).
- **Por qué:** las dos medidas tienen unidades distintas, así que para sumarlas hay que llevarlas a una misma escala. Se eligió "relativo al promedio de CABA" porque es coherente con la decisión de no pasar los componentes a 0–100 y dar el índice como porcentaje. Además se lee fácil en la interfaz ("+52 % que el promedio de la Ciudad"). El mismo peso evita que una sola fuente domine: la Comuna 8 tiene mucha autopista pero pocos colectivos, y la 3 al revés.
- **Alternativa descartada:**
  - normalizar cada indicador de 0 a 1 entre la comuna mínima y la máxima, porque depende de los extremos y el equipo ya había descartado las escalas 0–100;
  - usar solo uno de los dos indicadores.
- **Ajuste de nombres:** el procesado de colectivos pasó a llamarse `colectivos-gtfs__pasadas_por_comuna_dia_noche.csv`, para respetar la regla `nombre_original__transformacion` (el archivo original se llama `colectivos-gtfs.zip`).

## 2026-10-19 — Tránsito: "presión vial" en lugar de "flujo vehicular"
- **Qué:** El componente de tránsito del índice pasa a ser **presión vial** y se arma con dos fuentes que cubren las 15 comunas con el mismo método:
  - km de autopistas y avenidas por km² de comuna (OpenStreetMap);
  - pasadas de colectivo por km² y por hora, de día y de noche (GTFS de colectivos, programación 2019). Usa las mismas franjas que el ruido, así que también puede ir en el carrusel día/noche.
- **Conteo vehicular y Flujo vehicular (GCBA):** salen del índice. Los 49 cruces del conteo quedan como capa de contexto en el mapa (vehículos por hora en cada cruce).
- **Por qué:** los datos de conteo de GCBA cubren 14 de 15 comunas, pero con métodos, años y tipos de vía que no se pueden comparar (ver entrada anterior). No hay datos públicos de flujo medido por comuna: Waze/Congestiómetro solo se comparte con gobiernos, y TomTom, Google y HERE son pagos.
- **Limitación a comunicar:** presión vial mide **exposición** (cuánta vía de tránsito intenso y cuántos colectivos programados hay), no autos contados.
- **Alternativa descartada:** meter en el índice el conteo vehicular y el flujo vehicular de GCBA (no son comparables entre sí); sacar el tránsito del índice y solo mencionarlo en el disclaimer.
- **Resuelto:** la combinación está en la entrada de arriba. Cambia la fórmula presentada en la Entrega 1 ("− flujo vehicular" pasa a "− presión vial"), así que hay que explicarlo en el informe de la próxima entrega.

## 2026-10-19 — Ruido: se confirma la versión 2018
- **Qué:** Se volvió a bajar el Mapa de Ruido 2025 del portal (recurso actualizado el 04-08-2026). Es idéntico al descargado el 22-09-2026: la Comuna 1 sigue casi vacía. Se mantiene la versión 2018.
- **Por qué:** la página del dataset se había actualizado el 02-10-2026 y había que descartar que la versión 2025 se hubiera corregido, porque sería la más reciente.
- **Alternativa descartada:** usar 2025 para todas las comunas salvo la 1, que mezclaría dos años distintos.

## 2026-10-19 — Ruido: valor por comuna, día y noche
- **Qué:** El ruido se resume en un dBA por comuna para el día y otro para la noche (`medicion_de_ruido_2018__promedio_por_comuna.csv`), con un promedio ponderado por la superficie de cada zona del Mapa de Ruido 2018.
- **Índice:** el ruido nocturno pesa más cuando la etapa familiar es "esperando un bebé" o "hijos chicos". La app lo explica en un bloque de inferencia ("para familias con bebés priorizamos el ruido nocturno"), porque el criterio de ponderación es del equipo y no sale del dato.
- **Interfaz:** en la tarjeta, el ruido es un dato con carrusel (noche / día). El primer slide es el que pesa en el índice, y el segundo se anuncia con una etiqueta visible.
- **Por qué:** el ranking cambia entre franjas. De día la más ruidosa es la Comuna 3 y la más tranquila la 11; de noche, la 14 y la 12. La Comuna 9 está en el medio de día y es la segunda más tranquila de noche.
- **Alternativa descartada:** versión 2025 del Mapa de Ruido (en la descarga del 22-09-2026 le falta la Comuna 1; revisada de nuevo el 2026-10-19: sin cambios); un solo valor promedio día/noche.

## 2026-10-19 — Tránsito: ubicación de los cruces y cobertura por comuna
- **Qué:** Se ubicaron los 49 cruces de `conteo-vehicular.csv` con el arbolado lineal y los límites de comunas, sin servicios externos (ver `diccionario.md`). Cubren 11 comunas. Si se suman los 6 puntos con coordenadas de Flujo Vehicular, que caen en las comunas 1, 3, 7, 13 y 14, quedan cubiertas 14 de las 15 comunas: falta la 2.
- **Por qué:** había que ver si los datos de tránsito de GCBA alcanzaban para dar un valor por comuna antes de sacarlos del índice.
- **Resultado:** las dos fuentes no son comparables. Conteo es manual, de 2018–2019, de una a pocas horas por cruce y en calles internas y avenidas. Flujo es de sensores continuos, de 2020–2022 (con pandemia) y en accesos y autopistas. Además, varias comunas tienen un solo punto.
- **Informe Movilidad OMSV (jul. 2026):** se descartó para el índice. Trae totales mensuales de toda la ciudad (SUBE, autopistas, 20 avenidas, congestión TomTom) sin desagregación por comuna. Puede servir como contexto de tendencia general.
- **Alternativa descartada:** ubicar los cruces con un servicio de direcciones externo (USIG, Nominatim), que no estaba disponible desde el entorno de trabajo. Se usó el arbolado lineal, que trae calle y coordenadas de cada árbol.
- **Resuelto:** ver la entrada "Presión vial" de arriba.

## 2026-10-19 — Definiciones de interfaz para el prototipo en Figma
- **Qué:**
  - El chat con la IA es una burbuja flotante, disponible en todas las pantallas.
  - Las limitaciones de los datos se comunican en un disclaimer al pie de la página.
  - Jerarquía de información: ranking (puntaje, precio/m², una frase) → tarjeta de zona (componentes del índice, alérgenos, tendencia de valor) → detalle (fuentes, año del dato, dato duro vs inferencia).
  - La unidad geográfica que se muestra es la comuna.
  - Alquiler queda fuera por ahora: el prototipo trabaja solo con compra.
- **Por qué:** casi todos los datasets están agregados por comuna, y el único dataset de alquiler (2013–2019) tiene el 74 % de los precios vacíos.
- **Alternativa descartada:** chat como panel lateral fijo o como paso propio del flujo; mostrar por barrio.

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
