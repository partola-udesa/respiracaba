# Registro de decisiones

Qué probamos, qué descartamos y por qué. La entrada más nueva va arriba.

<!-- Formato:
## AAAA-MM-DD — Título corto
- **Qué:** …
- **Por qué:** …
- **Alternativa descartada:** …
-->

## 2026-10-25 — Prototipo funcional de prueba (`app/index.html`)
- **Qué:** Primera versión web navegable con datos reales de las 15 comunas. Sigue el flujo de la v3: búsqueda → resultados (mapa + ranking de 3) → detalle con lecturas → comparar → cómo se calcula. La IA convierte el texto libre en filtros, da la recomendación final, explica cada comuna ("Para ustedes") y responde en el chat. Los prompts están versionados en `prompts/prompts_v1.md`.
- **Índice provisorio:**
  - cada componente se expresa en % respecto del promedio de CABA, sin escala 0–100;
  - el ruido se convierte a sonoridad percibida: 2^((dB CABA − dB comuna) ÷ 10) − 1, es decir que 10 dB menos se perciben como la mitad de ruido;
  - cada componente tiene un tope de ±100 %, para que el verde de la Comuna 1 (Reserva Ecológica) no domine;
  - pesos iniciales por etapa familiar (aire / verde / arbolado / ruido / vial): sin hijos 25/20/15/20/20 · esperando un bebé 30/15/15/25/15 · hijos chicos 25/20/15/25/15 · hijos grandes 25/25/15/15/20.
- **Resultado:** con la búsqueda de ejemplo (3 amb., hasta USD 190.000, esperando un bebé, noche) el ranking da 12 → 13 → 10, distinto del 12 → 11 → 9 de ejemplo de los prototipos.
- **Lecturas propias para contexto:** precio ("entre las más baratas"…) y nacimientos ("entre las que más bajaron"…), para no presentar una baja de nacimientos como algo "peor".
- **Limitación:** la IA funciona solo dentro de Claude (capacidad `sample` de los artifacts). Publicada en Netlify, la búsqueda usa reglas simples y los bloques de IA muestran que no está disponible.
- **A revisar con el equipo:** la conversión de ruido, el tope de ±100 % y los pesos.

## 2026-10-20 — Prototipo v3: lecturas primero, dato duro al pasar el mouse
- **Qué:** Cada dato se muestra como una lectura en lenguaje simple más la posición de la comuna entre las 15. El dato duro (valor, fuente, promedio de CABA y referencia) aparece al pasar el mouse. "Para ustedes" queda como inferencia de la IA. El precio se traduce a un departamento concreto (m² × 70 m²).
- **Por qué:** para la familia usuaria, un número como "62,7 dBA" no significa nada. La lectura se calcula con una regla fija según la posición (1–3 entre las mejores, 4–6 mejor que el promedio, 7–9 en el promedio, 10–12 peor, 13–15 entre las peores), así que es reproducible y no es inferencia del LLM. Esto mantiene la distinción dato duro / inferencia que pide la rúbrica.
- **Referencia de ruido:** OMS, Guías de ruido ambiental (2018), para tránsito: menos de 45 dB de noche y menos de 53 dB como promedio ponderado de 24 h. En la calle, ninguna comuna la cumple, así que la lectura compara entre comunas.
- **Alternativa descartada:** mostrar solo el número con un ⓘ (v2). También que la IA escriba cada lectura: sería menos reproducible y mezclaría dato e inferencia.
- **Nota técnica:** el plan Starter de Figma permite 3 páginas por archivo, así que la v3 está en la misma página que la v2, debajo.

## 2026-10-20 — Prototipo de baja fidelidad v2
- **Qué:** Segunda iteración del wireframe (`diseno/prototipos/prototipo_v2/`), con dos pantallas nuevas: "Cómo se calcula el índice" y "Comparar comunas". Cambios de criterio:
  - cada dato duro muestra su valor en la unidad propia y la comparación con el promedio de CABA;
  - el verde se expresa como % de la superficie;
  - los alérgenos se personalizan según la especie que indica el usuario;
  - la natalidad se muestra como contexto y como base de la tendencia de valor.
- **Por qué:** el índice se arma comparando cada componente con el promedio de la Ciudad, así que la interfaz tiene que mostrar esa comparación. No hay población por comuna para calcular el verde por habitante. La natalidad es una variable de la hipótesis y no aparecía en la v1.
- **Corrección:** en la v1, la IA estimaba "demanda sostenida" de 3 ambientes, pero la natalidad bajó 26 % en CABA desde 2020 (36 % en la Comuna 12). En la v2 la tendencia pasa a "estable".
- **Alternativa descartada:** modificar la v1. Se mantiene intacta para poder comparar las iteraciones.

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
